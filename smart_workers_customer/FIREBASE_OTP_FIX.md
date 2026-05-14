# Firebase Phone OTP — Why it's not working and how to fix it

Firebase Phone Authentication **is already the best free OTP option for India**
(10,000 free verifications/month, Google-grade delivery). The implementation in
the code is correct — the breakage is **environmental**, not code.

This doc lists every check that must pass for OTP to work end-to-end.

---

## Quick mental model

```
[user phone] → FirebaseAuth.verifyPhoneNumber()
              ↳ Firebase Cloud verifies app integrity via SHA-1 + Play Integrity
              ↳ Firebase sends SMS
[user types code] → PhoneAuthProvider.credential(verificationId, code)
                  → FirebaseAuth.signInWithCredential() → idToken
                  → POST /api/v1/auth/verify-firebase-phone {idToken}
                    ↳ Backend uses Firebase Admin SDK to verify idToken
                    ↳ Returns app JWT
```

If OTP isn't arriving, the break is in the **upper half** (app→Firebase).
If OTP arrives but verification fails after typing it, the break is in the
**lower half** (backend verifying the ID token).

---

## Step 1 — Firebase Console checks (most common cause)

1. Open <https://console.firebase.google.com/> → project **smartworker-c0d21**
2. **Authentication → Sign-in method**
   - Confirm **Phone** provider is **Enabled** (the toggle is on)
3. **Project Settings (gear icon) → Your apps → Android app**
   - Package name must be `com.smartworkers.customer` ✓ (already matches `google-services.json`)
   - **SHA certificate fingerprints**: this is the #1 thing people get wrong.
     You need to register the SHA-1 **AND** SHA-256 of every keystore you use:
     - Your **debug** keystore (for `flutter run` testing)
     - Your **release/upload** keystore (for the APK you distribute)
   - If you only register debug but distribute a release APK → OTP fails silently.

### How to get SHA fingerprints

**Debug keystore** (auto-created by Android, lives at `~/.android/debug.keystore`):
```bash
keytool -list -v \
  -alias androiddebugkey \
  -keystore ~/.android/debug.keystore \
  -storepass android -keypass android
```

**Release keystore** (created by you — see [release.sh](release.sh) or below):
```bash
keytool -list -v \
  -alias smartworkers \
  -keystore /path/to/upload-keystore.jks
```

Look for `SHA1:` and `SHA-256:` lines. **Paste both into Firebase Console**
under "SHA certificate fingerprints" → "Add fingerprint".

After adding fingerprints, **re-download `google-services.json`** from Firebase
Console and replace `android/app/google-services.json`.

---

## Step 2 — Backend (Node.js) checks

The backend endpoint `POST /api/v1/auth/verify-firebase-phone` lives in the
Node.js backend at `workers-portal-backend/` (currently empty in this repo —
deployed on Railway).

**A quick health probe**:
```bash
curl -X POST https://smart-workers-backend-production.up.railway.app/api/v1/auth/verify-firebase-phone \
  -H "Content-Type: application/json" \
  -d '{"idToken":"invalid"}'
```

Expected: a clean JSON 401 like `{"error":"Invalid token"}`.
Currently observed: HTTP 500 with binary garbage (`��-...`) → backend has a
gzip/compression middleware bug. Until this is fixed, **even a valid OTP will
fail to exchange for a JWT**.

What backend code should be doing (in `routes/auth.js` or similar):
```js
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

router.post('/verify-firebase-phone', async (req, res) => {
  try {
    const { idToken } = req.body;
    const decoded = await admin.auth().verifyIdToken(idToken);
    // decoded.phone_number is the verified E.164 number
    // … create/lookup customer, sign app JWT, return
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});
```

**Required Railway env vars on `smart-workers-backend`**:
- `FIREBASE_SERVICE_ACCOUNT_JSON` — full JSON from Firebase Console →
  Project Settings → Service Accounts → Generate New Private Key. Paste the
  **entire JSON** as one env var (Railway accepts multi-line).
- *(Alternative)* `GOOGLE_APPLICATION_CREDENTIALS` pointing to a file path,
  but env-as-JSON is simpler on Railway.

---

## Step 3 — Play Integrity / reCAPTCHA

Since Android API 33+, Firebase Phone Auth requires **Play Integrity** to be
configured on the Firebase project. This is automatic if you've enabled phone
auth and have SHA fingerprints. If not:

- Firebase Console → Project Settings → **App Check** → Enable Play Integrity
  for your Android app
- For local dev/testing where Play Integrity isn't available, Firebase falls
  back to **reCAPTCHA** (web view appears briefly during OTP send). This is
  expected on emulator and on a freshly-signed APK that Play hasn't seen yet.

If you get error `app-not-authorized` → SHA mismatch.
If you get `missing-client-identifier` → `google-services.json` is stale or
the Phone provider isn't enabled.

---

## Step 4 — Test plan

1. Run on a **physical device** (emulator phone auth is finicky).
2. Use a **real Indian phone number** (not a test number unless registered in
   Firebase Console → Authentication → Phone numbers for testing).
3. Watch logcat: `adb logcat | grep -i firebase`
4. Try the test number flow first:
   - Firebase Console → Authentication → Sign-in method → Phone →
     "Phone numbers for testing" → add `+91 9999900000` with code `123456`
   - That number will *always* accept `123456` without sending real SMS.
     If this works but real numbers don't, the SHA/Play Integrity wiring
     is the issue.

---

## Summary of likely causes (ranked)

| # | Cause                                                  | Fix                                          |
|---|--------------------------------------------------------|----------------------------------------------|
| 1 | Release/debug SHA-1 missing in Firebase Console        | Add both fingerprints, re-download `google-services.json` |
| 2 | Backend `/auth/verify-firebase-phone` 500'ing          | Fix backend (not in this repo — `workers-portal-backend/` is empty here) |
| 3 | Phone provider not enabled in Firebase Console         | Authentication → Sign-in method → Phone → Enable |
| 4 | App Check / Play Integrity not configured              | Firebase Console → App Check                 |
| 5 | `FIREBASE_SERVICE_ACCOUNT_JSON` missing on Railway     | Set on backend service env vars              |

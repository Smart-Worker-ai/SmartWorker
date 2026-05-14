#!/usr/bin/env bash
#
# release.sh — Build the Customer App and distribute to Firebase App Distribution
#
# PREREQUISITES (one-time):
#   1. Install Flutter SDK:    https://docs.flutter.dev/get-started/install
#   2. Install Firebase CLI:   curl -sL https://firebase.tools | bash
#   3. Authenticate Firebase:  firebase login
#   4. Create release keystore (one-time):
#        keytool -genkey -v \
#          -keystore ~/upload-keystore.jks \
#          -alias smartworkers \
#          -keyalg RSA -keysize 2048 -validity 10000
#   5. Copy android/key.properties.example -> android/key.properties,
#      fill in storeFile path + passwords.
#   6. Register the keystore's SHA-1 AND SHA-256 in Firebase Console
#      (see FIREBASE_OTP_FIX.md for details).
#   7. Re-download google-services.json from Firebase Console after
#      adding fingerprints and replace android/app/google-services.json.
#
# Then run:   ./release.sh
#
# Optional env vars:
#   FIREBASE_APP_ID    — Android app ID from Firebase Console (e.g. 1:632...:android:0d70...).
#                        Default: read from google-services.json.
#   TESTERS            — comma-separated tester emails. Default: davidbec968@gmail.com
#   RELEASE_NOTES      — release notes for testers. Default: "v1.3.0 build 3"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Sanity checks ─────────────────────────────────────────────────────────────
command -v flutter  >/dev/null 2>&1 || { echo "❌ flutter not installed";  exit 1; }
command -v firebase >/dev/null 2>&1 || { echo "❌ firebase CLI not installed"; exit 1; }
command -v jq       >/dev/null 2>&1 || { echo "❌ jq not installed (sudo apt install jq)"; exit 1; }

if [[ ! -f android/key.properties ]]; then
  echo "⚠️  android/key.properties not found — release APK will be signed with DEBUG keystore."
  echo "    Firebase Phone Auth will only work for testers whose SHA-1 matches the debug keystore."
  echo "    See android/key.properties.example for setup."
  read -r -p "    Continue anyway? [y/N] " yn
  [[ "$yn" =~ ^[Yy]$ ]] || exit 1
fi

# ── Resolve Firebase App ID ───────────────────────────────────────────────────
APP_ID="${FIREBASE_APP_ID:-$(jq -r '.client[0].client_info.mobilesdk_app_id' android/app/google-services.json)}"
if [[ -z "$APP_ID" || "$APP_ID" == "null" ]]; then
  echo "❌ Could not determine Firebase App ID. Set FIREBASE_APP_ID env var."
  exit 1
fi

TESTERS="${TESTERS:-davidbec968@gmail.com}"
RELEASE_NOTES="${RELEASE_NOTES:-v1.3.0 build 3 — dark/light themes, smoother UI, deduped widgets, OTP error handling improved}"

echo "── Smart Workers — Customer App Release ──────────────────────────"
echo "  App ID:   $APP_ID"
echo "  Testers:  $TESTERS"
echo "  Notes:    $RELEASE_NOTES"
echo "──────────────────────────────────────────────────────────────────"

# ── Build ─────────────────────────────────────────────────────────────────────
echo "→ flutter clean"
flutter clean

echo "→ flutter pub get"
flutter pub get

echo "→ flutter analyze (non-fatal)"
flutter analyze || true

echo "→ flutter build apk --release"
flutter build apk --release

APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
[[ -f "$APK_PATH" ]] || { echo "❌ APK not found at $APK_PATH"; exit 1; }

APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo "✓ Built $APK_PATH ($APK_SIZE)"

# ── Distribute ────────────────────────────────────────────────────────────────
echo "→ firebase appdistribution:distribute"
firebase appdistribution:distribute "$APK_PATH" \
  --app "$APP_ID" \
  --testers "$TESTERS" \
  --release-notes "$RELEASE_NOTES"

echo "✓ Release uploaded. Testers will receive an email invite."

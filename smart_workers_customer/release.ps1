#Requires -Version 7.0
<#
.SYNOPSIS
    Build a signed release APK of the Customer App and upload it to Firebase
    App Distribution for tester davidbec968@gmail.com.

.DESCRIPTION
    Windows PowerShell counterpart of release.sh. Handles the parts that have
    historically broken on this project:
      * Generates a release keystore if one is missing.
      * Writes android/key.properties from prompted values (gitignored).
      * Extracts the keystore's SHA-1 + SHA-256 fingerprints.
      * OPTIONAL: registers them in Firebase Console via `firebase apps:android:sha:create`
        so the Phone OTP flow actually works on the resulting APK.
      * Runs `flutter pub get && flutter build apk --release`.
      * Uploads to Firebase App Distribution.

.PARAMETER NoRegister
    Skip the SHA registration step even if fingerprints are missing.

.PARAMETER Tester
    Email of the App Distribution tester. Defaults to davidbec968@gmail.com.

.PARAMETER ReleaseNotes
    Custom release notes string. Default reads from pubspec.yaml version.

.EXAMPLE
    .\release.ps1
    .\release.ps1 -NoRegister
    .\release.ps1 -Tester "alice@example.com" -ReleaseNotes "Hotfix login"
#>

[CmdletBinding()]
param(
    [switch]$NoRegister,
    [string]$Tester       = "davidbec968@gmail.com",
    [string]$ReleaseNotes
)

$ErrorActionPreference = "Stop"

# ── Helpers ──────────────────────────────────────────────────────────────────

function Write-Step($msg)  { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Info($msg)  { Write-Host "    $msg" -ForegroundColor Gray }
function Write-Ok($msg)    { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Fail($msg)  {
    Write-Host "  ✗ $msg" -ForegroundColor Red
    exit 1
}

function Test-Cmd($name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

# ── Locate this script's directory (project root for the app) ───────────────
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir
Write-Info "Working dir: $ScriptDir"

# ── 1. Prerequisite checks ──────────────────────────────────────────────────
Write-Step "Toolchain check"

if (-not (Test-Cmd "flutter"))  { Write-Fail "Flutter not on PATH. Install from https://docs.flutter.dev/get-started/install/windows" }
if (-not (Test-Cmd "firebase")) { Write-Fail "firebase CLI not on PATH. Run: npm install -g firebase-tools" }
if (-not (Test-Cmd "keytool"))  { Write-Fail "keytool not on PATH. Install JDK 17 (winget install Microsoft.OpenJDK.17), open new shell." }
if (-not (Test-Cmd "jq"))       { Write-Warn "jq not on PATH — falling back to a brittle regex for google-services.json parsing." }

Write-Ok "flutter:  $((flutter --version | Select-Object -First 1))"
Write-Ok "firebase: $((firebase --version))"
Write-Ok "keytool:  present"

# ── 2. google-services.json sanity ──────────────────────────────────────────
Write-Step "Firebase configuration"

$GsjPath = Join-Path $ScriptDir "android\app\google-services.json"
if (-not (Test-Path $GsjPath)) {
    Write-Fail "android\app\google-services.json missing. Download from Firebase Console -> Project Settings."
}

$AppId = $null
if (Test-Cmd "jq") {
    $AppId = (Get-Content $GsjPath -Raw | jq -r '.client[0].client_info.mobilesdk_app_id')
} else {
    $match = Select-String -Path $GsjPath -Pattern '"mobilesdk_app_id"\s*:\s*"([^"]+)"' -AllMatches | Select-Object -First 1
    if ($match) { $AppId = $match.Matches[0].Groups[1].Value }
}
if (-not $AppId -or $AppId -eq "null") { Write-Fail "Could not extract Firebase Android App ID from google-services.json." }
Write-Ok  "Firebase Android App ID: $AppId"

# ── 3. Keystore + key.properties ────────────────────────────────────────────
Write-Step "Release keystore"

$KeyPropsPath = Join-Path $ScriptDir "android\key.properties"
$KeystoreDir  = Join-Path $env:USERPROFILE ".smart_workers_keys"
$KeystorePath = Join-Path $KeystoreDir "upload-keystore.jks"

if (-not (Test-Path $KeyPropsPath)) {
    Write-Warn "android\key.properties not found."
    $ans = Read-Host "Generate a new release keystore now? (Y/n)"
    if ($ans -match '^[Nn]') { Write-Fail "Cannot proceed without a release keystore." }

    if (-not (Test-Path $KeystoreDir)) { New-Item -ItemType Directory -Force -Path $KeystoreDir | Out-Null }

    if (-not (Test-Path $KeystorePath)) {
        Write-Info "Generating $KeystorePath ..."
        $alias = "smartworkers"
        $storePass = Read-Host "Keystore password (8+ chars)"        -AsSecureString
        $keyPass   = Read-Host "Key password (8+ chars, same is fine)" -AsSecureString
        $cn        = Read-Host "Your name (CN)"
        $org       = Read-Host "Organisation name (O)"
        $country   = Read-Host "Country code (e.g. IN)"

        $storePassPlain = [System.Net.NetworkCredential]::new("", $storePass).Password
        $keyPassPlain   = [System.Net.NetworkCredential]::new("", $keyPass).Password

        & keytool -genkey -v `
            -keystore $KeystorePath `
            -alias $alias `
            -keyalg RSA -keysize 2048 -validity 10000 `
            -storepass $storePassPlain `
            -keypass   $keyPassPlain `
            -dname "CN=$cn, O=$org, C=$country" 2>&1 | Out-Null

        if (-not (Test-Path $KeystorePath)) { Write-Fail "keytool did not produce a keystore." }
        Write-Ok "Keystore created at $KeystorePath"
    }

    # Write key.properties (paths use forward slashes — Gradle parses safely)
    $storeFile = ($KeystorePath -replace '\\','/')
    if (-not $storePassPlain) { $storePassPlain = Read-Host "Keystore password" }
    if (-not $keyPassPlain)   { $keyPassPlain   = Read-Host "Key password"      }

    @"
storeFile=$storeFile
storePassword=$storePassPlain
keyAlias=smartworkers
keyPassword=$keyPassPlain
"@ | Set-Content -Path $KeyPropsPath -Encoding UTF8

    Write-Ok "android\key.properties written."
} else {
    Write-Ok "Using existing android\key.properties"
    # Pull storeFile out so we can extract its SHAs below
    $props = Get-Content $KeyPropsPath | ForEach-Object {
        if ($_ -match '^\s*([^=#][^=]*)=(.*)$') { @{ k = $matches[1].Trim(); v = $matches[2].Trim() } }
    }
    $storeFileLine = $props | Where-Object { $_.k -eq "storeFile" } | Select-Object -First 1
    if ($storeFileLine) { $KeystorePath = $storeFileLine.v }
    $storePassLine = $props | Where-Object { $_.k -eq "storePassword" } | Select-Object -First 1
    $aliasLine     = $props | Where-Object { $_.k -eq "keyAlias"      } | Select-Object -First 1
    if ($storePassLine) { $storePassPlain = $storePassLine.v }
    $alias = if ($aliasLine) { $aliasLine.v } else { "smartworkers" }
}

# ── 4. Extract SHA fingerprints ─────────────────────────────────────────────
Write-Step "Keystore fingerprints"

if (-not (Test-Path $KeystorePath)) { Write-Fail "Keystore not at $KeystorePath (re-check key.properties)." }
if (-not $storePassPlain) { $storePassPlain = Read-Host "Keystore password for SHA extraction" }

$keytoolOut = & keytool -list -v -keystore $KeystorePath -storepass $storePassPlain -alias $alias 2>&1
$sha1   = ($keytoolOut | Select-String -Pattern 'SHA1:\s+([0-9A-F:]+)'   | Select-Object -First 1).Matches.Groups[1].Value
$sha256 = ($keytoolOut | Select-String -Pattern 'SHA-?256:\s+([0-9A-F:]+)' | Select-Object -First 1).Matches.Groups[1].Value

if (-not $sha1)   { Write-Fail "Could not extract SHA-1 from keystore. Check alias + password." }
if (-not $sha256) { Write-Warn "Could not extract SHA-256 — only SHA-1 will be registered." }

Write-Ok "SHA-1:   $sha1"
if ($sha256) { Write-Ok "SHA-256: $sha256" }

# ── 5. Optional Firebase SHA registration ───────────────────────────────────
if (-not $NoRegister) {
    Write-Step "Firebase SHA registration"

    # Make sure user is logged in. `firebase login:list` lists nothing on cold install.
    $loggedIn = $false
    try {
        $list = & firebase login:list 2>&1
        if ($LASTEXITCODE -eq 0 -and $list -notmatch 'No.*logged in') { $loggedIn = $true }
    } catch { $loggedIn = $false }

    if (-not $loggedIn) {
        Write-Warn "Not logged in to Firebase CLI. Running 'firebase login' (browser opens)..."
        & firebase login
        if ($LASTEXITCODE -ne 0) { Write-Warn "Login skipped/failed. Skipping registration." ; $NoRegister = $true }
    }

    if (-not $NoRegister) {
        # `firebase apps:android:sha:list <APP_ID>` is the source of truth.
        $existing = & firebase apps:android:sha:list $AppId 2>&1
        $sha1Present   = $existing -match [Regex]::Escape($sha1)
        $sha256Present = if ($sha256) { $existing -match [Regex]::Escape($sha256) } else { $true }

        if ($sha1Present) {
            Write-Ok "SHA-1 already registered."
        } else {
            Write-Info "Registering SHA-1..."
            & firebase apps:android:sha:create $AppId $sha1
            if ($LASTEXITCODE -eq 0) { Write-Ok "SHA-1 registered." } else { Write-Warn "SHA-1 registration failed (continuing)." }
        }
        if ($sha256 -and -not $sha256Present) {
            Write-Info "Registering SHA-256..."
            & firebase apps:android:sha:create $AppId $sha256
            if ($LASTEXITCODE -eq 0) { Write-Ok "SHA-256 registered." } else { Write-Warn "SHA-256 registration failed (continuing)." }
        }

        Write-Warn "After registration, re-download google-services.json from Firebase Console"
        Write-Warn "and replace android\app\google-services.json. CI builds use the file in the repo."
    }
} else {
    Write-Info "Skipping SHA registration (-NoRegister)."
}

# ── 6. Build APK ────────────────────────────────────────────────────────────
Write-Step "Build release APK"

& flutter pub get
if ($LASTEXITCODE -ne 0) { Write-Fail "flutter pub get failed." }

& flutter build apk --release
if ($LASTEXITCODE -ne 0) { Write-Fail "flutter build apk --release failed." }

$ApkPath = Join-Path $ScriptDir "build\app\outputs\flutter-apk\app-release.apk"
if (-not (Test-Path $ApkPath)) { Write-Fail "APK not found at $ApkPath" }
Write-Ok "APK built: $ApkPath ($([math]::Round((Get-Item $ApkPath).Length / 1MB, 2)) MB)"

# ── 7. Release notes ────────────────────────────────────────────────────────
if (-not $ReleaseNotes) {
    $verLine = (Get-Content (Join-Path $ScriptDir "pubspec.yaml") | Where-Object { $_ -match '^version:' } | Select-Object -First 1)
    if ($verLine -match 'version:\s*(.+)$') {
        $ReleaseNotes = "Smart Workers Customer App — release " + $matches[1].Trim()
    } else {
        $ReleaseNotes = "Smart Workers Customer App — release"
    }
}

# ── 8. Distribute via Firebase App Distribution ─────────────────────────────
Write-Step "Firebase App Distribution upload"

& firebase appdistribution:distribute $ApkPath `
    --app           $AppId `
    --testers       $Tester `
    --release-notes $ReleaseNotes

if ($LASTEXITCODE -ne 0) { Write-Fail "firebase appdistribution:distribute failed." }

Write-Step "Done"
Write-Ok "APK distributed to tester $Tester."
Write-Info "Notes: $ReleaseNotes"

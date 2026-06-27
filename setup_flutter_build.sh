#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup_flutter_build.sh — Full automated Flutter + Android SDK setup + APK build
# Run from: /home/gipl-dsk/assignments/MAJOR/SMW/SmartWorker/
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"          # .../MAJOR/SMW
FLUTTER_SDK="$BASE_DIR/flutter-sdk"
ANDROID_HOME="$BASE_DIR/android-sdk"
APP_DIR="$SCRIPT_DIR/smart_workers_customer"
JAVA_HOME_PATH="/usr/lib/jvm/java-21-openjdk-amd64"

export ANDROID_HOME
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export JAVA_HOME="$JAVA_HOME_PATH"
export PATH="$FLUTTER_SDK/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Crewzo Customer — Flutter Build Setup"
echo "════════════════════════════════════════════════════════"
echo "  Flutter SDK : $FLUTTER_SDK"
echo "  Android SDK : $ANDROID_HOME"
echo "  App Dir     : $APP_DIR"
echo "════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Check Flutter SDK ─────────────────────────────────────────────────
if [[ ! -f "$FLUTTER_SDK/bin/flutter" ]]; then
  echo "→ Cloning Flutter stable SDK (shallow)..."
  git clone -b stable --depth 1 https://github.com/flutter/flutter.git "$FLUTTER_SDK"
else
  echo "✓ Flutter SDK already present"
fi

# ── Step 2: Check Android cmdline-tools ──────────────────────────────────────
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [[ ! -f "$SDKMANAGER" ]]; then
  echo "→ Downloading Android cmdline-tools..."
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  TMPZIP="$BASE_DIR/cmdtools.zip"
  curl -sL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -o "$TMPZIP"
  unzip -q "$TMPZIP" -d "$ANDROID_HOME/cmdline-tools"
  mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  rm -f "$TMPZIP"
  echo "✓ Android cmdline-tools installed"
else
  echo "✓ Android cmdline-tools already present"
fi

# ── Step 3: Accept SDK licenses (write hash files directly) ──────────────────
echo "→ Accepting Android SDK licenses..."
mkdir -p "$ANDROID_HOME/licenses"
printf "8933bad161af4178b1185d1a37fbf41ea5269c55\nd56f5187479451eabf01fb78af6dfcb131a6481e\n24333f8a63b6825ea9c5514f83c2829b004d1fee\n" \
  > "$ANDROID_HOME/licenses/android-sdk-license"
printf "84831b9409646a918e30573bab4c9c91346d8abd\n" \
  > "$ANDROID_HOME/licenses/android-sdk-preview-license"
printf "33b6a2b64607f11b759f320ef9dff4ae5c47d97a\n" \
  > "$ANDROID_HOME/licenses/google-gdk-license"
echo "✓ Licenses accepted"

# ── Step 4: Install Android SDK components ───────────────────────────────────
echo "→ Installing Android SDK components (platform-tools, android-35, build-tools 35.0.0)..."
"$SDKMANAGER" --sdk_root="$ANDROID_HOME" \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0" 2>&1 | grep -v "^$" | grep -v "Downloading" | tail -5 || true
echo "✓ Android SDK components installed"

# ── Step 5: Flutter doctor (non-fatal) ───────────────────────────────────────
echo ""
echo "→ flutter doctor (summary)..."
"$FLUTTER_SDK/bin/flutter" doctor --android-licenses 2>/dev/null || true
"$FLUTTER_SDK/bin/flutter" doctor -v 2>&1 | grep -E "^\[|Flutter|Android|✓|✗|!" | head -20
echo ""

# ── Step 6: Build debug APK ───────────────────────────────────────────────────
echo "→ Building debug APK (no keystore needed)..."
cd "$APP_DIR"

"$FLUTTER_SDK/bin/flutter" clean
"$FLUTTER_SDK/bin/flutter" pub get
"$FLUTTER_SDK/bin/flutter" build apk --debug 2>&1

APK_PATH="$APP_DIR/build/app/outputs/flutter-apk/app-debug.apk"
if [[ -f "$APK_PATH" ]]; then
  APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "  ✅ SUCCESS — Debug APK built!"
  echo "  📦 Path: $APK_PATH"
  echo "  📏 Size: $APK_SIZE"
  echo "════════════════════════════════════════════════════════"
  echo ""
  echo "  Install on device:  adb install $APK_PATH"
  echo "  Or copy and sideload manually."
  echo ""
else
  echo "❌ APK not found — build may have failed. Check output above."
  exit 1
fi

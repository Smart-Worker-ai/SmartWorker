#!/usr/bin/env bash
# HAYAKU – Firebase App Distribution deployment script
# Run after: firebase login

set -e

APK="e:/AJPRO/smart_workers_customer/build/app/outputs/flutter-apk/app-release.apk"
APP_ID="$1"          # Pass Firebase Android App ID as first arg
TESTERS="$2"         # Pass tester emails (comma-separated) as second arg
RELEASE_NOTES="HAYAKU Customer App v1.0 – Kerala edition. Features: Dashboard, Location search with searchable picker, Worker booking, Payment summary, Feedback."

if [ -z "$APP_ID" ]; then
  echo "Usage: bash deploy.sh <FIREBASE_APP_ID> <tester@email.com>"
  echo "Get App ID from: Firebase Console > Project > Android app > App ID"
  exit 1
fi

echo "==> Distributing APK to Firebase App Distribution..."
firebase appdistribution:distribute "$APK" \
  --app "$APP_ID" \
  --testers "$TESTERS" \
  --release-notes "$RELEASE_NOTES"

echo ""
echo "✓ Deployment complete!"
echo "Testers will receive an email with the download link."

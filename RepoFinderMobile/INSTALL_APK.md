# Install APK Directly on Phone

## Quick Steps

1. **Find the APK:**
   - Location: `RepoFinderMobile\build\app\outputs\flutter-apk\app-debug.apk`
   - Or: `C:\Users\manda\github\RepoFinderMobile\build\app\outputs\flutter-apk\app-debug.apk`

2. **Transfer to Phone:**
   - **Option A:** USB Transfer
     - Connect phone via USB
     - Copy APK to phone's Download folder
   - **Option B:** Email/Cloud
     - Email the APK to yourself
     - Or upload to Google Drive/Dropbox
     - Download on phone

3. **Install on Phone:**
   - Open File Manager on phone
   - Navigate to Downloads (or where you saved it)
   - Tap on `app-debug.apk`
   - Tap "Install"
   - If asked, allow "Install from Unknown Sources"

## MIUI (Xiaomi) Specific Steps

If you have a Xiaomi phone (Redmi Note 9 Pro Max):

1. **Enable Installation:**
   - Settings → Additional Settings → Developer Options
   - Enable "Install via USB"
   - Also enable: "USB debugging (Security settings)"

2. **Allow Unknown Sources:**
   - Settings → Apps → Manage Apps → Special app access
   - Install unknown apps
   - Enable for your file manager

3. **During Installation:**
   - Keep phone unlocked
   - Keep screen ON
   - Watch for permission popups

## If Still Failing

Try installing via ADB manually:

```bash
cd C:\Users\manda\github\RepoFinderMobile
adb install build\app\outputs\flutter-apk\app-debug.apk
```

This will show more detailed error messages.

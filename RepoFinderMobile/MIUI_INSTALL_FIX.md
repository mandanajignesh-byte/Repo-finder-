# Fix Installation on MIUI (Xiaomi/Redmi)

## Method 1: Enable via Security App

1. **Open "Security" app** on your phone
2. Go to **"Permissions"** or **"Privacy"**
3. Find **"Install apps"** or **"Install via USB"**
4. Enable it

## Method 2: Developer Options

1. **Settings** → **Additional Settings**
2. **Developer Options**
3. Enable these:
   - ✅ **USB Debugging**
   - ✅ **Install via USB**
   - ✅ **USB Debugging (Security settings)**

## Method 3: Install APK Directly (Easiest!)

Since USB install is blocked, install the APK file directly:

### Step 1: Transfer APK to Phone

**Option A: USB Transfer**
- Connect phone via USB
- Copy this file to phone:
  ```
  C:\Users\manda\github\RepoFinderMobile\build\app\outputs\flutter-apk\app-debug.apk
  ```
- Paste in phone's **Downloads** folder

**Option B: Email/Cloud**
- Email the APK to yourself
- Or upload to Google Drive
- Download on phone

### Step 2: Install on Phone

1. Open **File Manager** on phone
2. Go to **Downloads** folder
3. Find **app-debug.apk**
4. Tap on it
5. Tap **"Install"**
6. If asked, tap **"Settings"** → Enable **"Install from this source"**

## Method 4: MIUI Security Settings

1. **Settings** → **Apps** → **Manage Apps**
2. Search for **"Security"** app
3. Tap **"Permissions"**
4. Enable **"Install apps"**

## Method 5: Use ADB with Force Install

Try installing with ADB using force flag:

```powershell
cd C:\Users\manda\github\RepoFinderMobile
adb install -r -d build\app\outputs\flutter-apk\app-debug.apk
```

The `-r` flag replaces existing app, `-d` allows downgrade.

## Quick Fix: MIUI Security Center

1. Open **"Security"** app
2. Tap **"Permissions"** or **"Privacy"**
3. Find **"Install apps"** or **"Unknown sources"**
4. Enable for **"ADB"** or **"USB"**

## Still Not Working?

Try this MIUI-specific command:

```powershell
adb shell settings put global install_non_market_apps 1
adb install build\app\outputs\flutter-apk\app-debug.apk
```

This enables installation globally on MIUI.

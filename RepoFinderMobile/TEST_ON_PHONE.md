# Testing Flutter App on Your Phone

## Quick Start Options

### Option 1: USB Connection (Recommended)

#### For Android:

1. **Enable Developer Options:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect Phone:**
   - Connect phone to computer via USB
   - On phone: Allow USB debugging when prompted

3. **Run App:**
   ```bash
   cd C:\Users\manda\github\RepoFinderMobile
   C:\src\flutter\flutter\bin\flutter.bat run
   ```
   - Flutter will detect your phone automatically
   - Select your device when prompted

#### For iOS (iPhone):

1. **Requirements:**
   - Mac computer (required for iOS)
   - Xcode installed
   - Apple Developer account (free)

2. **Connect iPhone:**
   - Connect via USB
   - Trust computer on iPhone
   - In Xcode: Window → Devices → Select your iPhone

3. **Run App:**
   ```bash
   flutter run
   ```

---

### Option 2: Wireless Debugging (Android)

1. **Enable Wireless Debugging:**
   - Settings → Developer Options
   - Enable "Wireless debugging"
   - Note the IP address and port shown

2. **Connect via ADB:**
   ```bash
   adb connect YOUR_PHONE_IP:PORT
   ```

3. **Run App:**
   ```bash
   flutter run
   ```

---

### Option 3: Build APK (Android - No Computer Needed)

1. **Build Release APK:**
   ```bash
   cd C:\Users\manda\github\RepoFinderMobile
   C:\src\flutter\flutter\bin\flutter.bat build apk --release
   ```

2. **Find APK:**
   - Location: `RepoFinderMobile\build\app\outputs\flutter-apk\app-release.apk`

3. **Install on Phone:**
   - Transfer APK to phone (email, USB, cloud)
   - On phone: Settings → Security → Enable "Install from Unknown Sources"
   - Open APK file and install

---

### Option 4: Build App Bundle (For Play Store)

```bash
flutter build appbundle --release
```

---

## Troubleshooting

### Phone Not Detected?

1. **Check USB Connection:**
   ```bash
   adb devices
   ```
   - Should show your device

2. **Restart ADB:**
   ```bash
   adb kill-server
   adb start-server
   ```

3. **Check Flutter:**
   ```bash
   flutter doctor
   ```

### Build Errors?

- Make sure you have:
  - Android SDK installed (for Android)
  - Xcode installed (for iOS)
  - All dependencies: `flutter pub get`

---

## Quick Commands

```bash
# Check connected devices
flutter devices

# Run on specific device
flutter run -d <device-id>

# Build APK
flutter build apk --release

# Check Flutter setup
flutter doctor
```

---

## Recommended: USB Connection

**Easiest method:**
1. Enable USB debugging on phone
2. Connect via USB
3. Run `flutter run`
4. App installs and launches automatically!

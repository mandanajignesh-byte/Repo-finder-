# Live Logs & Real-Time Updates Guide

## Method 1: Flutter Logs (Recommended)

### View Live Logs While App is Running

```powershell
# In a separate terminal window
cd C:\Users\manda\github\RepoFinderMobile
C:\src\flutter\flutter\bin\flutter.bat logs
```

This shows:
- ✅ All `print()` and `debugPrint()` statements
- ✅ Error messages
- ✅ Stack traces
- ✅ Real-time updates as you interact with the app

### Run App + Logs Together

**Terminal 1 - Run App:**
```powershell
cd C:\Users\manda\github\RepoFinderMobile
C:\src\flutter\flutter\bin\flutter.bat run
```

**Terminal 2 - View Logs:**
```powershell
cd C:\Users\manda\github\RepoFinderMobile
C:\src\flutter\flutter\bin\flutter.bat logs
```

---

## Method 2: ADB Logcat (Android)

### View All Android Logs

```powershell
adb logcat
```

### Filter Flutter Logs Only

```powershell
adb logcat | findstr "flutter"
```

### Filter by Tag

```powershell
# Flutter framework logs
adb logcat -s flutter

# Your app logs
adb logcat -s flutter:V *:S
```

### Clear and View Fresh Logs

```powershell
adb logcat -c
adb logcat | findstr "flutter"
```

---

## Method 3: Hot Reload (Real-Time Code Changes)

### While App is Running

1. **Start app:**
   ```powershell
   C:\src\flutter\flutter\bin\flutter.bat run
   ```

2. **Make code changes** (edit any `.dart` file)

3. **Hot reload:**
   - Press `r` in terminal (quick reload)
   - Or press `R` (hot restart - full restart)
   - Or save file (if using VS Code with Flutter extension)

4. **See changes instantly on phone!** 🔥

### What Updates Instantly

✅ UI changes (colors, text, layouts)
✅ Widget properties
✅ State changes
✅ Most code modifications

### What Requires Full Restart

❌ Adding new dependencies
❌ Changing `main()` function
❌ Modifying `initState()`
❌ Native code changes

---

## Method 4: Flutter DevTools (Advanced)

### Open DevTools

```powershell
# While app is running, in another terminal:
C:\src\flutter\flutter\bin\flutter.bat pub global activate devtools
C:\src\flutter\flutter\bin\flutter.bat pub global run devtools
```

Then open the URL shown in browser for:
- Performance profiling
- Widget inspector
- Network monitoring
- Memory usage

---

## Method 5: VS Code Integration

### Setup

1. Install "Flutter" extension in VS Code
2. Press `F5` to start debugging
3. Open "Debug Console" (View → Debug Console)
4. See logs in real-time!

### Hot Reload in VS Code

- **Auto-reload:** Changes auto-reload when you save
- **Manual:** Press `Ctrl+F5` or click 🔥 icon
- **Hot Restart:** Press `Ctrl+Shift+F5`

---

## Quick Commands Reference

```powershell
# View logs
flutter logs

# Run app with verbose logging
flutter run -v

# Run app and show logs
flutter run --verbose

# Clear logs and start fresh
adb logcat -c && flutter logs

# Filter specific logs
adb logcat | findstr "error"
adb logcat | findstr "Supabase"
```

---

## Adding Debug Prints

Add these to your code to see what's happening:

```dart
// In any file
debugPrint('User ID: $userId');
debugPrint('Loading repos...');
debugPrint('Error: $e');
```

These will show in `flutter logs`!

---

## Troubleshooting

### No Logs Showing?

1. Make sure app is running
2. Check device is connected: `adb devices`
3. Try: `flutter logs --verbose`

### Logs Too Verbose?

Filter specific tags:
```powershell
adb logcat -s flutter:V *:S
```

### Want Clean Logs?

Clear first:
```powershell
adb logcat -c
flutter logs
```

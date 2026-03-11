# Flutter Hot Reload - Real-Time Updates

## What is Hot Reload?

Hot reload allows you to see code changes **instantly** on your phone without rebuilding the entire app. Changes appear in seconds!

## How to Use

### 1. Start the App in Debug Mode

```powershell
cd C:\Users\manda\github\RepoFinderMobile
C:\src\flutter\flutter\bin\flutter.bat run
```

### 2. Once App is Running

The terminal will show:
```
Flutter run key commands.
r Hot reload. 🔥🔥🔥
R Hot restart.
h List all available interactive commands.
```

### 3. Make Code Changes

- Edit any Dart file (`.dart`)
- Save the file

### 4. Hot Reload

Press `r` in the terminal to hot reload!

**Or** use the IDE:
- **VS Code**: Press `Ctrl+F5` or click the 🔥 icon
- **Android Studio**: Click the 🔥 button in toolbar

## What Gets Updated Instantly

✅ UI changes (colors, text, layouts)
✅ Widget properties
✅ State changes
✅ Most code modifications

## What Requires Hot Restart (R)

❌ Adding new dependencies
❌ Changing `main()` function
❌ Modifying `initState()`
❌ Native code changes

## Tips

1. **Keep terminal open** - Hot reload commands work there
2. **Save files** - Changes only apply after saving
3. **Use Hot Restart (R)** - If hot reload doesn't work
4. **Full rebuild** - Only needed for major changes

## VS Code Integration

If using VS Code:
1. Install "Flutter" extension
2. Press `F5` to start debugging
3. Make changes → Auto hot reloads!
4. Or press `Ctrl+F5` manually

## Example Workflow

```powershell
# 1. Start app
C:\src\flutter\flutter\bin\flutter.bat run

# 2. App launches on phone

# 3. Edit lib/screens/discovery_screen.dart
#    Change a color or text

# 4. Save file

# 5. Press 'r' in terminal
#    → Changes appear instantly! 🎉
```

## Troubleshooting

If hot reload doesn't work:
- Press `R` (capital) for hot restart
- Or stop and run again: `Ctrl+C` then `flutter run`

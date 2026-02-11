# How to Access Mobile Browser Logs for Debugging

## Android Chrome

### Method 1: Chrome DevTools (Recommended)
1. Connect your Android phone to your computer via USB
2. Enable USB Debugging on your phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings → Developer Options
   - Enable "USB Debugging"
3. On your computer, open Chrome
4. Go to `chrome://inspect` in the address bar
5. You should see your device listed
6. Click "Inspect" next to your app's tab
7. The DevTools will open - check the Console tab for errors

### Method 2: Remote Debugging via WiFi
1. On your phone, open Chrome
2. Go to `chrome://inspect`
3. Enable "Discover USB devices"
4. On your computer, open Chrome
5. Go to `chrome://inspect`
6. Your phone should appear - click "Inspect"

### Method 3: Chrome for Android (Beta/Dev)
1. Install Chrome Beta or Chrome Dev on your phone
2. Open your app in Chrome Beta/Dev
3. Go to `chrome://inspect` on your computer
4. Click "Inspect" to see logs

## iOS Safari

### Method 1: Safari Web Inspector (Mac Required)
1. On your iPhone/iPad:
   - Go to Settings → Safari → Advanced
   - Enable "Web Inspector"
2. On your Mac:
   - Open Safari
   - Go to Safari → Preferences → Advanced
   - Check "Show Develop menu in menu bar"
3. On your iPhone/iPad, open your app in Safari
4. On your Mac:
   - Open Safari
   - Go to Develop → [Your iPhone Name] → [Your App Tab]
   - The Web Inspector will open - check Console for errors

### Method 2: iOS Simulator (Mac Only)
1. Open Xcode
2. Go to Xcode → Open Developer Tool → Simulator
3. Open Safari in the simulator
4. Navigate to your app
5. In Safari on Mac, go to Develop → Simulator → [Your App Tab]
6. Check Console for errors

## Quick Debugging Tips

### Check Console Logs
Look for these log messages:
- `[PWA]` - PWA-related logs
- `Error loading` - Loading errors
- `isLoadingMore` - Loading state issues

### Common Issues to Check
1. **Infinite Loading**: Check if `isLoadingMore` stays `true`
2. **PWA Prompt Issues**: Look for `[PWA]` logs
3. **Network Errors**: Check for failed API calls
4. **State Issues**: Look for React warnings or errors

### Share Logs
1. Copy console errors
2. Take screenshots of the DevTools console
3. Note the exact steps that caused the issue
4. Share the browser/device info

## Alternative: Add Debug Mode

If you can't access DevTools, we can add a debug mode that:
- Shows logs on screen
- Saves logs to localStorage
- Exports logs as a file

Let me know if you'd like me to add this feature!

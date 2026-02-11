# 🧪 Quick PWA Test - Do This Now

## Step 1: Open Your App
The dev server should be running. Open your browser and go to:
```
http://localhost:5173
```

## Step 2: Open DevTools
Press `F12` or right-click → "Inspect"

## Step 3: Check Service Worker (30 seconds)

1. **Go to Application tab** (in DevTools)
2. **Click "Service Workers"** (left sidebar)
3. **Look for:**
   - ✅ Service worker registered: `repoverse-v1`
   - ✅ Status: "activated and is running"
   - ✅ Console should show: `[PWA] Service Worker registered: http://localhost:5173/`

**If you see errors:**
- Check Console tab for error messages
- Make sure you're on `localhost` (not `127.0.0.1`)

## Step 4: Check Manifest (30 seconds)

1. **Still in Application tab**
2. **Click "Manifest"** (left sidebar)
3. **Verify:**
   - ✅ App name: "RepoVerse"
   - ✅ Theme color: `#0B0B0F`
   - ✅ Icons: Should show 2 icons (192x192 and 512x512)
   - ✅ No errors shown

## Step 5: Test Install Prompt (1 minute)

### Chrome/Edge Desktop:
1. **Look at address bar** - you might see an install icon (➕)
2. **Or:** Go to Application → Manifest → Click "Add to homescreen" button
3. **Click install**
4. **App should open in standalone window** (no browser UI)

### If Install Button Doesn't Show:
- PWA might already be installed
- Or browser doesn't support install (try Chrome/Edge)

## Step 6: Test Offline Mode (1 minute)

1. **Go to Network tab** (in DevTools)
2. **Check "Offline" checkbox** (top toolbar)
3. **Reload page** (F5 or Ctrl+R)
4. **Expected:**
   - ✅ Page still loads (from cache)
   - ✅ App works (with cached data)
   - ✅ API calls show offline error gracefully

## Step 7: Check Console Logs (30 seconds)

1. **Go to Console tab**
2. **Look for:**
   - ✅ `[PWA] Service Worker registered: ...`
   - ✅ `[Service Worker] Installing...`
   - ✅ `[Service Worker] Activating...`
   - ✅ `[PWA] Running in browser` (or `Running as installed PWA`)

## ✅ Success Indicators

You'll know it's working if you see:
- ✅ Service worker registered in Application tab
- ✅ Manifest loads without errors
- ✅ Console shows PWA initialization messages
- ✅ Offline mode works (page loads from cache)
- ✅ Install prompt appears (or app installs)

## 🐛 Common Issues

### Service Worker Not Registering
**Fix:** Check Console for errors. Common issues:
- Service worker file not found → Check `/sw.js` is accessible
- HTTPS required → Use `localhost` (works without HTTPS)

### Manifest Errors
**Fix:** 
- Check `manifest.json` syntax (should be valid JSON)
- Verify icons exist at `/logo.png`

### Install Prompt Not Showing
**Fix:**
- Try Chrome or Edge (best PWA support)
- Check all PWA requirements are met
- Try manual install: Application → Manifest → "Add to homescreen"

## 📱 Test on Mobile (Optional)

1. **Find your computer's IP:**
   - Windows: `ipconfig` → Look for IPv4 Address
   - Mac/Linux: `ifconfig` → Look for inet address

2. **On your phone (same Wi-Fi):**
   - Open Chrome (Android) or Safari (iOS)
   - Go to: `http://YOUR_IP:5173`
   - Look for "Add to Home Screen" prompt

3. **Install and test:**
   - Tap "Add to Home Screen"
   - Open installed app
   - Should open fullscreen (no browser UI)

## 🎉 You're Done!

If all checks pass, your PWA is working! The app can now be installed on mobile devices and will work offline.

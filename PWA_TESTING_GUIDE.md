# PWA Testing Guide

## Quick Test Checklist

### 1. Service Worker Registration
- [ ] Open DevTools → Application → Service Workers
- [ ] Check if service worker is registered
- [ ] Status should show "activated and is running"

### 2. Manifest File
- [ ] Open DevTools → Application → Manifest
- [ ] Verify manifest loads correctly
- [ ] Check app name: "RepoVerse"
- [ ] Verify theme color: `#0B0B0F`
- [ ] Check icons are listed

### 3. Install Prompt
- [ ] Look for "Install" button in browser address bar
- [ ] Or check DevTools → Application → Manifest → "Add to homescreen"
- [ ] On mobile: Browser should show "Add to Home Screen" prompt

### 4. Offline Functionality
- [ ] Open DevTools → Network tab
- [ ] Check "Offline" checkbox
- [ ] Reload page
- [ ] App should still load (from cache)
- [ ] API calls should show offline error gracefully

### 5. App Info (After Installation)
- [ ] Install the PWA
- [ ] Check app size (should be small, ~1-2MB)
- [ ] Verify app appears in app drawer/list
- [ ] Check app info screen (storage, permissions)

## Testing Steps

### Desktop (Chrome/Edge)

1. **Start Dev Server:**
   ```bash
   npm run dev
   ```

2. **Open Browser:**
   - Navigate to `http://localhost:5173`
   - Open DevTools (F12)

3. **Check Service Worker:**
   - Go to Application → Service Workers
   - Should see "repoverse-v1" registered
   - Status: "activated and is running"

4. **Check Manifest:**
   - Go to Application → Manifest
   - Verify all fields are correct
   - Check for any errors

5. **Test Install:**
   - Look for install icon in address bar
   - Or use DevTools → Application → Manifest → "Add to homescreen"
   - Click install
   - App should open in standalone window

6. **Test Offline:**
   - Go to Network tab
   - Check "Offline" checkbox
   - Reload page
   - App should still work (cached assets)

### Mobile (Android Chrome)

1. **Connect Device:**
   - Ensure phone and computer on same Wi-Fi
   - Note the network URL from dev server (e.g., `http://192.168.1.100:5173`)

2. **Open on Phone:**
   - Open Chrome on Android
   - Navigate to the network URL

3. **Install PWA:**
   - Browser should show "Add to Home Screen" banner
   - Or tap menu (3 dots) → "Add to Home screen"
   - Tap "Add"
   - App icon appears on home screen

4. **Test Installed App:**
   - Tap app icon
   - Should open fullscreen (no browser UI)
   - Check app info: Settings → Apps → RepoVerse

### Mobile (iOS Safari)

1. **Open on iPhone:**
   - Open Safari
   - Navigate to the network URL

2. **Install PWA:**
   - Tap Share button (square with arrow)
   - Select "Add to Home Screen"
   - Tap "Add"
   - App icon appears on home screen

3. **Test Installed App:**
   - Tap app icon
   - Should open fullscreen
   - Check app info: Settings → General → iPhone Storage → RepoVerse

## Expected Results

### Service Worker
- ✅ Registers automatically on page load
- ✅ Caches static assets
- ✅ Handles offline requests
- ✅ Updates automatically when code changes

### Manifest
- ✅ Loads without errors
- ✅ Shows correct app name and colors
- ✅ Icons are accessible
- ✅ Theme color matches app (`#0B0B0F`)

### Installation
- ✅ Install prompt appears (on supported browsers)
- ✅ App installs successfully
- ✅ App opens in standalone mode
- ✅ No browser UI visible

### Offline Mode
- ✅ Static assets load from cache
- ✅ API calls show graceful error messages
- ✅ App remains functional (with cached data)

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure site is served over HTTPS (or localhost)
- Clear browser cache and reload
- Check if service worker file exists at `/sw.js`

### Manifest Not Loading
- Verify `manifest.json` is accessible at `/manifest.json`
- Check for JSON syntax errors
- Verify icons exist at specified paths

### Install Prompt Not Showing
- Ensure all PWA requirements are met:
  - HTTPS (or localhost)
  - Valid manifest.json
  - Service worker registered
  - Icons provided
- Try manually: DevTools → Application → Manifest → "Add to homescreen"

### Offline Not Working
- Check service worker is registered
- Verify assets are cached (DevTools → Application → Cache Storage)
- Check Network tab for failed requests
- Ensure service worker handles fetch events correctly

## Console Commands for Testing

Open browser console and run:

```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistration().then(reg => console.log(reg));

// Check if PWA is installed
window.matchMedia('(display-mode: standalone)').matches;

// Check cache contents
caches.keys().then(keys => console.log(keys));
caches.open('repoverse-v1').then(cache => cache.keys().then(keys => console.log(keys)));

// Unregister service worker (for testing)
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
```

## Production Testing

After deploying to production:

1. Visit production URL (e.g., `https://repoverse.space`)
2. Follow same testing steps
3. Verify HTTPS is working (required for PWA)
4. Test on real mobile devices
5. Check app store-like experience

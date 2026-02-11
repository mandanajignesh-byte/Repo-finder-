# PWA Setup Guide

RepoVerse is now configured as a Progressive Web App (PWA), allowing users to install it on their mobile devices and use it like a native app.

## What's Included

### Files Created:
1. **`public/manifest.json`** - PWA manifest with app metadata, icons, and configuration
2. **`public/sw.js`** - Service worker for offline support and caching
3. **`src/utils/pwa.ts`** - PWA utility functions for service worker registration and install prompts

### Files Modified:
1. **`index.html`** - Added manifest link and PWA meta tags
2. **`src/main.tsx`** - Added PWA initialization

## Features

### ✅ Installable
- Users can install the app on their home screen
- Works on Android and iOS
- Appears in app drawer/list

### ✅ Offline Support
- Service worker caches static assets
- App works offline (with cached data)
- API calls gracefully handle offline state

### ✅ Fast Loading
- Assets cached locally
- Faster subsequent loads
- Reduced network usage

### ✅ Native-like Experience
- Fullscreen mode (no browser UI)
- App icon on home screen
- Standalone display mode

## How Users Install

### Android (Chrome):
1. Visit the website
2. Browser shows "Add to Home Screen" prompt
3. Tap "Add" or "Install"
4. App icon appears on home screen

### iOS (Safari):
1. Visit the website
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"
5. App icon appears on home screen

## Testing Locally

### Development:
```bash
npm run dev
```

The service worker will register automatically. To test PWA features:
1. Open Chrome DevTools → Application → Service Workers
2. Check "Offline" to test offline mode
3. Use "Add to Home Screen" to test installation

### Production:
```bash
npm run build
```

The built app in `dist/` includes:
- `manifest.json`
- `sw.js` (service worker)
- All static assets

## Service Worker Strategy

### Caching Strategy:
- **Static Assets**: Cache-first (HTML, CSS, JS, images)
- **API Calls**: Network-first (always fetch fresh data)
- **Offline**: Graceful fallback with error messages

### Cache Management:
- Old caches are automatically cleaned up
- New versions update automatically
- Cache names include version numbers

## Configuration

### Manifest (`public/manifest.json`):
- **Name**: "RepoVerse - Navigate the GitHub Universe"
- **Short Name**: "RepoVerse"
- **Theme Color**: `#0F0F12` (matches your app's dark theme)
- **Display Mode**: `standalone` (fullscreen, no browser UI)
- **Icons**: Uses `/logo.png` (192x192 and 512x512)

### Service Worker (`public/sw.js`):
- Caches static assets on install
- Handles fetch requests with cache-first strategy
- Skips caching for API calls (always network-first)
- Provides offline fallback

## Browser Support

### Full Support:
- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS 11.3+)
- ✅ Firefox (Android)

### Partial Support:
- ⚠️ Safari (Desktop) - Limited PWA features
- ⚠️ Older browsers - Graceful degradation

## Troubleshooting

### Service Worker Not Registering:
1. Check browser console for errors
2. Ensure site is served over HTTPS (or localhost)
3. Clear browser cache and reload

### App Not Installing:
1. Check `manifest.json` is accessible at `/manifest.json`
2. Verify icons exist at `/logo.png`
3. Ensure site is served over HTTPS (required for installation)

### Offline Mode Not Working:
1. Check service worker is registered (DevTools → Application)
2. Verify assets are cached (DevTools → Application → Cache Storage)
3. Test with "Offline" checkbox in DevTools

## Updating the PWA

### To Update:
1. Make changes to your app
2. Build: `npm run build`
3. Deploy to production
4. Service worker will detect update and prompt users to refresh

### Version Management:
- Update `CACHE_NAME` in `sw.js` to force cache refresh
- Users will get new version on next visit

## Future Enhancements

Potential additions:
- Push notifications
- Background sync
- Share target API
- Custom install prompts
- Offline data persistence

## Notes

- **No Breaking Changes**: All PWA features are additive and won't affect existing website functionality
- **Backward Compatible**: Works as normal website if PWA features aren't supported
- **Production Ready**: All files are production-ready and optimized

/**
 * PWA Utility Functions
 * Handles service worker registration and PWA installation prompts
 */

/**
 * Register the service worker
 */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          
          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to refresh
                  console.log('[PWA] New service worker available');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    });
  }
}

/**
 * Check if app is installed as PWA
 */
export function isPWAInstalled(): boolean {
  // Check if running in standalone mode (installed PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for iOS standalone mode
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  return false;
}

/**
 * Detect if user is on iOS device
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if user is on iOS Safari (not Chrome/Firefox on iOS)
 */
export function isIOSSafari(): boolean {
  if (!isIOS()) return false;
  // Safari on iOS doesn't have Chrome/Firefox in user agent
  const ua = navigator.userAgent.toLowerCase();
  return !ua.includes('crios') && !ua.includes('fxios') && !ua.includes('edgios');
}

/**
 * Check if browser supports PWA installation (Android Chrome/Edge)
 */
export function canInstallPWA(): boolean {
  // Check for beforeinstallprompt event support (Android only)
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if we should show iOS install instructions
 */
export function shouldShowIOSInstructions(): boolean {
  return isIOS() && !isPWAInstalled();
}

/**
 * Show install prompt (if available)
 */
let deferredPrompt: any = null;

export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default install prompt
    e.preventDefault();
    // Store the event for later use
    deferredPrompt = e;
    console.log('[PWA] Install prompt available');
  });
}

/**
 * Check if install prompt is available
 */
export function isInstallPromptAvailable(): boolean {
  return deferredPrompt !== null;
}

/**
 * Trigger PWA installation prompt
 */
export async function promptInstallPWA(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for user response
  const { outcome } = await deferredPrompt.userChoice;
  
  // Clear the deferred prompt
  deferredPrompt = null;
  
  return outcome === 'accepted';
}

/**
 * Initialize PWA features
 */
export function initPWA(): void {
  // Register service worker
  registerServiceWorker();
  
  // Setup install prompt
  setupInstallPrompt();
  
  // Log PWA status
  if (isPWAInstalled()) {
    console.log('[PWA] Running as installed PWA');
  } else {
    console.log('[PWA] Running in browser');
  }
}

/**
 * PWA Analytics Utilities
 * Tracks when users open the app as an installed PWA (standalone mode)
 */

import { supabaseService } from '@/services/supabase.service';

/**
 * Check if the app is running in standalone PWA mode
 */
export function isStandalonePWA(): boolean {
  // Check for standalone display mode (most reliable)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // iOS Safari standalone mode detection
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  // Additional check: if window was opened from home screen
  // This is less reliable but can help catch edge cases
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    // On some devices, standalone appears as fullscreen
    return true;
  }
  
  return false;
}

/**
 * Detect device type (Android, iOS, Desktop, etc.)
 */
export function detectDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();

  // iOS detection
  if (/iphone|ipad|ipod/.test(userAgent) || (platform === 'macintel' && navigator.maxTouchPoints > 1)) {
    return 'iOS';
  }

  // Android detection
  if (/android/.test(userAgent)) {
    return 'Android';
  }

  // Windows Phone
  if (/windows phone/.test(userAgent)) {
    return 'Windows Phone';
  }

  // Desktop detection
  if (/windows|macintosh|linux/.test(platform) && !/android|iphone|ipad|ipod/.test(userAgent)) {
    return 'Desktop';
  }

  // Default fallback
  return 'Unknown';
}

/**
 * Get user location (if available)
 * Returns location data or null if not available/permission denied
 */
export async function getUserLocation(): Promise<{ latitude: number; longitude: number; country?: string; city?: string } | null> {
  return new Promise((resolve) => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    // Try to get location (with timeout)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Optionally reverse geocode to get country/city
          // Using a free service (you can replace with your own)
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            
            resolve({
              latitude,
              longitude,
              country: data.countryName || undefined,
              city: data.city || data.locality || undefined,
            });
          } catch (error) {
            // If reverse geocoding fails, just return coordinates
            resolve({
              latitude,
              longitude,
            });
          }
        } catch (error) {
          console.error('[PWA] Error processing location:', error);
          resolve(null);
        }
      },
      (error) => {
        // User denied permission or location unavailable
        console.log('[PWA] Location not available:', error.message);
        resolve(null);
      },
      {
        timeout: 5000, // 5 second timeout
        maximumAge: 60000, // Accept cached location up to 1 minute old
        enableHighAccuracy: false, // Don't require high accuracy (faster)
      }
    );
  });
}

/**
 * Track PWA open (only once per user, then update last_opened_at)
 */
export async function trackPWAOpenOnce(): Promise<void> {
  try {
    // Only track if running as standalone PWA
    if (!isStandalonePWA()) {
      return;
    }

    const deviceType = detectDeviceType();
    const location = await getUserLocation(); // Get location (may be null if denied/unavailable)

    const deviceInfo: Record<string, any> = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      deviceType,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Add location if available
    if (location) {
      deviceInfo.location = location;
    }

    const alreadyTracked = localStorage.getItem('pwa-open-tracked');
    
    if (alreadyTracked) {
      // User already tracked, just update last_opened_at with current device info
      await supabaseService.trackPWAInstall(deviceInfo);
      return;
    }

    // First time opening as PWA - track as new install
    await supabaseService.trackPWAInstall(deviceInfo);

    // Mark as tracked so we don't count multiple times
    localStorage.setItem('pwa-open-tracked', '1');
    
    console.log('[PWA] Tracked PWA install/open', { deviceType, location: location ? 'available' : 'not available' });
  } catch (error) {
    console.error('[PWA] Error tracking PWA open:', error);
  }
}

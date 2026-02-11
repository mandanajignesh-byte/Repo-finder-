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
 * Track PWA open (only once per user, then update last_opened_at)
 */
export async function trackPWAOpenOnce(): Promise<void> {
  try {
    // Only track if running as standalone PWA
    if (!isStandalonePWA()) {
      return;
    }

    const alreadyTracked = localStorage.getItem('pwa-open-tracked');
    
    if (alreadyTracked) {
      // User already tracked, just update last_opened_at
      await supabaseService.trackPWAInstall({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      });
      return;
    }

    // First time opening as PWA - track as new install
    await supabaseService.trackPWAInstall({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    });

    // Mark as tracked so we don't count multiple times
    localStorage.setItem('pwa-open-tracked', '1');
    
    console.log('[PWA] Tracked PWA install/open');
  } catch (error) {
    console.error('[PWA] Error tracking PWA open:', error);
  }
}

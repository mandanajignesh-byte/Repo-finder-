/**
 * React hook for managing user preferences
 * Syncs with Supabase for persistent storage
 */

import { useState, useEffect } from 'react';
import { UserPreferences } from '@/lib/types';
import { supabaseService } from '@/services/supabase.service';

const STORAGE_KEY = 'github_repo_app_preferences';

const defaultPreferences: UserPreferences = {
  techStack: [],
  interests: [],
  experienceLevel: 'intermediate',
};

export function useUserPreferences() {
  // OPTIMIZATION: Load from localStorage immediately for instant UI
  const getInitialPreferences = (): UserPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading preferences from localStorage:', error);
    }
    return defaultPreferences;
  };

  const [preferences, setPreferences] = useState<UserPreferences>(getInitialPreferences());
  const [loaded, setLoaded] = useState(true); // OPTIMIZATION: Mark as loaded immediately since we have localStorage

  useEffect(() => {
    // OPTIMIZATION: Sync with Supabase in background without blocking UI
    const syncPreferences = async () => {
      try {
        const userId = await supabaseService.getOrCreateUserId();
        const supabasePrefs = await supabaseService.getUserPreferences(userId);
        
        if (supabasePrefs) {
          // Only update if Supabase has newer/different preferences
          const currentPrefs = getInitialPreferences();
          const prefsChanged = JSON.stringify(supabasePrefs) !== JSON.stringify(currentPrefs);
          
          if (prefsChanged) {
          setPreferences(supabasePrefs);
          // Also save to localStorage as backup
          localStorage.setItem(STORAGE_KEY, JSON.stringify(supabasePrefs));
          }
        } else {
          // Sync current localStorage preferences to Supabase in background
          const currentPrefs = getInitialPreferences();
          if (currentPrefs && Object.keys(currentPrefs).length > 0) {
            await supabaseService.saveUserPreferences(userId, currentPrefs);
          }
        }
      } catch (error) {
        console.error('Error syncing preferences with Supabase:', error);
        // Continue with localStorage preferences - non-blocking
          }
    };

    // Sync in background without blocking
    syncPreferences();
  }, []);

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    
    // Save to localStorage immediately
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // Sync to Supabase in background
    try {
      const userId = await supabaseService.getOrCreateUserId();
      await supabaseService.saveUserPreferences(userId, updated);
    } catch (error) {
      console.error('Error syncing preferences to Supabase:', error);
      // Continue without Supabase - localStorage is the fallback
    }
  };

  return { preferences, updatePreferences, loaded };
}

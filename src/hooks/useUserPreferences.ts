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
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load preferences from Supabase first, fallback to localStorage
    const loadPreferences = async () => {
      try {
        const userId = await supabaseService.getOrCreateUserId();
        const supabasePrefs = await supabaseService.getUserPreferences(userId);
        
        if (supabasePrefs) {
          setPreferences(supabasePrefs);
          // Also save to localStorage as backup
          localStorage.setItem(STORAGE_KEY, JSON.stringify(supabasePrefs));
        } else {
          // Fallback to localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const localPrefs = JSON.parse(stored);
              setPreferences(localPrefs);
              // Sync to Supabase in background
              await supabaseService.saveUserPreferences(userId, localPrefs);
            } catch (error) {
              console.error('Error loading preferences from localStorage:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setPreferences(JSON.parse(stored));
          } catch (e) {
            console.error('Error parsing localStorage preferences:', e);
          }
        }
      } finally {
        setLoaded(true);
      }
    };

    loadPreferences();
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

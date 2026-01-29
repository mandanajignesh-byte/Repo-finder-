/**
 * Supabase Client Configuration
 * Creates and exports the Supabase client instance
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

// Validate Supabase URL format
if (supabaseUrl) {
  // Check if URL is incorrectly pointing to dashboard instead of API
  if (supabaseUrl.includes('supabase.com/dashboard') || supabaseUrl.includes('supabase.com/project')) {
    console.error(
      '❌ INVALID SUPABASE URL DETECTED!\n' +
      'The Supabase URL is pointing to the dashboard, not the API endpoint.\n' +
      'Correct format: https://[project-ref].supabase.co\n' +
      'Current (wrong): ' + supabaseUrl + '\n' +
      'Please update VITE_SUPABASE_URL in your Vercel environment variables.\n' +
      'Get the correct URL from: Supabase Dashboard → Project Settings → API → Project URL'
    );
  } else if (!supabaseUrl.includes('.supabase.co')) {
    console.error(
      '⚠️ SUPABASE URL FORMAT WARNING!\n' +
      'Expected format: https://[project-ref].supabase.co\n' +
      'Current: ' + supabaseUrl
    );
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Some features may not work.');
  console.warn('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false, // We'll handle sessions manually
      autoRefreshToken: false,
    },
  }
);

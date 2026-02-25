/**
 * Application configuration
 * Loads environment variables with fallbacks
 */

export const config = {
  github: {
    apiToken: import.meta.env.VITE_GITHUB_API_TOKEN || '',
    baseUrl: 'https://api.github.com',
  },
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini', // Balanced: much smarter than 3.5, cheaper than gpt-4o
  },
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  app: {
    env: import.meta.env.VITE_ENV || 'development',
  },
  payment: {
    paypalUsername: import.meta.env.VITE_PAYPAL_USERNAME || '',
  },
} as const;

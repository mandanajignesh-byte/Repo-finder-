# Fixing Vercel Environment Variables

## The Problem

If you're seeing errors like:
- `Access to fetch at 'https://supabase.com/dashboard/project/...' has been blocked by CORS policy`
- `TypeError: Failed to fetch`
- `0 repos` being returned

This means your Supabase URL is incorrectly configured in Vercel.

## The Issue

The Supabase URL in your Vercel environment variables is pointing to:
```
https://supabase.com/dashboard/project/[project-id]/rest/v1/...
```

This is **WRONG** - this is the dashboard URL, not the API URL.

## The Fix

### Step 1: Get Your Correct Supabase Credentials

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** (gear icon in the sidebar)
4. Click on **API** in the settings menu
5. You'll see two important values:

   **Project URL** (this is what you need for `VITE_SUPABASE_URL`):
   ```
   https://[your-project-ref].supabase.co
   ```
   Example: `https://abcdefghijklmnop.supabase.co`

   **anon/public key** (this is what you need for `VITE_SUPABASE_ANON_KEY`):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   (This is a long JWT token)

### Step 2: Update Vercel Environment Variables

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your project (`repo-finder-rho` or whatever you named it)
3. Go to **Settings** → **Environment Variables**
4. Find these variables and update them:

   **VITE_SUPABASE_URL**
   - **Current (wrong)**: `https://supabase.com/dashboard/project/...`
   - **Should be**: `https://[your-project-ref].supabase.co`
   - Example: `https://hwbdrvbcawcfpbcimblg.supabase.co`

   **VITE_SUPABASE_ANON_KEY**
   - **Should be**: The `anon/public` key from Supabase API settings
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3YmRydmJjYXdjZnBiY2ltYmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2...`

### Step 3: Redeploy

After updating the environment variables:

1. **Option A: Automatic Redeploy**
   - Vercel will automatically detect the change
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Or push a new commit to trigger a redeploy

2. **Option B: Manual Redeploy**
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy**

### Step 4: Verify

After redeploying, check the browser console:
- ✅ Should see no CORS errors
- ✅ Should see successful API calls to `https://[project-ref].supabase.co/rest/v1/...`
- ✅ Should see repositories loading

## Common Mistakes

### ❌ Wrong:
```
VITE_SUPABASE_URL=https://supabase.com/dashboard/project/hwbdrvbcawcfpbcimblg
```

### ✅ Correct:
```
VITE_SUPABASE_URL=https://hwbdrvbcawcfpbcimblg.supabase.co
```

## Other Environment Variables to Check

While you're at it, make sure these are also set correctly in Vercel:

- `VITE_GITHUB_API_TOKEN` - Your GitHub Personal Access Token (optional but recommended)
- `VITE_OPENAI_API_KEY` - Your OpenAI API key (for AI agent feature)
- `VITE_PAYPAL_USERNAME` - Your PayPal.me username (for Buy Me a Coffee)

## Still Having Issues?

1. **Clear browser cache** - Old cached code might still have the wrong URL
2. **Check the console** - The updated code will now show helpful error messages
3. **Verify the URL format** - Make sure it ends with `.supabase.co` (not `.com`)
4. **Check the key** - Make sure you're using the `anon/public` key, not the `service_role` key

## Quick Checklist

- [ ] Got Project URL from Supabase Dashboard → Settings → API
- [ ] Got anon/public key from Supabase Dashboard → Settings → API
- [ ] Updated `VITE_SUPABASE_URL` in Vercel (format: `https://[ref].supabase.co`)
- [ ] Updated `VITE_SUPABASE_ANON_KEY` in Vercel
- [ ] Redeployed the application
- [ ] Cleared browser cache
- [ ] Verified no CORS errors in console

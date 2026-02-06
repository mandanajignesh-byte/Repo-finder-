# Google Analytics Setup Guide

This app includes Google Analytics 4 (GA4) integration for tracking user behavior and engagement.

## Setup Instructions

### 1. Create a Google Analytics Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property (or use an existing one)
3. Get your **Measurement ID** (format: `G-XXXXXXXXXX`)

### 2. Add Measurement ID to Environment Variables

Add your Google Analytics Measurement ID to your `.env` file:

```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Measurement ID.

### 3. Restart Development Server

After adding the environment variable, restart your development server:

```bash
npm run dev
```

## What's Being Tracked

### Page Views
- Automatic page view tracking for all routes
- Tracks navigation between pages (Discover, Trending, Agent, Profile, Support)

### Repository Interactions
- **Like**: When user swipes right or likes a repo
- **Skip**: When user swipes left or skips a repo
- **Save**: When user saves a repository
- **View**: When a repository card is displayed
- **Share**: When user shares a repository (native share or copy link)

### Onboarding Events
- **Started**: When onboarding popup appears (after 4-5 swipes)
- **Completed**: When user completes the onboarding flow
- **Skipped**: When user skips the onboarding

### Navigation Events
- Navigation to Saved Repos section
- Navigation to Liked Repos section

## Custom Events

All events include relevant metadata:
- Repository ID and name
- Action type
- Source context
- Step numbers (for onboarding)

## Viewing Analytics

1. Go to your [Google Analytics Dashboard](https://analytics.google.com/)
2. Navigate to **Reports** → **Engagement** → **Events**
3. You'll see all tracked events with their parameters

## Testing

To verify tracking is working:

1. Open browser DevTools → Network tab
2. Filter by "google-analytics" or "collect"
3. Perform actions (swipe, save, share, etc.)
4. You should see requests being sent to Google Analytics

## Privacy

- No personally identifiable information (PII) is tracked
- User IDs are anonymized
- Complies with GDPR and privacy regulations
- Users can opt out via browser settings

## Disabling Analytics

To disable Google Analytics, simply remove or comment out the `VITE_GA_MEASUREMENT_ID` from your `.env` file. The app will continue to work normally without tracking.

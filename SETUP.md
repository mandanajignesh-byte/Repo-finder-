# Setup Guide - GitHub Repository Discovery App

## Prerequisites

- Node.js 18+ and npm/pnpm
- GitHub Personal Access Token (optional but recommended)
- OpenAI API Key (for AI agent feature)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Set up environment variables:**
   
   Create a `.env` file in the root directory:
   ```env
   # GitHub API Configuration (optional but recommended)
   # Get your token from: https://github.com/settings/tokens
   # Permissions needed: public_repo (read-only)
   VITE_GITHUB_API_TOKEN=your_github_token_here

   # OpenAI API Configuration (required for AI agent)
   # Get your key from: https://platform.openai.com/api-keys
   VITE_OPENAI_API_KEY=your_openai_api_key_here

   # Backend API URL (if using separate backend - optional for MVP)
   VITE_API_URL=http://localhost:3000

   # Environment
   VITE_ENV=development
   ```

3. **Get API Keys:**

   **GitHub Token (Optional):**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `public_repo` (read-only)
   - Copy the token to your `.env` file
   - Without a token, you'll be limited to 60 requests/hour (vs 5,000 with token)

   **OpenAI API Key (Required for AI Agent):**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy it to your `.env` file
   - Note: You'll be charged per API call (very cheap with GPT-3.5 Turbo)

## Running the App

```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

## Features

### 1. Discovery Screen
- Swipe-based repository discovery
- Personalized recommendations based on your tech stack
- Save repositories you like
- View saved repositories

### 2. Trending Screen
- View trending repositories (today/week)
- Filter by category (AI, Web, Mobile, DevOps)
- Real-time GitHub data

### 3. AI Agent
- Ask for repository recommendations
- Describe your project and tech stack
- Get personalized suggestions
- Credit system (5 free credits on signup, 1 per day)

## Cost Management

### Free Tier Limits:
- **GitHub API**: 5,000 requests/hour (with token) or 60/hour (without)
- **OpenAI API**: Pay-as-you-go (~$0.0015 per query with GPT-3.5 Turbo)
- **Credits**: 5 free on signup, 1 free per day

### Cost Optimization:
- GitHub API responses are cached
- AI responses are cached for similar queries
- Use GPT-3.5 Turbo (cheaper than GPT-4)
- Implement rate limiting per user

## Project Structure

```
src/
├── app/
│   ├── components/          # React components
│   │   ├── DiscoveryScreen.tsx
│   │   ├── TrendingScreen.tsx
│   │   ├── AgentScreen.tsx
│   │   └── ...
│   └── App.tsx              # Main app component
├── services/                 # API services
│   ├── github.service.ts     # GitHub API integration
│   ├── ai.service.ts         # OpenAI integration
│   ├── recommendation.service.ts
│   └── credit.service.ts
├── hooks/                    # React hooks
│   ├── useRepositories.ts
│   └── useUserPreferences.ts
├── lib/                      # Utilities
│   ├── config.ts            # Configuration
│   └── types.ts             # TypeScript types
└── styles/                   # CSS files
```

## Troubleshooting

### GitHub API Rate Limits
- **Error**: "API rate limit exceeded"
- **Solution**: 
  - Add a GitHub token to `.env`
  - Implement better caching
  - Reduce API calls

### OpenAI API Errors
- **Error**: "Invalid API key"
- **Solution**: 
  - Check your `.env` file
  - Verify the key at https://platform.openai.com/api-keys
  - Ensure you have credits in your OpenAI account

### No Repositories Showing
- Check browser console for errors
- Verify GitHub API token is set
- Check network tab for API responses
- Ensure you're connected to the internet

## Next Steps

1. **Add Backend (Optional):**
   - Set up Supabase/Firebase for user data
   - Store user preferences
   - Implement user authentication

2. **Monetization:**
   - Add Stripe integration
   - Implement credit purchases
   - Add premium features

3. **Improvements:**
   - Better caching strategy
   - Offline support
   - Push notifications
   - Social features

## Support

For issues or questions:
- Check the console for errors
- Review API documentation:
  - GitHub: https://docs.github.com/en/rest
  - OpenAI: https://platform.openai.com/docs

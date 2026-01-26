# Backend Setup Guide

The backend API server is now complete! Here's how to set it up:

## Quick Start

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

### 2. Create Backend `.env` File

Create `server/.env` file:

```env
PORT=3000
NODE_ENV=development

# GitHub API (optional but recommended)
GITHUB_TOKEN=your_github_token_here

# OpenAI API (required for AI agent)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
```

### 3. Start the Backend Server

```bash
cd server
npm run dev
```

The backend will run on `http://localhost:3000`

### 4. Update Frontend Config (Optional)

Update `src/lib/config.ts` or create `.env` in root:

```env
VITE_API_URL=http://localhost:3000/api
```

## What's Included

### ✅ Backend API Server (`server/index.js`)
- Express.js API server
- GitHub API integration (proxied through backend)
- OpenAI API integration (keeps keys secure)
- File-based storage for user data
- CORS enabled for frontend

### ✅ API Endpoints

**GitHub Repositories:**
- `GET /api/repos/search` - Search repositories
- `GET /api/repos/trending` - Get trending repos

**AI Agent:**
- `POST /api/ai/recommendations` - Get AI recommendations

**User Data:**
- `GET /api/user/preferences` - Get preferences
- `POST /api/user/preferences` - Save preferences
- `GET /api/user/saved-repos` - Get saved repos
- `POST /api/user/saved-repos` - Save repo
- `GET /api/user/credits` - Get credits
- `POST /api/user/credits/use` - Use credits

**Health:**
- `GET /api/health` - Server health check

### ✅ API Client Services (Frontend)
- `src/services/api.client.ts` - Base HTTP client
- `src/services/api/github.api.ts` - GitHub API service
- `src/services/api/ai.api.ts` - AI API service
- `src/services/api/user.api.ts` - User data service

## Architecture

```
Frontend (React)
    ↓
API Client Services
    ↓
Backend API (Express)
    ├── GitHub API (proxied)
    ├── OpenAI API (proxied)
    └── File Storage (JSON)
```

## Current Status

### Backend: ✅ Complete
- All API endpoints implemented
- File-based storage working
- CORS configured

### Frontend: 🔄 Hybrid
- Currently uses direct services (GitHub/OpenAI from browser)
- API client services created (ready to use)
- Can be updated to use backend API (optional)

## To Use Backend API (Optional)

Currently, the frontend calls services directly. To use the backend API instead:

1. Update `src/services/github.service.ts` to use `githubApiService`
2. Update `src/services/ai.service.ts` to use `aiApiService`
3. Update `src/services/credit.service.ts` to use `userApiService`

Or keep current setup - backend is ready when you need it!

## Running Both Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Benefits of Using Backend

1. **Security**: API keys stay on server (not exposed to browser)
2. **Rate Limiting**: Can implement rate limiting
3. **Caching**: Can cache GitHub API responses
4. **Data Persistence**: User data stored on server
5. **Analytics**: Can track usage on server

## Data Storage

Currently uses JSON files in `server/data/`:
- `users.json` - User preferences & credits
- `saved-repos.json` - Saved repositories

For production, replace with a database (PostgreSQL, MongoDB, etc.).

## Next Steps (Optional)

1. **Update frontend** to use backend API
2. **Add authentication** (JWT tokens)
3. **Replace file storage** with database
4. **Add rate limiting**
5. **Add API caching**
6. **Add analytics/logging**

The backend is complete and ready to use! 🚀

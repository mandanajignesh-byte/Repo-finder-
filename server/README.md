# Backend API Server

Node.js/Express backend API for GitHub Repository Discovery App.

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Create `.env` file:**
   ```env
   PORT=3000
   NODE_ENV=development
   GITHUB_TOKEN=your_github_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-3.5-turbo
   ```

3. **Start the server:**
   ```bash
   npm run dev
   # or
   npm start
   ```

The server will run on `http://localhost:3000`

## API Endpoints

### GitHub Repositories

- `GET /api/repos/search?q=query&language=js&sort=stars&per_page=30`
  - Search repositories
  
- `GET /api/repos/trending?language=js&since=daily&per_page=30`
  - Get trending repositories

### AI Agent

- `POST /api/ai/recommendations`
  - Body: `{ query: string, preferences?: UserPreferences }`
  - Returns AI-powered recommendations

### User Data

- `GET /api/user/preferences?userId=default`
  - Get user preferences

- `POST /api/user/preferences`
  - Body: `{ userId: string, preferences: UserPreferences }`
  - Save user preferences

- `GET /api/user/saved-repos?userId=default`
  - Get saved repositories

- `POST /api/user/saved-repos`
  - Body: `{ userId: string, repo: Repository }`
  - Save a repository

- `GET /api/user/credits?userId=default`
  - Get credit balance

- `POST /api/user/credits/use`
  - Body: `{ userId: string, amount: number }`
  - Use credits

### Health Check

- `GET /api/health`
  - Server health status

## Data Storage

Currently uses file-based JSON storage in `server/data/`:
- `users.json` - User preferences and credits
- `saved-repos.json` - Saved repositories

For production, consider using a database (PostgreSQL, MongoDB, etc.).

## CORS

The server is configured to allow CORS from the frontend (port 5173).

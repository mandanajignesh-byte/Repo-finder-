# Quick Start Guide

## File Locations

### Project Root
```
C:\Users\manda\github\GitHub Repository Discovery App\
```

### Key Files
- **package.json** - Contains all npm scripts (root directory)
- **scripts/ingest-repos.ts** - Main ingestion script
- **scripts/update-existing-repos.ts** - Update existing repos script
- **supabase-repos-schema.sql** - Database schema (run in Supabase SQL Editor)
- **scripts/recommendation-queries.sql** - Feed queries

## Step-by-Step Setup

### 1. Navigate to Project Directory
```powershell
cd "C:\Users\manda\github\GitHub Repository Discovery App"
```

### 2. Verify Scripts are Available
```powershell
npm run
```
You should see:
- `ingest-repos`
- `update-repos`

### 3. Create Database Table
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run: `supabase-repos-schema.sql`

### 4. Set Up Environment Variables
Create/update `.env.local` in project root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_GITHUB_API_TOKEN=your_github_token
```

### 5. Run Ingestion
```powershell
npm run ingest-repos
```

## Common Commands

```powershell
# Navigate to project
cd "C:\Users\manda\github\GitHub Repository Discovery App"

# Run ingestion (adds new repos)
npm run ingest-repos

# Update existing repos (refreshes scores)
npm run update-repos

# See all available scripts
npm run
```

## Troubleshooting

**Error: "Missing script"**
- Make sure you're in the project root directory
- Check that `package.json` has the script defined

**Error: "Cannot find module"**
- Run `npm install` to install dependencies

**Error: "Missing Supabase credentials"**
- Check `.env.local` file exists in project root
- Verify environment variables are set correctly

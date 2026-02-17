# Supabase Database Setup Guide

## Option 1: Using Supabase Dashboard (Easiest - Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste**
   - Open `supabase-repoverse-complete-schema.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor

4. **Run the Query**
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Wait for execution to complete

5. **Verify Tables**
   - Go to "Table Editor" in left sidebar
   - You should see all the new tables listed

---

## Option 2: Using Supabase CLI

### Prerequisites
- Install Supabase CLI: https://supabase.com/docs/guides/cli
- Login to Supabase: `supabase login`
- Link your project: `supabase link --project-ref your-project-ref`

### Commands

```bash
# Navigate to project directory
cd C:\Users\manda\github\RepoFinderMobile

# Push schema to Supabase
supabase db push

# OR if you want to run the SQL file directly
supabase db execute --file supabase-repoverse-complete-schema.sql
```

---

## Option 3: Using psql (Direct PostgreSQL Connection)

### Get Connection String
1. Go to Supabase Dashboard → Settings → Database
2. Copy the "Connection string" (URI format)

### Run Command

```bash
# Windows PowerShell
$env:PGPASSWORD="your-db-password"
psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f supabase-repoverse-complete-schema.sql

# OR using connection string
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase-repoverse-complete-schema.sql
```

---

## Option 4: Using Supabase REST API (Programmatic)

```bash
# Get your API key from Supabase Dashboard → Settings → API
# Get your project URL

curl -X POST \
  'https://[YOUR-PROJECT-REF].supabase.co/rest/v1/rpc/exec_sql' \
  -H 'apikey: [YOUR-ANON-KEY]' \
  -H 'Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]' \
  -H 'Content-Type: application/json' \
  -d '{
    "sql": "[PASTE SQL CONTENT HERE]"
  }'
```

---

## Quick Verification Query

After running the schema, verify tables were created:

```sql
-- Run this in Supabase SQL Editor
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'repos_master',
    'repo_clusters',
    'repo_tech_stack',
    'repo_complexity',
    'repo_health',
    'badge_definitions',
    'repo_badges',
    'user_profile',
    'user_interests',
    'user_tech_stack',
    'user_goals',
    'user_preferences',
    'user_vectors',
    'repo_interactions',
    'repo_recommendations',
    'user_current_projects',
    'user_github_data'
  )
ORDER BY table_name;
```

Expected result: 17 tables should be listed.

---

## Troubleshooting

### Error: "relation already exists"
- Some tables might already exist
- Either drop them first or modify the SQL to use `CREATE TABLE IF NOT EXISTS` (already included)

### Error: "permission denied"
- Make sure you're using the correct database role
- Use `postgres` user or service role key

### Error: "extension does not exist"
- Run this first:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";
  ```

---

## Recommended: Use Option 1 (Dashboard)
The Supabase Dashboard SQL Editor is the easiest and most reliable method.

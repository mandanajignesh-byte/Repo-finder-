# Quick Command to Create All Tables in Supabase

## ✅ EASIEST METHOD: Supabase Dashboard (Recommended)

**No command needed - just use the web interface:**

1. Go to: https://app.supabase.com
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New query"**
5. Copy the entire contents of `supabase-repoverse-complete-schema.sql`
6. Paste into the editor
7. Click **"Run"** (or press `Ctrl+Enter`)

**Done!** All tables will be created.

---

## 🔧 METHOD 2: Supabase CLI (If Installed)

```powershell
# Navigate to project
cd C:\Users\manda\github\RepoFinderMobile

# Check if Supabase CLI is installed
supabase --version

# If installed, run:
supabase db push

# OR execute SQL file directly:
supabase db execute --file supabase-repoverse-complete-schema.sql
```

**If CLI is not installed**, use Method 1 (Dashboard) instead.

---

## 🔍 Verify Tables Were Created

After running, execute this in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'repo%' OR table_name LIKE 'user%' OR table_name LIKE 'badge%'
ORDER BY table_name;
```

You should see 17 tables:
- repos_master
- repo_clusters
- repo_tech_stack
- repo_complexity
- repo_health
- badge_definitions
- repo_badges
- user_profile
- user_interests
- user_tech_stack
- user_goals
- user_preferences
- user_vectors
- repo_interactions
- repo_recommendations
- user_current_projects
- user_github_data

---

## ⚡ Quick Copy Command (Windows)

If you want to quickly copy the SQL file content:

```powershell
Get-Content supabase-repoverse-complete-schema.sql | Set-Clipboard
```

Then paste into Supabase SQL Editor.

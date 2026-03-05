# Repoverse Trending Repos — Setup Guide

A fully automated system that fetches, scores, and stores trending GitHub repos into Supabase daily and weekly.

---

## How it works

1. **GitHub Actions** triggers `fetch-trending.js` on a schedule
2. The script searches GitHub for repos matching 8 categories × 5 topics
3. For every repo found it calls 6 GitHub API endpoints to gather real data
4. Each repo is scored 0–100 based on momentum, activity, community, issue health, and growth
5. Results are upserted into a single Supabase table (`trending_repos_v2`)
6. The frontend reads from that table and displays cards with health grades

---

## Step 1 — Run the SQL in Supabase

Open your **Supabase project → SQL Editor** and paste the following:

```sql
-- ─── Drop old system (safe to run even if tables don't exist) ────────────────
DROP FUNCTION IF EXISTS public.get_trending_gems CASCADE;
DROP TABLE IF EXISTS public.trending_repos CASCADE;

-- ─── Create new trending_repos_v2 table ─────────────────────────────────────
CREATE TABLE public.trending_repos_v2 (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id                 bigint      NOT NULL,
  name                      text        NOT NULL,   -- full_name e.g. "tiangolo/fastapi"
  owner                     text        NOT NULL,
  repo                      text        NOT NULL,
  description               text,
  url                       text        NOT NULL,
  homepage                  text,
  language                  text,
  topics                    text[]      DEFAULT '{}',
  category                  text        NOT NULL,

  -- Stats
  stars                     integer     DEFAULT 0,
  forks                     integer     DEFAULT 0,
  open_issues               integer     DEFAULT 0,
  watchers                  integer     DEFAULT 0,

  -- Growth
  stars_today               integer     DEFAULT 0,
  stars_this_week           integer     DEFAULT 0,

  -- Scoring
  total_score               integer     DEFAULT 0,
  raw_score                 integer     DEFAULT 0,
  momentum_score            integer     DEFAULT 0,
  activity_score            integer     DEFAULT 0,
  community_score           integer     DEFAULT 0,
  issue_health_score        integer     DEFAULT 0,
  growth_consistency_score  integer     DEFAULT 0,
  release_bonus             integer     DEFAULT 0,
  issue_response_bonus      integer     DEFAULT 0,
  contributors_bonus        integer     DEFAULT 0,
  health_grade              text,
  health_status             text,

  -- Raw fetched data
  commits_last_7_days       integer,
  commits_last_30_days      integer,
  commits_last_90_days      integer,
  stars_last_7_days         integer     DEFAULT 0,
  stars_last_24_hours       integer     DEFAULT 0,
  total_contributors        integer     DEFAULT 0,
  avg_issue_close_hours     float       DEFAULT 0,
  latest_release_at         timestamptz,
  license_name              text,
  repo_size_kb              integer     DEFAULT 0,

  -- Extra signals
  has_homepage              boolean     DEFAULT false,
  has_topics                boolean     DEFAULT false,
  topics_count              integer     DEFAULT 0,

  -- Dates
  github_created_at         timestamptz,
  github_pushed_at          timestamptz,
  fetched_at                timestamptz DEFAULT now(),

  -- Period
  period                    text        NOT NULL CHECK (period IN ('daily', 'weekly')),
  date                      date        NOT NULL,

  CONSTRAINT uq_repo_period_date UNIQUE (github_id, period, date)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_trv2_period_date       ON public.trending_repos_v2 (period, date);
CREATE INDEX idx_trv2_category          ON public.trending_repos_v2 (category, period, date);
CREATE INDEX idx_trv2_total_score       ON public.trending_repos_v2 (total_score DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.trending_repos_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.trending_repos_v2 FOR SELECT USING (true);
```

---

## Step 2 — Add GitHub Secrets

In your GitHub repo go to **Settings → Secrets and variables → Actions** and add:

| Secret name           | Value                                                     |
|-----------------------|-----------------------------------------------------------|
| `SUPABASE_URL`        | Your Supabase project URL (`https://xxx.supabase.co`)    |
| `SUPABASE_SERVICE_KEY`| Service role key from Supabase → Settings → API           |

> `GITHUB_TOKEN` is provided automatically by GitHub Actions — no secret needed.

---

## Step 3 — Push the workflow file

The workflow is already at `.github/workflows/fetch-trending.yml`.  
Just push it to your `master`/`main` branch:

```bash
git add .github/workflows/fetch-trending.yml scripts/
git commit -m "feat: add trending repo fetcher"
git push origin master
```

---

## Step 4 — Test a manual run

In your GitHub repo go to **Actions → Fetch Trending Repos → Run workflow**.  
Select `daily` and click **Run workflow**.  
Watch the logs — it should finish in ~3–5 minutes.

---

## Step 5 — Done!

The workflow now runs automatically:
- **Daily** at 1:00 AM UTC
- **Weekly** at 2:00 AM UTC every Monday

Data lands in `trending_repos_v2` and your frontend reads from it.

---

## Scoring breakdown

| Factor               | Max points | Source                            |
|----------------------|-----------|-----------------------------------|
| Momentum             | 30         | Stars gained last 7 days          |
| Activity             | 25         | Commits last 7 days (or pushed_at)|
| Community            | 20         | Fork count                        |
| Issue health         | 15         | Closed/total issue ratio          |
| Growth consistency   | 10         | Stars per day since creation      |
| Release bonus        | +5         | Released in last 30 days          |
| Issue response bonus | +7         | Avg close time & oldest open issue|
| Contributors bonus   | +12        | Total contributor count           |
| **Max total**        | **100**    |                                   |

### Health grades

| Score  | Grade |
|--------|-------|
| 90–100 | A+    |
| 80–89  | A     |
| 70–79  | B+    |
| 60–69  | B     |
| 50–59  | C+    |
| 40–49  | C     |
| 30–39  | D     |
| < 30   | F     |

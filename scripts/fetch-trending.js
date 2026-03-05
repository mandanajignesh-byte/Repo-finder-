/**
 * Repoverse — Trending Repo Fetcher
 * ===================================
 * Fetches, scores, and stores trending GitHub repos into Supabase.
 *
 * Usage:
 *   RUN_TYPE=daily  node scripts/fetch-trending.js
 *   RUN_TYPE=weekly node scripts/fetch-trending.js
 *
 * Required env vars:
 *   GITHUB_TOKEN        — GitHub personal access token
 *   SUPABASE_URL        — Supabase project URL
 *   SUPABASE_SERVICE_KEY — Supabase service role key
 *   RUN_TYPE            — 'daily' or 'weekly'
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root for local development (no-op in CI)
dotenv.config({ path: join(__dirname, '..', '.env') });

// ─── Validate config ───────────────────────────────────────────────────────────
const GITHUB_TOKEN       = process.env.GITHUB_TOKEN;
const SUPABASE_URL       = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RUN_TYPE           = (process.env.RUN_TYPE || 'daily').toLowerCase();
const TODAY              = new Date().toISOString().split('T')[0];

if (!GITHUB_TOKEN)        throw new Error('Missing GITHUB_TOKEN');
if (!SUPABASE_URL)        throw new Error('Missing SUPABASE_URL');
if (!SUPABASE_SERVICE_KEY) throw new Error('Missing SUPABASE_SERVICE_KEY');
if (!['daily', 'weekly'].includes(RUN_TYPE)) throw new Error('RUN_TYPE must be "daily" or "weekly"');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const GH_API   = 'https://api.github.com';

// Counters
let apiCallCount = 0;
const startTime  = Date.now();

// ─── Categories & Topics ───────────────────────────────────────────────────────
const CATEGORIES = [
  {
    name: 'AI & ML',
    slug: 'ai-ml',
    topics: ['llm', 'machine-learning', 'ai-agent', 'deep-learning', 'nlp'],
  },
  {
    name: 'Frontend',
    slug: 'frontend',
    topics: ['react', 'nextjs', 'vue', 'svelte', 'typescript'],
  },
  {
    name: 'Backend',
    slug: 'backend',
    topics: ['nodejs', 'fastapi', 'golang', 'rust', 'django'],
  },
  {
    name: 'DevOps',
    slug: 'devops',
    topics: ['docker', 'kubernetes', 'terraform', 'ci-cd', 'devops'],
  },
  {
    name: 'Mobile',
    slug: 'mobile',
    topics: ['flutter', 'react-native', 'swift', 'kotlin', 'ios'],
  },
  {
    name: 'Data Science',
    slug: 'data-science',
    topics: ['pandas', 'jupyter', 'data-visualization', 'pytorch', 'numpy'],
  },
  {
    name: 'Dev Tools',
    slug: 'dev-tools',
    topics: ['cli', 'vscode-extension', 'developer-tools', 'productivity', 'api'],
  },
  {
    name: 'Open Source Alternatives',
    slug: 'open-source-alternatives',
    topics: ['self-hosted', 'open-source', 'alternative', 'privacy'],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Fetch from GitHub API with retry on rate-limit (403/429).
 */
async function ghFetch(url, extraHeaders = {}, retryCount = 0) {
  apiCallCount++;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...extraHeaders,
      },
    });
  } catch (err) {
    console.error(`  Network error: ${err.message}`);
    return null;
  }

  if ((res.status === 403 || res.status === 429) && retryCount < 1) {
    console.log(`  Rate limited (${res.status}). Waiting 60s then retrying...`);
    await sleep(60_000);
    return ghFetch(url, extraHeaders, retryCount + 1);
  }

  return res;
}

// ─── Per-repo fetchers ─────────────────────────────────────────────────────────

/** 1. Basic repo data */
async function fetchBasicData(owner, repo) {
  const res = await ghFetch(`${GH_API}/repos/${owner}/${repo}`);
  if (!res || !res.ok) return null;
  return res.json();
}

/** 2. Commit activity (last 52 weeks). Returns 202 when GitHub is computing — retries up to 3×. */
async function fetchCommitActivity(owner, repo) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await ghFetch(`${GH_API}/repos/${owner}/${repo}/stats/commit_activity`);
    if (!res) return null;

    if (res.status === 202) {
      console.log(`    Commit stats computing (${owner}/${repo}), retry ${attempt + 1}/3…`);
      await sleep(3_000);
      continue;
    }
    if (!res.ok) return null;

    const weeks = await res.json();
    if (!Array.isArray(weeks) || weeks.length === 0) return null;

    const commits_last_7_days  = weeks.at(-1)?.total  || 0;
    const commits_last_30_days = weeks.slice(-4).reduce((s, w)  => s + (w?.total || 0), 0);
    const commits_last_90_days = weeks.slice(-13).reduce((s, w) => s + (w?.total || 0), 0);

    return { commits_last_7_days, commits_last_30_days, commits_last_90_days };
  }
  return null; // failed after retries — caller falls back to pushed_at
}

/** 3. Recent star timestamps (last 2 pages of stargazers). */
async function fetchRecentStars(owner, repo) {
  // Get total page count using per_page=1
  const firstRes = await ghFetch(
    `${GH_API}/repos/${owner}/${repo}/stargazers?per_page=1`,
    { Accept: 'application/vnd.github.star+json' },
  );
  if (!firstRes || !firstRes.ok) return { stars_last_7_days: 0, stars_last_24_hours: 0 };

  const link      = firstRes.headers.get('Link') || '';
  const lastMatch = link.match(/page=(\d+)>; rel="last"/);
  const lastPage  = lastMatch ? parseInt(lastMatch[1]) : 1;

  // Fetch last 2 pages (most recent stargazers)
  const allStars = [];
  for (const page of [lastPage, lastPage - 1].filter((p) => p > 0)) {
    await sleep(120);
    const res = await ghFetch(
      `${GH_API}/repos/${owner}/${repo}/stargazers?per_page=100&page=${page}`,
      { Accept: 'application/vnd.github.star+json' },
    );
    if (!res || !res.ok) continue;
    const data = await res.json();
    if (Array.isArray(data)) allStars.push(...data);
  }

  const now = Date.now();
  const stars_last_7_days   = allStars.filter((s) => now - new Date(s.starred_at).getTime() < 7  * 86_400_000).length;
  const stars_last_24_hours = allStars.filter((s) => now - new Date(s.starred_at).getTime() < 1  * 86_400_000).length;

  return { stars_last_7_days, stars_last_24_hours };
}

/** 4. Issue health: last 20 open + last 20 closed (real issues only, no PRs). */
async function fetchIssueHealth(owner, repo) {
  const [closedRes, openRes] = await Promise.all([
    ghFetch(`${GH_API}/repos/${owner}/${repo}/issues?state=closed&per_page=20&sort=updated`),
    ghFetch(`${GH_API}/repos/${owner}/${repo}/issues?state=open&per_page=20&sort=updated`),
  ]);

  const closed = closedRes?.ok ? (await closedRes.json()).filter((i) => !i.pull_request) : [];
  const open   = openRes?.ok   ? (await openRes.json()).filter((i)   => !i.pull_request) : [];

  const total       = closed.length + open.length;
  const closed_count = closed.length;

  // Average close time in hours
  let avg_issue_close_hours = 0;
  if (closed.length > 0) {
    const totalHours = closed.reduce((s, i) => {
      const h = (new Date(i.closed_at) - new Date(i.created_at)) / 3_600_000;
      return s + Math.max(0, h);
    }, 0);
    avg_issue_close_hours = totalHours / closed.length;
  }

  // Age of oldest open issue (days)
  let oldest_open_issue_days = null;
  if (open.length > 0) {
    const oldest = open.reduce((a, b) => (new Date(a.created_at) < new Date(b.created_at) ? a : b));
    oldest_open_issue_days = Math.floor((Date.now() - new Date(oldest.created_at).getTime()) / 86_400_000);
  }

  return { total_issues: total, closed_count, avg_issue_close_hours, oldest_open_issue_days };
}

/** 5. Last 5 releases — grab most recent published_at. */
async function fetchReleases(owner, repo) {
  const res = await ghFetch(`${GH_API}/repos/${owner}/${repo}/releases?per_page=5`);
  if (!res || !res.ok) return { latest_release_at: null };
  const releases = await res.json();
  if (!Array.isArray(releases) || releases.length === 0) return { latest_release_at: null };
  return { latest_release_at: releases[0]?.published_at || null };
}

/** 6. Total contributors count via Link header pagination trick. */
async function fetchContributors(owner, repo) {
  const res = await ghFetch(`${GH_API}/repos/${owner}/${repo}/contributors?per_page=1&anon=false`);
  if (!res || !res.ok) return { total_contributors: 0 };

  const link      = res.headers.get('Link') || '';
  const lastMatch = link.match(/page=(\d+)>; rel="last"/);
  if (lastMatch) return { total_contributors: parseInt(lastMatch[1]) };

  // No pagination link → count items on first (and only) page
  const items = await res.json();
  return { total_contributors: Array.isArray(items) ? items.length : 0 };
}

// ─── Scoring ───────────────────────────────────────────────────────────────────
function calculateScore({ basic, commits, recentStars, issues, releases, contributors }) {
  // ── 1. Momentum (0–30) ──────────────────────────────────────────
  const s7 = recentStars?.stars_last_7_days ?? 0;
  const momentumScore =
    s7 >= 500 ? 30 :
    s7 >= 301 ? 25 :
    s7 >= 101 ? 20 :
    s7 >= 51  ? 15 :
    s7 >= 11  ? 10 :
    s7 >= 1   ? 5  : 0;

  // ── 2. Activity (0–25) ───────────────────────────────────────────
  let activityScore;
  if (commits) {
    const c7 = commits.commits_last_7_days;
    activityScore = c7 >= 20 ? 25 : c7 >= 6 ? 18 : c7 >= 1 ? 10 : 0;
  } else {
    // Fallback: use pushed_at
    const days = Math.floor((Date.now() - new Date(basic.pushed_at).getTime()) / 86_400_000);
    activityScore = days <= 3 ? 25 : days <= 7 ? 20 : days <= 14 ? 15 : days <= 30 ? 10 : days <= 60 ? 5 : 0;
  }

  // ── 3. Community (0–20) ─────────────────────────────────────────
  const f = basic.forks_count || 0;
  const communityScore = f >= 500 ? 20 : f >= 201 ? 18 : f >= 51 ? 14 : f >= 11 ? 8 : f >= 1 ? 2 : 0;

  // ── 4. Issue Health (0–15) ──────────────────────────────────────
  let issueScore = 8; // default: no issues data = neutral
  if (issues && issues.total_issues > 0) {
    const ratio = issues.closed_count / issues.total_issues;
    issueScore = ratio > 0.8 ? 15 : ratio > 0.6 ? 12 : ratio > 0.4 ? 8 : ratio > 0.2 ? 4 : 1;
  }

  // ── 5. Growth Consistency (0–10) ────────────────────────────────
  const daysSinceCreated = Math.max(1, Math.floor((Date.now() - new Date(basic.created_at).getTime()) / 86_400_000));
  const starsPerDay = basic.stargazers_count / daysSinceCreated;
  const growthScore = starsPerDay >= 10 ? 10 : starsPerDay >= 5 ? 7 : starsPerDay >= 1 ? 4 : 1;

  // ── Bonuses ──────────────────────────────────────────────────────

  // Release bonus (up to +5)
  let releaseBonus = 0;
  if (releases?.latest_release_at) {
    const d = Math.floor((Date.now() - new Date(releases.latest_release_at).getTime()) / 86_400_000);
    releaseBonus = d <= 30 ? 5 : d <= 90 ? 3 : 0;
  }

  // Issue response bonus (up to +7)
  let issueResponseBonus = 0;
  if (issues?.avg_issue_close_hours > 0) {
    issueResponseBonus += issues.avg_issue_close_hours <= 48  ? 5 :
                          issues.avg_issue_close_hours <= 168 ? 3 : 0;
  }
  if (issues?.oldest_open_issue_days !== null && issues?.oldest_open_issue_days <= 30) {
    issueResponseBonus += 2;
  }

  // Contributors bonus (up to +12)
  const c = contributors?.total_contributors || 0;
  const contributorsBonus = c >= 100 ? 12 : c >= 51 ? 9 : c >= 21 ? 6 : c >= 6 ? 3 : 0;

  // ── Final ────────────────────────────────────────────────────────
  const rawScore   = momentumScore + activityScore + communityScore + issueScore + growthScore
                   + releaseBonus + issueResponseBonus + contributorsBonus;
  const totalScore = Math.min(100, rawScore);

  const healthGrade =
    totalScore >= 90 ? 'A+' :
    totalScore >= 80 ? 'A'  :
    totalScore >= 70 ? 'B+' :
    totalScore >= 60 ? 'B'  :
    totalScore >= 50 ? 'C+' :
    totalScore >= 40 ? 'C'  :
    totalScore >= 30 ? 'D'  : 'F';

  // Health status based on real commit data
  let healthStatus;
  if (commits) {
    const c7  = commits.commits_last_7_days;
    const c30 = commits.commits_last_30_days || 0;
    healthStatus = c7 >= 10 ? 'Very Active' : c7 >= 5 ? 'Active' : c7 >= 1 ? 'Stable' : c30 > 0 ? 'Slowing' : 'Dormant';
  } else {
    const d = Math.floor((Date.now() - new Date(basic.pushed_at).getTime()) / 86_400_000);
    healthStatus = d <= 7 ? 'Active' : d <= 30 ? 'Stable' : d <= 90 ? 'Slowing' : 'Dormant';
  }

  return {
    total_score:              totalScore,
    raw_score:                rawScore,
    momentum_score:           momentumScore,
    activity_score:           activityScore,
    community_score:          communityScore,
    issue_health_score:       issueScore,
    growth_consistency_score: growthScore,
    release_bonus:            releaseBonus,
    issue_response_bonus:     issueResponseBonus,
    contributors_bonus:       contributorsBonus,
    health_grade:             healthGrade,
    health_status:            healthStatus,
  };
}

// ─── Full data fetch for one repo ─────────────────────────────────────────────
async function fetchRepoFullData(owner, repo, categorySlug) {
  // 1. Basic data
  const basic = await fetchBasicData(owner, repo);
  if (!basic) {
    console.log(`    ✗ ${owner}/${repo} — basic fetch failed, skipping`);
    return null;
  }
  // Hard filter: skip archived, forks, no description
  if (basic.archived || basic.fork || !basic.description?.trim()) return null;

  await sleep(100);

  // 2–6. Parallel fetch of all remaining signals
  const [commitRes, starsRes, issueRes, releaseRes, contribRes] = await Promise.allSettled([
    fetchCommitActivity(owner, repo),
    fetchRecentStars(owner, repo),
    fetchIssueHealth(owner, repo),
    fetchReleases(owner, repo),
    fetchContributors(owner, repo),
  ]);

  const commits      = commitRes.status  === 'fulfilled' ? commitRes.value  : null;
  const recentStars  = starsRes.status   === 'fulfilled' ? starsRes.value   : null;
  const issues       = issueRes.status   === 'fulfilled' ? issueRes.value   : null;
  const releases     = releaseRes.status === 'fulfilled' ? releaseRes.value : null;
  const contributors = contribRes.status === 'fulfilled' ? contribRes.value : null;

  // 7. Score
  const score = calculateScore({ basic, commits, recentStars, issues, releases, contributors });

  console.log(
    `    ✓ ${basic.full_name} — Score: ${score.total_score} (${score.health_grade}) | ` +
    `Stars/wk: ${recentStars?.stars_last_7_days ?? '?'} | ` +
    `Commits/wk: ${commits?.commits_last_7_days ?? 'N/A'}`,
  );

  return {
    // Identity
    github_id:  basic.id,
    name:       basic.full_name,
    owner:      basic.owner.login,
    repo:       basic.name,

    // Metadata
    description: basic.description,
    url:         basic.html_url,
    homepage:    basic.homepage  || null,
    language:    basic.language  || null,
    topics:      basic.topics    || [],
    category:    categorySlug,
    license_name: basic.license?.name || null,
    repo_size_kb: basic.size || 0,

    // Stats
    stars:       basic.stargazers_count,
    forks:       basic.forks_count,
    open_issues: basic.open_issues_count,
    watchers:    basic.watchers_count,

    // Growth
    stars_today:     recentStars?.stars_last_24_hours || 0,
    stars_this_week: recentStars?.stars_last_7_days   || 0,

    // Raw fetched data
    commits_last_7_days:   commits?.commits_last_7_days  ?? null,
    commits_last_30_days:  commits?.commits_last_30_days ?? null,
    commits_last_90_days:  commits?.commits_last_90_days ?? null,
    stars_last_7_days:     recentStars?.stars_last_7_days   || 0,
    stars_last_24_hours:   recentStars?.stars_last_24_hours || 0,
    total_contributors:    contributors?.total_contributors || 0,
    avg_issue_close_hours: issues?.avg_issue_close_hours || 0,
    latest_release_at:     releases?.latest_release_at  || null,

    // Extra signals
    has_homepage:  !!basic.homepage,
    has_topics:    (basic.topics?.length || 0) > 0,
    topics_count:  basic.topics?.length || 0,

    // Dates
    github_created_at: basic.created_at,
    github_pushed_at:  basic.pushed_at,
    fetched_at:        new Date().toISOString(),

    // Period
    period: RUN_TYPE,
    date:   TODAY,

    // Scores
    ...score,
  };
}

// ─── Search repos by topic ─────────────────────────────────────────────────────
async function searchByTopic(topic, perPage = 20) {
  // Only repos with commits in the last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const dateStr = cutoff.toISOString().split('T')[0];

  const q   = `topic:${topic} stars:100..50000 pushed:>${dateStr} fork:false archived:false`;
  const url = `${GH_API}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perPage}`;

  const res = await ghFetch(url);
  if (!res || !res.ok) {
    console.error(`  Search failed for topic "${topic}": ${res?.status ?? 'network error'}`);
    return [];
  }

  const data  = await res.json();
  const items = data.items || [];

  // Double-check filters (API sometimes returns edge cases)
  return items.filter(
    (r) => !r.fork && !r.archived && r.description?.trim() &&
           r.stargazers_count >= 100 && r.stargazers_count <= 50_000,
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nStarting fetch:', RUN_TYPE.toUpperCase());
  console.log('Date:', TODAY);
  console.log('─'.repeat(50));

  // seen map: github_id → true  (dedup across topics)
  const seen = new Set();
  const allRecords = [];

  for (const category of CATEGORIES) {
    console.log(`\nFetching ${category.name}…`);

    const categoryQueue = []; // { owner, repo } objects to process

    for (const topic of category.topics) {
      const items = await searchByTopic(topic, 20);
      await sleep(500); // 500ms between topic searches

      for (const item of items) {
        if (seen.has(item.id)) continue; // already claimed by an earlier category
        seen.add(item.id);
        categoryQueue.push({ owner: item.owner.login, repo: item.name });
      }
    }

    console.log(`  Found ${categoryQueue.length} unique repos for ${category.name}`);

    for (const { owner, repo } of categoryQueue) {
      const record = await fetchRepoFullData(owner, repo, category.slug);
      if (record) allRecords.push(record);
      await sleep(100); // 100ms between repos
    }
  }

  // Sort by score descending before storing
  allRecords.sort((a, b) => b.total_score - a.total_score);

  // ── Upsert to Supabase in chunks of 50 ──────────────────────────
  console.log(`\nUpserting ${allRecords.length} repos to Supabase…`);
  const CHUNK_SIZE = 50;

  for (let i = 0; i < allRecords.length; i += CHUNK_SIZE) {
    const chunk = allRecords.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('trending_repos_v2')
      .upsert(chunk, { onConflict: 'github_id,period,date' });

    if (error) {
      console.error(`  Upsert error (chunk ${Math.floor(i / CHUNK_SIZE) + 1}):`, error.message);
    } else {
      console.log(`  ✓ Chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(allRecords.length / CHUNK_SIZE)} saved`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const top3    = allRecords.slice(0, 3);

  console.log('\n' + '='.repeat(50));
  console.log('FETCH COMPLETE');
  console.log(`Total repos stored : ${allRecords.length}`);
  console.log(`Categories covered : ${CATEGORIES.length}`);
  console.log('Top 3 repos:');
  top3.forEach((r, i) =>
    console.log(`  ${i + 1}. ${r.name} — Score: ${r.total_score} — Grade: ${r.health_grade}`),
  );
  console.log(`API calls used     : ${apiCallCount}/5000`);
  console.log(`Time taken         : ${elapsed}s`);
  console.log('='.repeat(50));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/**
 * Update Trending Repos Table (Daily/Weekly)
 *
 * Full pipeline:
 *   1. Fetch trending repos from GitHub API
 *   2. UPSERT each repo into repos_master (always refresh stars, forks, topics, etc.)
 *   3. Calculate and UPSERT all scores:
 *        - repo_activity  (freshness_score, activity_score, commit_velocity)
 *        - repo_health    (health_score, community_score, activity_score)
 *        - repo_gems      (gem_score + reason) — REQUIRED for get_trending_gems RPC
 *   4. DELETE old rows from trending_repos for this period
 *   5. INSERT fresh trending rows (only repos that qualify as gems)
 *   6. Auto-clean entries older than 7 days (daily) / 4 weeks (weekly)
 *
 * Usage:
 *   node update-trending-repos.js --period=daily
 *   node update-trending-repos.js --period=weekly
 */

const { createClient } = require('@supabase/supabase-js');

// dotenv is optional — in GitHub Actions env vars come from secrets directly
try { require('dotenv').config(); } catch (_) {}

const SUPABASE_URL = process.env.SUPABASE_URL;
// main.yml exposes secret as SUPABASE_SERVICE_KEY; also check SUPABASE_SERVICE_ROLE_KEY for local use
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// GitHub API token pool (supports comma-separated list)
const tokenString = process.env.GH_API_TOKENS || process.env.GITHUB_TOKENS || process.env.GITHUB_TOKEN || '';
const GITHUB_TOKENS = tokenString.split(',').map(t => t.trim()).filter(Boolean);

if (GITHUB_TOKENS.length === 0) {
  console.error('❌ No GitHub tokens found. Set GH_API_TOKENS in .env or GitHub Secrets');
  process.exit(1);
}

let currentTokenIndex = 0;
function getToken() {
  const token = GITHUB_TOKENS[currentTokenIndex];
  currentTokenIndex = (currentTokenIndex + 1) % GITHUB_TOKENS.length;
  return token;
}

// (no custom https agent — native Node 18/20 fetch is used directly)

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getDateKey(periodType) {
  const now = new Date();
  if (periodType === 'daily') {
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  // weekly → Monday of current week
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB API
// ─────────────────────────────────────────────────────────────────────────────

async function fetchGitHubAPI(endpoint, retries = 3) {
  const token = getToken();
  const url = `https://api.github.com${endpoint}`;
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Repoverse-Trending-Updater',
          'Authorization': `token ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 403) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const waitMs = (parseInt(resetTime) * 1000) - Date.now() + 1000;
          if (waitMs > 0 && waitMs < 120_000) {
            console.log(`  ⏳ Rate limited — waiting ${Math.ceil(waitMs / 1000)}s…`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }
        }
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries - 1) { console.error(`  ❌ GitHub API error:`, err.message); return null; }
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  return null;
}

async function searchTrendingRepos(periodType) {
  const daysBack = periodType === 'daily' ? 1 : 7;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const sinceDate = since.toISOString().split('T')[0];

  const strategies = [
    { q: `pushed:>${sinceDate} stars:>20 sort:stars`,    desc: 'Recently active' },
    { q: `created:>${sinceDate} stars:>10 sort:stars`,   desc: 'Brand-new repos' },
    { q: `pushed:>${sinceDate} forks:>5 stars:>15 sort:updated`, desc: 'Active + forked' },
  ];

  const allRepos = new Map();
  for (const { q, desc } of strategies) {
    console.log(`  🔍 ${desc}…`);
    for (let page = 1; page <= 5 && allRepos.size < 1000; page++) {
      const data = await fetchGitHubAPI(`/search/repositories?q=${encodeURIComponent(q)}&per_page=100&page=${page}`);
      if (!data?.items?.length) break;
      data.items.forEach(r => { if (!allRepos.has(r.id)) allRepos.set(r.id, r); });
      if (data.items.length < 100) break;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return Array.from(allRepos.values())
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────────────────────────────

function calcFreshnessScore(pushedAt) {
  if (!pushedAt) return 0.1;
  const daysInactive = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000;
  if (daysInactive <=  30) return 1.00;
  if (daysInactive <=  90) return 0.85;
  if (daysInactive <= 180) return 0.65;
  if (daysInactive <= 365) return 0.45;
  if (daysInactive <= 730) return 0.25;
  return 0.05;
}

function calcCommunityScore(stars, forks, watchers) {
  // Normalize: 10k stars / 1k forks / 500 watchers = roughly 1.0
  const s = Math.min(stars   / 10_000, 1.0);
  const f = Math.min(forks   /  1_000, 1.0);
  const w = Math.min(watchers /   500, 1.0);
  return s * 0.6 + f * 0.3 + w * 0.1;
}

function calcHealthScore({ freshnessScore, activityScore, communityScore, hasDescription, hasTopics, openIssues, forks }) {
  // Penalise repos with tons of open issues relative to forks
  const issueRatio = forks > 0 ? Math.min(openIssues / (forks * 10), 1.0) : 0.5;
  const issuePenalty = 1 - issueRatio * 0.2;

  return Math.min(1.0,
    freshnessScore  * 0.30 +
    activityScore   * 0.25 +
    communityScore  * 0.20 +
    (hasDescription ? 0.10 : 0.0) +
    (hasTopics      ? 0.05 : 0.0) +
    issuePenalty    * 0.10
  );
}

/**
 * Gem score = "underrated quality"
 * High score → high quality, low public awareness (hidden gem)
 * Stars < 1k gets a bonus; Stars > 5k gets penalised.
 */
function calcGemScore({ healthScore, freshnessScore, stars }) {
  const underratedBonus = stars < 500   ? 1.0
                        : stars < 2000  ? 0.85
                        : stars < 5000  ? 0.70
                        : stars < 10000 ? 0.55
                        : stars < 20000 ? 0.40
                        : stars < 35000 ? 0.25
                        : 0.15; // 35k–50k stars — still qualifies but lower bonus

  return Math.min(1.0,
    healthScore    * 0.45 +
    freshnessScore * 0.30 +
    underratedBonus * 0.25
  );
}

function calcTrendingScore({ starVelocity, freshnessScore, healthScore, commitVelocity = 0 }) {
  const normStarVel    = Math.min(starVelocity  / 100, 1.0); // 100 stars/day = max
  const normCommitVel  = Math.min(commitVelocity / 10,  1.0); // 10 commits/day = max
  return (
    normStarVel   * 0.50 +
    normCommitVel * 0.20 +
    (healthScore   || 0.5) * 0.20 +
    (freshnessScore || 0.5) * 0.10
  );
}

// Estimate star velocity from activity proxy (no extra API call)
function estimateStarVelocity(freshnessScore, activityScore) {
  return (activityScore * 0.6 + freshnessScore * 0.4) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE UPSERTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert repo into repos_master AND all score tables.
 * Always overwrites — keeps stars, forks, topics fresh.
 * Returns the computed scores so we don't need to re-fetch them.
 */
async function upsertRepoWithScores(repo) {
  const repoRow = {
    repo_id:           repo.id,
    name:              repo.name,
    full_name:         repo.full_name,
    description:       repo.description || null,
    owner_login:       repo.owner.login,
    avatar_url:        repo.owner.avatar_url,
    html_url:          repo.html_url,
    language:          repo.language || null,
    stars:             repo.stargazers_count,
    forks:             repo.forks_count,
    watchers:          repo.watchers_count,
    open_issues:       repo.open_issues_count,
    topics:            repo.topics || [],
    size_kb:           repo.size || 0,
    created_at:        repo.created_at,
    updated_at:        repo.updated_at,
    pushed_at:         repo.pushed_at,
    last_commit_at:    repo.pushed_at || repo.updated_at,
    archived:          repo.archived || false,
    license:           repo.license?.name || null,
    default_branch:    repo.default_branch || 'main',
    visibility:        repo.visibility || 'public',
    contributors_count: 0,
  };

  const { error: masterErr } = await supabase
    .from('repos_master')
    .upsert(repoRow, { onConflict: 'repo_id' });

  if (masterErr) {
    console.error(`  ❌ repos_master upsert failed for ${repo.full_name}:`, masterErr.message);
    return null;
  }

  // ── Scores ────────────────────────────────────────────────────────────────
  const freshnessScore  = calcFreshnessScore(repo.pushed_at || repo.updated_at);
  const activityScore   = freshnessScore * 0.6; // proxy without commit API
  const communityScore  = calcCommunityScore(repo.stargazers_count, repo.forks_count, repo.watchers_count);
  const healthScore     = calcHealthScore({
    freshnessScore,
    activityScore,
    communityScore,
    hasDescription: !!(repo.description && repo.description.length > 10),
    hasTopics:      !!(repo.topics && repo.topics.length > 0),
    openIssues:     repo.open_issues_count,
    forks:          repo.forks_count,
  });
  const gemScore        = calcGemScore({ healthScore, freshnessScore, stars: repo.stargazers_count });
  const starVelocity    = estimateStarVelocity(freshnessScore, activityScore);
  const trendingScore   = calcTrendingScore({ starVelocity, freshnessScore, healthScore });

  // repo_activity
  await supabase.from('repo_activity').upsert({
    repo_id:         repo.id,
    last_commit_at:  repo.pushed_at || repo.updated_at,
    freshness_score: freshnessScore,
    activity_score:  activityScore,
    commits_30_days: 0, // updated by separate enrichment job
    commits_90_days: 0,
    commit_velocity: 0,
  }, { onConflict: 'repo_id' });

  // repo_health
  await supabase.from('repo_health').upsert({
    repo_id:          repo.id,
    health_score:     healthScore,
    activity_score:   activityScore,
    community_score:  communityScore,
  }, { onConflict: 'repo_id' });

  return { freshnessScore, activityScore, communityScore, healthScore, gemScore, starVelocity, trendingScore };
}

/**
 * Upsert repo_gems row.
 * CRITICAL: get_trending_gems RPC uses INNER JOIN repo_gems — a repo that
 * isn't in repo_gems will NEVER appear in the trending page.
 */
async function upsertGem(repoId, gemScore, repo) {
  const reason = {
    stars:          repo.stargazers_count,
    language:       repo.language,
    has_description: !!(repo.description && repo.description.length > 10),
    has_topics:      !!(repo.topics && repo.topics.length > 0),
    freshness:       calcFreshnessScore(repo.pushed_at || repo.updated_at).toFixed(2),
  };

  const { error } = await supabase.from('repo_gems').upsert({
    repo_id:     repoId,
    gem_score:   parseFloat(gemScore.toFixed(4)),
    reason:      reason,
    updated_at:  new Date().toISOString(),
  }, { onConflict: 'repo_id' });

  if (error) {
    console.error(`  ❌ repo_gems upsert failed for ${repoId}:`, error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const periodArg = process.argv.find(a => a.startsWith('--period='));
  const period = periodArg ? periodArg.split('=')[1] : 'daily';

  if (!['daily', 'weekly'].includes(period)) {
    console.error('❌ --period must be "daily" or "weekly"');
    process.exit(1);
  }

  console.log(`\n🔥 ${period.toUpperCase()} Trending Repos Update`);
  console.log('='.repeat(60));

  const periodDate = getDateKey(period);
  console.log(`📅 Period:      ${period}`);
  console.log(`📅 Period date: ${periodDate}\n`);

  // ── 1. Fetch GitHub ────────────────────────────────────────────────────────
  console.log('🔍 Fetching trending repos from GitHub…\n');
  const trendingRepos = await searchTrendingRepos(period);
  if (!trendingRepos?.length) { console.log('⚠️  No repos found'); return; }
  console.log(`\n✅ ${trendingRepos.length} repos fetched from GitHub\n`);

  // ── 2. Upsert each repo + scores ───────────────────────────────────────────
  console.log('💾 Upserting repos + calculating scores…\n');

  const GEM_STAR_MAX   = 50000; // above this → not a "hidden gem"
  const GEM_STAR_MIN   = 10;   // below this → too obscure
  const GEM_DESC_MIN   = 10;   // chars

  const trendingToInsert = [];
  let upserted = 0;
  let gemsFound = 0;

  for (const repo of trendingRepos) {
    process.stdout.write(`  [${upserted + 1}/${trendingRepos.length}] ${repo.full_name.substring(0, 55).padEnd(55)}\r`);

    const scores = await upsertRepoWithScores(repo);
    if (!scores) { upserted++; continue; }

    upserted++;

    // Determine if it qualifies as a gem
    const isGem = (
      repo.stargazers_count >= GEM_STAR_MIN &&
      repo.stargazers_count <= GEM_STAR_MAX &&
      repo.description &&
      repo.description.length > GEM_DESC_MIN &&
      scores.healthScore >= 0.35
    );

    if (isGem) {
      // CRITICAL: upsert into repo_gems so the RPC can JOIN it
      await upsertGem(repo.id, scores.gemScore, repo);
      gemsFound++;

      trendingToInsert.push({
        repo_id:        repo.id,
        period_type:    period,
        period_date:    periodDate,
        trending_score: parseFloat(scores.trendingScore.toFixed(4)),
        star_velocity:  parseFloat(scores.starVelocity.toFixed(2)),
        cluster_slug:   detectCluster(repo),
      });
    }

    // Small pause every 20 repos to be nice to Supabase
    if (upserted % 20 === 0) await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n\n✅ Upserted ${upserted} repos to repos_master`);
  console.log(`💎 ${gemsFound} qualify as trending gems\n`);

  // ── 3. Sort + rank ─────────────────────────────────────────────────────────
  trendingToInsert.sort((a, b) => b.trending_score - a.trending_score);
  trendingToInsert.forEach((item, i) => { item.rank = i + 1; });

  // ── 4. Delete old rows for this period_type + period_date ─────────────────
  console.log('🗑️  Removing stale trending rows for today's period…');
  const { error: delErr } = await supabase
    .from('trending_repos')
    .delete()
    .eq('period_type', period)
    .eq('period_date', periodDate);

  if (delErr) console.error('  ❌ Delete error:', delErr.message);
  else        console.log('  ✅ Stale rows deleted\n');

  // ── 5. Insert fresh rows ───────────────────────────────────────────────────
  if (trendingToInsert.length > 0) {
    console.log(`💾 Inserting ${trendingToInsert.length} trending rows…`);
    const batchSize = 100;
    for (let i = 0; i < trendingToInsert.length; i += batchSize) {
      const batch = trendingToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('trending_repos').insert(batch);
      if (error) console.error(`  ❌ Insert batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    }
    console.log(`  ✅ Inserted ${trendingToInsert.length} trending gems\n`);
  } else {
    console.log('⚠️  No gems to insert (check GEM_STAR_MAX / health threshold)\n');
  }

  // ── 6. Auto-clean old entries ──────────────────────────────────────────────
  const keepDays = period === 'daily' ? 7 : 28;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  console.log(`🧹 Cleaning entries older than ${cutoffStr} (keep ${keepDays} days)…`);
  const { error: cleanErr } = await supabase
    .from('trending_repos')
    .delete()
    .eq('period_type', period)
    .lt('period_date', cutoffStr);

  if (cleanErr) console.error('  ❌ Cleanup error:', cleanErr.message);
  else          console.log(`  ✅ Old entries removed\n`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('='.repeat(60));
  console.log('🎉 Done!\n');
  console.log(`  📥 Repos upserted to repos_master: ${upserted}`);
  console.log(`  💎 Gems registered in repo_gems:   ${gemsFound}`);
  console.log(`  🔥 Trending rows inserted:         ${trendingToInsert.length}`);
  console.log(`\n  Query: supabase.rpc('get_trending_gems', { p_period_type: '${period}' })\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY DETECTION
// Maps a GitHub repo to a cluster_slug (matches existing onboarding clusters)
// ─────────────────────────────────────────────────────────────────────────────

function detectCluster(repo) {
  const lang   = (repo.language || '').toLowerCase();
  const topics = (repo.topics || []).map(t => t.toLowerCase());
  const text   = `${repo.description || ''} ${topics.join(' ')}`.toLowerCase();

  // AI / ML
  if (['python', 'jupyter notebook'].includes(lang) ||
      topics.some(t => ['machine-learning','deep-learning','ai','llm','gpt','transformer','pytorch','tensorflow','huggingface'].includes(t)) ||
      text.includes('large language') || text.includes('neural network')) return 'ai_ml';

  // DevOps / Cloud
  if (['go', 'shell', 'dockerfile', 'hcl'].includes(lang) ||
      topics.some(t => ['devops','docker','kubernetes','k8s','helm','terraform','ci-cd','cloud','aws','gcp'].includes(t)))
    return 'devops';

  // Mobile
  if (['swift', 'kotlin', 'dart', 'objective-c'].includes(lang) ||
      topics.some(t => ['ios','android','flutter','react-native','mobile'].includes(t)))
    return 'mobile';

  // Data Science
  if (topics.some(t => ['data-science','pandas','numpy','jupyter','analytics','visualization','etl'].includes(t)))
    return 'data_science';

  // Cybersecurity
  if (topics.some(t => ['security','cybersecurity','penetration-testing','ctf','hacking','cryptography'].includes(t)))
    return 'cybersecurity';

  // Blockchain
  if (topics.some(t => ['blockchain','web3','ethereum','solidity','defi','nft','crypto'].includes(t)))
    return 'blockchain';

  // Game Dev
  if (topics.some(t => ['game','gamedev','unity','unreal','godot','pygame'].includes(t)))
    return 'game_dev';

  // Automation / Bots
  if (topics.some(t => ['automation','bot','workflow','scraping','rpa'].includes(t)))
    return 'automation';

  // Web / Frontend / Backend
  if (['typescript', 'javascript', 'html', 'css', 'vue', 'svelte'].includes(lang)) return 'web_dev';
  if (['java', 'ruby', 'php', 'elixir', 'scala', 'c#'].includes(lang))             return 'web_dev';
  if (['rust', 'c', 'c++', 'zig', 'assembly'].includes(lang))                       return 'systems';

  return 'open_source_tools'; // catch-all
}

main().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });

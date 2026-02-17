/**
 * Enrich All Repos - Complete all enrichment tables
 * 
 * This script enriches all repos in repos_master by populating:
 * - repo_cluster_new (assigns clusters)
 * - repo_tech_stack
 * - repo_complexity
 * - repo_activity
 * - repo_health
 * - repo_badges
 * - repo_gems
 * 
 * Usage: node enrich-all-repos.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'YOUR_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cluster detection keywords
const CLUSTER_KEYWORDS = {
  'ai_ml': ['machine-learning', 'artificial-intelligence', 'deep-learning', 'neural-network', 'tensorflow', 'pytorch', 'ml', 'ai', 'neural', 'keras'],
  'web_dev': ['web-development', 'frontend', 'backend', 'react', 'vue', 'angular', 'nextjs', 'html', 'css', 'javascript', 'web'],
  'devops': ['devops', 'docker', 'kubernetes', 'infrastructure', 'ci-cd', 'terraform', 'deployment'],
  'data_science': ['data-science', 'data-analysis', 'pandas', 'jupyter', 'analytics', 'data-visualization', 'numpy'],
  'mobile': ['mobile', 'ios', 'android', 'flutter', 'react-native', 'mobile-app', 'swift', 'kotlin'],
  'automation': ['automation', 'bot', 'workflow', 'task-automation', 'scheduler', 'script'],
  'cybersecurity': ['security', 'cybersecurity', 'encryption', 'authentication', 'vulnerability', 'hacking'],
  'blockchain': ['blockchain', 'crypto', 'ethereum', 'web3', 'solidity', 'defi', 'bitcoin'],
  'game_dev': ['game-development', 'gaming', 'unity', 'unreal-engine', 'game-engine', 'game', 'gamedev'],
  'open_source_tools': ['tool', 'utility', 'cli', 'developer-tools', 'productivity', 'library', 'framework']
};

const REPO_TYPE_KEYWORDS = {
  'tutorial': ['tutorial', 'guide', 'learn', 'example', 'getting-started', 'introduction', 'course'],
  'boilerplate': ['boilerplate', 'starter', 'template', 'scaffold', 'seed'],
  'full_app': ['app', 'application', 'dashboard', 'platform', 'system'],
  'production_saas': ['saas', 'service', 'api', 'platform', 'enterprise', 'production'],
  'infrastructure': ['framework', 'library', 'engine', 'orchestration', 'infrastructure', 'toolkit']
};

function classifyRepoType(repo) {
  const text = `${repo.description || ''} ${(repo.topics || []).join(' ')} ${repo.name || ''}`.toLowerCase();
  
  for (const [type, keywords] of Object.entries(REPO_TYPE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return type;
    }
  }
  
  const stars = repo.stars || 0;
  const size = repo.size_kb || 0;
  
  if (stars > 10000 || size > 100000) return 'infrastructure';
  if (stars > 5000 && size > 50000) return 'production_saas';
  return 'full_app';
}

function detectClusters(repo) {
  const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const clusters = [];
  
  for (const [slug, keywords] of Object.entries(CLUSTER_KEYWORDS)) {
    const matches = keywords.filter(kw => text.includes(kw) || (repo.topics || []).includes(kw)).length;
    if (matches > 0) {
      const weight = Math.min(matches / keywords.length, 1.0);
      clusters.push({
        cluster_slug: slug,
        weight: Math.max(weight, 0.5),
        confidence_score: Math.min(0.7 + (matches * 0.1), 1.0) // Cap at 1.0
      });
    }
  }
  
  // Sort by weight and take top 3
  return clusters.sort((a, b) => b.weight - a.weight).slice(0, 3);
}

function isGem(repo, health, activity) {
  if (!health || !activity) return false;
  
  const stars = repo.stars || 0;
  const contributors = repo.contributors_count || 0;
  
  return (
    stars < 1000 &&
    health.health_score > 0.8 &&
    activity.freshness_score > 0.7 &&
    health.documentation_score > 0.7 &&
    contributors > 3
  );
}

async function enrichSingleRepo(repo) {
  try {
    const repoId = repo.repo_id;
    
    // Validate repo has required fields
    if (!repoId) {
      console.error(`  ❌ Repo missing repo_id:`, repo);
      return { success: false, repoId: null, error: 'Missing repo_id' };
    }
    
    const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
    const operations = [];
    
    // 1. Assign clusters
    const clusters = detectClusters(repo);
    for (const cluster of clusters) {
      operations.push(
        supabase
          .from('repo_cluster_new')
          .upsert({
            repo_id: repoId,
            cluster_slug: cluster.cluster_slug,
            weight: cluster.weight,
            confidence_score: cluster.confidence_score
          }, { onConflict: 'repo_id,cluster_slug' })
      );
    }
    
    // 2. Detect tech stack
    const language = repo.language?.toLowerCase();
    const techStack = [];
    
    if (language) {
      const languageMap = {
        'javascript': 'javascript', 'typescript': 'javascript',
        'python': 'python', 'java': 'java', 'go': 'go', 'rust': 'rust'
      };
      
      if (languageMap[language]) {
        techStack.push({ tech_slug: languageMap[language], weight: 1.0 });
      }
    }
    
    const frameworkKeywords = {
      'react': 'react', 'vue': 'vue', 'angular': 'angular', 'nextjs': 'nextjs',
      'django': 'django', 'flask': 'flask', 'fastapi': 'fastapi',
      'docker': 'docker', 'kubernetes': 'kubernetes', 'terraform': 'terraform'
    };
    
    for (const [keyword, tech] of Object.entries(frameworkKeywords)) {
      if (text.includes(keyword)) {
        techStack.push({ tech_slug: tech, weight: 0.8 });
      }
    }
    
    // Handle tech_stack separately due to composite unique constraint
    // We'll do this after other operations to avoid blocking
    const techStackOps = [];
    for (const tech of techStack) {
      techStackOps.push(
        (async () => {
          // Try insert first
          const insertResult = await supabase
            .from('repo_tech_stack')
            .insert({
              repo_id: repoId,
              tech_slug: tech.tech_slug,
              weight: tech.weight
            });
          
          // If duplicate error, update instead
          if (insertResult.error && 
              (insertResult.error.code === '23505' || 
               insertResult.error.message.includes('duplicate') ||
               insertResult.error.message.includes('unique'))) {
            const updateResult = await supabase
              .from('repo_tech_stack')
              .update({ weight: tech.weight })
              .eq('repo_id', repoId)
              .eq('tech_slug', tech.tech_slug);
            return updateResult;
          }
          
          return insertResult;
        })()
      );
    }
    
    // 3. Classify complexity
    const repoType = classifyRepoType(repo);
    const complexitySlug = repoType;
    
    operations.push(
      supabase
        .from('repo_complexity')
        .upsert({
          repo_id: repoId,
          complexity_slug: complexitySlug,
          confidence: 0.8,
          loc_bucket: repo.size_kb < 10000 ? 'small' : repo.size_kb < 50000 ? 'medium' : 'large'
        }, { onConflict: 'repo_id' })
    );
    
    // 4. Compute activity
    const lastCommitAt = repo.pushed_at || repo.updated_at || repo.last_commit_at;
    const daysInactive = lastCommitAt ? 
      (Date.now() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24) : 999;
    
    const freshnessScore = daysInactive <= 30 ? 1.0 :
      daysInactive <= 90 ? 0.85 :
      daysInactive <= 180 ? 0.65 :
      daysInactive <= 365 ? 0.45 : 0.25;
    
    operations.push(
      supabase
        .from('repo_activity')
        .upsert({
          repo_id: repoId,
          last_commit_at: lastCommitAt,
          commits_30_days: 0,
          commits_90_days: 0,
          commit_velocity: 0,
          freshness_score: freshnessScore,
          activity_score: freshnessScore * 0.6
        }, { onConflict: 'repo_id' })
    );
    
    // 5. Compute health
    const activityScore = freshnessScore * 0.6;
    const communityScore = Math.min((repo.stars / 100000 + repo.forks / 10000) / 2, 1.0);
    const maintenanceScore = Math.min(activityScore + (1 - Math.min((repo.open_issues || 0) / 100, 1.0)) * 0.3, 1.0);
    const codeQuality = 0.7 + (activityScore * 0.3);
    const documentationScore = repo.description ? 0.8 : 0.3;
    const age = repo.created_at ? (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365) : 0;
    const stabilityScore = Math.min(age / 5, 1.0) * 0.7 + activityScore * 0.3;
    
    const healthScore = (
      activityScore * 0.25 +
      maintenanceScore * 0.20 +
      communityScore * 0.20 +
      codeQuality * 0.15 +
      documentationScore * 0.10 +
      stabilityScore * 0.10
    );
    
    operations.push(
      supabase
        .from('repo_health')
        .upsert({
          repo_id: repoId,
          activity_score: activityScore,
          maintenance_score: maintenanceScore,
          community_score: communityScore,
          code_quality_score: codeQuality,
          documentation_score: documentationScore,
          stability_score: stabilityScore,
          health_score: healthScore
        }, { onConflict: 'repo_id' })
    );
    
    // 6. Assign badges
    const badges = [];
    if (healthScore > 0.85) badges.push('well_maintained');
    if (freshnessScore > 0.85) badges.push('actively_updated');
    if (complexitySlug === 'tutorial' && documentationScore > 0.7) badges.push('beginner_friendly');
    if (healthScore > 0.8 && freshnessScore > 0.7) badges.push('production_ready');
    
    for (const badge of badges) {
      operations.push(
        supabase
          .from('repo_badges')
          .upsert({ repo_id: repoId, badge_slug: badge }, { onConflict: 'repo_id,badge_slug' })
      );
    }
    
    // Execute main operations in parallel
    const results = await Promise.allSettled(operations);
    const errors = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        errors.push({ index: i, error: result.reason });
      } else if (result.status === 'fulfilled') {
        // Check Supabase response for errors
        const response = result.value;
        if (response.error) {
          errors.push({ index: i, error: response.error });
        }
      }
    }
    
    // Execute tech_stack operations separately
    if (techStackOps.length > 0) {
      const techResults = await Promise.allSettled(techStackOps);
      for (const techResult of techResults) {
        if (techResult.status === 'rejected') {
          errors.push({ index: 'tech_stack', error: techResult.reason });
        } else if (techResult.status === 'fulfilled' && techResult.value.error) {
          errors.push({ index: 'tech_stack', error: techResult.value.error });
        }
      }
    }
    
    if (errors.length > 0) {
      const errorMessages = errors.map(e => {
        const err = e.error;
        if (err?.message) return err.message;
        if (typeof err === 'string') return err;
        return JSON.stringify(err);
      });
      // Only log if there are significant errors (not just tech_stack duplicates)
      const significantErrors = errors.filter(e => {
        const err = e.error;
        const msg = err?.message || '';
        return !msg.includes('duplicate') && !msg.includes('23505');
      });
      if (significantErrors.length > 0) {
        console.error(`  ⚠️  ${significantErrors.length} operations failed for repo ${repoId}`);
      }
    }
    
    // 7. Detect gems (needs health/activity data, so do after)
    const { data: health } = await supabase
      .from('repo_health')
      .select('*')
      .eq('repo_id', repoId)
      .single();
    
    const { data: activity } = await supabase
      .from('repo_activity')
      .select('*')
      .eq('repo_id', repoId)
      .single();
    
    if (isGem(repo, health, activity)) {
      const gemScore = (
        (health.health_score * 0.3) +
        (activity.freshness_score * 0.3) +
        (health.documentation_score * 0.2) +
        (Math.min((repo.contributors_count || 0) / 10, 1.0) * 0.2)
      );
      
      const { error: gemError } = await supabase
        .from('repo_gems')
        .upsert({
          repo_id: repoId,
          gem_score: gemScore,
          reason: {
            health_score: health.health_score,
            freshness_score: activity.freshness_score,
            documentation_score: health.documentation_score,
            contributors: repo.contributors_count
          }
        }, { onConflict: 'repo_id' });
      
      if (gemError) {
        console.error(`  ⚠️  Gem insertion failed for repo ${repoId}:`, gemError.message);
      }
    }
    
    return { success: true, repoId };
  } catch (error) {
    console.error(`  ❌ Error enriching repo ${repo.repo_id}:`, error.message, error.stack);
    return { success: false, repoId: repo.repo_id, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Enrichment of All Repos\n');
  console.log('='.repeat(60));
  
  // Get all repos from repos_master (fetch in batches to handle large datasets)
  console.log('📊 Fetching all repos from repos_master...');
  let allRepos = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data: repos, error: fetchError } = await supabase
      .from('repos_master')
      .select('*')
      .order('repo_id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (fetchError) {
      console.error('❌ Error fetching repos:', fetchError);
      process.exit(1);
    }
    
    if (!repos || repos.length === 0) {
      hasMore = false;
    } else {
      allRepos = allRepos.concat(repos);
      console.log(`  📦 Fetched ${allRepos.length} repos so far...`);
      
      if (repos.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }
  
  if (allRepos.length === 0) {
    console.log('⚠️  No repos found in repos_master');
    process.exit(0);
  }
  
  console.log(`✅ Found ${allRepos.length} total repos to enrich\n`);
  
  // Check which repos are already enriched (fetch in batches)
  console.log('🔍 Checking enrichment status...');
  const enrichedIds = new Set();
  let healthPage = 0;
  let hasMoreHealth = true;
  
  while (hasMoreHealth) {
    const { data: healthData } = await supabase
      .from('repo_health')
      .select('repo_id')
      .range(healthPage * 1000, (healthPage + 1) * 1000 - 1);
    
    if (healthData && healthData.length > 0) {
      healthData.forEach(r => enrichedIds.add(r.repo_id));
      if (healthData.length < 1000) hasMoreHealth = false;
      else healthPage++;
    } else {
      hasMoreHealth = false;
    }
  }
  
  const reposToEnrich = allRepos.filter(r => !enrichedIds.has(r.repo_id));
  const alreadyEnriched = allRepos.length - reposToEnrich.length;
  
  console.log(`  ✅ Already enriched: ${alreadyEnriched}`);
  console.log(`  ⏳ Need enrichment: ${reposToEnrich.length}\n`);
  
  if (reposToEnrich.length === 0) {
    console.log('🎉 All repos are already enriched!');
    return;
  }
  
  // Process in batches of 50 for parallel processing
  const BATCH_SIZE = 50;
  let processed = 0;
  let successCount = 0;
  let errorCount = 0;
  
  console.log(`🔄 Processing ${reposToEnrich.length} repos in batches of ${BATCH_SIZE}...\n`);
  
  for (let i = 0; i < reposToEnrich.length; i += BATCH_SIZE) {
    const batch = reposToEnrich.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(reposToEnrich.length / BATCH_SIZE);
    
    console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} repos)...`);
    
    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(repo => enrichSingleRepo(repo))
    );
    
    // Count successes and errors
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successCount++;
        } else {
          errorCount++;
          // Log the specific error
          if (result.value.errors && result.value.errors.length > 0) {
            console.error(`  ⚠️  Repo ${result.value.repoId} had errors:`, result.value.errors);
          }
        }
      } else {
        errorCount++;
        console.error(`  ⚠️  Repo processing failed:`, result.reason);
      }
      processed++;
    }
    
    // Progress update
    const progress = ((processed / reposToEnrich.length) * 100).toFixed(1);
    console.log(`  ✅ Progress: ${processed}/${reposToEnrich.length} (${progress}%) | ✅ ${successCount} | ❌ ${errorCount}\n`);
    
    // Small delay to avoid overwhelming the database
    if (i + BATCH_SIZE < reposToEnrich.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('='.repeat(60));
  console.log('🎉 Enrichment Complete!\n');
  console.log(`📊 Summary:`);
  console.log(`  ✅ Successfully enriched: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📈 Total processed: ${processed}`);
  
  // Final status check (using count queries)
  console.log('\n🔍 Final Status Check:');
  const { count: finalHealthCount } = await supabase
    .from('repo_health')
    .select('*', { count: 'exact', head: true });
  
  const { count: finalActivityCount } = await supabase
    .from('repo_activity')
    .select('*', { count: 'exact', head: true });
  
  const { count: finalComplexityCount } = await supabase
    .from('repo_complexity')
    .select('*', { count: 'exact', head: true });
  
  const { count: finalTechStackCount } = await supabase
    .from('repo_tech_stack')
    .select('*', { count: 'exact', head: true });
  
  const { count: finalBadgesCount } = await supabase
    .from('repo_badges')
    .select('*', { count: 'exact', head: true });
  
  const { count: finalGemsCount } = await supabase
    .from('repo_gems')
    .select('*', { count: 'exact', head: true });
  
  const { count: finalClustersCount } = await supabase
    .from('repo_cluster_new')
    .select('*', { count: 'exact', head: true });
  
  console.log(`  📊 repos_master: ${allRepos.length}`);
  console.log(`  🏥 repo_health: ${finalHealthCount || 0}`);
  console.log(`  ⚡ repo_activity: ${finalActivityCount || 0}`);
  console.log(`  📦 repo_complexity: ${finalComplexityCount || 0}`);
  console.log(`  🔧 repo_tech_stack: ${finalTechStackCount || 0}`);
  console.log(`  🏅 repo_badges: ${finalBadgesCount || 0}`);
  console.log(`  💎 repo_gems: ${finalGemsCount || 0}`);
  console.log(`  🏷️  repo_cluster_new: ${finalClustersCount || 0}`);
}

main().catch(console.error);

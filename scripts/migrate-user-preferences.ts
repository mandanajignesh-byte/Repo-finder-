/**
 * Migration Script: Update existing user preferences to new structure
 * Adds primaryCluster and secondaryClusters based on existing interests/techStack
 * 
 * Usage: npx tsx scripts/migrate-user-preferences.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Map interest ID to cluster name
 */
function interestToCluster(interest: string): string | null {
  const mapping: Record<string, string> = {
    'web-frontend': 'frontend',
    'web-backend': 'backend',
    'mobile': 'mobile',
    'desktop': 'desktop',
    'data-science': 'data-science',
    'devops': 'devops',
    'game-dev': 'game-dev',
    'ai-ml': 'ai-ml',
  };
  return mapping[interest] || null;
}

/**
 * Infer cluster from tech stack
 */
function inferClusterFromTechStack(techStack: string[]): string | null {
  const tech = techStack.map(t => t.toLowerCase());
  
  // Frontend frameworks
  if (tech.some(t => ['react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt'].includes(t))) {
    return 'frontend';
  }
  
  // Backend frameworks
  if (tech.some(t => ['express', 'django', 'flask', 'fastapi', 'spring', 'laravel'].includes(t))) {
    return 'backend';
  }
  
  // Mobile frameworks
  if (tech.some(t => ['flutter', 'react native', 'ionic', 'electron'].includes(t))) {
    return 'mobile';
  }
  
  // AI/ML
  if (tech.some(t => ['tensorflow', 'pytorch', 'pandas', 'numpy'].includes(t))) {
    return 'ai-ml';
  }
  
  // Data Science
  if (tech.some(t => ['pandas', 'numpy', 'jupyter', 'r'].includes(t))) {
    return 'data-science';
  }
  
  // DevOps
  if (tech.some(t => ['docker', 'kubernetes', 'terraform', 'ansible'].includes(t))) {
    return 'devops';
  }
  
  // Game Dev
  if (tech.some(t => ['unity', 'unreal', 'godot'].includes(t))) {
    return 'game-dev';
  }
  
  // Desktop
  if (tech.some(t => ['electron', 'tauri', 'qt'].includes(t))) {
    return 'desktop';
  }
  
  return null;
}

async function migrateUserPreferences() {
  console.log('🔄 Starting user preferences migration...\n');
  
  try {
    // Get all user preferences
    const { data: preferences, error: fetchError } = await supabase
      .from('user_preferences')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Error fetching preferences:', fetchError);
      return;
    }
    
    if (!preferences || preferences.length === 0) {
      console.log('✅ No user preferences to migrate');
      return;
    }
    
    console.log(`📊 Found ${preferences.length} user preference records\n`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const pref of preferences) {
      // Skip if already has primary_cluster
      if (pref.primary_cluster) {
        console.log(`⏭️  User ${pref.user_id}: Already has primary_cluster (${pref.primary_cluster}), skipping`);
        skipped++;
        continue;
      }
      
      let primaryCluster: string | null = null;
      const secondaryClusters: string[] = [];
      
      // Try to infer from interests first
      if (pref.interests && pref.interests.length > 0) {
        const firstInterest = pref.interests[0];
        primaryCluster = interestToCluster(firstInterest);
        
        // Add remaining interests as secondary
        for (let i = 1; i < pref.interests.length; i++) {
          const cluster = interestToCluster(pref.interests[i]);
          if (cluster && cluster !== primaryCluster) {
            secondaryClusters.push(cluster);
          }
        }
      }
      
      // If no primary cluster from interests, try tech stack
      if (!primaryCluster && pref.tech_stack && pref.tech_stack.length > 0) {
        primaryCluster = inferClusterFromTechStack(pref.tech_stack);
      }
      
      // Default to frontend if still no cluster
      if (!primaryCluster) {
        primaryCluster = 'frontend';
        console.log(`⚠️  User ${pref.user_id}: No cluster detected, defaulting to frontend`);
      }
      
      // Update the preference
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({
          primary_cluster: primaryCluster,
          secondary_clusters: secondaryClusters,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', pref.user_id);
      
      if (updateError) {
        console.error(`❌ Error updating user ${pref.user_id}:`, updateError);
      } else {
        console.log(`✅ User ${pref.user_id}: ${primaryCluster}${secondaryClusters.length > 0 ? ` + ${secondaryClusters.join(', ')}` : ''}`);
        migrated++;
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUserPreferences();
}

export { migrateUserPreferences };

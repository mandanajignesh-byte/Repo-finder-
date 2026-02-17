-- ============================================
-- Populate Sample Data for Testing
-- Use this to test your schema with sample data
-- ============================================

-- ============================================
-- STEP 1: Insert Sample Repos (repos_master)
-- ============================================
INSERT INTO repos_master (
  repo_id, name, full_name, description, owner_login, 
  avatar_url, html_url, language, stars, forks, watchers,
  open_issues, topics, size_kb, created_at, updated_at, 
  pushed_at, last_commit_at, archived, license
) VALUES
  -- Popular AI/ML repo
  (123456789, 'tensorflow', 'tensorflow/tensorflow', 'An Open Source Machine Learning Framework', 'tensorflow',
   'https://avatars.githubusercontent.com/u/15658638?v=4', 'https://github.com/tensorflow/tensorflow',
   'C++', 180000, 88000, 5000, 2500, 
   '["machine-learning", "deep-learning", "neural-network", "tensorflow"]'::jsonb,
   500000, '2015-11-09 00:00:00+00', '2024-01-15 10:00:00+00', 
   '2024-01-15 09:00:00+00', '2024-01-14 12:00:00+00', FALSE, 'Apache-2.0'),
  
  -- Web Dev repo
  (987654321, 'react', 'facebook/react', 'A JavaScript library for building user interfaces', 'facebook',
   'https://avatars.githubusercontent.com/u/69631?v=4', 'https://github.com/facebook/react',
   'JavaScript', 220000, 45000, 8000, 600,
   '["react", "javascript", "ui", "frontend"]'::jsonb,
   200000, '2013-05-24 00:00:00+00', '2024-01-16 08:00:00+00',
   '2024-01-16 07:00:00+00', '2024-01-15 14:00:00+00', FALSE, 'MIT'),
   
  -- Mobile repo
  (456789123, 'flutter', 'flutter/flutter', 'Flutter SDK', 'flutter',
   'https://avatars.githubusercontent.com/u/14101776?v=4', 'https://github.com/flutter/flutter',
   'Dart', 160000, 25000, 3000, 800,
   '["flutter", "dart", "mobile", "cross-platform"]'::jsonb,
   300000, '2015-05-20 00:00:00+00', '2024-01-16 10:00:00+00',
   '2024-01-16 09:00:00+00', '2024-01-15 16:00:00+00', FALSE, 'BSD-3-Clause'),
   
  -- DevOps repo
  (789123456, 'kubernetes', 'kubernetes/kubernetes', 'Production-Grade Container Orchestration', 'kubernetes',
   'https://avatars.githubusercontent.com/u/13629408?v=4', 'https://github.com/kubernetes/kubernetes',
   'Go', 110000, 38000, 2000, 1200,
   '["kubernetes", "container", "orchestration", "devops"]'::jsonb,
   800000, '2014-06-07 00:00:00+00', '2024-01-16 11:00:00+00',
   '2024-01-16 10:00:00+00', '2024-01-15 18:00:00+00', FALSE, 'Apache-2.0'),
   
  -- Data Science repo
  (321654987, 'pandas', 'pandas-dev/pandas', 'Flexible and powerful data analysis / manipulation library', 'pandas-dev',
   'https://avatars.githubusercontent.com/u/21206976?v=4', 'https://github.com/pandas-dev/pandas',
   'Python', 42000, 18000, 1500, 300,
   '["python", "data-science", "data-analysis", "pandas"]'::jsonb,
   150000, '2010-01-15 00:00:00+00', '2024-01-15 15:00:00+00',
   '2024-01-15 14:00:00+00', '2024-01-14 10:00:00+00', FALSE, 'BSD-3-Clause')
ON CONFLICT (repo_id) DO NOTHING;

-- ============================================
-- STEP 2: Insert Repo Clusters (repo_cluster_new)
-- ============================================
INSERT INTO repo_cluster_new (repo_id, cluster_slug, weight, confidence_score) VALUES
  -- TensorFlow: AI/ML + Automation
  (123456789, 'ai_ml', 0.95, 0.98),
  (123456789, 'automation', 0.60, 0.75),
  
  -- React: Web Dev
  (987654321, 'web_dev', 0.98, 0.99),
  
  -- Flutter: Mobile
  (456789123, 'mobile', 0.97, 0.99),
  
  -- Kubernetes: DevOps
  (789123456, 'devops', 0.96, 0.98),
  (789123456, 'infrastructure', 0.85, 0.90),
  
  -- Pandas: Data Science
  (321654987, 'data_science', 0.94, 0.97),
  (321654987, 'ai_ml', 0.70, 0.80)
ON CONFLICT (repo_id, cluster_slug) DO NOTHING;

-- ============================================
-- STEP 3: Insert Repo Tech Stack
-- ============================================
INSERT INTO repo_tech_stack (repo_id, tech_slug, weight) VALUES
  -- TensorFlow
  (123456789, 'python', 0.95),
  (123456789, 'tensorflow', 1.0),
  (123456789, 'c++', 0.80),
  
  -- React
  (987654321, 'javascript', 1.0),
  (987654321, 'react', 1.0),
  (987654321, 'nodejs', 0.60),
  
  -- Flutter
  (456789123, 'dart', 1.0),
  (456789123, 'flutter', 1.0),
  
  -- Kubernetes
  (789123456, 'go', 1.0),
  (789123456, 'kubernetes', 1.0),
  (789123456, 'docker', 0.85),
  
  -- Pandas
  (321654987, 'python', 1.0),
  (321654987, 'pandas', 1.0)
ON CONFLICT (repo_id, tech_slug) DO NOTHING;

-- ============================================
-- STEP 4: Insert Repo Complexity
-- ============================================
INSERT INTO repo_complexity (repo_id, complexity_slug, confidence, loc_bucket) VALUES
  (123456789, 'framework', 0.95, 'xlarge'),
  (987654321, 'framework', 0.98, 'large'),
  (456789123, 'framework', 0.97, 'xlarge'),
  (789123456, 'infrastructure', 0.99, 'xlarge'),
  (321654987, 'full_app', 0.90, 'large')
ON CONFLICT (repo_id) DO UPDATE
SET complexity_slug = EXCLUDED.complexity_slug,
    confidence = EXCLUDED.confidence,
    loc_bucket = EXCLUDED.loc_bucket;

-- ============================================
-- STEP 5: Insert Repo Activity
-- ============================================
INSERT INTO repo_activity (
  repo_id, last_commit_at, commits_30_days, commits_90_days, 
  commit_velocity, freshness_score, activity_score
) VALUES
  (123456789, '2024-01-14 12:00:00+00', 45, 120, 1.33, 1.0, 0.95),
  (987654321, '2024-01-15 14:00:00+00', 38, 95, 1.06, 1.0, 0.92),
  (456789123, '2024-01-15 16:00:00+00', 52, 140, 1.56, 1.0, 0.97),
  (789123456, '2024-01-15 18:00:00+00', 28, 75, 0.83, 1.0, 0.88),
  (321654987, '2024-01-14 10:00:00+00', 22, 58, 0.64, 1.0, 0.85)
ON CONFLICT (repo_id) DO UPDATE
SET last_commit_at = EXCLUDED.last_commit_at,
    commits_30_days = EXCLUDED.commits_30_days,
    commits_90_days = EXCLUDED.commits_90_days,
    commit_velocity = EXCLUDED.commit_velocity,
    freshness_score = EXCLUDED.freshness_score,
    activity_score = EXCLUDED.activity_score;

-- ============================================
-- STEP 6: Insert Repo Health
-- ============================================
INSERT INTO repo_health (
  repo_id, activity_score, maintenance_score, community_score,
  code_quality_score, documentation_score, stability_score, health_score
) VALUES
  (123456789, 0.95, 0.88, 0.92, 0.85, 0.90, 0.87, 0.90),
  (987654321, 0.92, 0.95, 0.98, 0.88, 0.85, 0.90, 0.92),
  (456789123, 0.97, 0.90, 0.85, 0.82, 0.88, 0.88, 0.88),
  (789123456, 0.88, 0.92, 0.90, 0.90, 0.85, 0.95, 0.90),
  (321654987, 0.85, 0.88, 0.80, 0.85, 0.90, 0.82, 0.85)
ON CONFLICT (repo_id) DO UPDATE
SET activity_score = EXCLUDED.activity_score,
    maintenance_score = EXCLUDED.maintenance_score,
    community_score = EXCLUDED.community_score,
    code_quality_score = EXCLUDED.code_quality_score,
    documentation_score = EXCLUDED.documentation_score,
    stability_score = EXCLUDED.stability_score,
    health_score = EXCLUDED.health_score;

-- ============================================
-- STEP 7: Insert Repo Badges
-- ============================================
INSERT INTO repo_badges (repo_id, badge_slug) VALUES
  (123456789, 'well_maintained'),
  (123456789, 'production_ready'),
  (123456789, 'trending_now'),
  (987654321, 'well_maintained'),
  (987654321, 'production_ready'),
  (987654321, 'trending_now'),
  (456789123, 'well_maintained'),
  (456789123, 'production_ready'),
  (789123456, 'well_maintained'),
  (789123456, 'production_ready'),
  (321654987, 'well_maintained'),
  (321654987, 'beginner_friendly')
ON CONFLICT (repo_id, badge_slug) DO NOTHING;

-- ============================================
-- STEP 8: Insert Sample User (for testing)
-- ============================================
INSERT INTO user_profile (
  user_id, username, skill_level, onboarding_completed
) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'test_user', 'intermediate', TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- Insert user interests
INSERT INTO user_interests (user_id, interest_slug, weight, selected_rank) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'ai_ml', 1.0, 1),
  ('550e8400-e29b-41d4-a716-446655440000', 'web_dev', 0.8, 2),
  ('550e8400-e29b-41d4-a716-446655440000', 'data_science', 0.6, 3)
ON CONFLICT (user_id, interest_slug) DO NOTHING;

-- Insert user tech stack
INSERT INTO user_tech_stack (user_id, tech_slug, weight) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'python', 1.0),
  ('550e8400-e29b-41d4-a716-446655440000', 'javascript', 0.9),
  ('550e8400-e29b-41d4-a716-446655440000', 'react', 0.8)
ON CONFLICT (user_id, tech_slug) DO NOTHING;

-- Insert user goals
INSERT INTO user_goals (user_id, goal_slug) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'learning'),
  ('550e8400-e29b-41d4-a716-446655440000', 'contributing')
ON CONFLICT (user_id, goal_slug) DO NOTHING;

-- ============================================
-- STEP 9: Insert User Vectors
-- ============================================
INSERT INTO user_vectors (
  user_id, interest_vector, tech_vector, complexity_vector, goal_vector
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440000',
    '{"ai_ml": 0.9, "web_dev": 0.7, "data_science": 0.5}'::jsonb,
    '{"python": 1.0, "javascript": 0.6, "react": 0.4}'::jsonb,
    '{"full_app": 1.0, "tutorial": 0.4}'::jsonb,
    '{"learning": 1.0, "contributing": 1.0}'::jsonb
  )
ON CONFLICT (user_id) DO UPDATE
SET interest_vector = EXCLUDED.interest_vector,
    tech_vector = EXCLUDED.tech_vector,
    complexity_vector = EXCLUDED.complexity_vector,
    goal_vector = EXCLUDED.goal_vector;

-- ============================================
-- STEP 10: Insert Sample Recommendations
-- ============================================
INSERT INTO repo_recommendations (
  user_id, repo_id, score, interest_match, tech_match, 
  complexity_match, health_boost, freshness_boost, version
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440000',
    123456789, -- TensorFlow
    0.92,
    0.35, -- interest_match (ai_ml)
    0.15, -- tech_match (python)
    0.10, -- complexity_match
    0.18, -- health_boost
    0.10, -- freshness_boost
    1
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    987654321, -- React
    0.88,
    0.25, -- interest_match (web_dev)
    0.14, -- tech_match (javascript, react)
    0.10, -- complexity_match
    0.18, -- health_boost
    0.10, -- freshness_boost
    1
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    321654987, -- Pandas
    0.85,
    0.30, -- interest_match (data_science, ai_ml)
    0.15, -- tech_match (python)
    0.10, -- complexity_match
    0.17, -- health_boost
    0.10, -- freshness_boost
    1
  )
ON CONFLICT (user_id, repo_id, version) DO UPDATE
SET score = EXCLUDED.score,
    interest_match = EXCLUDED.interest_match,
    tech_match = EXCLUDED.tech_match,
    complexity_match = EXCLUDED.complexity_match,
    health_boost = EXCLUDED.health_boost,
    freshness_boost = EXCLUDED.freshness_boost;

-- ============================================
-- Verification Queries
-- ============================================

-- Check repos
SELECT COUNT(*) as repo_count FROM repos_master;

-- Check clusters
SELECT cluster_slug, COUNT(*) as repo_count 
FROM repo_cluster_new 
GROUP BY cluster_slug;

-- Check recommendations
SELECT r.name, rr.score, rr.interest_match, rr.tech_match
FROM repo_recommendations rr
JOIN repos_master r ON rr.repo_id = r.repo_id
WHERE rr.user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY rr.score DESC;

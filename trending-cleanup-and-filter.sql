-- =====================================================
-- TRENDING DATA CLEANUP AND FILTERING
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. DELETE OLD TRENDING DATA (older than 3 days)
DELETE FROM trending_repos 
WHERE period_date < CURRENT_DATE - INTERVAL '3 days';

-- 2. CREATE A TABLE FOR BLOCKED/GENERIC REPOS (if not exists)
CREATE TABLE IF NOT EXISTS blocked_repos (
    repo_full_name TEXT PRIMARY KEY,
    reason TEXT DEFAULT 'generic',
    blocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INSERT BLOCKED GENERIC REPOS
-- These are too popular/generic and not useful for discovery
INSERT INTO blocked_repos (repo_full_name, reason) VALUES
    -- Big Tech Company Repos
    ('facebook/react', 'too-generic'),
    ('facebook/react-native', 'too-generic'),
    ('microsoft/vscode', 'too-generic'),
    ('microsoft/TypeScript', 'too-generic'),
    ('microsoft/terminal', 'too-generic'),
    ('google/material-design-icons', 'too-generic'),
    ('google/guava', 'too-generic'),
    ('apple/swift', 'too-generic'),
    ('vercel/next.js', 'too-generic'),
    ('vuejs/vue', 'too-generic'),
    ('angular/angular', 'too-generic'),
    ('nodejs/node', 'too-generic'),
    ('tensorflow/tensorflow', 'too-generic'),
    ('pytorch/pytorch', 'too-generic'),
    ('kubernetes/kubernetes', 'too-generic'),
    ('docker/docker-ce', 'too-generic'),
    ('golang/go', 'too-generic'),
    ('rust-lang/rust', 'too-generic'),
    ('python/cpython', 'too-generic'),
    ('torvalds/linux', 'too-generic'),
    ('freeCodeCamp/freeCodeCamp', 'too-generic'),
    ('EbookFoundation/free-programming-books', 'too-generic'),
    ('jwasham/coding-interview-university', 'too-generic'),
    ('sindresorhus/awesome', 'too-generic'),
    ('public-apis/public-apis', 'too-generic'),
    ('donnemartin/system-design-primer', 'too-generic'),
    ('vinta/awesome-python', 'too-generic'),
    ('awesome-selfhosted/awesome-selfhosted', 'too-generic'),
    ('github/gitignore', 'too-generic'),
    ('ohmyzsh/ohmyzsh', 'too-generic'),
    ('flutter/flutter', 'too-generic'),
    ('laravel/laravel', 'too-generic'),
    ('django/django', 'too-generic'),
    ('rails/rails', 'too-generic'),
    ('spring-projects/spring-boot', 'too-generic'),
    ('elastic/elasticsearch', 'too-generic'),
    ('redis/redis', 'too-generic'),
    ('apache/kafka', 'too-generic'),
    ('grafana/grafana', 'too-generic'),
    ('prometheus/prometheus', 'too-generic'),
    ('home-assistant/core', 'too-generic'),
    ('netdata/netdata', 'too-generic'),
    ('ansible/ansible', 'too-generic'),
    ('hashicorp/terraform', 'too-generic'),
    ('helm/helm', 'too-generic'),
    ('istio/istio', 'too-generic'),
    ('cilium/cilium', 'too-generic'),
    ('traefik/traefik', 'too-generic'),
    ('minio/minio', 'too-generic'),
    ('caddyserver/caddy', 'too-generic'),
    ('nginx/nginx', 'too-generic')
ON CONFLICT (repo_full_name) DO NOTHING;

-- 4. CREATE FUNCTION TO CLEANUP OLD TRENDING DATA (can be called by workflow)
CREATE OR REPLACE FUNCTION cleanup_old_trending_data(days_to_keep INTEGER DEFAULT 3)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM trending_repos 
    WHERE period_date < CURRENT_DATE - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 5. CREATE FUNCTION TO CHECK IF REPO IS BLOCKED
CREATE OR REPLACE FUNCTION is_repo_blocked(p_full_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM blocked_repos WHERE repo_full_name = p_full_name);
END;
$$ LANGUAGE plpgsql;

-- 6. ADD CATEGORY COLUMN TO TRENDING_REPOS IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trending_repos' AND column_name = 'category'
    ) THEN
        ALTER TABLE trending_repos ADD COLUMN category TEXT;
    END IF;
END $$;

-- 7. CREATE INDEX FOR FASTER CATEGORY QUERIES
CREATE INDEX IF NOT EXISTS idx_trending_repos_category 
ON trending_repos(period_type, period_date, category);

-- 8. VIEW TODAY'S TRENDING DATA STATUS
SELECT 
    period_type,
    period_date,
    COUNT(*) as repo_count
FROM trending_repos
WHERE period_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY period_type, period_date
ORDER BY period_date DESC, period_type;

-- 9. CLEAN UP NOW - Delete anything older than 3 days
SELECT cleanup_old_trending_data(3);

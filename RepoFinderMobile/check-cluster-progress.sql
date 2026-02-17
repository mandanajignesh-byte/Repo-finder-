-- Check cluster ingestion progress
-- Run this in Supabase SQL Editor to see current status

SELECT 
  cluster_slug,
  COUNT(*) as current_count,
  CASE cluster_slug
    WHEN 'ai_ml' THEN 3000
    WHEN 'web_dev' THEN 3000
    WHEN 'devops' THEN 2500
    WHEN 'data_science' THEN 2000
    WHEN 'mobile' THEN 2000
    WHEN 'automation' THEN 1500
    WHEN 'cybersecurity' THEN 1500
    WHEN 'blockchain' THEN 1500
    WHEN 'game_dev' THEN 1200
    WHEN 'open_source_tools' THEN 1300
  END as target_count,
  CASE cluster_slug
    WHEN 'ai_ml' THEN 3000
    WHEN 'web_dev' THEN 3000
    WHEN 'devops' THEN 2500
    WHEN 'data_science' THEN 2000
    WHEN 'mobile' THEN 2000
    WHEN 'automation' THEN 1500
    WHEN 'cybersecurity' THEN 1500
    WHEN 'blockchain' THEN 1500
    WHEN 'game_dev' THEN 1200
    WHEN 'open_source_tools' THEN 1300
  END - COUNT(*) as needed,
  ROUND(COUNT(*) * 100.0 / 
    CASE cluster_slug
      WHEN 'ai_ml' THEN 3000
      WHEN 'web_dev' THEN 3000
      WHEN 'devops' THEN 2500
      WHEN 'data_science' THEN 2000
      WHEN 'mobile' THEN 2000
      WHEN 'automation' THEN 1500
      WHEN 'cybersecurity' THEN 1500
      WHEN 'blockchain' THEN 1500
      WHEN 'game_dev' THEN 1200
      WHEN 'open_source_tools' THEN 1300
    END, 1) as progress_percent,
  CASE 
    WHEN COUNT(*) >= 
      CASE cluster_slug
        WHEN 'ai_ml' THEN 3000
        WHEN 'web_dev' THEN 3000
        WHEN 'devops' THEN 2500
        WHEN 'data_science' THEN 2000
        WHEN 'mobile' THEN 2000
        WHEN 'automation' THEN 1500
        WHEN 'cybersecurity' THEN 1500
        WHEN 'blockchain' THEN 1500
        WHEN 'game_dev' THEN 1200
        WHEN 'open_source_tools' THEN 1300
      END THEN '✅ Complete'
    ELSE '⏳ In Progress'
  END as status
FROM repo_cluster_new
GROUP BY cluster_slug
ORDER BY 
  CASE cluster_slug
    WHEN 'ai_ml' THEN 1
    WHEN 'web_dev' THEN 2
    WHEN 'devops' THEN 3
    WHEN 'data_science' THEN 4
    WHEN 'mobile' THEN 5
    WHEN 'automation' THEN 6
    WHEN 'cybersecurity' THEN 7
    WHEN 'blockchain' THEN 8
    WHEN 'game_dev' THEN 9
    WHEN 'open_source_tools' THEN 10
  END;

-- Total summary
SELECT 
  COUNT(DISTINCT cluster_slug) as clusters_with_repos,
  COUNT(DISTINCT repo_id) as total_repos,
  SUM(
    CASE cluster_slug
      WHEN 'ai_ml' THEN 3000
      WHEN 'web_dev' THEN 3000
      WHEN 'devops' THEN 2500
      WHEN 'data_science' THEN 2000
      WHEN 'mobile' THEN 2000
      WHEN 'automation' THEN 1500
      WHEN 'cybersecurity' THEN 1500
      WHEN 'blockchain' THEN 1500
      WHEN 'game_dev' THEN 1200
      WHEN 'open_source_tools' THEN 1300
      ELSE 0
    END
  ) as total_target,
  ROUND(COUNT(DISTINCT repo_id) * 100.0 / 
    SUM(
      CASE cluster_slug
        WHEN 'ai_ml' THEN 3000
        WHEN 'web_dev' THEN 3000
        WHEN 'devops' THEN 2500
        WHEN 'data_science' THEN 2000
        WHEN 'mobile' THEN 2000
        WHEN 'automation' THEN 1500
        WHEN 'cybersecurity' THEN 1500
        WHEN 'blockchain' THEN 1500
        WHEN 'game_dev' THEN 1200
        WHEN 'open_source_tools' THEN 1300
        ELSE 0
      END
    ), 1) as overall_progress
FROM repo_cluster_new;

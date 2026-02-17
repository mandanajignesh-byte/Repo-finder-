import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/repository.dart';

class RepoService extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;
  List<Repository> _savedRepos = [];
  List<Repository> _likedRepos = [];
  bool _isLoading = false;

  List<Repository> get savedRepos => _savedRepos;
  List<Repository> get likedRepos => _likedRepos;
  bool get isLoading => _isLoading;

  // Helper to get goal topics
  List<String> _getGoalTopics(List<String> goals) {
    final goalTopics = <String>[];
    for (final goal in goals) {
      switch (goal) {
        case 'learning-new-tech':
          goalTopics.addAll(['tutorial', 'course', 'learn', 'guide', 'example', 'walkthrough']);
          break;
        case 'building-project':
          goalTopics.addAll(['boilerplate', 'starter', 'template', 'scaffold', 'project']);
          break;
        case 'contributing':
          goalTopics.addAll(['open-source', 'contributing', 'contribute']);
          break;
        case 'finding-solutions':
          goalTopics.addAll(['library', 'package', 'sdk', 'tool', 'utility']);
          break;
        case 'exploring':
          goalTopics.addAll(['awesome', 'curated', 'list', 'collection']);
          break;
      }
    }
    return goalTopics;
  }

  // Get repos by cluster with cursor pagination
  Future<List<Repository>> getReposByCluster({
    required String cluster,
    required String userId,
    int limit = 20,
    int? cursor,
    double minScore = 0,
  }) async {
    try {
      debugPrint('getReposByCluster: cluster=$cluster, limit=$limit');
      
      // Map cluster names to match database slugs
      final clusterMap = {
        'frontend': 'web_dev',
        'backend': 'web_dev',
        'mobile': 'mobile',
        'desktop': 'desktop',
        'data-science': 'data_science',
        'devops': 'devops',
        'game-dev': 'game_dev',
        'ai-ml': 'ai_ml',
      };
      final dbCluster = clusterMap[cluster] ?? cluster;
      
      // Query using repos view (which joins repos_master with repo_cluster_new)
      var query = _supabase
          .from('repos')
          .select()
          .eq('cluster', dbCluster)
          .gte('recommendation_score', minScore);

      if (cursor != null) {
        query = query.gt('github_id', cursor);
      }

      final data = await query
          .order('recommendation_score', ascending: false)
          .limit(limit);

      debugPrint('getReposByCluster returned ${(data as List).length} repos');
      final repos = (data as List)
          .map((json) => Repository.fromJson(json))
          .toList();

      return repos;
    } catch (e) {
      debugPrint('Error fetching repos: $e');
      // Fallback: try direct query to repos_master with join
      try {
        debugPrint('Trying fallback query...');
        final clusterMap = {
          'frontend': 'web_dev',
          'backend': 'web_dev',
          'mobile': 'mobile',
          'desktop': 'desktop',
          'data-science': 'data_science',
          'devops': 'devops',
          'game-dev': 'game_dev',
          'ai-ml': 'ai_ml',
        };
        final dbCluster = clusterMap[cluster] ?? cluster;
        
        // Direct query with join
        final clusterData = await _supabase
            .from('repo_cluster_new')
            .select('repo_id')
            .eq('cluster_slug', dbCluster)
            .order('weight', ascending: false)
            .limit(limit * 2);
        
        if (clusterData.isEmpty) {
          debugPrint('No repos found in cluster: $dbCluster');
          return [];
        }
        
        final repoIds = (clusterData as List)
            .map((item) => item['repo_id'] as int)
            .toList();
        
        final reposData = await _supabase
            .from('repos_master')
            .select()
            .in('repo_id', repoIds)
            .limit(limit);
        
        final repos = (reposData as List).map((json) {
          // Transform to match Repository model
          return Repository.fromJson({
            ...json,
            'id': json['repo_id'].toString(),
            'github_id': json['repo_id'],
            'cluster': dbCluster,
            'recommendation_score': 0.7,
            'popularity_score': 0.5,
            'activity_score': 0.5,
            'freshness_score': 0.5,
            'quality_score': 0.5,
            'trending_score': 0.0,
            'repo_url': json['html_url'],
            'owner_avatar': json['avatar_url'],
          });
        }).toList();
        
        debugPrint('Fallback returned ${repos.length} repos');
        return repos;
      } catch (fallbackError) {
        debugPrint('Fallback also failed: $fallbackError');
        return [];
      }
    }
  }

  // Get personalized repos based on user preferences
  Future<List<Repository>> getPersonalizedRepos({
    required String primaryCluster,
    List<String> preferredLanguages = const [],
    List<String> goals = const [],
    int limit = 50,
    int? cursor,
  }) async {
    try {
      debugPrint('getPersonalizedRepos: cluster=$primaryCluster, languages=$preferredLanguages, goals=$goals');

      // Check what clusters actually exist in the database
      try {
        // First check if repos table has any data at all
        final totalCheck = await _supabase
            .from('repos')
            .select('id, cluster, language')
            .limit(10);
        debugPrint('Total repos in database (sample): ${(totalCheck as List).length}');
        if ((totalCheck as List).isNotEmpty) {
          debugPrint('Sample repo data: ${(totalCheck as List).first}');
        }
        
        final clusterCheck = await _supabase
            .from('repos')
            .select('cluster')
            .limit(100);
        final uniqueClusters = (clusterCheck as List)
            .map((item) => item['cluster'] as String?)
            .where((c) => c != null)
            .toSet()
            .toList();
        debugPrint('Available clusters in database: $uniqueClusters');
        
        // Also check what languages exist
        final langCheck = await _supabase
            .from('repos')
            .select('language')
            .limit(100);
        final uniqueLangs = (langCheck as List)
            .map((item) => item['language'] as String?)
            .where((c) => c != null)
            .toSet()
            .toList();
        debugPrint('Available languages in database (sample): ${uniqueLangs.take(10).toList()}');
      } catch (e) {
        debugPrint('Could not check database: $e');
      }

      // Map cluster names
      final clusterMap = {
        'frontend': 'web_dev',
        'backend': 'web_dev',
        'mobile': 'mobile',
        'desktop': 'desktop',
        'data-science': 'data_science',
        'devops': 'devops',
        'game-dev': 'game_dev',
        'ai-ml': 'ai_ml',
      };
      final dbCluster = clusterMap[primaryCluster] ?? primaryCluster;
      
      // STEP 1: Try EXACT match - cluster + language (if languages provided)
      if (preferredLanguages.isNotEmpty) {
        debugPrint('Step 1: Trying EXACT match - cluster=$dbCluster + languages=$preferredLanguages');
        
        // Query repos_master joined with repo_cluster_new and filter by language
        final clusterRepos = await _supabase
            .from('repo_cluster_new')
            .select('repo_id')
            .eq('cluster_slug', dbCluster)
            .order('weight', ascending: false)
            .limit(limit * 3);
        
        if (clusterRepos.isNotEmpty) {
          final repoIds = (clusterRepos as List)
              .map((item) => item['repo_id'] as int)
              .toList();
          
          // Build language filter
          final langConditions = preferredLanguages
              .map((lang) => 'language.eq.$lang')
              .join(',');
          
          var query = _supabase
              .from('repos_master')
              .select()
              .in('repo_id', repoIds);
          
          if (langConditions.isNotEmpty) {
            query = query.or(langConditions);
          }
          
          if (cursor != null) {
            query = query.gt('repo_id', cursor);
          }
          
          final data = await query
              .order('stars', ascending: false)
              .limit(limit * 2);
          
          var repos = (data as List).map((json) {
            return Repository.fromJson({
              ...json,
              'id': json['repo_id'].toString(),
              'github_id': json['repo_id'],
              'cluster': dbCluster,
              'recommendation_score': 0.7,
              'popularity_score': (json['stars'] ?? 0) / 100000.0,
              'activity_score': 0.5,
              'freshness_score': 0.5,
              'quality_score': 0.5,
              'trending_score': 0.0,
              'repo_url': json['html_url'],
              'owner_avatar': json['avatar_url'],
            });
          }).toList();
          
          debugPrint('Exact match (cluster + language) returned ${repos.length} repos');
          
          // Apply goal filter if provided
          if (goals.isNotEmpty && repos.isNotEmpty) {
            final goalTopics = _getGoalTopics(goals);
            final beforeFilter = repos.length;
            repos = repos.where((repo) {
              final repoTopics = repo.topics.map((t) => t.toLowerCase()).toList();
              return goalTopics.any((topic) => 
                repoTopics.any((rt) => rt.contains(topic.toLowerCase()))
              );
            }).toList();
            debugPrint('Filtered from $beforeFilter to ${repos.length} repos by goal topics');
            
            if (repos.isEmpty) {
              // Keep original if goal filter removed all
              repos = (data as List).map((json) {
                return Repository.fromJson({
                  ...json,
                  'id': json['repo_id'].toString(),
                  'github_id': json['repo_id'],
                  'cluster': dbCluster,
                  'recommendation_score': 0.7,
                  'popularity_score': (json['stars'] ?? 0) / 100000.0,
                  'activity_score': 0.5,
                  'freshness_score': 0.5,
                  'quality_score': 0.5,
                  'trending_score': 0.0,
                  'repo_url': json['html_url'],
                  'owner_avatar': json['avatar_url'],
                });
              }).toList();
            }
          }
          
          repos = repos.take(limit).toList();
          debugPrint('✅ Returning ${repos.length} EXACT match repos (cluster + language)');
          return repos;
        }
        
        debugPrint('No exact matches found, proceeding to Step 2...');
      }
      
      // STEP 2: No exact matches - try cluster only (no language filter)
      debugPrint('Step 2: Trying cluster only (no language filter) - cluster=$dbCluster');
      
      final clusterRepos = await _supabase
          .from('repo_cluster_new')
          .select('repo_id')
          .eq('cluster_slug', dbCluster)
          .order('weight', ascending: false)
          .limit(limit * 2);
      
      if (clusterRepos.isEmpty) {
        debugPrint('No repos found in cluster: $dbCluster');
        return [];
      }
      
      final repoIds = (clusterRepos as List)
          .map((item) => item['repo_id'] as int)
          .toList();
      
      var query = _supabase
          .from('repos_master')
          .select()
          .in('repo_id', repoIds);
      
      if (cursor != null) {
        query = query.gt('repo_id', cursor);
      }
      
      final data = await query
          .order('stars', ascending: false)
          .limit(limit * 2);
      
      debugPrint('Cluster-only query returned ${(data as List).length} repos');
      
      var repos = (data as List).map((json) {
        return Repository.fromJson({
          ...json,
          'id': json['repo_id'].toString(),
          'github_id': json['repo_id'],
          'cluster': dbCluster,
          'recommendation_score': 0.7,
          'popularity_score': (json['stars'] ?? 0) / 100000.0,
          'activity_score': 0.5,
          'freshness_score': 0.5,
          'quality_score': 0.5,
          'trending_score': 0.0,
          'repo_url': json['html_url'],
          'owner_avatar': json['avatar_url'],
        });
      }).toList();
      
      // Filter by goal topics if provided
      final goalTopics = _getGoalTopics(goals);
      if (goalTopics.isNotEmpty && repos.isNotEmpty) {
        final beforeFilter = repos.length;
        repos = repos.where((repo) {
          final repoTopics = repo.topics.map((t) => t.toLowerCase()).toList();
          return goalTopics.any((topic) => 
            repoTopics.any((rt) => rt.contains(topic.toLowerCase()))
          );
        }).toList();
        debugPrint('Filtered from $beforeFilter to ${repos.length} repos by goal topics');
      }
      
      // Limit to requested amount
      repos = repos.take(limit).toList();
      debugPrint('✅ Returning ${repos.length} repos from cluster only');
      return repos;
      
    } catch (e) {
      debugPrint('Error fetching personalized repos: $e');
      // Fallback to cluster-only query
      return getReposByCluster(
        cluster: primaryCluster,
        userId: '',
        limit: limit,
        cursor: cursor,
      );
    }
  }

  // Get trending repos
  Future<List<Repository>> getTrendingRepos({int limit = 50}) async {
    try {
      // Query trending_repos table if it exists, otherwise use repos_master
      try {
        final trendingData = await _supabase
            .from('trending_repos')
            .select('repo_id, trending_score, rank')
            .eq('period_type', 'daily')
            .order('rank', ascending: true)
            .limit(limit);
        
        if (trendingData.isNotEmpty) {
          final repoIds = (trendingData as List)
              .map((item) => item['repo_id'] as int)
              .toList();
          
          final reposData = await _supabase
              .from('repos_master')
              .select()
              .in('repo_id', repoIds)
              .limit(limit);
          
          final repos = (reposData as List).map((json) {
            return Repository.fromJson({
              ...json,
              'id': json['repo_id'].toString(),
              'github_id': json['repo_id'],
              'cluster': 'general',
              'recommendation_score': 0.7,
              'popularity_score': (json['stars'] ?? 0) / 100000.0,
              'activity_score': 0.5,
              'freshness_score': 0.5,
              'quality_score': 0.5,
              'trending_score': 0.8,
              'repo_url': json['html_url'],
              'owner_avatar': json['avatar_url'],
            });
          }).toList();
          
          return repos;
        }
      } catch (e) {
        debugPrint('Trending table not available, using fallback: $e');
      }
      
      // Fallback: get repos with most stars
      final data = await _supabase
          .from('repos_master')
          .select()
          .order('stars', ascending: false)
          .limit(limit);

      final repos = (data as List).map((json) {
        return Repository.fromJson({
          ...json,
          'id': json['repo_id'].toString(),
          'github_id': json['repo_id'],
          'cluster': 'general',
          'recommendation_score': 0.7,
          'popularity_score': (json['stars'] ?? 0) / 100000.0,
          'activity_score': 0.5,
          'freshness_score': 0.5,
          'quality_score': 0.5,
          'trending_score': 0.0,
          'repo_url': json['html_url'],
          'owner_avatar': json['avatar_url'],
        });
      }).toList();

      return repos;
    } catch (e) {
      debugPrint('Error fetching trending repos: $e');
      return [];
    }
  }

  // Save repo (using app_saved_repos table)
  Future<void> saveRepo(String userId, Repository repo) async {
    try {
      await _supabase.from('app_saved_repos').insert({
        'user_id': userId,
        'repo_github_id': repo.githubId,
        'saved_at': DateTime.now().toIso8601String(),
      });

      // Track interaction
      try {
        await _supabase.from('app_user_interactions').insert({
          'user_id': userId,
          'repo_github_id': repo.githubId,
          'action': 'save',
          'created_at': DateTime.now().toIso8601String(),
        });
      } catch (e) {
        debugPrint('Interaction already tracked: $e');
      }
    } catch (e) {
      debugPrint('Error saving repo: $e');
    }
  }

  // Like repo (using app_liked_repos table)
  Future<void> likeRepo(String userId, Repository repo) async {
    try {
      await _supabase.from('app_liked_repos').insert({
        'user_id': userId,
        'repo_github_id': repo.githubId,
        'liked_at': DateTime.now().toIso8601String(),
      });

      // Track interaction
      try {
        await _supabase.from('app_user_interactions').insert({
          'user_id': userId,
          'repo_github_id': repo.githubId,
          'action': 'like',
          'created_at': DateTime.now().toIso8601String(),
        });
      } catch (e) {
        debugPrint('Interaction already tracked: $e');
      }
    } catch (e) {
      debugPrint('Error liking repo: $e');
    }
  }

  // Get saved repos (using app_saved_repos table)
  Future<void> loadSavedRepos(String userId) async {
    try {
      // Get saved repo IDs
      final savedData = await _supabase
          .from('app_saved_repos')
          .select('repo_github_id')
          .eq('user_id', userId)
          .order('saved_at', ascending: false);

      if (savedData.isEmpty) {
        _savedRepos = [];
        notifyListeners();
        return;
      }

      final githubIds = (savedData as List)
          .map((item) => item['repo_github_id'] as int)
          .toList();

      // Fetch full repo data from repos_master table
      // Build OR query for multiple github_ids
      if (githubIds.isEmpty) {
        _savedRepos = [];
        notifyListeners();
        return;
      }
      
      final reposData = await _supabase
          .from('repos_master')
          .select()
          .in('repo_id', githubIds);

      _savedRepos = (reposData as List).map((json) {
        return Repository.fromJson({
          ...json,
          'id': json['repo_id'].toString(),
          'github_id': json['repo_id'],
          'cluster': 'general',
          'recommendation_score': 0.7,
          'popularity_score': (json['stars'] ?? 0) / 100000.0,
          'activity_score': 0.5,
          'freshness_score': 0.5,
          'quality_score': 0.5,
          'trending_score': 0.0,
          'repo_url': json['html_url'],
          'owner_avatar': json['avatar_url'],
        });
      }).toList();

      notifyListeners();
    } catch (e) {
      debugPrint('Error loading saved repos: $e');
    }
  }

  // Get liked repos (using app_liked_repos table)
  Future<void> loadLikedRepos(String userId) async {
    try {
      // Get liked repo IDs
      final likedData = await _supabase
          .from('app_liked_repos')
          .select('repo_github_id')
          .eq('user_id', userId)
          .order('liked_at', ascending: false);

      if (likedData.isEmpty) {
        _likedRepos = [];
        notifyListeners();
        return;
      }

      final githubIds = (likedData as List)
          .map((item) => item['repo_github_id'] as int)
          .toList();

      // Fetch full repo data from repos_master table
      if (githubIds.isEmpty) {
        _likedRepos = [];
        notifyListeners();
        return;
      }
      
      final reposData = await _supabase
          .from('repos_master')
          .select()
          .in('repo_id', githubIds);

      _likedRepos = (reposData as List).map((json) {
        return Repository.fromJson({
          ...json,
          'id': json['repo_id'].toString(),
          'github_id': json['repo_id'],
          'cluster': 'general',
          'recommendation_score': 0.7,
          'popularity_score': (json['stars'] ?? 0) / 100000.0,
          'activity_score': 0.5,
          'freshness_score': 0.5,
          'quality_score': 0.5,
          'trending_score': 0.0,
          'repo_url': json['html_url'],
          'owner_avatar': json['avatar_url'],
        });
      }).toList();

      notifyListeners();
    } catch (e) {
      debugPrint('Error loading liked repos: $e');
    }
  }
}

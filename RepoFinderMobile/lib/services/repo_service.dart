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

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  List<String> _getGoalTopics(List<String> goals) {
    final goalTopics = <String>[];
    for (final goal in goals) {
      switch (goal) {
        case 'learning-new-tech':
          goalTopics.addAll(
              ['tutorial', 'course', 'learn', 'guide', 'example', 'walkthrough']);
          break;
        case 'building-project':
          goalTopics.addAll(
              ['boilerplate', 'starter', 'template', 'scaffold', 'project']);
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

  /// Build a [Repository] from a `repos_master` row (used when loading
  /// saved/liked repos via `app_saved_repos` / `app_liked_repos` join).
  Repository _repoFromMasterRow(Map<String, dynamic> row) {
    final githubId = row['repo_id'] as int? ?? 0;
    final ownerLogin = row['owner_login'] as String? ?? '';
    final fullName = row['full_name'] as String? ?? '';
    return Repository.fromJson({
      'id': githubId.toString(),
      'github_id': githubId,
      'name': row['name'] ?? '',
      'full_name': fullName,
      'description': row['description'],
      'owner_login': ownerLogin,
      'owner_avatar': row['avatar_url'] ?? 'https://github.com/$ownerLogin.png',
      'stars': row['stars'] ?? 0,
      'forks': row['forks'] ?? 0,
      'watchers': row['watchers'] ?? 0,
      'open_issues': row['open_issues'] ?? 0,
      'language': row['language'],
      'topics': List<String>.from(row['topics'] ?? []),
      'license': row['license'],
      'repo_url': row['html_url'] ?? 'https://github.com/$fullName',
      'homepage_url': null,
      'cluster': 'general',
      'recommendation_score': 0.7,
      'popularity_score': ((row['stars'] as int? ?? 0) / 100000.0).clamp(0.0, 1.0),
      'activity_score': 0.5,
      'freshness_score': 0.5,
      'quality_score': 0.5,
      'trending_score': 0.0,
    });
  }

  /// Build a [Repository] from a raw `trending_repos_v2` row.
  Repository _repoFromTrendingV2Row(Map<String, dynamic> item, int rank) {
    final owner = item['owner'] as String? ?? '';
    final repoName = item['name'] as String? ?? '';
    final fullName = item['repo'] as String? ?? '$owner/$repoName';
    final githubId = item['github_id'] as int? ?? 0;
    final stars = item['stars'] as int? ?? 0;
    final totalScore = (item['total_score'] ?? 0).toDouble();

    return Repository.fromJson({
      'id': githubId.toString(),
      'github_id': githubId,
      'name': repoName,
      'full_name': fullName,
      'description': item['description'],
      'owner_login': owner,
      'owner_avatar': 'https://github.com/$owner.png',
      'stars': stars,
      'forks': item['forks'] ?? 0,
      'watchers': 0,
      'open_issues': item['open_issues'] ?? 0,
      'language': item['language'],
      'topics': List<String>.from(item['topics'] ?? []),
      'license': null,
      'repo_url': item['url'] ?? 'https://github.com/$fullName',
      'homepage_url': item['homepage'],
      'cluster': item['category'] ?? 'general',
      'recommendation_score': (totalScore / 100.0).clamp(0.0, 1.0),
      'popularity_score': (stars / 50000.0).clamp(0.0, 1.0),
      'activity_score': 0.5,
      'freshness_score': 0.5,
      'quality_score': 0.5,
      'trending_score': (totalScore / 100.0).clamp(0.0, 1.0),
    });
  }

  // ---------------------------------------------------------------------------
  // DISCOVERY REPOS  (repos_master / repo_cluster_new — unchanged)
  // ---------------------------------------------------------------------------

  Future<List<Repository>> getReposByCluster({
    required String cluster,
    required String userId,
    int limit = 20,
    int? cursor,
    double minScore = 0,
  }) async {
    try {
      debugPrint('getReposByCluster: cluster=$cluster, limit=$limit');

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
      return (data as List).map((json) => Repository.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Error fetching repos: $e');
      try {
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

        final clusterData = await _supabase
            .from('repo_cluster_new')
            .select('repo_id')
            .eq('cluster_slug', dbCluster)
            .order('weight', ascending: false)
            .limit(limit * 2);

        if (clusterData.isEmpty) return [];

        final repoIds =
            (clusterData as List).map((item) => item['repo_id'] as int).toList();

        final reposData = await _supabase
            .from('repos_master')
            .select()
            .inFilter('repo_id', repoIds)
            .limit(limit);

        return (reposData as List).map((json) {
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
      } catch (fallbackError) {
        debugPrint('Fallback also failed: $fallbackError');
        return [];
      }
    }
  }

  Future<List<Repository>> getPersonalizedRepos({
    required String primaryCluster,
    List<String> preferredLanguages = const [],
    List<String> goals = const [],
    int limit = 50,
    int? cursor,
  }) async {
    try {
      debugPrint(
          'getPersonalizedRepos: cluster=$primaryCluster, languages=$preferredLanguages, goals=$goals');

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

      if (preferredLanguages.isNotEmpty) {
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

          final langConditions = preferredLanguages
              .map((lang) => 'language.eq.$lang')
              .join(',');

          var query = _supabase
              .from('repos_master')
              .select()
              .inFilter('repo_id', repoIds);

          if (langConditions.isNotEmpty) {
            query = query.or(langConditions);
          }

          if (cursor != null) query = query.gt('repo_id', cursor);

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

          if (goals.isNotEmpty && repos.isNotEmpty) {
            final goalTopics = _getGoalTopics(goals);
            final filtered = repos.where((repo) {
              final repoTopics =
                  repo.topics.map((t) => t.toLowerCase()).toList();
              return goalTopics.any((topic) =>
                  repoTopics.any((rt) => rt.contains(topic.toLowerCase())));
            }).toList();
            if (filtered.isNotEmpty) repos = filtered;
          }

          return repos.take(limit).toList();
        }
      }

      // Cluster-only fallback
      final clusterRepos = await _supabase
          .from('repo_cluster_new')
          .select('repo_id')
          .eq('cluster_slug', dbCluster)
          .order('weight', ascending: false)
          .limit(limit * 2);

      if (clusterRepos.isEmpty) return [];

      final repoIds =
          (clusterRepos as List).map((item) => item['repo_id'] as int).toList();

      var query = _supabase
          .from('repos_master')
          .select()
          .inFilter('repo_id', repoIds);

      if (cursor != null) query = query.gt('repo_id', cursor);

      final data =
          await query.order('stars', ascending: false).limit(limit * 2);

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

      final goalTopics = _getGoalTopics(goals);
      if (goalTopics.isNotEmpty && repos.isNotEmpty) {
        final filtered = repos.where((repo) {
          final repoTopics = repo.topics.map((t) => t.toLowerCase()).toList();
          return goalTopics.any((topic) =>
              repoTopics.any((rt) => rt.contains(topic.toLowerCase())));
        }).toList();
        if (filtered.isNotEmpty) repos = filtered;
      }

      return repos.take(limit).toList();
    } catch (e) {
      debugPrint('Error fetching personalized repos: $e');
      return getReposByCluster(
        cluster: primaryCluster,
        userId: '',
        limit: limit,
        cursor: cursor,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // TRENDING  — now uses trending_repos_v2 (same as web)
  // ---------------------------------------------------------------------------

  Future<List<Repository>> getTrendingRepos({
    int limit = 50,
    String period = 'daily',
  }) async {
    try {
      // Step 1: find the latest date that has data for this period
      final latestRow = await _supabase
          .from('trending_repos_v2')
          .select('date')
          .eq('period', period)
          .order('date', ascending: false)
          .limit(1)
          .maybeSingle();

      if (latestRow != null) {
        final latestDate = latestRow['date'] as String;
        debugPrint('Trending: using date=$latestDate period=$period');

        final trendingData = await _supabase
            .from('trending_repos_v2')
            .select(
                'github_id, name, owner, repo, description, url, homepage, '
                'language, topics, category, stars, forks, open_issues, '
                'total_score, health_grade, health_status, '
                'stars_last_24_hours, stars_last_7_days')
            .eq('period', period)
            .eq('date', latestDate)
            .order('total_score', ascending: false)
            .limit(limit);

        final repos = (trendingData as List)
            .asMap()
            .entries
            .map((e) => _repoFromTrendingV2Row(e.value, e.key + 1))
            .toList();

        debugPrint('Trending: loaded ${repos.length} repos from trending_repos_v2');
        return repos;
      }

      debugPrint('trending_repos_v2 has no data yet, falling back to repos_master');
    } catch (e) {
      debugPrint('Error fetching from trending_repos_v2: $e');
    }

    // Fallback: most-starred repos from repos_master
    try {
      final data = await _supabase
          .from('repos_master')
          .select()
          .order('stars', ascending: false)
          .limit(limit);

      return (data as List).map((json) {
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
    } catch (e) {
      debugPrint('Error fetching trending fallback: $e');
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // RECOMMENDATIONS  — read from app_user_recommendations + repos_master join
  // ---------------------------------------------------------------------------

  /// Returns the pre-computed, ranked list of repositories for [userId].
  ///
  /// Reads `app_user_recommendations` (populated by the `generate-recommendations`
  /// Edge Function) and joins against `repos_master` for full repo details.
  /// Returns an empty list if no recommendations have been generated yet.
  Future<List<Repository>> loadRecommendedRepos(String userId) async {
    try {
      // Step 1: get ranked repo IDs for the user
      final recRows = await _supabase
          .from('app_user_recommendations')
          .select('repo_github_id, rank')
          .eq('user_id', userId)
          .order('rank', ascending: true);

      if ((recRows as List).isEmpty) return [];

      final orderedIds = recRows
          .map((r) => r['repo_github_id'] as int)
          .toList();

      // Step 2: fetch full details from repos_master (batch if large)
      const batchSize = 500;
      final masterRows = <Map<String, dynamic>>[];
      for (int i = 0; i < orderedIds.length; i += batchSize) {
        final batch = orderedIds.sublist(
            i, (i + batchSize).clamp(0, orderedIds.length));
        final rows = await _supabase
            .from('repos_master')
            .select()
            .inFilter('repo_id', batch);
        for (final row in (rows as List)) {
          masterRows.add(row as Map<String, dynamic>);
        }
      }

      // Step 3: rebuild in original ranked order
      final masterMap = <int, Map<String, dynamic>>{
        for (final row in masterRows) (row['repo_id'] as int): row,
      };

      return orderedIds
          .where((id) => masterMap.containsKey(id))
          .map((id) => _repoFromMasterRow(masterMap[id]!))
          .toList();
    } catch (e) {
      debugPrint('loadRecommendedRepos error: $e');
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // SAVE / LIKE  — app_saved_repos / app_liked_repos (mobile-specific tables)
  // ---------------------------------------------------------------------------

  /// Save a repository.  Writes to `app_saved_repos` (user_id + repo_github_id).
  Future<void> saveRepo(String userId, Repository repo) async {
    try {
      await _supabase.from('app_saved_repos').upsert({
        'user_id': userId,
        'repo_github_id': repo.githubId, // bigint
        'saved_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id,repo_github_id');

      // Track in app_user_interactions
      try {
        await _supabase.from('app_user_interactions').insert({
          'user_id': userId,
          'repo_github_id': repo.githubId, // bigint
          'action': 'save',
        });
      } catch (e) {
        debugPrint('Interaction already tracked: $e');
      }
    } catch (e) {
      debugPrint('Error saving repo: $e');
    }
  }

  /// Like a repository.  Writes to `app_liked_repos` AND `app_saved_repos` so
  /// liked repos also appear in the Saved tab.
  Future<void> likeRepo(String userId, Repository repo) async {
    final now = DateTime.now().toIso8601String();

    try {
      // Write to app_liked_repos
      await _supabase.from('app_liked_repos').upsert({
        'user_id': userId,
        'repo_github_id': repo.githubId, // bigint
        'liked_at': now,
      }, onConflict: 'user_id,repo_github_id');

      // Also write to app_saved_repos so liked repos appear in the Saved section
      await _supabase.from('app_saved_repos').upsert({
        'user_id': userId,
        'repo_github_id': repo.githubId, // bigint
        'saved_at': now,
      }, onConflict: 'user_id,repo_github_id');

      // Track in app_user_interactions
      try {
        await _supabase.from('app_user_interactions').insert({
          'user_id': userId,
          'repo_github_id': repo.githubId, // bigint
          'action': 'like',
        });
      } catch (e) {
        debugPrint('Interaction already tracked: $e');
      }
    } catch (e) {
      debugPrint('Error liking repo: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // LOAD SAVED / LIKED  — read github IDs from app_ tables, join repos_master
  // ---------------------------------------------------------------------------

  Future<void> loadSavedRepos(String userId) async {
    _isLoading = true;
    notifyListeners();
    try {
      // Step 1: get saved repo IDs ordered by save time
      final savedRows = await _supabase
          .from('app_saved_repos')
          .select('repo_github_id, saved_at')
          .eq('user_id', userId)
          .order('saved_at', ascending: false);

      if ((savedRows as List).isEmpty) {
        _savedRepos = [];
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Step 2: preserve ordering from save time
      final orderedIds = savedRows.map((r) => r['repo_github_id'] as int).toList();

      // Step 3: fetch full repo details from repos_master
      final masterRows = await _supabase
          .from('repos_master')
          .select()
          .inFilter('repo_id', orderedIds);

      // Build lookup map for O(1) access
      final masterMap = <int, Map<String, dynamic>>{
        for (final row in (masterRows as List))
          (row['repo_id'] as int): row as Map<String, dynamic>
      };

      // Reconstruct in original saved order, skip any IDs missing from master
      _savedRepos = orderedIds
          .where((id) => masterMap.containsKey(id))
          .map((id) => _repoFromMasterRow(masterMap[id]!))
          .toList();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading saved repos: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadLikedRepos(String userId) async {
    _isLoading = true;
    notifyListeners();
    try {
      // Step 1: get liked repo IDs ordered by like time
      final likedRows = await _supabase
          .from('app_liked_repos')
          .select('repo_github_id, liked_at')
          .eq('user_id', userId)
          .order('liked_at', ascending: false);

      if ((likedRows as List).isEmpty) {
        _likedRepos = [];
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Step 2: preserve ordering from like time
      final orderedIds = likedRows.map((r) => r['repo_github_id'] as int).toList();

      // Step 3: fetch full repo details from repos_master
      final masterRows = await _supabase
          .from('repos_master')
          .select()
          .inFilter('repo_id', orderedIds);

      // Build lookup map for O(1) access
      final masterMap = <int, Map<String, dynamic>>{
        for (final row in (masterRows as List))
          (row['repo_id'] as int): row as Map<String, dynamic>
      };

      // Reconstruct in original liked order, skip any IDs missing from master
      _likedRepos = orderedIds
          .where((id) => masterMap.containsKey(id))
          .map((id) => _repoFromMasterRow(masterMap[id]!))
          .toList();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading liked repos: $e');
      _isLoading = false;
      notifyListeners();
    }
  }
}

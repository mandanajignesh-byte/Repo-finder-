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
  // DISCOVERY FEED  →  repo_recommendations_feed  (NEW)
  // ---------------------------------------------------------------------------

  /// Fetch the next batch of personalised repos for a user.
  ///
  /// Reads from `repo_recommendations_feed` which is pre-built by the
  /// `precompute_user_recommendations` Supabase RPC (up to 500 repos, ranked).
  ///
  /// [afterRank]   – cursor: return only rows with rank > this value.
  /// [excludeIds]  – repo IDs to skip (already seen this session).
  /// [limit]       – how many cards to load per batch (default 10).
  Future<List<Repository>> getDiscoveryFeed({
    required String userId,
    int afterRank = 0,
    List<int> excludeIds = const [],
    int limit = 10,
  }) async {
    try {
      debugPrint(
          'getDiscoveryFeed: userId=$userId afterRank=$afterRank limit=$limit');

      // Fetch a slightly larger batch so we have headroom after client-side exclusion
      final fetchLimit = limit + excludeIds.length.clamp(0, 20);

      var query = _supabase
          .from('repo_recommendations_feed')
          .select()
          .eq('user_id', userId)
          .gt('rank', afterRank)
          .order('rank', ascending: true)
          .limit(fetchLimit);

      final data = await query;

      var repos = (data as List).map((json) => Repository.fromFeed(json)).toList();

      // Client-side deduplication
      if (excludeIds.isNotEmpty) {
        repos = repos
            .where((r) => !excludeIds.contains(r.githubId))
            .toList();
      }

      debugPrint('getDiscoveryFeed: returning ${repos.take(limit).length} repos');
      return repos.take(limit).toList();
    } catch (e) {
      debugPrint('Error fetching discovery feed: $e');
      return [];
    }
  }

  /// How many repos are left in the feed after [afterRank].
  Future<int> getRemainingFeedCount(String userId, int afterRank) async {
    try {
      final data = await _supabase
          .from('repo_recommendations_feed')
          .select('rank')
          .eq('user_id', userId)
          .gt('rank', afterRank)
          .limit(1);
      // Just check if there's anything left
      return (data as List).isEmpty ? 0 : 1;
    } catch (_) {
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // TRENDING  →  trending_repos_v2  (unchanged)
  // ---------------------------------------------------------------------------

  Future<List<Repository>> getTrendingRepos({
    int limit = 50,
    String period = 'daily',
  }) async {
    try {
      final latestRow = await _supabase
          .from('trending_repos_v2')
          .select('date')
          .eq('period', period)
          .order('date', ascending: false)
          .limit(1)
          .maybeSingle();

      if (latestRow != null) {
        final latestDate = latestRow['date'] as String;
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

        return (trendingData as List)
            .asMap()
            .entries
            .map((e) => _repoFromTrendingRow(e.value, e.key + 1))
            .toList();
      }
    } catch (e) {
      debugPrint('Error fetching trending_repos_v2: $e');
    }

    // Fallback: most-starred from repos_master
    try {
      final data = await _supabase
          .from('repos_master')
          .select()
          .order('stars', ascending: false)
          .limit(limit);
      return (data as List).map((json) => Repository.fromMaster(json)).toList();
    } catch (e) {
      debugPrint('Error fetching trending fallback: $e');
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // SAVE  →  app_saved_repos  (NEW)
  // ---------------------------------------------------------------------------

  Future<void> saveRepo(String userId, Repository repo) async {
    try {
      await _supabase.from('app_saved_repos').upsert({
        'user_id': userId,
        'repo_github_id': repo.githubId,
        'saved_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id,repo_github_id');

      // Track interaction
      try {
        await _supabase.from('app_user_interactions').insert({
          'user_id': userId,
          'repo_github_id': repo.githubId,
          'action': 'save',
          'created_at': DateTime.now().toIso8601String(),
        });
      } catch (_) {}
    } catch (e) {
      debugPrint('Error saving repo: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // LIKE  →  app_liked_repos  (NEW)
  // ---------------------------------------------------------------------------

  Future<void> likeRepo(String userId, Repository repo) async {
    try {
      await _supabase.from('app_liked_repos').upsert({
        'user_id': userId,
        'repo_github_id': repo.githubId,
        'liked_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id,repo_github_id');

      // Track interaction
      try {
        await _supabase.from('app_user_interactions').insert({
          'user_id': userId,
          'repo_github_id': repo.githubId,
          'action': 'like',
          'created_at': DateTime.now().toIso8601String(),
        });
      } catch (_) {}
    } catch (e) {
      debugPrint('Error liking repo: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // LOAD SAVED / LIKED  →  join app_saved/liked_repos with repos_master
  // ---------------------------------------------------------------------------

  Future<void> loadSavedRepos(String userId) async {
    try {
      // Get saved repo IDs
      final savedData = await _supabase
          .from('app_saved_repos')
          .select('repo_github_id, saved_at')
          .eq('user_id', userId)
          .order('saved_at', ascending: false);

      if ((savedData as List).isEmpty) {
        _savedRepos = [];
        notifyListeners();
        return;
      }

      final ids = savedData.map((r) => r['repo_github_id'] as int).toList();

      // Fetch details from repos_master
      final reposData = await _supabase
          .from('repos_master')
          .select()
          .inFilter('repo_id', ids);

      _savedRepos = (reposData as List)
          .map((json) => Repository.fromMaster(json))
          .toList();

      notifyListeners();
    } catch (e) {
      debugPrint('Error loading saved repos: $e');
    }
  }

  Future<void> loadLikedRepos(String userId) async {
    try {
      final likedData = await _supabase
          .from('app_liked_repos')
          .select('repo_github_id, liked_at')
          .eq('user_id', userId)
          .order('liked_at', ascending: false);

      if ((likedData as List).isEmpty) {
        _likedRepos = [];
        notifyListeners();
        return;
      }

      final ids = likedData.map((r) => r['repo_github_id'] as int).toList();

      final reposData = await _supabase
          .from('repos_master')
          .select()
          .inFilter('repo_id', ids);

      _likedRepos = (reposData as List)
          .map((json) => Repository.fromMaster(json))
          .toList();

      notifyListeners();
    } catch (e) {
      debugPrint('Error loading liked repos: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  Repository _repoFromTrendingRow(Map<String, dynamic> item, int rank) {
    final owner = item['owner'] as String? ?? '';
    final repoName = item['name'] as String? ?? '';
    final fullName = item['repo'] as String? ?? '$owner/$repoName';
    final githubId = item['github_id'] as int? ?? 0;
    final stars = item['stars'] as int? ?? 0;
    final totalScore = (item['total_score'] ?? 0).toDouble();

    return Repository(
      id: githubId.toString(),
      githubId: githubId,
      name: repoName,
      fullName: fullName,
      description: item['description'],
      ownerLogin: owner,
      ownerAvatar: 'https://github.com/$owner.png',
      stars: stars,
      forks: item['forks'] ?? 0,
      watchers: 0,
      openIssues: item['open_issues'] ?? 0,
      language: item['language'],
      topics: List<String>.from(item['topics'] ?? []),
      license: null,
      repoUrl: item['url'] ?? 'https://github.com/$fullName',
      homepageUrl: item['homepage'],
      cluster: item['category'] ?? 'general',
      recommendationScore: (totalScore / 100.0).clamp(0.0, 1.0),
      popularityScore: (stars / 50000.0).clamp(0.0, 1.0),
      activityScore: 0.5,
      freshnessScore: 0.5,
      qualityScore: 0.5,
      trendingScore: (totalScore / 100.0).clamp(0.0, 1.0),
      badges: const [],
    );
  }
}

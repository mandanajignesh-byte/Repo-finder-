import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;

/// Data model for a GitHub connection
class GitHubConnection {
  final String githubLogin;
  final String? githubName;
  final String githubAvatarUrl;
  final int starredReposCount;
  final DateTime connectedAt;
  final DateTime? lastSyncedAt;

  const GitHubConnection({
    required this.githubLogin,
    this.githubName,
    required this.githubAvatarUrl,
    required this.starredReposCount,
    required this.connectedAt,
    this.lastSyncedAt,
  });

  factory GitHubConnection.fromJson(Map<String, dynamic> json) {
    return GitHubConnection(
      githubLogin: json['github_login'] as String,
      githubName: json['github_name'] as String?,
      githubAvatarUrl: json['github_avatar_url'] as String? ?? '',
      starredReposCount: (json['starred_repos_count'] as num?)?.toInt() ?? 0,
      connectedAt: DateTime.parse(json['connected_at'] as String),
      lastSyncedAt: json['last_synced_at'] != null
          ? DateTime.parse(json['last_synced_at'] as String)
          : null,
    );
  }
}

/// Data model for a starred repo
class StarredRepo {
  final String id;
  final String fullName;
  final String name;
  final String? description;
  final int stars;
  final int forks;
  final String? language;
  final String url;
  final String ownerLogin;
  final String ownerAvatarUrl;
  final List<String> topics;
  final DateTime? starredAt;

  const StarredRepo({
    required this.id,
    required this.fullName,
    required this.name,
    this.description,
    required this.stars,
    required this.forks,
    this.language,
    required this.url,
    required this.ownerLogin,
    required this.ownerAvatarUrl,
    required this.topics,
    this.starredAt,
  });

  factory StarredRepo.fromJson(Map<String, dynamic> json) {
    return StarredRepo(
      id: (json['repo_id'] ?? json['id'] ?? '').toString(),
      fullName: json['repo_full_name'] ?? json['full_name'] ?? '',
      name: json['repo_name'] ?? json['name'] ?? '',
      description: json['repo_description'] ?? json['description'],
      stars: (json['repo_stars'] ?? json['stargazers_count'] ?? 0) as int,
      forks: (json['repo_forks'] ?? json['forks_count'] ?? 0) as int,
      language: json['repo_language'] ?? json['language'],
      url: json['repo_url'] ?? json['html_url'] ?? '',
      ownerLogin: json['repo_owner_login'] ??
          (json['owner'] as Map?)?['login'] ?? '',
      ownerAvatarUrl: json['repo_owner_avatar_url'] ??
          (json['owner'] as Map?)?['avatar_url'] ?? '',
      topics: List<String>.from(
          json['repo_topics'] ?? json['topics'] ?? const []),
      starredAt: json['starred_at'] != null
          ? DateTime.tryParse(json['starred_at'] as String)
          : null,
    );
  }
}

/// Service to manage GitHub OAuth connection and starred repos sync.
///
/// Flow:
/// 1. User taps "Connect GitHub" → [connectGitHub] is called
/// 2. supabase_flutter opens Safari for GitHub OAuth
/// 3. After auth, Safari redirects to repoverse://github-callback
/// 4. supabase_flutter intercepts the deep link → creates a GitHub session
/// 5. [onAuthStateChange] fires → we extract provider_token
/// 6. We save the token to [github_connections] table linked to the app's user_id
/// 7. We sign out the GitHub Supabase session (it was temporary)
/// 8. We sync starred repos in the background
class GitHubService extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;

  GitHubConnection? _connection;
  bool _loading = false;
  bool _syncing = false;
  String? _error;
  int _syncProgress = 0;
  int _syncTotal = 0;

  /// The GitHub connection for the current user (null if not connected)
  GitHubConnection? get connection => _connection;
  bool get loading => _loading;
  bool get syncing => _syncing;
  String? get error => _error;
  int get syncProgress => _syncProgress;
  int get syncTotal => _syncTotal;
  bool get isConnected => _connection != null;

  // Kept across the OAuth redirect so we know which user to link
  String? _pendingAppUserId;
  String? _preOAuthStoredUserId;

  // Auth state subscription
  void Function()? _authUnsubscribe;

  // ── Load existing connection ─────────────────────────────────────────────

  Future<void> loadConnection(String userId) async {
    _loading = true;
    notifyListeners();

    try {
      final data = await _supabase
          .from('github_connections')
          .select(
              'github_login, github_name, github_avatar_url, starred_repos_count, connected_at, last_synced_at')
          .eq('user_id', userId)
          .maybeSingle();

      _connection = data != null ? GitHubConnection.fromJson(data) : null;
    } catch (e) {
      debugPrint('GitHubService: loadConnection error: $e');
      _connection = null;
    }

    _loading = false;
    notifyListeners();
  }

  // ── Connect GitHub via OAuth ─────────────────────────────────────────────

  Future<void> connectGitHub(String appUserId) async {
    try {
      _error = null;
      _pendingAppUserId = appUserId;

      // Snapshot the current stored user_id so we can restore it after OAuth
      final prefs = await SharedPreferences.getInstance();
      _preOAuthStoredUserId = prefs.getString('app_user_id') ?? appUserId;

      // Cancel any old listener
      _authUnsubscribe?.call();

      // Listen for the OAuth callback
      final subscription = _supabase.auth.onAuthStateChange.listen((data) async {
        final event = data.event;
        final session = data.session;

        if ((event == AuthChangeEvent.signedIn ||
                event == AuthChangeEvent.tokenRefreshed) &&
            session?.providerToken != null &&
            _pendingAppUserId != null) {
          final token = session!.providerToken!;
          final capturedUserId = _pendingAppUserId!;
          _pendingAppUserId = null;

          debugPrint('GitHubService: Got provider_token, saving connection…');

          // Fetch GitHub profile using the token
          final profile = await _fetchGitHubProfile(token);
          if (profile == null) {
            _error = 'Failed to fetch GitHub profile';
            notifyListeners();
            return;
          }

          // Save connection to Supabase
          await _saveConnection(capturedUserId, profile, token);

          // Sign out the temporary GitHub Supabase session
          // (we don't use GitHub as primary auth — Apple / anonymous is primary)
          try {
            await _supabase.auth.signOut();
          } catch (_) {}

          // Restore the original app_user_id in SharedPreferences
          if (_preOAuthStoredUserId != null) {
            final prefs2 = await SharedPreferences.getInstance();
            await prefs2.setString('app_user_id', _preOAuthStoredUserId!);
            _preOAuthStoredUserId = null;
          }

          // Reload connection UI
          await loadConnection(capturedUserId);

          // Sync starred repos in background
          syncStarredRepos(capturedUserId);
        }
      });

      _authUnsubscribe = subscription.cancel;

      // Launch the OAuth flow — opens Safari / SFSafariViewController
      await _supabase.auth.signInWithOAuth(
        OAuthProvider.github,
        redirectTo: 'repoverse://github-callback',
        scopes: 'read:user public_repo',
      );
    } catch (e) {
      _error = 'Failed to connect GitHub: $e';
      debugPrint('GitHubService: connectGitHub error: $e');
      notifyListeners();
    }
  }

  // ── Fetch GitHub profile ─────────────────────────────────────────────────

  Future<Map<String, dynamic>?> _fetchGitHubProfile(String token) async {
    try {
      final res = await http.get(
        Uri.parse('https://api.github.com/user'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/vnd.github.v3+json',
        },
      );
      if (res.statusCode == 200) return jsonDecode(res.body);
      return null;
    } catch (e) {
      debugPrint('GitHubService: _fetchGitHubProfile error: $e');
      return null;
    }
  }

  // ── Save connection to Supabase ──────────────────────────────────────────

  Future<void> _saveConnection(
    String userId,
    Map<String, dynamic> profile,
    String token,
  ) async {
    try {
      await _supabase.from('github_connections').upsert(
        {
          'user_id': userId,
          'github_id': profile['id'],
          'github_login': profile['login'],
          'github_name': profile['name'],
          'github_avatar_url': profile['avatar_url'],
          'github_access_token': token,
          'updated_at': DateTime.now().toIso8601String(),
        },
        onConflict: 'user_id',
      );
      debugPrint('GitHubService: connection saved for $userId');
    } catch (e) {
      debugPrint('GitHubService: _saveConnection error: $e');
    }
  }

  // ── Disconnect GitHub ────────────────────────────────────────────────────

  Future<void> disconnect(String userId) async {
    _loading = true;
    notifyListeners();

    try {
      await _supabase
          .from('github_starred_repos')
          .delete()
          .eq('user_id', userId);
      await _supabase
          .from('github_connections')
          .delete()
          .eq('user_id', userId);
      _connection = null;
    } catch (e) {
      _error = 'Failed to disconnect: $e';
      debugPrint('GitHubService: disconnect error: $e');
    }

    _loading = false;
    notifyListeners();
  }

  // ── Sync starred repos ───────────────────────────────────────────────────

  Future<int> syncStarredRepos(String userId) async {
    _syncing = true;
    _syncProgress = 0;
    _syncTotal = 0;
    _error = null;
    notifyListeners();

    try {
      // Get stored token
      final connData = await _supabase
          .from('github_connections')
          .select('github_access_token')
          .eq('user_id', userId)
          .single();

      final token = connData['github_access_token'] as String?;
      if (token == null || token.isEmpty) {
        throw Exception('No GitHub token — please reconnect');
      }

      // Probe first page to estimate total
      final probe = await http.get(
        Uri.parse(
            'https://api.github.com/user/starred?per_page=1&page=1'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/vnd.github.star+json',
        },
      );

      if (probe.statusCode == 401) {
        throw Exception('GitHub token expired — please reconnect');
      }

      // Parse Link header to estimate total (1 item per page = total pages = total items)
      final linkHeader = probe.headers['link'] ?? '';
      final lastMatch =
          RegExp(r'page=(\d+)>; rel="last"').firstMatch(linkHeader);
      _syncTotal = lastMatch != null ? int.parse(lastMatch.group(1)!) : 0;

      // Fetch all pages
      final allStarred = <Map<String, dynamic>>[];
      int page = 1;
      const perPage = 100;

      while (true) {
        final res = await http.get(
          Uri.parse(
              'https://api.github.com/user/starred?per_page=$perPage&page=$page'),
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'application/vnd.github.star+json',
          },
        );

        if (res.statusCode == 401) {
          throw Exception('GitHub token expired — please reconnect');
        }
        if (res.statusCode != 200) break;

        final items = jsonDecode(res.body) as List;
        if (items.isEmpty) break;

        for (final item in items) {
          // vnd.github.star+json wraps each item as { starred_at, repo }
          final r = (item['repo'] ?? item) as Map<String, dynamic>;
          allStarred.add({
            'user_id': userId,
            'repo_id': r['id'].toString(),
            'repo_full_name': r['full_name'],
            'repo_name': r['name'],
            'repo_description': r['description'],
            'repo_stars': r['stargazers_count'] ?? 0,
            'repo_forks': r['forks_count'] ?? 0,
            'repo_language': r['language'],
            'repo_url': r['html_url'],
            'repo_owner_login': (r['owner'] as Map?)?['login'] ?? '',
            'repo_owner_avatar_url':
                (r['owner'] as Map?)?['avatar_url'] ?? '',
            'repo_topics': r['topics'] ?? [],
            'starred_at': item['starred_at'] ??
                DateTime.now().toIso8601String(),
            'synced_at': DateTime.now().toIso8601String(),
          });
        }

        _syncProgress = allStarred.length;
        notifyListeners();

        final link = res.headers['link'] ?? '';
        if (!link.contains('rel="next"')) break;
        page++;
      }

      // Batch upsert in chunks of 100
      const chunkSize = 100;
      for (int i = 0; i < allStarred.length; i += chunkSize) {
        final chunk = allStarred.sublist(
          i,
          (i + chunkSize).clamp(0, allStarred.length),
        );
        await _supabase
            .from('github_starred_repos')
            .upsert(chunk, onConflict: 'user_id,repo_id');
      }

      // Update count + last_synced_at
      await _supabase.from('github_connections').update({
        'starred_repos_count': allStarred.length,
        'last_synced_at': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('user_id', userId);

      // Refresh connection info
      await loadConnection(userId);

      debugPrint(
          'GitHubService: synced ${allStarred.length} starred repos');
      return allStarred.length;
    } catch (e) {
      _error = e.toString();
      debugPrint('GitHubService: syncStarredRepos error: $e');
      _syncing = false;
      notifyListeners();
      return 0;
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  // ── Get stored starred repos ─────────────────────────────────────────────

  Future<List<StarredRepo>> getStarredRepos(
    String userId, {
    int limit = 50,
    int offset = 0,
    String? search,
  }) async {
    try {
      var query = _supabase
          .from('github_starred_repos')
          .select()
          .eq('user_id', userId);

      if (search != null && search.isNotEmpty) {
        query = query.or(
          'repo_full_name.ilike.%$search%,'
          'repo_description.ilike.%$search%,'
          'repo_language.ilike.%$search%',
        );
      }

      final data = await query
          .order('starred_at', ascending: false)
          .range(offset, offset + limit - 1);

      return (data as List)
          .map((json) => StarredRepo.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('GitHubService: getStarredRepos error: $e');
      return [];
    }
  }

  @override
  void dispose() {
    _authUnsubscribe?.call();
    super.dispose();
  }
}

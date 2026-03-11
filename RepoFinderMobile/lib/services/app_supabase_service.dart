import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_preferences.dart';

/// Unified Supabase service using the NEW app_* tables.
/// These tables are separate from the web app tables and are
/// optimised for mobile — no cross-platform conflicts.
class AppSupabaseService extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;
  String? _userId;
  UserPreferences? _preferences;

  String? get userId => _userId;
  UserPreferences? get preferences => _preferences;

  // ---------------------------------------------------------------------------
  // USER IDENTITY  →  app_users
  // ---------------------------------------------------------------------------

  /// Returns the current user's ID.
  ///
  /// Priority:
  ///  1. Supabase auth session (Apple Sign-In) → UUID
  ///  2. Persisted anonymous ID (SharedPreferences)
  ///  3. Generate new anonymous ID  `app_user_<ts>_<us>`
  Future<String> getOrCreateUserId({String? name}) async {
    if (_userId != null) return _userId!;

    // 1. Prefer authenticated user
    final authUser = _supabase.auth.currentUser;
    if (authUser != null) {
      _userId = authUser.id;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_user_id', _userId!);
    } else {
      // 2. Restore persisted anonymous ID
      final prefs = await SharedPreferences.getInstance();
      _userId = prefs.getString('app_user_id');

      // 3. Create brand-new anonymous ID
      if (_userId == null) {
        _userId =
            'app_user_${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecondsSinceEpoch}';
        await prefs.setString('app_user_id', _userId!);
      }
    }

    // Upsert into app_users (touch last_active_at on every launch)
    try {
      await _supabase.from('app_users').upsert({
        'id': _userId!,
        'platform': 'android',
        'name': name,
        'last_active_at': DateTime.now().toIso8601String(),
      }, onConflict: 'id');
    } catch (e) {
      debugPrint('Error upserting app_users: $e');
    }

    return _userId!;
  }

  // ---------------------------------------------------------------------------
  // USER PREFERENCES  →  app_user_preferences
  // ---------------------------------------------------------------------------

  Future<UserPreferences?> getUserPreferences(String userId) async {
    try {
      final data = await _supabase
          .from('app_user_preferences')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

      if (data == null) return null;

      _preferences = UserPreferences(
        primaryCluster: data['primary_cluster'],
        secondaryClusters: List<String>.from(data['secondary_clusters'] ?? []),
        techStack: List<String>.from(data['tech_stack'] ?? []),
        interests: List<String>.from(data['interests'] ?? []),
        goals: List<String>.from(data['goals'] ?? []),
        projectTypes: List<String>.from(data['project_types'] ?? []),
        experienceLevel: data['experience_level'] ?? 'intermediate',
        activityPreference: data['activity_preference'] ?? 'any',
        popularityWeight: data['popularity_weight'] ?? 'medium',
        documentationImportance:
            data['documentation_importance'] ?? 'important',
        licensePreference: List<String>.from(data['license_preference'] ?? []),
        repoSize: List<String>.from(data['repo_size'] ?? []),
        onboardingCompleted: data['onboarding_completed'] ?? false,
      );
      notifyListeners();
      return _preferences;
    } catch (e) {
      debugPrint('Error getting app_user_preferences: $e');
      return null;
    }
  }

  Future<void> saveUserPreferences(
      String userId, UserPreferences preferences) async {
    try {
      await _supabase.from('app_user_preferences').upsert({
        'user_id': userId,
        'primary_cluster': preferences.primaryCluster,
        'secondary_clusters': preferences.secondaryClusters,
        'tech_stack': preferences.techStack,
        'interests': preferences.interests,
        'goals': preferences.goals,
        'project_types': preferences.projectTypes ?? [],
        'experience_level': preferences.experienceLevel,
        'activity_preference': preferences.activityPreference,
        'popularity_weight': preferences.popularityWeight,
        'documentation_importance': preferences.documentationImportance,
        'license_preference': preferences.licensePreference,
        'repo_size': preferences.repoSize,
        'onboarding_completed': preferences.onboardingCompleted,
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id');

      _preferences = preferences;
      notifyListeners();
    } catch (e) {
      debugPrint('Error saving app_user_preferences: $e');
      rethrow;
    }
  }

  Future<bool> isOnboardingCompleted(String userId) async {
    final prefs = await getUserPreferences(userId);
    return prefs?.onboardingCompleted ?? false;
  }

  // ---------------------------------------------------------------------------
  // INTERACTIONS  →  app_user_interactions
  // ---------------------------------------------------------------------------

  /// Track a user interaction (view / like / save / skip / swipe_up).
  Future<void> trackInteraction({
    required String userId,
    required int repoGithubId,
    required String action,
  }) async {
    try {
      await _supabase.from('app_user_interactions').upsert({
        'user_id': userId,
        'repo_github_id': repoGithubId,
        'action': action,
        'created_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id,repo_github_id,action');
    } catch (e) {
      debugPrint('Error tracking interaction: $e');
    }
  }

  /// Returns every repo ID this user has already seen
  /// (for deduplication / exclusion from discovery).
  Future<List<int>> getAllSeenRepoIds(String userId) async {
    try {
      final data = await _supabase
          .from('app_user_interactions')
          .select('repo_github_id')
          .eq('user_id', userId)
          .inFilter('action', ['view', 'like', 'skip', 'save']);

      return (data as List)
          .map((row) => row['repo_github_id'] as int)
          .toSet()
          .toList();
    } catch (e) {
      debugPrint('Error getting seen repo IDs: $e');
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // RECOMMENDATION BUILD  →  precompute_user_recommendations RPC
  // ---------------------------------------------------------------------------

  /// Calls the Supabase RPC that scores all candidate repos and writes
  /// up to 500 personalised entries into `repo_recommendations_feed`.
  ///
  /// Returns the number of repos built (0 if something went wrong).
  Future<int> buildRecommendations(String userId) async {
    try {
      debugPrint('🔨 Building recommendations for $userId...');
      final result = await _supabase.rpc(
        'precompute_user_recommendations',
        params: {'p_user_id': userId, 'p_limit': 500},
      );
      final count = (result as num?)?.toInt() ?? 0;
      debugPrint('✅ Built $count recommendations');
      return count;
    } catch (e) {
      debugPrint('❌ Error building recommendations: $e');
      return 0;
    }
  }

  /// True if the user already has a pre-built feed (can skip rebuild on
  /// subsequent launches).
  Future<bool> hasRecommendationFeed(String userId) async {
    try {
      final data = await _supabase
          .from('repo_recommendations_feed')
          .select('repo_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
      return data != null;
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // LEGACY  —  kept so older callers don't break; delegates to app tables
  // ---------------------------------------------------------------------------

  Future<void> saveOnboardingData({
    required String userId,
    required List<String> interests,
    required List<String> techStack,
    required String? skillLevel,
    required List<String> goals,
    required String? repoSizePref,
    required String? currentProject,
  }) async {
    // Build a primary cluster from the first interest
    final clusterMap = {
      'ai_ml': 'ai_ml',
      'web_dev': 'web_dev',
      'mobile': 'mobile',
      'devops': 'devops',
      'data_science': 'data_science',
      'game_dev': 'game_dev',
      'cybersecurity': 'cybersecurity',
      'automation': 'automation',
      'blockchain': 'blockchain',
      'open_source': 'open_source',
      'database': 'database',
    };
    final primaryCluster =
        interests.isNotEmpty ? (clusterMap[interests.first] ?? interests.first) : 'web_dev';
    final secondaryClusters = interests.length > 1
        ? interests
            .skip(1)
            .map((i) => clusterMap[i] ?? i)
            .toList()
        : <String>[];

    await saveUserPreferences(
      userId,
      UserPreferences(
        primaryCluster: primaryCluster,
        secondaryClusters: secondaryClusters,
        techStack: techStack,
        interests: interests,
        goals: goals,
        projectTypes: [],
        experienceLevel: skillLevel ?? 'intermediate',
        activityPreference: 'any',
        popularityWeight: 'medium',
        documentationImportance: 'important',
        licensePreference: [],
        repoSize: repoSizePref != null ? [repoSizePref] : [],
        onboardingCompleted: true,
      ),
    );
  }
}

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../models/user_preferences.dart';

/// Mobile-specific Supabase service — uses the `app_` prefixed tables
/// (`app_users`, `app_user_preferences`, `app_user_interactions`,
/// `app_saved_repos`, `app_liked_repos`) that are dedicated to the iOS app.
class AppSupabaseService extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;
  String? _userId;
  UserPreferences? _preferences;

  String? get userId => _userId;
  UserPreferences? get preferences => _preferences;

  /// Increments each time the user saves new preferences.
  /// Listeners (e.g. DiscoveryScreen) use this to detect that repos need reload.
  int prefsVersion = 0;

  /// Called after user saves new preferences so discovery deck refreshes.
  void bumpPrefsVersion() {
    prefsVersion++;
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // USER IDENTITY
  // ---------------------------------------------------------------------------

  /// Returns the current user's ID.
  ///
  /// Priority:
  ///  1. Supabase auth session (Apple Sign In) → use UUID
  ///  2. Persisted anonymous ID from SharedPreferences
  ///  3. Generate a new anonymous ID (valid UUID v4)
  ///
  /// Writes to the app-specific `app_users` table.
  Future<String> getOrCreateUserId({String? name}) async {
    if (_userId != null) return _userId!;

    // 1. Prefer Supabase auth user (Apple Sign In)
    final authUser = _supabase.auth.currentUser;
    if (authUser != null) {
      _userId = authUser.id;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_user_id', _userId!);
    } else {
      // 2. Fallback to stored anonymous ID
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString('app_user_id');

      // Validate stored ID is a proper UUID — clear old 'app_user_<timestamp>' format
      final uuidRegex = RegExp(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        caseSensitive: false,
      );
      _userId = (stored != null && uuidRegex.hasMatch(stored)) ? stored : null;

      // 3. Create new anonymous ID — must be a valid UUID for Supabase
      if (_userId == null) {
        // Try Supabase anonymous auth first (gives a real UUID)
        try {
          final response = await _supabase.auth.signInAnonymously();
          _userId = response.session?.user.id ?? response.user?.id;
        } catch (e) {
          debugPrint('Anonymous auth unavailable, generating UUID: $e');
        }
        // Fallback: generate a proper UUID v4
        _userId ??= const Uuid().v4();
        await prefs.setString('app_user_id', _userId!);
      }
    }

    // Upsert into `app_users` table (mobile-specific)
    try {
      final now = DateTime.now().toIso8601String();
      final existing = await _supabase
          .from('app_users')
          .select('id')
          .eq('id', _userId!)
          .maybeSingle();

      if (existing == null) {
        await _supabase.from('app_users').insert({
          'id': _userId!,
          'name': name,
          'platform': 'ios',
          'created_at': now,
          'last_active_at': now,
        });
      } else {
        await _supabase.from('app_users').update({
          if (name != null) 'name': name,
          'last_active_at': now,
          'updated_at': now,
        }).eq('id', _userId!);
      }
    } catch (e) {
      debugPrint('Error ensuring user exists in app_users table: $e');
    }

    return _userId!;
  }

  // ---------------------------------------------------------------------------
  // USER PREFERENCES  (app_user_preferences table)
  // ---------------------------------------------------------------------------

  Future<UserPreferences?> getUserPreferences(String userId) async {
    try {
      final data = await _supabase
          .from('app_user_preferences') // mobile-specific table
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
      debugPrint('Error getting user preferences: $e');
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
      debugPrint('Error saving user preferences: $e');
      rethrow;
    }
  }

  Future<bool> isOnboardingCompleted(String userId) async {
    // Check local cache first — survives UUID rotation
    final sharedPrefs = await SharedPreferences.getInstance();
    final localDone = sharedPrefs.getBool('onboarding_completed') ?? false;
    if (localDone) return true;

    // Fall back to Supabase
    final prefs = await getUserPreferences(userId);
    final done = prefs?.onboardingCompleted ?? false;
    if (done) {
      // Cache locally so next check is instant even if UUID changes
      await sharedPrefs.setBool('onboarding_completed', true);
    }
    return done;
  }

  /// Call after onboarding finishes to persist completion locally.
  Future<void> markOnboardingCompleted() async {
    final sharedPrefs = await SharedPreferences.getInstance();
    await sharedPrefs.setBool('onboarding_completed', true);
  }

  // ---------------------------------------------------------------------------
  // INTERACTIONS  (app_user_interactions table)
  // ---------------------------------------------------------------------------

  /// Track a user interaction.
  ///
  /// [repoGithubId] — the integer GitHub repo ID (stored as bigint).
  /// [action]       — 'like', 'save', 'skip', 'view', 'swipe_up'
  Future<void> trackInteraction({
    required String userId,
    required int repoGithubId,
    required String action,
  }) async {
    try {
      await _supabase.from('app_user_interactions').insert({
        'user_id': userId,
        'repo_github_id': repoGithubId, // bigint — app_user_interactions schema
        'action': action,
      });
    } catch (e) {
      debugPrint('Error tracking interaction: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // ONBOARDING  (legacy iOS recommendation tables — unchanged)
  // ---------------------------------------------------------------------------

  /// Saves structured onboarding data to the iOS-specific recommendation tables
  /// AND updates the `app_user_preferences` row.
  Future<void> saveOnboardingData({
    required String userId,
    required List<String> interests,
    required List<String> techStack,
    required String? skillLevel,
    required List<String> goals,
    required String? repoSizePref,
    required String? currentProject,
  }) async {
    try {
      // 1. user_interests (iOS recommendation engine)
      if (interests.isNotEmpty) {
        await _supabase.from('user_interests').delete().eq('user_id', userId);
        for (int i = 0; i < interests.length; i++) {
          final weight = i == 0 ? 1.0 : (i == 1 ? 0.8 : (i == 2 ? 0.6 : 0.5));
          await _supabase.from('user_interests').insert({
            'user_id': userId,
            'interest_slug': interests[i],
            'weight': weight,
          });
        }
      }

      // 2. user_tech_stack (iOS recommendation engine)
      if (techStack.isNotEmpty) {
        await _supabase.from('user_tech_stack').delete().eq('user_id', userId);
        for (int i = 0; i < techStack.length; i++) {
          final weight = i == 0 ? 1.0 : (i == 1 ? 0.9 : 0.8);
          await _supabase.from('user_tech_stack').insert({
            'user_id': userId,
            'tech_slug': techStack[i],
            'weight': weight,
          });
        }
      }

      // 3. user_profile (skill level / complexity vector)
      Map<String, double> complexityVector = {};
      if (skillLevel == 'beginner') {
        complexityVector = {
          'tutorial': 1.0, 'boilerplate': 0.8,
          'full_app': 0.3, 'infra': 0.0, 'framework': 0.0,
        };
      } else if (skillLevel == 'intermediate') {
        complexityVector = {
          'tutorial': 0.4, 'boilerplate': 0.7,
          'full_app': 1.0, 'infra': 0.3, 'framework': 0.2,
        };
      } else if (skillLevel == 'advanced') {
        complexityVector = {
          'tutorial': 0.1, 'boilerplate': 0.3,
          'full_app': 0.7, 'infra': 1.0, 'framework': 1.0,
        };
      }

      if (skillLevel != null) {
        await _supabase.from('user_profile').upsert({
          'user_id': userId,
          'skill_level': skillLevel,
          'complexity_vector': complexityVector,
        }, onConflict: 'user_id');
      }

      // 4. user_goals (iOS recommendation engine)
      if (goals.isNotEmpty) {
        await _supabase.from('user_goals').delete().eq('user_id', userId);
        for (final goal in goals) {
          await _supabase.from('user_goals').insert({
            'user_id': userId,
            'goal_slug': goal,
          });
        }
      }

      // 5. user_current_projects
      if (currentProject != null && currentProject.isNotEmpty) {
        await _supabase.from('user_current_projects').upsert({
          'user_id': userId,
          'text_input': currentProject,
          'extracted_clusters': {},
        }, onConflict: 'user_id');
      }

      // 6. user_vectors (composite recommendation vector)
      final interestVector = {
        for (int i = 0; i < interests.length; i++)
          interests[i]: i == 0 ? 0.9 : (i == 1 ? 0.7 : (i == 2 ? 0.5 : 0.3))
      };
      final techVector = {
        for (int i = 0; i < techStack.length; i++)
          techStack[i]: i == 0 ? 1.0 : (i == 1 ? 0.6 : 0.4)
      };
      final goalVector = {for (final g in goals) g: 1.0};

      await _supabase.from('user_vectors').upsert({
        'user_id': userId,
        'interest_vector': interestVector,
        'tech_vector': techVector,
        'complexity_vector': complexityVector,
        'goal_vector': goalVector,
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id');

      // 7. Also update the app_user_preferences row so preferences
      //    are stored in the mobile-specific table.
      await _supabase.from('app_user_preferences').upsert({
        'user_id': userId,
        'tech_stack': techStack,
        'interests': interests,
        'goals': goals,
        'experience_level': skillLevel ?? 'intermediate',
        'onboarding_completed': true,
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id');
    } catch (e) {
      debugPrint('Error saving onboarding data: $e');
      rethrow;
    }
  }
}

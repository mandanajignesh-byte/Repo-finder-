import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_preferences.dart';

/// Service for app-specific Supabase operations
/// Uses app_users and app_user_preferences tables
class AppSupabaseService extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;
  String? _userId;
  UserPreferences? _preferences;

  String? get userId => _userId;
  UserPreferences? get preferences => _preferences;

  // Get or create app user ID
  // Prefers Supabase auth user ID (from Apple Sign In), falls back to anonymous ID
  Future<String> getOrCreateUserId({String? name}) async {
    if (_userId != null) return _userId!;

    // First, check if there's a Supabase auth session (Apple Sign In)
    final authUser = _supabase.auth.currentUser;
    if (authUser != null) {
      _userId = authUser.id;
      // Save to SharedPreferences for consistency
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_user_id', _userId!);
    } else {
      // Fallback to anonymous user ID (legacy/offline)
      final prefs = await SharedPreferences.getInstance();
      _userId = prefs.getString('app_user_id');

      if (_userId == null) {
        _userId = 'app_user_${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecondsSinceEpoch}';
        await prefs.setString('app_user_id', _userId!);
      }
    }

    // Ensure user exists in Supabase app_users table
    try {
      final data = await _supabase
          .from('app_users')
          .select('id')
          .eq('id', _userId!)
          .maybeSingle();

      if (data == null) {
        await _supabase.from('app_users').insert({
          'id': _userId!,
          'name': name,
          'device_id': _userId!, // Use user_id as device_id for now
          'platform': defaultTargetPlatform == TargetPlatform.android 
              ? 'android' 
              : defaultTargetPlatform == TargetPlatform.iOS 
                  ? 'ios' 
                  : 'unknown',
          'created_at': DateTime.now().toIso8601String(),
          'last_active_at': DateTime.now().toIso8601String(),
        });
      } else if (name != null) {
        await _supabase
            .from('app_users')
            .update({
              'name': name,
              'last_active_at': DateTime.now().toIso8601String(),
            })
            .eq('id', _userId!);
      } else {
        // Update last_active_at
        await _supabase
            .from('app_users')
            .update({'last_active_at': DateTime.now().toIso8601String()})
            .eq('id', _userId!);
      }
    } catch (e) {
      debugPrint('Error ensuring app user exists: $e');
    }

    return _userId!;
  }

  // Get user preferences
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
        documentationImportance: data['documentation_importance'] ?? 'important',
        licensePreference: List<String>.from(data['license_preference'] ?? []),
        repoSize: List<String>.from(data['repo_size'] ?? []),
        onboardingCompleted: data['onboarding_completed'] ?? false,
      );
      notifyListeners();
      return _preferences;
    } catch (e) {
      debugPrint('Error getting app user preferences: $e');
      return null;
    }
  }

  // Save user preferences
  Future<void> saveUserPreferences(String userId, UserPreferences preferences) async {
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
      debugPrint('Error saving app user preferences: $e');
      rethrow;
    }
  }

  // Check if onboarding is completed
  Future<bool> isOnboardingCompleted(String userId) async {
    final prefs = await getUserPreferences(userId);
    return prefs?.onboardingCompleted ?? false;
  }

  // Track user interaction (for recommendations)
  Future<void> trackInteraction({
    required String userId,
    required int repoGithubId,
    required String action, // 'like', 'save', 'skip', 'view', 'swipe_up'
  }) async {
    try {
      await _supabase.from('app_user_interactions').insert({
        'user_id': userId,
        'repo_github_id': repoGithubId,
        'action': action,
        'created_at': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      // Ignore duplicate errors (unique constraint)
      debugPrint('Error tracking interaction: $e');
    }
  }

  // Save new onboarding data structure
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
      // 1. Save user_interests
      if (interests.isNotEmpty) {
        // Delete existing interests first
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

      // 2. Save user_tech_stack
      if (techStack.isNotEmpty) {
        // Delete existing tech stack first
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

      // 3. Save user_profile (skill_level + complexity_vector)
      if (skillLevel != null) {
        Map<String, double> complexityVector = {};
        if (skillLevel == 'beginner') {
          complexityVector = {
            'tutorial': 1.0,
            'boilerplate': 0.8,
            'full_app': 0.3,
            'infra': 0.0,
            'framework': 0.0,
          };
        } else if (skillLevel == 'intermediate') {
          complexityVector = {
            'tutorial': 0.4,
            'boilerplate': 0.7,
            'full_app': 1.0,
            'infra': 0.3,
            'framework': 0.2,
          };
        } else if (skillLevel == 'advanced') {
          complexityVector = {
            'tutorial': 0.1,
            'boilerplate': 0.3,
            'full_app': 0.7,
            'infra': 1.0,
            'framework': 1.0,
          };
        }

        await _supabase.from('user_profile').upsert({
          'user_id': userId,
          'skill_level': skillLevel,
          'complexity_vector': complexityVector,
        }, onConflict: 'user_id');
      }

      // 4. Save user_goals
      if (goals.isNotEmpty) {
        // Delete existing goals first
        await _supabase.from('user_goals').delete().eq('user_id', userId);
        
        for (final goal in goals) {
          await _supabase.from('user_goals').insert({
            'user_id': userId,
            'goal_slug': goal,
          });
        }
      }

      // 5. Save user_preferences (repo_size_pref)
      if (repoSizePref != null) {
        double sizeWeight = 0.6; // default medium
        if (repoSizePref == 'small') sizeWeight = 0.3;
        else if (repoSizePref == 'medium') sizeWeight = 0.6;
        else if (repoSizePref == 'large') sizeWeight = 1.0;

        await _supabase.from('user_preferences').upsert({
          'user_id': userId,
          'repo_size_pref': repoSizePref,
          'size_weight': sizeWeight,
        }, onConflict: 'user_id');
      }

      // 6. Save user_current_projects (if provided)
      if (currentProject != null && currentProject.isNotEmpty) {
        await _supabase.from('user_current_projects').upsert({
          'user_id': userId,
          'text_input': currentProject,
          'extracted_clusters': {}, // Will be populated by backend
        }, onConflict: 'user_id');
      }

      // 7. Generate and save user_vectors
      Map<String, double> interestVector = {};
      for (int i = 0; i < interests.length; i++) {
        final weight = i == 0 ? 0.9 : (i == 1 ? 0.7 : (i == 2 ? 0.5 : 0.3));
        interestVector[interests[i]] = weight;
      }

      Map<String, double> techVector = {};
      for (int i = 0; i < techStack.length; i++) {
        final weight = i == 0 ? 1.0 : (i == 1 ? 0.6 : 0.4);
        techVector[techStack[i]] = weight;
      }

      Map<String, double> goalVector = {};
      for (final goal in goals) {
        goalVector[goal] = 1.0;
      }

      Map<String, double> complexityVector = {};
      if (skillLevel == 'beginner') {
        complexityVector = {
          'tutorial': 1.0,
          'boilerplate': 0.8,
          'full_app': 0.3,
          'infra': 0.0,
          'framework': 0.0,
        };
      } else if (skillLevel == 'intermediate') {
        complexityVector = {
          'tutorial': 0.4,
          'boilerplate': 0.7,
          'full_app': 1.0,
          'infra': 0.3,
          'framework': 0.2,
        };
      } else if (skillLevel == 'advanced') {
        complexityVector = {
          'tutorial': 0.1,
          'boilerplate': 0.3,
          'full_app': 0.7,
          'infra': 1.0,
          'framework': 1.0,
        };
      }

      await _supabase.from('user_vectors').upsert({
        'user_id': userId,
        'interest_vector': interestVector,
        'tech_vector': techVector,
        'complexity_vector': complexityVector,
        'goal_vector': goalVector,
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id');
    } catch (e) {
      debugPrint('Error saving onboarding data: $e');
      rethrow;
    }
  }
}

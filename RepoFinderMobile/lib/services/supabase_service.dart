import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_preferences.dart';

class SupabaseService extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;
  String? _userId;
  UserPreferences? _preferences;

  String? get userId => _userId;
  UserPreferences? get preferences => _preferences;

  // Get or create user ID
  Future<String> getOrCreateUserId({String? name}) async {
    if (_userId != null) return _userId!;

    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getString('user_id');

    if (_userId == null) {
      _userId = 'user_${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecondsSinceEpoch}';
      await prefs.setString('user_id', _userId!);
    }

    // Ensure user exists in Supabase
    try {
      final data = await _supabase
          .from('users')
          .select('id')
          .eq('id', _userId!)
          .maybeSingle();

      if (data == null) {
        await _supabase.from('users').insert({
          'id': _userId!,
          'name': name,
          'created_at': DateTime.now().toIso8601String(),
        });
      } else if (name != null) {
        await _supabase
            .from('users')
            .update({'name': name})
            .eq('id', _userId!);
      }
    } catch (e) {
      debugPrint('Error ensuring user exists: $e');
    }

    return _userId!;
  }

  // Get user preferences
  Future<UserPreferences?> getUserPreferences(String userId) async {
    try {
      final data = await _supabase
          .from('user_preferences')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

      if (data == null) return null;

      // Convert database columns to UserPreferences object
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
      debugPrint('Error getting preferences: $e');
      return null;
    }
  }

  // Save user preferences
  Future<void> saveUserPreferences(String userId, UserPreferences preferences) async {
    try {
      await _supabase.from('user_preferences').upsert({
        'user_id': userId,
        'primary_cluster': preferences.primaryCluster,
        'secondary_clusters': preferences.secondaryClusters,
        'tech_stack': preferences.techStack,
        'interests': preferences.interests,
        'goals': preferences.goals,
        'project_types': preferences.projectTypes,
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
      debugPrint('Error saving preferences: $e');
      rethrow;
    }
  }

  // Check if onboarding is completed
  Future<bool> isOnboardingCompleted(String userId) async {
    final prefs = await getUserPreferences(userId);
    return prefs?.onboardingCompleted ?? false;
  }
}

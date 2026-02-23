import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Handles Apple Sign In authentication via Supabase.
/// 
/// Flow:
/// 1. User taps "Sign in with Apple" → native iOS dialog
/// 2. Apple returns credential → sent to Supabase auth
/// 3. Supabase creates/links user → session established
/// 4. Old anonymous user ID migrated to new Apple user ID
class AuthService extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;

  bool _isLoading = false;
  String? _error;

  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Whether the user has an active Supabase auth session
  bool get isSignedIn => _supabase.auth.currentSession != null;

  /// The current Supabase user (null if not signed in)
  User? get currentUser => _supabase.auth.currentUser;

  /// The authenticated user's ID from Supabase (used as the app user ID)
  String? get userId => currentUser?.id;

  /// User's display name from Apple (may be null after first sign-in)
  String? get displayName {
    final meta = currentUser?.userMetadata;
    if (meta == null) return null;
    final fullName = meta['full_name'] as String?;
    if (fullName != null && fullName.isNotEmpty) return fullName;
    // Fallback: construct from first/last
    final first = meta['first_name'] as String? ?? '';
    final last = meta['last_name'] as String? ?? '';
    final name = '$first $last'.trim();
    return name.isNotEmpty ? name : null;
  }

  /// User's email from Apple
  String? get email => currentUser?.email;

  /// Generate a random nonce for Apple Sign In security
  String _generateNonce([int length = 32]) {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(length, (_) => charset[random.nextInt(charset.length)]).join();
  }

  /// SHA256 hash of the nonce (required by Apple)
  String _sha256ofString(String input) {
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Sign in with Apple via Supabase
  /// 
  /// Returns the Supabase user ID on success, null on failure.
  /// Also migrates any existing anonymous user data to the new Apple user ID.
  Future<String?> signInWithApple() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // 1. Generate nonce for security
      final rawNonce = _generateNonce();
      final hashedNonce = _sha256ofString(rawNonce);

      // 2. Request credential from Apple
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: hashedNonce,
      );

      // 3. Get the identity token
      final idToken = credential.identityToken;
      if (idToken == null) {
        throw Exception('Apple Sign In failed: No identity token received');
      }

      // 4. Sign in to Supabase with the Apple token
      final response = await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );

      if (response.user == null) {
        throw Exception('Supabase auth failed: No user returned');
      }

      // 5. Save display name if Apple provided it (only on first sign-in)
      final fullName = [
        credential.givenName,
        credential.familyName,
      ].where((n) => n != null && n.isNotEmpty).join(' ');

      if (fullName.isNotEmpty) {
        await _supabase.auth.updateUser(
          UserAttributes(
            data: {
              'full_name': fullName,
              'first_name': credential.givenName,
              'last_name': credential.familyName,
            },
          ),
        );
      }

      final newUserId = response.user!.id;

      // 6. Migrate anonymous data to new Apple user ID
      await _migrateAnonymousData(newUserId);

      // 7. Store the new user ID locally
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_user_id', newUserId);

      debugPrint('✅ Apple Sign In successful: $newUserId');

      _isLoading = false;
      notifyListeners();
      return newUserId;
    } on SignInWithAppleAuthorizationException catch (e) {
      // User cancelled or other Apple-specific error
      if (e.code == AuthorizationErrorCode.canceled) {
        _error = null; // User cancelled, not an error
        debugPrint('Apple Sign In cancelled by user');
      } else {
        _error = 'Apple Sign In failed: ${e.message}';
        debugPrint('❌ Apple Sign In error: ${e.code} - ${e.message}');
      }
      _isLoading = false;
      notifyListeners();
      return null;
    } catch (e) {
      _error = 'Sign in failed. Please try again.';
      debugPrint('❌ Sign in error: $e');
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Migrate data from the old anonymous user ID to the new Apple auth user ID.
  /// This ensures existing onboarding data, preferences, and interactions are preserved.
  Future<void> _migrateAnonymousData(String newUserId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final oldUserId = prefs.getString('app_user_id');

      // Only migrate if there's an old anonymous ID that's different
      if (oldUserId == null || oldUserId == newUserId || oldUserId.isEmpty) {
        debugPrint('No anonymous data to migrate');
        return;
      }

      // Skip if old ID is already a Supabase UUID (already migrated)
      if (!oldUserId.startsWith('app_user_')) {
        debugPrint('Old user ID is not anonymous, skipping migration');
        return;
      }

      debugPrint('🔄 Migrating data from $oldUserId → $newUserId');

      // Migrate each table — update user_id references
      // Using try/catch per table so one failure doesn't block others
      final tables = [
        'app_users',
        'app_user_preferences',
        'user_interests',
        'user_tech_stack',
        'user_profile',
        'user_goals',
        'user_preferences',
        'user_current_projects',
        'user_vectors',
        'app_user_interactions',
      ];

      for (final table in tables) {
        try {
          await _supabase
              .from(table)
              .update({'user_id': newUserId})
              .eq('user_id', oldUserId);
        } catch (e) {
          // Table might not exist or have no matching rows — that's fine
          debugPrint('  Migration skipped for $table: $e');
        }
      }

      // Special case: app_users uses 'id' not 'user_id'
      try {
        await _supabase
            .from('app_users')
            .update({
              'id': newUserId,
              'last_active_at': DateTime.now().toIso8601String(),
            })
            .eq('id', oldUserId);
      } catch (e) {
        debugPrint('  Migration skipped for app_users.id: $e');
      }

      debugPrint('✅ Data migration complete');
    } catch (e) {
      debugPrint('⚠️ Migration error (non-fatal): $e');
      // Migration failure is non-fatal — user can still use the app
    }
  }

  /// Sign out the current user
  Future<void> signOut() async {
    try {
      await _supabase.auth.signOut();
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('app_user_id');
      notifyListeners();
    } catch (e) {
      debugPrint('Error signing out: $e');
    }
  }

  /// Check if there's a valid existing session
  Future<bool> hasValidSession() async {
    try {
      final session = _supabase.auth.currentSession;
      if (session == null) return false;

      // Check if session is expired
      if (session.isExpired) {
        // Try to refresh
        try {
          await _supabase.auth.refreshSession();
          return _supabase.auth.currentSession != null;
        } catch (_) {
          return false;
        }
      }
      return true;
    } catch (e) {
      debugPrint('Error checking session: $e');
      return false;
    }
  }
}

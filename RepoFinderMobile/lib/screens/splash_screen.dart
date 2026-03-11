import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/app_supabase_service.dart';
import '../services/revenuecat_service.dart';
import '../theme/app_theme.dart';
import 'sign_in_screen.dart';
import 'onboarding_screen.dart';
import 'main_tab_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  String _statusMessage = 'Loading…';

  @override
  void initState() {
    super.initState();
    _checkAuthAndNavigate();
  }

  Future<void> _checkAuthAndNavigate() async {
    try {
      // Brief splash delay for branding
      await Future.delayed(const Duration(milliseconds: 1200));

      if (!mounted) return;

      final authService = Provider.of<AuthService>(context, listen: false);
      final hasSession = await authService.hasValidSession();

      if (!mounted) return;

      if (hasSession && authService.userId != null) {
        // Sync RevenueCat with authenticated user
        try {
          await RevenueCatService.instance.logIn(authService.userId!);
        } catch (e) {
          debugPrint('RevenueCat login skipped: $e');
        }

        final supabaseService =
            Provider.of<AppSupabaseService>(context, listen: false);

        // Ensure the user row exists in app_users
        final userId = await supabaseService.getOrCreateUserId();

        // Check onboarding status
        final isOnboarded =
            await supabaseService.isOnboardingCompleted(userId);

        if (!mounted) return;

        if (!isOnboarded) {
          // Onboarding not done — go there
          _navigateTo(const OnboardingScreen());
          return;
        }

        // Onboarding done — check if recommendations feed exists
        final hasFeed = await supabaseService.hasRecommendationFeed(userId);

        if (!hasFeed) {
          // Feed is missing (first launch after onboarding, or expired).
          // Rebuild in the background while showing a message.
          if (mounted) setState(() => _statusMessage = 'Personalising your feed…');

          final count = await supabaseService.buildRecommendations(userId);
          debugPrint('Splash: built $count recommendations');
        }

        if (!mounted) return;
        _navigateTo(const MainTabScreen());
      } else {
        // No session — show sign-in screen
        if (!mounted) return;
        _navigateTo(const SignInScreen());
      }
    } catch (e) {
      debugPrint('Error during splash check: $e');
      if (!mounted) return;
      _navigateTo(const SignInScreen());
    }
  }

  void _navigateTo(Widget screen) {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => screen,
        transitionDuration: const Duration(milliseconds: 600),
        transitionsBuilder: (_, animation, __, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // App icon
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppTheme.accent.withOpacity(0.12),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(
                Icons.explore_rounded,
                size: 36,
                color: AppTheme.accent,
              ),
            ),
            const SizedBox(height: 24),

            // App name
            Text(
              'Repoverse',
              style: AppTheme.titleLarge.copyWith(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 40),

            // Spinner
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            const SizedBox(height: 16),

            // Status message (changes during feed rebuild)
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              child: Text(
                _statusMessage,
                key: ValueKey(_statusMessage),
                style: AppTheme.metaText.copyWith(
                  color: AppTheme.textTertiary,
                ),
              ),
            ),

            // Debug skip button (only in debug builds)
            if (kDebugMode) ...[
              const SizedBox(height: 32),
              TextButton(
                onPressed: () => _navigateTo(const OnboardingScreen()),
                child: Text(
                  '🛠️ Go to Onboarding (Debug)',
                  style: TextStyle(
                    color: Colors.orange.withOpacity(0.7),
                    fontSize: 12,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => _navigateTo(const MainTabScreen()),
                child: Text(
                  '🛠️ Go to Main App (Debug)',
                  style: TextStyle(
                    color: Colors.orange.withOpacity(0.7),
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/app_supabase_service.dart';
import 'sign_in_screen.dart';
import 'onboarding_screen.dart';
import 'main_tab_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuthAndNavigate();
  }

  Future<void> _checkAuthAndNavigate() async {
    try {
      // Brief splash delay for branding
      await Future.delayed(const Duration(seconds: 2));

      if (!mounted) return;

      final authService = Provider.of<AuthService>(context, listen: false);
      final hasSession = await authService.hasValidSession();

      if (!mounted) return;

      if (hasSession && authService.userId != null) {
        // User is signed in — check if onboarding is done
        final supabaseService =
            Provider.of<AppSupabaseService>(context, listen: false);
        final isOnboarded = await supabaseService
            .isOnboardingCompleted(authService.userId!);

        if (!mounted) return;

        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) =>
                isOnboarded ? const MainTabScreen() : const OnboardingScreen(),
          ),
        );
      } else {
        // No session — show sign-in screen
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const SignInScreen()),
        );
      }
    } catch (e) {
      if (!mounted) return;

      debugPrint('Error during splash check: $e');
      // On error, default to sign-in screen
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const SignInScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Repoverse',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 20),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}

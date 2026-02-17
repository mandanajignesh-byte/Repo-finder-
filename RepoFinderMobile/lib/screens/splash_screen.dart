import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import '../services/app_supabase_service.dart';
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
    _checkOnboardingStatus();
  }

  Future<void> _checkOnboardingStatus() async {
    try {
      await Future.delayed(const Duration(seconds: 2));

      if (!mounted) return;

      // TEMPORARY: Always show onboarding for testing
      // TODO: Remove this and uncomment the code below when ready
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const OnboardingScreen(),
        ),
      );
      
      /* ORIGINAL CODE - Uncomment when ready to use onboarding check
      final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
      final userId = await supabaseService.getOrCreateUserId();
      final isCompleted = await supabaseService.isOnboardingCompleted(userId);

      if (!mounted) return;

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => isCompleted 
              ? const MainTabScreen() 
              : const OnboardingScreen(),
        ),
      );
      */
    } catch (e) {
      if (!mounted) return;
      
      // Show error but still navigate to onboarding
      debugPrint('Error checking onboarding: $e');
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const OnboardingScreen()),
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
              'RepoFinder',
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

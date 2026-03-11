import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/app_supabase_service.dart';
import '../services/revenuecat_service.dart';
import '../models/user_preferences.dart';
import '../theme/app_theme.dart';
import 'onboarding_screen.dart';
import 'paywall_screen.dart';
import 'sign_in_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  UserPreferences? _preferences;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    final supabaseService =
        Provider.of<AppSupabaseService>(context, listen: false);
    final userId = await supabaseService.getOrCreateUserId();
    if (!mounted) return;
    final prefs = await supabaseService.getUserPreferences(userId);

    if (mounted) {
      setState(() {
        _preferences = prefs;
        _isLoading = false;
      });
    }
  }

  Future<void> _clearData() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
        title: const Text('Clear All Data',
            style: TextStyle(color: AppTheme.textPrimary)),
        content: const Text(
            'This will delete all your preferences and saved repos. Continue?',
            style: TextStyle(color: AppTheme.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel',
                style: TextStyle(color: AppTheme.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Clear',
                style: TextStyle(color: AppTheme.error)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      if (!mounted) return;
      final authService = Provider.of<AuthService>(context, listen: false);
      await authService.signOut();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const SignInScreen()),
          (route) => false,
        );
      }
    }
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
        title: const Text('Sign Out',
            style: TextStyle(color: AppTheme.textPrimary)),
        content: const Text('You will need to sign in again to use the app.',
            style: TextStyle(color: AppTheme.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel',
                style: TextStyle(color: AppTheme.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign Out',
                style: TextStyle(color: AppTheme.error)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (!mounted) return;
      final authService = Provider.of<AuthService>(context, listen: false);
      await authService.signOut();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const SignInScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppTheme.accent),
                  strokeWidth: 2,
                ),
              )
            : SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.only(bottom: 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 24),
                    _buildSubscriptionCard(),
                    const SizedBox(height: 16),
                    if (_preferences != null) _buildPreferencesCard(),
                    if (_preferences != null) const SizedBox(height: 16),
                    _buildActionsCard(),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildHeader() {
    final authService = Provider.of<AuthService>(context, listen: false);
    final displayName =
        authService.displayName ?? _preferences?.name ?? 'Developer';
    final initial =
        displayName.isNotEmpty ? displayName[0].toUpperCase() : 'D';
    final isSignedIn = authService.isSignedIn;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTheme.hairlineBorder)),
      ),
      child: Row(
        children: [
          // Gradient avatar circle
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF0A84FF), Color(0xFF5E5CE6)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0A84FF).withOpacity(0.35),
                  blurRadius: 20,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Center(
              child: Text(
                initial,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isSignedIn ? (authService.email ?? 'Apple ID') : 'Guest User',
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: isSignedIn
                        ? AppTheme.success.withOpacity(0.12)
                        : AppTheme.textSecondary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSignedIn
                          ? AppTheme.success.withOpacity(0.3)
                          : AppTheme.textSecondary.withOpacity(0.2),
                    ),
                  ),
                  child: Text(
                    isSignedIn ? '● Signed In' : '● Guest',
                    style: TextStyle(
                      color: isSignedIn
                          ? AppTheme.success
                          : AppTheme.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.edit_outlined,
                color: AppTheme.textSecondary),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const OnboardingScreen()),
              ).then((_) => _loadPreferences());
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSubscriptionCard() {
    final isPro = RevenueCatService.instance.isProUser;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isPro
                ? [const Color(0xFF2D2000), const Color(0xFF1A1200)]
                : [const Color(0xFF001A2E), const Color(0xFF000D1A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          border: Border.all(
            color: isPro
                ? const Color(0xFFFFD60A).withOpacity(0.3)
                : AppTheme.accent.withOpacity(0.3),
          ),
        ),
        child: ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          leading: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isPro
                  ? const Color(0xFFFFD60A).withOpacity(0.15)
                  : AppTheme.accent.withOpacity(0.15),
            ),
            child: Icon(
              Icons.workspace_premium_rounded,
              color: isPro ? const Color(0xFFFFD60A) : AppTheme.accent,
              size: 24,
            ),
          ),
          title: Text(
            isPro ? 'Repoverse Pro' : 'Upgrade to Pro',
            style: TextStyle(
              color: isPro ? const Color(0xFFFFD60A) : AppTheme.accent,
              fontWeight: FontWeight.w700,
              fontSize: 16,
            ),
          ),
          subtitle: Text(
            isPro
                ? '✓ All features unlocked'
                : 'Unlimited swipes, AI recommendations & more',
            style: const TextStyle(
                color: AppTheme.textSecondary, fontSize: 12),
          ),
          trailing: isPro
              ? null
              : GestureDetector(
                  onTap: () => showPaywallScreen(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: AppTheme.accent,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'Upgrade',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
          onTap: isPro ? null : () => showPaywallScreen(context),
        ),
      ),
    );
  }

  Widget _buildPreferencesCard() {
    final prefs = _preferences!;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          border: Border.all(color: AppTheme.hairlineBorder),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text(
                  'Your Preferences',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const OnboardingScreen()),
                    ).then((_) => _loadPreferences());
                  },
                  child: const Text('Edit',
                      style: TextStyle(
                          color: AppTheme.accent, fontSize: 14)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (prefs.primaryCluster != null) ...[
              _prefRow('Focus', Icons.hub_outlined,
                  _chipRow([prefs.primaryCluster!], const Color(0xFF0A84FF))),
              const SizedBox(height: 12),
            ],
            if (prefs.techStack.isNotEmpty) ...[
              _prefRow('Stack', Icons.code_rounded,
                  _chipRow(prefs.techStack, const Color(0xFF30D158))),
              const SizedBox(height: 12),
            ],
            if (prefs.interests.isNotEmpty) ...[
              _prefRow('Interests', Icons.interests_outlined,
                  _chipRow(prefs.interests, const Color(0xFFFF9F0A))),
              const SizedBox(height: 12),
            ],
            if (prefs.goals.isNotEmpty) ...[
              _prefRow(
                  'Goals',
                  Icons.flag_outlined,
                  _chipRow(
                      prefs.goals
                          .map((g) => g.replaceAll('-', ' '))
                          .toList(),
                      const Color(0xFFBF5AF2))),
              const SizedBox(height: 16),
            ],
            Row(
              children: [
                _metaBadge(
                    prefs.experienceLevel.toUpperCase(),
                    Icons.bar_chart_rounded),
                const SizedBox(width: 8),
                _metaBadge(
                    prefs.activityPreference, Icons.timeline_rounded),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _prefRow(String label, IconData icon, Widget content) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppTheme.textSecondary),
        const SizedBox(width: 8),
        SizedBox(
          width: 68,
          child: Text(label,
              style: const TextStyle(
                  color: AppTheme.textSecondary, fontSize: 13)),
        ),
        Expanded(child: content),
      ],
    );
  }

  Widget _chipRow(List<String> items, Color color) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: items.take(6).map((item) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Text(
            item,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _metaBadge(String text, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppTheme.elevatedSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.hairlineBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppTheme.textSecondary),
          const SizedBox(width: 4),
          Text(text,
              style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildActionsCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          border: Border.all(color: AppTheme.hairlineBorder),
        ),
        child: Column(
          children: [
            _actionTile(
              icon: Icons.tune_rounded,
              iconColor: AppTheme.accent,
              label: 'Edit Preferences',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const OnboardingScreen()),
                ).then((_) => _loadPreferences());
              },
            ),
            _divider(),
            Consumer<AuthService>(
              builder: (context, auth, _) {
                if (!auth.isSignedIn) return const SizedBox.shrink();
                return Column(children: [
                  _actionTile(
                    icon: Icons.logout_rounded,
                    iconColor: AppTheme.warning,
                    label: 'Sign Out',
                    onTap: _signOut,
                  ),
                  _divider(),
                ]);
              },
            ),
            _actionTile(
              icon: Icons.delete_sweep_outlined,
              iconColor: AppTheme.error,
              label: 'Clear All Data',
              onTap: _clearData,
            ),
          ],
        ),
      ),
    );
  }

  Widget _actionTile({
    required IconData icon,
    required Color iconColor,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: iconColor),
            ),
            const SizedBox(width: 14),
            Text(
              label,
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            const Icon(Icons.chevron_right_rounded,
                color: AppTheme.textSecondary, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _divider() => const Divider(
        color: AppTheme.hairlineBorder,
        height: 1,
        indent: 20,
        endIndent: 20,
      );
}

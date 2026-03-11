import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/app_supabase_service.dart';
import '../services/revenuecat_service.dart';
import '../models/user_preferences.dart';
import '../widgets/github_connect_card.dart';
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
        backgroundColor: const Color(0xFF1C1C1E),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Clear All Data',
            style: TextStyle(color: Colors.white)),
        content: const Text(
          'This will delete all your preferences and saved repos. This action cannot be undone.',
          style: TextStyle(color: Color(0xFF8B8B99)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel',
                style: TextStyle(color: AppTheme.accent)),
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
      final authService =
          Provider.of<AuthService>(context, listen: false);
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
        backgroundColor: const Color(0xFF1C1C1E),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sign Out',
            style: TextStyle(color: Colors.white)),
        content: const Text(
          'You will need to sign in again to use the app.',
          style: TextStyle(color: Color(0xFF8B8B99)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel',
                style: TextStyle(color: AppTheme.accent)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign Out',
                style: TextStyle(color: AppTheme.warning)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (!mounted) return;
      final authService =
          Provider.of<AuthService>(context, listen: false);
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
      backgroundColor: Colors.black,
      body: SafeArea(
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppTheme.accent),
                  strokeWidth: 2,
                ),
              )
            : CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(child: _buildHeader()),
                  SliverToBoxAdapter(child: _buildSubscriptionCard()),
                  SliverToBoxAdapter(child: _buildPreferencesCard()),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: const GitHubConnectCard(),
                    ),
                  ),
                  SliverToBoxAdapter(child: _buildActionsCard()),
                  const SliverToBoxAdapter(child: SizedBox(height: 32)),
                ],
              ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Header
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildHeader() {
    return Consumer<AuthService>(
      builder: (context, auth, _) {
        final name = auth.displayName ?? _preferences?.name ?? 'Developer';
        final email = auth.email;
        final initial =
            name.isNotEmpty ? name[0].toUpperCase() : 'D';

        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
          child: Row(
            children: [
              // Avatar with gradient
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0A84FF), Color(0xFF5E5CE6)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0A84FF).withOpacity(0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    initial,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
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
                      name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                    if (email != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        email,
                        style: const TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 13,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    if (auth.isSignedIn)
                      _StatusBadge(
                        icon: Icons.apple_rounded,
                        label: 'Apple ID',
                        color: Colors.white,
                        bgColor: const Color(0xFF1C1C1E),
                      ),
                  ],
                ),
              ),
              // Refresh icon
              IconButton(
                onPressed: _loadPreferences,
                icon: const Icon(Icons.refresh_rounded,
                    color: Colors.white38),
              ),
            ],
          ),
        );
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Subscription card
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildSubscriptionCard() {
    final isPro = RevenueCatService.instance.isProUser;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: GestureDetector(
        onTap: isPro ? null : () => showPaywallScreen(context),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isPro
                  ? [const Color(0xFF2D1B00), const Color(0xFF1A1000)]
                  : [
                      const Color(0xFF0D2140),
                      const Color(0xFF071628),
                    ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isPro
                  ? const Color(0xFFFFD700).withOpacity(0.3)
                  : AppTheme.accent.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: isPro
                      ? const Color(0xFFFFD700).withOpacity(0.12)
                      : AppTheme.accent.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.workspace_premium_rounded,
                  color: isPro
                      ? const Color(0xFFFFD700)
                      : AppTheme.accent,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isPro ? 'Repoverse Pro' : 'Upgrade to Pro',
                      style: TextStyle(
                        color: isPro
                            ? const Color(0xFFFFD700)
                            : AppTheme.accent,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isPro
                          ? 'Active subscription • Unlimited swipes'
                          : 'Unlock unlimited swipes & more',
                      style: const TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (!isPro)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.accent,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Upgrade',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFD700).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: const Color(0xFFFFD700).withOpacity(0.3),
                      width: 0.8,
                    ),
                  ),
                  child: const Text(
                    'Active',
                    style: TextStyle(
                      color: Color(0xFFFFD700),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Preferences card
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildPreferencesCard() {
    if (_preferences == null) return const SizedBox.shrink();
    final p = _preferences!;

    return _SectionCard(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      title: 'My Preferences',
      titleTrailing: GestureDetector(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const OnboardingScreen()),
        ).then((_) => _loadPreferences()),
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppTheme.accent.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: AppTheme.accent.withOpacity(0.3),
              width: 0.8,
            ),
          ),
          child: const Text(
            'Edit',
            style: TextStyle(
              color: AppTheme.accent,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
      children: [
        // Experience level
        _PrefRow(
          label: 'Experience',
          value: _capitalize(p.experienceLevel),
          icon: Icons.school_outlined,
          iconColor: const Color(0xFF60A5FA),
        ),

        // Primary focus
        if (p.primaryCluster != null)
          _PrefRow(
            label: 'Primary Focus',
            value: _capitalize(p.primaryCluster!.replaceAll('_', ' ')),
            icon: Icons.category_outlined,
            iconColor: const Color(0xFF34D399),
          ),

        // Tech stack chips
        if (p.techStack.isNotEmpty) ...[
          const SizedBox(height: 12),
          _ChipLabel(label: 'Tech Stack', icon: Icons.code_rounded),
          const SizedBox(height: 8),
          _ChipRow(
            items: p.techStack,
            color: const Color(0xFF8B5CF6),
          ),
        ],

        // Interests chips
        if (p.interests.isNotEmpty) ...[
          const SizedBox(height: 12),
          _ChipLabel(
              label: 'Interests', icon: Icons.favorite_outline_rounded),
          const SizedBox(height: 8),
          _ChipRow(
            items: p.interests,
            color: const Color(0xFFF59E0B),
          ),
        ],

        // Goals chips
        if (p.goals.isNotEmpty) ...[
          const SizedBox(height: 12),
          _ChipLabel(label: 'Goals', icon: Icons.flag_outlined),
          const SizedBox(height: 8),
          _ChipRow(
            items:
                p.goals.map((g) => g.replaceAll('-', ' ')).toList(),
            color: const Color(0xFF22C55E),
          ),
        ],
      ],
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Actions card
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildActionsCard() {
    return _SectionCard(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      title: 'Account',
      children: [
        _ActionRow(
          icon: Icons.edit_outlined,
          iconColor: AppTheme.accent,
          label: 'Edit Preferences',
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const OnboardingScreen()),
          ).then((_) => _loadPreferences()),
        ),
        _divider(),
        _ActionRow(
          icon: Icons.logout_rounded,
          iconColor: AppTheme.warning,
          label: 'Sign Out',
          labelColor: AppTheme.warning,
          onTap: _signOut,
        ),
        _divider(),
        _ActionRow(
          icon: Icons.delete_outline_rounded,
          iconColor: AppTheme.error,
          label: 'Clear All Data',
          labelColor: AppTheme.error,
          onTap: _clearData,
        ),
      ],
    );
  }

  Widget _divider() => const Divider(
        color: Color(0xFF1C1C24),
        height: 1,
        thickness: 0.8,
        indent: 44,
      );

  String _capitalize(String s) =>
      s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper widgets
// ─────────────────────────────────────────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color bgColor;

  const _StatusBadge({
    required this.icon,
    required this.label,
    required this.color,
    required this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Colors.white.withOpacity(0.08),
          width: 0.7,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget? titleTrailing;
  final List<Widget> children;
  final EdgeInsets margin;

  const _SectionCard({
    required this.title,
    required this.children,
    this.titleTrailing,
    this.margin = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: const Color(0xFF111218),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.06),
          width: 0.7,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                  ),
                ),
                const Spacer(),
                if (titleTrailing != null) titleTrailing!,
              ],
            ),
            const SizedBox(height: 14),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _PrefRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;

  const _PrefRow({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 15, color: iconColor),
          ),
          const SizedBox(width: 10),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF6B7280),
              fontSize: 13,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChipLabel extends StatelessWidget {
  final String label;
  final IconData icon;

  const _ChipLabel({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 13, color: const Color(0xFF6B7280)),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF6B7280),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _ChipRow extends StatelessWidget {
  final List<String> items;
  final Color color;

  const _ChipRow({required this.items, required this.color});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: items
          .map(
            (item) => Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: color.withOpacity(0.25),
                  width: 0.8,
                ),
              ),
              child: Text(
                item,
                style: TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _ActionRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final Color labelColor;
  final VoidCallback onTap;

  const _ActionRow({
    required this.icon,
    required this.iconColor,
    required this.label,
    this.labelColor = Colors.white,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 17, color: iconColor),
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                color: labelColor,
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            const Icon(Icons.chevron_right_rounded,
                color: Color(0xFF3A3A4A), size: 20),
          ],
        ),
      ),
    );
  }
}

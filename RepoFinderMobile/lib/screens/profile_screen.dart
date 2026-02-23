import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/app_supabase_service.dart';
import '../services/revenuecat_service.dart';
import '../models/user_preferences.dart';
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
    final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
    final userId = await supabaseService.getOrCreateUserId();
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
        title: const Text('Clear All Data'),
        content: const Text('This will delete all your preferences and saved repos. Continue?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Clear', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      // Clear local storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      // Sign out from Supabase
      final authService = Provider.of<AuthService>(context, listen: false);
      await authService.signOut();

      // Navigate to sign-in screen
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
        title: const Text('Sign Out'),
        content: const Text('You will need to sign in again to use the app.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign Out', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
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
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text(
          'Profile',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.black,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // User Info
                  Card(
                    color: const Color(0xFF1A1A1A),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Preferences',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (_preferences?.name != null)
                            _buildInfoRow('Name', _preferences!.name!),
                          if (_preferences?.primaryCluster != null)
                            _buildInfoRow(
                              'Primary Cluster',
                              _preferences!.primaryCluster!.toUpperCase(),
                            ),
                          if (_preferences?.techStack.isNotEmpty == true)
                            _buildInfoRow(
                              'Tech Stack',
                              _preferences!.techStack.join(', '),
                            ),
                          if (_preferences?.goals.isNotEmpty == true)
                            _buildInfoRow(
                              'Goals',
                              _preferences!.goals.join(', ').replaceAll('-', ' '),
                            ),
                          if (_preferences?.experienceLevel != null)
                            _buildInfoRow(
                              'Experience',
                              _preferences!.experienceLevel.toUpperCase(),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Account Info
                  Consumer<AuthService>(
                    builder: (context, auth, _) {
                      if (!auth.isSignedIn) return const SizedBox.shrink();
                      return Column(
                        children: [
                          Card(
                            color: const Color(0xFF1A1A1A),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Account',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  if (auth.displayName != null)
                                    _buildInfoRow('Name', auth.displayName!),
                                  if (auth.email != null)
                                    _buildInfoRow('Email', auth.email!),
                                  _buildInfoRow('Sign In', 'Apple ID'),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                      );
                    },
                  ),

                  // Subscription Status
                  Builder(
                    builder: (context) {
                      final revenueCat = RevenueCatService.instance;
                      if (revenueCat.isProUser) {
                        return Card(
                          color: const Color(0xFF1A1A1A),
                          child: ListTile(
                            leading: const Icon(Icons.workspace_premium_rounded, color: Colors.amber),
                            title: const Text('Repoverse Pro', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
                            subtitle: const Text('Active subscription', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          ),
                        );
                      } else {
                        return Card(
                          color: const Color(0xFF1A1A1A),
                          child: ListTile(
                            leading: const Icon(Icons.workspace_premium_rounded, color: Colors.cyan),
                            title: const Text('Upgrade to Pro', style: TextStyle(color: Colors.cyan, fontWeight: FontWeight.bold)),
                            subtitle: const Text('Unlock unlimited swipes & more', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            trailing: const Icon(Icons.arrow_forward_ios, color: Colors.grey, size: 16),
                            onTap: () {
                              showPaywallScreen(context);
                            },
                          ),
                        );
                      }
                    },
                  ),
                  const SizedBox(height: 16),

                  // Actions
                  Card(
                    color: const Color(0xFF1A1A1A),
                    child: Column(
                      children: [
                        ListTile(
                          leading: const Icon(Icons.edit, color: Colors.white),
                          title: const Text('Edit Preferences', style: TextStyle(color: Colors.white)),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const OnboardingScreen(),
                              ),
                            ).then((_) => _loadPreferences());
                          },
                        ),
                        const Divider(color: Colors.grey),
                        ListTile(
                          leading: const Icon(Icons.logout_rounded, color: Colors.orange),
                          title: const Text('Sign Out', style: TextStyle(color: Colors.orange)),
                          onTap: _signOut,
                        ),
                        const Divider(color: Colors.grey),
                        ListTile(
                          leading: const Icon(Icons.delete_outline, color: Colors.red),
                          title: const Text('Clear All Data', style: TextStyle(color: Colors.red)),
                          onTap: _clearData,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(color: Colors.grey, fontSize: 14),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: Colors.white, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}

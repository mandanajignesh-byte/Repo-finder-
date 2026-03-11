import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_supabase_service.dart';
import '../models/user_preferences.dart';
import '../theme/app_theme.dart';

/// A single-scroll preferences editor — no multi-step wizard.
/// Loads the user's existing preferences and lets them adjust everything in one place.
/// On save, bumps [AppSupabaseService.prefsVersion] so the discovery deck reloads.
class EditPreferencesScreen extends StatefulWidget {
  const EditPreferencesScreen({super.key});

  @override
  State<EditPreferencesScreen> createState() => _EditPreferencesScreenState();
}

class _EditPreferencesScreenState extends State<EditPreferencesScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  // ── Editable preference state ─────────────────────────────────────────────
  List<String> _selectedInterests = [];
  List<String> _selectedTechStack = [];
  String _skillLevel = 'intermediate';
  List<String> _selectedGoals = [];
  String _repoSize = 'medium';
  String _activityPreference = 'any';

  // ── Option data ───────────────────────────────────────────────────────────
  static const _interests = [
    {'id': 'ai_ml',         'name': 'AI / Machine Learning'},
    {'id': 'web_dev',       'name': 'Web Development'},
    {'id': 'mobile',        'name': 'Mobile App Development'},
    {'id': 'devops',        'name': 'DevOps / Infrastructure'},
    {'id': 'cybersecurity', 'name': 'Cybersecurity'},
    {'id': 'data_science',  'name': 'Data Science'},
    {'id': 'automation',    'name': 'Automation / Bots'},
    {'id': 'blockchain',    'name': 'Blockchain / Web3'},
    {'id': 'game_dev',      'name': 'Game Development'},
    {'id': 'open_source',   'name': 'Open Source Tools'},
    {'id': 'database',      'name': 'Database / Storage'},
  ];

  static const _techStack = [
    {'id': 'python',        'name': 'Python'},
    {'id': 'javascript',    'name': 'JavaScript / TypeScript'},
    {'id': 'go',            'name': 'Go'},
    {'id': 'rust',          'name': 'Rust'},
    {'id': 'java',          'name': 'Java'},
    {'id': 'cpp',           'name': 'C++'},
    {'id': 'react',         'name': 'React / Next.js'},
    {'id': 'nodejs',        'name': 'Node.js'},
    {'id': 'flutter',       'name': 'Flutter / Dart'},
    {'id': 'swift_kotlin',  'name': 'Swift / Kotlin'},
    {'id': 'django',        'name': 'Django / FastAPI'},
    {'id': 'spring',        'name': 'Spring Boot'},
    {'id': 'docker',        'name': 'Docker'},
    {'id': 'kubernetes',    'name': 'Kubernetes'},
    {'id': 'supabase',      'name': 'Supabase / Firebase'},
  ];

  static const _goals = [
    {'id': 'learning',     'name': 'Learning to code'},
    {'id': 'startup',      'name': 'Building a startup / SaaS'},
    {'id': 'freelance',    'name': 'Freelancing / agency work'},
    {'id': 'contributing', 'name': 'Contributing to open source'},
    {'id': 'exploring',    'name': 'Exploring new tech'},
  ];

  static const _skillLevels = [
    {'id': 'beginner',     'name': 'Beginner',     'desc': 'Learning basics & tutorials'},
    {'id': 'intermediate', 'name': 'Intermediate', 'desc': 'Building full projects'},
    {'id': 'advanced',     'name': 'Advanced',     'desc': 'Scalable systems & frameworks'},
  ];

  static const _repoSizes = [
    {'id': 'small',  'name': 'Small',  'desc': 'Scripts & utilities'},
    {'id': 'medium', 'name': 'Medium', 'desc': 'Full projects'},
    {'id': 'large',  'name': 'Large',  'desc': 'Production systems'},
  ];

  static const _activityOptions = [
    {'id': 'active',   'name': 'Active repos only'},
    {'id': 'any',      'name': 'Any activity level'},
    {'id': 'archived', 'name': 'Include archived'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadPreferences());
  }

  // ── Load existing preferences ─────────────────────────────────────────────

  Future<void> _loadPreferences() async {
    if (!mounted) return;
    setState(() { _isLoading = true; _error = null; });

    try {
      final svc = Provider.of<AppSupabaseService>(context, listen: false);
      final userId = await svc.getOrCreateUserId();
      final prefs = await svc.getUserPreferences(userId);

      if (mounted && prefs != null) {
        setState(() {
          _selectedInterests = List<String>.from(prefs.interests);
          _selectedTechStack = List<String>.from(prefs.techStack);
          _skillLevel = prefs.experienceLevel;
          _selectedGoals = List<String>.from(prefs.goals);
          _repoSize = prefs.repoSize.isNotEmpty ? prefs.repoSize.first : 'medium';
          _activityPreference = prefs.activityPreference;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  Future<void> _save() async {
    if (_isSaving) return;
    setState(() => _isSaving = true);

    try {
      final svc = Provider.of<AppSupabaseService>(context, listen: false);
      final userId = await svc.getOrCreateUserId();

      // Derive primaryCluster from first selected interest — same logic as onboarding.
      // This is what the discovery backend uses to pick which repo cluster to query.
      final primaryCluster = _selectedInterests.isNotEmpty
          ? _selectedInterests.first
          : svc.preferences?.primaryCluster;
      final secondaryClusters = _selectedInterests.length > 1
          ? _selectedInterests.sublist(1)
          : <String>[];

      final prefs = UserPreferences(
        interests: _selectedInterests,
        techStack: _selectedTechStack,
        experienceLevel: _skillLevel,
        goals: _selectedGoals,
        repoSize: [_repoSize],
        activityPreference: _activityPreference,
        // Derived from selected interests (same as onboarding)
        primaryCluster: primaryCluster,
        secondaryClusters: secondaryClusters,
        // Preserve other values
        projectTypes: svc.preferences?.projectTypes,
        popularityWeight: svc.preferences?.popularityWeight ?? 'medium',
        documentationImportance: svc.preferences?.documentationImportance,
        licensePreference: svc.preferences?.licensePreference ?? [],
        onboardingCompleted: true,
      );

      // 1. Update user_preferences (cross-platform / web-visible)
      await svc.saveUserPreferences(userId, prefs);

      // 2. Update ALL backend recommendation engine tables so that the
      //    discovery feed reflects the new preferences immediately:
      //    user_interests, user_tech_stack, user_profile (complexity vector),
      //    user_goals, user_vectors — exactly the same tables onboarding writes.
      await svc.saveOnboardingData(
        userId: userId,
        interests: _selectedInterests,
        techStack: _selectedTechStack,
        skillLevel: _skillLevel,
        goals: _selectedGoals,
        repoSizePref: _repoSize,
        currentProject: '',
      );

      // 3. Notify discovery screen to show "Finding new repos…" and reload
      svc.bumpPrefsVersion();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Preferences saved!'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
        Navigator.pop(context, true); // true = preferences were updated
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded,
              color: AppTheme.textPrimary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Edit Preferences',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppTheme.accent),
                strokeWidth: 2,
              ),
            )
          : _error != null
              ? _buildError()
              : _buildForm(),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.wifi_off_rounded,
              color: AppTheme.textSecondary, size: 48),
          const SizedBox(height: 16),
          Text(_error!,
              style: const TextStyle(color: AppTheme.textSecondary),
              textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadPreferences,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accent,
              foregroundColor: Colors.white,
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildForm() {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              // Interests
              _sectionHeader('Interests', 'Pick up to 5 topics you care about',
                  Icons.interests_outlined, const Color(0xFFFF9F0A)),
              const SizedBox(height: 12),
              _buildMultiSelect(
                options: _interests,
                selected: _selectedInterests,
                maxSelect: 5,
                activeColor: const Color(0xFFFF9F0A),
                onTap: (id) => _toggle(_selectedInterests, id, max: 5),
              ),
              const SizedBox(height: 28),

              // Tech Stack
              _sectionHeader('Tech Stack', 'Languages & frameworks you use',
                  Icons.code_rounded, const Color(0xFF30D158)),
              const SizedBox(height: 12),
              _buildMultiSelect(
                options: _techStack,
                selected: _selectedTechStack,
                activeColor: const Color(0xFF30D158),
                onTap: (id) => _toggle(_selectedTechStack, id),
              ),
              const SizedBox(height: 28),

              // Goals
              _sectionHeader('Goals', 'What are you trying to achieve?',
                  Icons.flag_outlined, const Color(0xFFBF5AF2)),
              const SizedBox(height: 12),
              _buildMultiSelect(
                options: _goals,
                selected: _selectedGoals,
                activeColor: const Color(0xFFBF5AF2),
                onTap: (id) => _toggle(_selectedGoals, id),
              ),
              const SizedBox(height: 28),

              // Skill Level
              _sectionHeader('Experience Level', 'How experienced are you?',
                  Icons.bar_chart_rounded, const Color(0xFF0A84FF)),
              const SizedBox(height: 12),
              _buildSingleSelect(
                options: _skillLevels,
                selected: _skillLevel,
                activeColor: const Color(0xFF0A84FF),
                onTap: (id) => setState(() => _skillLevel = id),
              ),
              const SizedBox(height: 28),

              // Repo Size
              _sectionHeader('Repo Size Preference', 'What size projects do you prefer?',
                  Icons.storage_rounded, const Color(0xFF5AC8FA)),
              const SizedBox(height: 12),
              _buildSingleSelect(
                options: _repoSizes,
                selected: _repoSize,
                activeColor: const Color(0xFF5AC8FA),
                onTap: (id) => setState(() => _repoSize = id),
              ),
              const SizedBox(height: 28),

              // Activity
              _sectionHeader('Activity Preference', 'How active should repos be?',
                  Icons.timeline_rounded, const Color(0xFFFF6B35)),
              const SizedBox(height: 12),
              _buildSingleSelect(
                options: _activityOptions,
                selected: _activityPreference,
                activeColor: const Color(0xFFFF6B35),
                onTap: (id) => setState(() => _activityPreference = id),
              ),
              const SizedBox(height: 40),

              // Save button
              _buildSaveButton(),
              const SizedBox(height: 20),
            ]),
          ),
        ),
      ],
    );
  }

  // ── Section helpers ───────────────────────────────────────────────────────

  Widget _sectionHeader(
      String title, String subtitle, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: color),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  )),
              Text(subtitle,
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  )),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMultiSelect({
    required List<Map<String, String>> options,
    required List<String> selected,
    required Color activeColor,
    required void Function(String id) onTap,
    int? maxSelect,
  }) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((option) {
        final id = option['id']!;
        final name = option['name']!;
        final isSelected = selected.contains(id);
        final isDisabled = !isSelected && maxSelect != null && selected.length >= maxSelect;

        return GestureDetector(
          onTap: isDisabled ? null : () => onTap(id),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            decoration: BoxDecoration(
              color: isSelected
                  ? activeColor.withValues(alpha: 0.15)
                  : isDisabled
                      ? AppTheme.surface.withValues(alpha: 0.5)
                      : AppTheme.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isSelected
                    ? activeColor
                    : isDisabled
                        ? AppTheme.hairlineBorder.withValues(alpha: 0.4)
                        : AppTheme.hairlineBorder,
                width: isSelected ? 1.5 : 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isSelected) ...[
                  Icon(Icons.check_rounded, size: 14, color: activeColor),
                  const SizedBox(width: 4),
                ],
                Text(
                  name,
                  style: TextStyle(
                    color: isSelected
                        ? activeColor
                        : isDisabled
                            ? AppTheme.textSecondary.withValues(alpha: 0.4)
                            : AppTheme.textSecondary,
                    fontSize: 13,
                    fontWeight:
                        isSelected ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSingleSelect({
    required List<Map<String, String>> options,
    required String selected,
    required Color activeColor,
    required void Function(String id) onTap,
  }) {
    return Column(
      children: options.map((option) {
        final id = option['id']!;
        final name = option['name']!;
        final desc = option['desc'] ?? '';
        final isSelected = selected == id;

        return GestureDetector(
          onTap: () => onTap(id),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: isSelected
                  ? activeColor.withValues(alpha: 0.12)
                  : AppTheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isSelected ? activeColor : AppTheme.hairlineBorder,
                width: isSelected ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          style: TextStyle(
                            color: isSelected
                                ? activeColor
                                : AppTheme.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          )),
                      if (desc.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(desc,
                            style: const TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 12,
                            )),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isSelected ? activeColor : Colors.transparent,
                    border: Border.all(
                      color: isSelected
                          ? activeColor
                          : AppTheme.textSecondary.withValues(alpha: 0.4),
                      width: 2,
                    ),
                  ),
                  child: isSelected
                      ? const Icon(Icons.check_rounded,
                          size: 12, color: Colors.white)
                      : null,
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: _isSaving ? null : _save,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppTheme.accent.withValues(alpha: 0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
        child: _isSaving
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeWidth: 2,
                ),
              )
            : const Text(
                'Save Changes',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  void _toggle(List<String> list, String id, {int? max}) {
    setState(() {
      if (list.contains(id)) {
        list.remove(id);
      } else if (max == null || list.length < max) {
        list.add(id);
      }
    });
  }
}

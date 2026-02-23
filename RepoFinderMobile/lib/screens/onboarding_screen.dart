import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/app_supabase_service.dart';
import '../services/revenuecat_service.dart';
import '../models/user_preferences.dart';
import '../theme/app_theme.dart';
import 'main_tab_screen.dart';
import 'paywall_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  int _currentStep = 0;
  final PageController _pageController = PageController();
  
  // New onboarding data
  List<String> _selectedInterests = []; // Max 5
  List<String> _selectedTechStack = [];
  String? _skillLevel; // beginner, intermediate, advanced
  List<String> _selectedGoals = [];
  String? _repoSizePref; // small, medium, large
  bool _githubConnected = false;
  String _currentProject = '';
  
  late AnimationController _fadeController;
  late AnimationController _scaleController;
  late AnimationController _slideController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;
  late Animation<Offset> _slideAnimation;

  // Screen 1: Interests (max 5)
  final List<Map<String, String>> _interests = [
    {'id': 'ai_ml', 'name': 'AI / Machine Learning'},
    {'id': 'web_dev', 'name': 'Web Development'},
    {'id': 'mobile', 'name': 'Mobile App Development'},
    {'id': 'devops', 'name': 'DevOps / Infrastructure'},
    {'id': 'cybersecurity', 'name': 'Cybersecurity'},
    {'id': 'data_science', 'name': 'Data Science'},
    {'id': 'automation', 'name': 'Automation / Bots'},
    {'id': 'blockchain', 'name': 'Blockchain / Web3'},
    {'id': 'game_dev', 'name': 'Game Development'},
    {'id': 'open_source', 'name': 'Open Source Tools'},
    {'id': 'database', 'name': 'Database Storage'},
  ];

  // Screen 2: Tech Stack
  final List<Map<String, String>> _techStack = [
    // Languages
    {'id': 'python', 'name': 'Python', 'type': 'language'},
    {'id': 'javascript', 'name': 'JavaScript / TypeScript', 'type': 'language'},
    {'id': 'go', 'name': 'Go', 'type': 'language'},
    {'id': 'rust', 'name': 'Rust', 'type': 'language'},
    {'id': 'java', 'name': 'Java', 'type': 'language'},
    {'id': 'cpp', 'name': 'C++', 'type': 'language'},
    // Frameworks / Tools
    {'id': 'react', 'name': 'React / Next.js', 'type': 'framework'},
    {'id': 'nodejs', 'name': 'Node.js', 'type': 'framework'},
    {'id': 'flutter', 'name': 'Flutter / Dart', 'type': 'framework'},
    {'id': 'swift_kotlin', 'name': 'Swift / Kotlin', 'type': 'framework'},
    {'id': 'django', 'name': 'Django / FastAPI', 'type': 'framework'},
    {'id': 'spring', 'name': 'Spring Boot', 'type': 'framework'},
    {'id': 'docker', 'name': 'Docker', 'type': 'tool'},
    {'id': 'kubernetes', 'name': 'Kubernetes', 'type': 'tool'},
    {'id': 'supabase', 'name': 'Supabase / Firebase', 'type': 'tool'},
  ];

  // Screen 3: Skill Level
  final List<Map<String, String>> _skillLevels = [
    {
      'id': 'beginner',
      'name': 'Beginner',
      'description': 'I\'m learning basics and exploring tutorials.'
    },
    {
      'id': 'intermediate',
      'name': 'Intermediate',
      'description': 'I can build projects and want full apps.'
    },
    {
      'id': 'advanced',
      'name': 'Advanced',
      'description': 'I work on scalable systems or frameworks.'
    },
  ];

  // Screen 4: Goals
  final List<Map<String, String>> _goals = [
    {'id': 'learning', 'name': 'Learning to code'},
    {'id': 'startup', 'name': 'Building a startup / SaaS'},
    {'id': 'freelance', 'name': 'Freelancing / agency work'},
    {'id': 'contributing', 'name': 'Contributing to open source'},
    {'id': 'exploring', 'name': 'Exploring new tech'},
  ];

  // Screen 5: Repo Size
  final List<Map<String, String>> _repoSizes = [
    {'id': 'small', 'name': 'Small scripts & tools'},
    {'id': 'medium', 'name': 'Medium projects'},
    {'id': 'large', 'name': 'Large production systems'},
  ];

  @override
  void initState() {
    super.initState();
    // Slower, calmer animations
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000), // Slower fade
    );
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200), // Slower scale
    );
    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400), // Slower slide
    );
    
    // Calmer curves - easeInOut for steady reveal
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _fadeController, 
        curve: Curves.easeInOut,
      ),
    );
    _scaleAnimation = Tween<double>(begin: 0.96, end: 1.0).animate(
      CurvedAnimation(
        parent: _scaleController, 
        curve: Curves.easeOut,
      ),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0.0, 0.03), // Smaller offset for subtlety
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _slideController, 
        curve: Curves.easeOut,
      ),
    );
    
    // Staggered start for calmer reveal
    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) {
        _fadeController.forward();
      }
    });
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) {
        _scaleController.forward();
      }
    });
    Future.delayed(const Duration(milliseconds: 400), () {
      if (mounted) {
        _slideController.forward();
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _fadeController.dispose();
    _scaleController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  void _nextStep() {
    HapticFeedback.selectionClick();
    if (_currentStep < 6) {
      // Smooth exit
      _fadeController.reverse();
      _scaleController.reverse();
      _slideController.reverse();
      
      Future.delayed(const Duration(milliseconds: 400), () {
        if (!mounted) return;
        _fadeController.reset();
        _scaleController.reset();
        _slideController.reset();
        setState(() {
          _currentStep++;
        });
        _pageController.nextPage(
          duration: const Duration(milliseconds: 600), // Slower page transition
          curve: Curves.easeInOut,
        );
        // Calm reveal with staggered delays
        Future.delayed(const Duration(milliseconds: 300), () {
          if (mounted) {
            _fadeController.forward();
          }
        });
        Future.delayed(const Duration(milliseconds: 400), () {
          if (mounted) {
            _scaleController.forward();
          }
        });
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            _slideController.forward();
          }
        });
      });
    } else {
      _completeOnboarding();
    }
  }

  void _previousStep() {
    HapticFeedback.lightImpact();
    if (_currentStep > 0) {
      // Smooth exit
      _fadeController.reverse();
      _scaleController.reverse();
      _slideController.reverse();
      
      Future.delayed(const Duration(milliseconds: 400), () {
        if (!mounted) return;
        _fadeController.reset();
        _scaleController.reset();
        _slideController.reset();
        setState(() {
          _currentStep--;
        });
        _pageController.previousPage(
          duration: const Duration(milliseconds: 600), // Slower page transition
          curve: Curves.easeInOut,
        );
        // Calm reveal with staggered delays
        Future.delayed(const Duration(milliseconds: 300), () {
          if (mounted) {
            _fadeController.forward();
          }
        });
        Future.delayed(const Duration(milliseconds: 400), () {
          if (mounted) {
            _scaleController.forward();
          }
        });
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            _slideController.forward();
          }
        });
      });
    }
  }

  bool _canProceed() {
    switch (_currentStep) {
      case 0: // Interests
        return _selectedInterests.isNotEmpty && _selectedInterests.length <= 5;
      case 1: // Tech Stack
        return true; // Optional
      case 2: // Skill Level
        return _skillLevel != null;
      case 3: // Goals
        return _selectedGoals.isNotEmpty;
      case 4: // Repo Size
        return _repoSizePref != null;
      case 5: // GitHub Connect (optional)
        return true;
      case 6: // Current Project (optional)
        return true;
      default:
        return false;
    }
  }

  Future<void> _completeOnboarding() async {
    final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
    final userId = await supabaseService.getOrCreateUserId();
    
    // Save to new tables structure
    try {
      await supabaseService.saveOnboardingData(
        userId: userId,
        interests: _selectedInterests,
        techStack: _selectedTechStack,
        skillLevel: _skillLevel,
        goals: _selectedGoals,
        repoSizePref: _repoSizePref,
        currentProject: _currentProject.isNotEmpty ? _currentProject : null,
      );

      // Also update app_user_preferences for backward compatibility
      final completedPrefs = UserPreferences(
        primaryCluster: _selectedInterests.isNotEmpty ? _selectedInterests[0] : null,
        secondaryClusters: _selectedInterests.length > 1 ? _selectedInterests.sublist(1) : [],
        techStack: _selectedTechStack,
        goals: _selectedGoals,
        experienceLevel: _skillLevel ?? 'intermediate',
        repoSize: _repoSizePref != null ? [_repoSizePref!] : [],
        onboardingCompleted: true,
      );

      await supabaseService.saveUserPreferences(userId, completedPrefs);
    } catch (e) {
      debugPrint('Error saving onboarding data: $e');
      // Continue anyway - user can retry later
    }

    if (!mounted) return;

    // Check if user already has Pro access (VIP or subscriber)
    final revenueCat = RevenueCatService.instance;
    if (revenueCat.isProUser) {
      // VIP or already subscribed — skip paywall, go to main app
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const MainTabScreen(),
          transitionDuration: const Duration(milliseconds: 800),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      );
    } else {
      // Show paywall with close button (soft paywall — user can skip)
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => PaywallScreen(
            onClose: () {
              // User skipped paywall — go to main app
            },
          ),
          transitionDuration: const Duration(milliseconds: 800),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Progress indicator
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
              child: Row(
                children: List.generate(7, (index) {
                  return Expanded(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 600), // Slower progress animation
                      curve: Curves.easeInOut,
                      height: 3,
                      margin: EdgeInsets.only(
                        right: index < 6 ? 8 : 0,
                      ),
                      decoration: BoxDecoration(
                        color: index <= _currentStep 
                            ? AppTheme.accent 
                            : AppTheme.divider,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),
            
            // Content
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildInterestsStep(),
                  _buildTechStackStep(),
                  _buildSkillLevelStep(),
                  _buildGoalsStep(),
                  _buildRepoSizeStep(),
                  _buildGitHubConnectStep(),
                  _buildCurrentProjectStep(),
                ],
              ),
            ),
            
            // Navigation buttons
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (_currentStep > 0)
                    TextButton(
                      onPressed: _previousStep,
                      style: TextButton.styleFrom(
                        foregroundColor: AppTheme.textSecondary,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                      ),
                      child: Text(
                        'Back',
                        style: AppTheme.secondaryText.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    )
                  else
                    const SizedBox(width: 80),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 400),
                    curve: Curves.easeOut,
                    child: ElevatedButton(
                      onPressed: _canProceed() ? _nextStep : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _canProceed() 
                            ? AppTheme.accent 
                            : AppTheme.divider,
                        foregroundColor: AppTheme.textPrimary,
                        disabledForegroundColor: AppTheme.textTertiary,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 14,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        _currentStep < 6 ? 'Next' : 'Complete',
                        style: AppTheme.buttonText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Screen 1: Interests
  Widget _buildInterestsStep() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                Text(
                  'What do you want to explore on Repoverse?',
                  style: AppTheme.displayLarge,
                  textAlign: TextAlign.left,
                ),
                const SizedBox(height: 12),
                Text(
                  'Select up to 5 interests',
                  style: AppTheme.bodyMedium.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
                if (_selectedInterests.length >= 5)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      'Maximum 5 selections',
                      style: AppTheme.metaText.copyWith(
                        color: AppTheme.accent,
                      ),
                    ),
                  ),
                const SizedBox(height: 32),
                Expanded(
                  child: GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.8,
                    ),
                    itemCount: _interests.length,
                    itemBuilder: (context, index) {
                      final interest = _interests[index];
                      final isSelected = _selectedInterests.contains(interest['id']);
                      final canSelect = _selectedInterests.length < 5 || isSelected;
                      
                      return TweenAnimationBuilder<double>(
                        duration: const Duration(milliseconds: 800),
                        tween: Tween(begin: 0.0, end: 1.0),
                        curve: Curves.easeOut,
                        builder: (context, value, child) {
                          return Transform.scale(
                            scale: 0.94 + (value * 0.06),
                            child: Opacity(
                              opacity: value,
                              child: child,
                            ),
                          );
                        },
                        child: GestureDetector(
                          onTap: canSelect ? () {
                            HapticFeedback.selectionClick();
                            setState(() {
                              if (isSelected) {
                                _selectedInterests.remove(interest['id']);
                              } else {
                                _selectedInterests.add(interest['id']!);
                              }
                            });
                          } : null,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 400),
                            curve: Curves.easeOut,
                            decoration: BoxDecoration(
                              color: isSelected 
                                  ? AppTheme.accent.withOpacity(0.12) 
                                  : AppTheme.surface,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                              border: Border.all(
                                color: isSelected 
                                    ? AppTheme.accent 
                                    : (canSelect ? AppTheme.divider : AppTheme.divider.withOpacity(0.3)),
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Opacity(
                              opacity: canSelect ? 1.0 : 0.5,
                              child: Center(
                                child: Text(
                                  interest['name']!,
                                  style: AppTheme.repoTitle.copyWith(
                                    color: isSelected 
                                        ? AppTheme.accent 
                                        : AppTheme.textPrimary,
                                    fontWeight: isSelected 
                                        ? FontWeight.w600 
                                        : FontWeight.w500,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Screen 2: Tech Stack
  Widget _buildTechStackStep() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                Text(
                  'What technologies do you use or want to learn?',
                  style: AppTheme.displayLarge,
                ),
                const SizedBox(height: 12),
                Text(
                  'Select all that apply',
                  style: AppTheme.bodyMedium.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 32),
                Expanded(
                  child: GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.5,
                    ),
                    itemCount: _techStack.length,
                    itemBuilder: (context, index) {
                      final tech = _techStack[index];
                      final isSelected = _selectedTechStack.contains(tech['id']);
                      
                      return TweenAnimationBuilder<double>(
                        duration: const Duration(milliseconds: 800),
                        tween: Tween(begin: 0.0, end: 1.0),
                        curve: Curves.easeOut,
                        builder: (context, value, child) {
                          return Transform.scale(
                            scale: 0.94 + (value * 0.06),
                            child: Opacity(
                              opacity: value,
                              child: child,
                            ),
                          );
                        },
                        child: GestureDetector(
                          onTap: () {
                            HapticFeedback.selectionClick();
                            setState(() {
                              if (isSelected) {
                                _selectedTechStack.remove(tech['id']);
                              } else {
                                _selectedTechStack.add(tech['id']!);
                              }
                            });
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 400),
                            curve: Curves.easeOut,
                            decoration: BoxDecoration(
                              color: isSelected 
                                  ? AppTheme.accent.withOpacity(0.12) 
                                  : AppTheme.surface,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                              border: Border.all(
                                color: isSelected 
                                    ? AppTheme.accent 
                                    : AppTheme.divider,
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                tech['name']!,
                                style: AppTheme.tagText.copyWith(
                                  fontSize: 13,
                                  color: isSelected 
                                      ? AppTheme.accent 
                                      : AppTheme.textPrimary,
                                  fontWeight: isSelected 
                                      ? FontWeight.w600 
                                      : FontWeight.w500,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Screen 3: Skill Level
  Widget _buildSkillLevelStep() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                Text(
                  'How would you describe your coding level?',
                  style: AppTheme.displayLarge,
                ),
                const SizedBox(height: 32),
                Expanded(
                  child: ListView.builder(
                    itemCount: _skillLevels.length,
                    itemBuilder: (context, index) {
                      final level = _skillLevels[index];
                      final isSelected = _skillLevel == level['id'];
                      
                      return TweenAnimationBuilder<double>(
                        duration: const Duration(milliseconds: 900),
                        tween: Tween(begin: 0.0, end: 1.0),
                        curve: Curves.easeOut,
                        builder: (context, value, child) {
                          return Transform.translate(
                            offset: Offset(0, 15 * (1 - value)),
                            child: Opacity(
                              opacity: value,
                              child: child,
                            ),
                          );
                        },
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GestureDetector(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() {
                                _skillLevel = level['id'];
                              });
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 500),
                              curve: Curves.easeOut,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 18,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected 
                                    ? AppTheme.accent.withOpacity(0.12) 
                                    : AppTheme.surface,
                                borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                                border: Border.all(
                                  color: isSelected 
                                      ? AppTheme.accent 
                                      : AppTheme.divider,
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          level['name']!,
                                          style: AppTheme.bodyMedium.copyWith(
                                            color: isSelected 
                                                ? AppTheme.accent 
                                                : AppTheme.textPrimary,
                                            fontWeight: isSelected 
                                                ? FontWeight.w600 
                                                : FontWeight.w400,
                                          ),
                                        ),
                                      ),
                                      if (isSelected)
                                        Icon(
                                          Icons.check_circle,
                                          color: AppTheme.accent,
                                          size: 20,
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    level['description']!,
                                    style: AppTheme.metaText.copyWith(
                                      color: AppTheme.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Screen 4: Goals
  Widget _buildGoalsStep() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                Text(
                  'Why are you exploring GitHub projects?',
                  style: AppTheme.displayLarge,
                ),
                const SizedBox(height: 12),
                Text(
                  'Select all that apply',
                  style: AppTheme.bodyMedium.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 32),
                Expanded(
                  child: ListView.builder(
                    itemCount: _goals.length,
                    itemBuilder: (context, index) {
                      final goal = _goals[index];
                      final isSelected = _selectedGoals.contains(goal['id']);
                      
                      return TweenAnimationBuilder<double>(
                        duration: const Duration(milliseconds: 900),
                        tween: Tween(begin: 0.0, end: 1.0),
                        curve: Curves.easeOut,
                        builder: (context, value, child) {
                          return Transform.translate(
                            offset: Offset(0, 15 * (1 - value)),
                            child: Opacity(
                              opacity: value,
                              child: child,
                            ),
                          );
                        },
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GestureDetector(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() {
                                if (isSelected) {
                                  _selectedGoals.remove(goal['id']);
                                } else {
                                  _selectedGoals.add(goal['id']!);
                                }
                              });
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 500),
                              curve: Curves.easeOut,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 18,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected 
                                    ? AppTheme.accent.withOpacity(0.12) 
                                    : AppTheme.surface,
                                borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                                border: Border.all(
                                  color: isSelected 
                                      ? AppTheme.accent 
                                      : AppTheme.divider,
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      goal['name']!,
                                      style: AppTheme.bodyMedium.copyWith(
                                        color: isSelected 
                                            ? AppTheme.accent 
                                            : AppTheme.textPrimary,
                                        fontWeight: isSelected 
                                            ? FontWeight.w600 
                                            : FontWeight.w400,
                                      ),
                                    ),
                                  ),
                                  if (isSelected)
                                    Icon(
                                      Icons.check_circle,
                                      color: AppTheme.accent,
                                      size: 20,
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Screen 5: Repo Size
  Widget _buildRepoSizeStep() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                Text(
                  'What type of projects do you prefer?',
                  style: AppTheme.displayLarge,
                ),
                const SizedBox(height: 32),
                Expanded(
                  child: ListView.builder(
                    itemCount: _repoSizes.length,
                    itemBuilder: (context, index) {
                      final size = _repoSizes[index];
                      final isSelected = _repoSizePref == size['id'];
                      
                      return TweenAnimationBuilder<double>(
                        duration: const Duration(milliseconds: 900),
                        tween: Tween(begin: 0.0, end: 1.0),
                        curve: Curves.easeOut,
                        builder: (context, value, child) {
                          return Transform.translate(
                            offset: Offset(0, 15 * (1 - value)),
                            child: Opacity(
                              opacity: value,
                              child: child,
                            ),
                          );
                        },
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GestureDetector(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() {
                                _repoSizePref = size['id'];
                              });
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 500),
                              curve: Curves.easeOut,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 18,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected 
                                    ? AppTheme.accent.withOpacity(0.12) 
                                    : AppTheme.surface,
                                borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                                border: Border.all(
                                  color: isSelected 
                                      ? AppTheme.accent 
                                      : AppTheme.divider,
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      size['name']!,
                                      style: AppTheme.bodyMedium.copyWith(
                                        color: isSelected 
                                            ? AppTheme.accent 
                                            : AppTheme.textPrimary,
                                        fontWeight: isSelected 
                                            ? FontWeight.w600 
                                            : FontWeight.w400,
                                      ),
                                    ),
                                  ),
                                  if (isSelected)
                                    Icon(
                                      Icons.check_circle,
                                      color: AppTheme.accent,
                                      size: 20,
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Screen 6: GitHub Connect (Optional)
  Widget _buildGitHubConnectStep() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                Text(
                  'Connect GitHub to personalize instantly',
                  style: AppTheme.displayLarge,
                ),
                const SizedBox(height: 12),
                Text(
                  'Optional - We\'ll use your starred repos and contributions to improve recommendations',
                  style: AppTheme.bodyMedium.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 48),
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.code,
                          size: 80,
                          color: AppTheme.textSecondary,
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: () {
                            HapticFeedback.selectionClick();
                            // TODO: Implement GitHub OAuth
                            setState(() {
                              _githubConnected = true;
                            });
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _githubConnected 
                                ? AppTheme.accent 
                                : AppTheme.surface,
                            foregroundColor: AppTheme.textPrimary,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 32,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                            ),
                          ),
                          child: Text(
                            _githubConnected ? 'Connected' : 'Connect GitHub',
                            style: AppTheme.buttonText,
                          ),
                        ),
                        if (_githubConnected)
                          Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: Text(
                              'GitHub connected successfully',
                              style: AppTheme.metaText.copyWith(
                                color: AppTheme.accent,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Screen 7: Current Project (Optional)
  Widget _buildCurrentProjectStep() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                Text(
                  'What are you building right now?',
                  style: AppTheme.displayLarge,
                ),
                const SizedBox(height: 12),
                Text(
                  'Optional - Tell us about your current project',
                  style: AppTheme.bodyMedium.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 32),
                Expanded(
                  child: TextField(
                    onChanged: (value) {
                      setState(() {
                        _currentProject = value;
                      });
                    },
                    maxLines: null,
                    expands: true,
                    textAlignVertical: TextAlignVertical.top,
                    style: AppTheme.bodyMedium,
                    decoration: InputDecoration(
                      hintText: 'e.g., AI SaaS, Flutter fitness app, DevOps monitoring tool...',
                      hintStyle: AppTheme.metaText.copyWith(
                        color: AppTheme.textTertiary,
                      ),
                      filled: true,
                      fillColor: AppTheme.surface,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        borderSide: BorderSide(
                          color: AppTheme.divider,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        borderSide: BorderSide(
                          color: AppTheme.divider,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        borderSide: BorderSide(
                          color: AppTheme.accent,
                          width: 1.5,
                        ),
                      ),
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

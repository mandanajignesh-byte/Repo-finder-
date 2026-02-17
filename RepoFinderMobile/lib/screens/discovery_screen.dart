import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/repository.dart';
import '../services/repo_service.dart';
import '../services/app_supabase_service.dart';
import '../widgets/premium_swipeable_card.dart';
import '../widgets/readme_preview_modal.dart';
import '../widgets/empty_state.dart';
import '../widgets/loading_skeleton.dart';
import '../theme/app_theme.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DiscoveryScreen extends StatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  State<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends State<DiscoveryScreen> {
  final PageController _pageController = PageController();
  List<Repository> _repos = [];
  int _currentIndex = 0;
  bool _isLoading = true;
  String? _error;
  String? _primaryCluster;

  @override
  void initState() {
    super.initState();
    // Delay loading until after first frame to avoid build phase issues
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadRepos();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _loadRepos() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
      final repoService = Provider.of<RepoService>(context, listen: false);
      
      final userId = await supabaseService.getOrCreateUserId();
      final preferences = await supabaseService.getUserPreferences(userId);
      
      // Get primary cluster from preferences
      _primaryCluster = preferences?.primaryCluster ?? 'frontend';
      
      debugPrint('Loading repos for cluster: $_primaryCluster');
      debugPrint('Preferences: ${preferences?.techStack}, Goals: ${preferences?.goals}');
      
      // Fetch personalized repos based on preferences
      // If no repos found with filters, try without goal filtering
      var repos = await repoService.getPersonalizedRepos(
        primaryCluster: _primaryCluster!,
        preferredLanguages: preferences?.techStack ?? [],
        goals: preferences?.goals ?? [],
        limit: 50,
      );
      
      debugPrint('Found ${repos.length} repos after filtering');

      // If no repos found, try without goal filtering (just cluster + languages)
      if (repos.isEmpty && preferences?.goals?.isNotEmpty == true) {
        debugPrint('No repos with goal filtering, trying without goals...');
        repos = await repoService.getPersonalizedRepos(
          primaryCluster: _primaryCluster!,
          preferredLanguages: preferences?.techStack ?? [],
          goals: [], // Remove goal filtering
          limit: 50,
        );
        debugPrint('Found ${repos.length} repos without goal filtering');
      }

      // If still no repos, try just cluster
      if (repos.isEmpty) {
        debugPrint('No repos with language filtering, trying cluster only...');
        repos = await repoService.getReposByCluster(
          cluster: _primaryCluster!,
          userId: userId,
          limit: 50,
        );
        debugPrint('Found ${repos.length} repos from cluster only');
      }

      // If still no repos, try common fallback clusters
      if (repos.isEmpty) {
        debugPrint('No repos in $_primaryCluster, trying fallback clusters...');
        final fallbackClusters = ['frontend', 'mobile', 'ai-ml', 'data-science'];
        for (final cluster in fallbackClusters) {
          if (cluster == _primaryCluster) continue; // Skip already tried
          debugPrint('Trying fallback cluster: $cluster');
          repos = await repoService.getReposByCluster(
            cluster: cluster,
            userId: userId,
            limit: 50,
          );
          if (repos.isNotEmpty) {
            debugPrint('Found ${repos.length} repos in fallback cluster: $cluster');
            break;
          }
        }
      }

      // Last resort: try to get ANY repos (no cluster filter)
      if (repos.isEmpty) {
        debugPrint('Trying to get any repos without cluster filter...');
        try {
          final data = await Supabase.instance.client
              .from('repos')
              .select()
              .order('stars', ascending: false)
              .limit(50);
          repos = (data as List)
              .map((json) => Repository.fromJson(json))
              .toList();
          debugPrint('Found ${repos.length} repos without cluster filter');
        } catch (e) {
          debugPrint('Error getting repos without filter: $e');
        }
      }

      if (mounted) {
        setState(() {
          _repos = repos;
          _isLoading = false;
          if (repos.isEmpty) {
            _error = 'No repos found in database. Please check your database connection or add some repos.';
            debugPrint('ERROR: No repos found after all fallbacks');
          } else {
            debugPrint('SUCCESS: Loaded ${repos.length} repos');
          }
        });
      }
    } catch (e, stackTrace) {
      debugPrint('ERROR loading repos: $e');
      debugPrint('Stack trace: $stackTrace');
      if (mounted) {
        setState(() {
          _error = 'Error: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleLike(Repository repo) async {
    try {
      final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
      final repoService = Provider.of<RepoService>(context, listen: false);
      
      final userId = await supabaseService.getOrCreateUserId();
      await repoService.likeRepo(userId, repo); // Already tracks interaction
      
      // Move to next repo
      _nextRepo();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Repo liked!'),
            duration: const Duration(seconds: 1),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            ),
          ),
        );
      }
    }
  }

  Future<void> _handleSave(Repository repo) async {
    try {
      final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
      final repoService = Provider.of<RepoService>(context, listen: false);
      
      final userId = await supabaseService.getOrCreateUserId();
      await repoService.saveRepo(userId, repo); // Already tracks interaction
      
      HapticFeedback.mediumImpact();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Repo saved!'),
            duration: const Duration(seconds: 1),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            ),
          ),
        );
      }
      
      // Move to next repo
      _nextRepo();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            ),
          ),
        );
      }
    }
  }

  Future<void> _handlePreview(Repository repo) async {
    // Track view interaction
    try {
      final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
      final userId = await supabaseService.getOrCreateUserId();
      await supabaseService.trackInteraction(
        userId: userId,
        repoGithubId: repo.githubId,
        action: 'swipe_up',
      );
    } catch (e) {
      debugPrint('Error tracking preview: $e');
    }
    
    // Fetch README content from Supabase
    try {
      final supabase = Supabase.instance.client;
      final readmeData = await supabase
          .from('repos_master')
          .select('description')
          .eq('repo_id', repo.githubId)
          .maybeSingle();
      
      final readmeContent = readmeData?['description'] as String?;
      
      if (mounted) {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (context) => ReadmePreviewModal(
            repo: repo,
            readmeContent: readmeContent,
            onSave: () => _handleSave(repo),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error fetching README: $e');
      // Show modal anyway with no content
      if (mounted) {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (context) => ReadmePreviewModal(
            repo: repo,
            readmeContent: null,
            onSave: () => _handleSave(repo),
          ),
        );
      }
    }
  }

  void _nextRepo() async {
    if (_currentIndex < _repos.length - 1) {
      // Track skip interaction for current repo
      final currentRepo = _repos[_currentIndex];
      try {
        final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
        final userId = await supabaseService.getOrCreateUserId();
        await supabaseService.trackInteraction(
          userId: userId,
          repoGithubId: currentRepo.githubId,
          action: 'skip',
        );
      } catch (e) {
        debugPrint('Error tracking skip: $e');
      }
      
      setState(() {
        _currentIndex++;
      });
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      
      // Load more if near end
      if (_currentIndex >= _repos.length - 5) {
        _loadMoreRepos();
      }
    }
  }

  Future<void> _loadMoreRepos() async {
    if (_primaryCluster == null) return;
    
    try {
      final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
      final repoService = Provider.of<RepoService>(context, listen: false);
      
      final userId = await supabaseService.getOrCreateUserId();
      final preferences = await supabaseService.getUserPreferences(userId);
      final lastRepo = _repos.isNotEmpty ? _repos.last : null;
      final cursor = lastRepo?.githubId;
      
      final newRepos = await repoService.getPersonalizedRepos(
        primaryCluster: _primaryCluster!,
        preferredLanguages: preferences?.techStack ?? [],
        goals: preferences?.goals ?? [],
        limit: 20,
        cursor: cursor,
      );

      if (mounted && newRepos.isNotEmpty) {
        setState(() {
          _repos.addAll(newRepos);
        });
      }
    } catch (e) {
      debugPrint('Error loading more repos: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text(
          'Discover',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.black,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadRepos,
          ),
        ],
      ),
      body: _isLoading
          ? ListView.builder(
              itemCount: 3,
              itemBuilder: (context, index) => const LoadingSkeleton(),
            )
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppTheme.spacingLG),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 64,
                          color: AppTheme.error,
                        ),
                        const SizedBox(height: AppTheme.spacingMD),
                        Text(
                          'Error loading repos',
                          style: AppTheme.sectionTitle.copyWith(
                            color: AppTheme.error,
                          ),
                        ),
                        const SizedBox(height: AppTheme.spacingSM),
                        Text(
                          _error!,
                          style: AppTheme.body.copyWith(
                            color: AppTheme.textSecondary,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AppTheme.spacingLG),
                        ElevatedButton(
                          onPressed: _loadRepos,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.accent,
                            foregroundColor: AppTheme.textPrimary,
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppTheme.spacingLG,
                              vertical: AppTheme.spacingMD,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                            ),
                          ),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _repos.isEmpty
                  ? EmptyState(
                      message: 'No repos found\nTry refreshing or check your preferences',
                      actionLabel: 'Refresh',
                      onAction: _loadRepos,
                    )
                  : PageView.builder(
                      controller: _pageController,
                      itemCount: _repos.length,
                      physics: const NeverScrollableScrollPhysics(), // Disable page swipe, use card swipe
                      onPageChanged: (index) {
                        setState(() {
                          _currentIndex = index;
                        });
                        if (index >= _repos.length - 5) {
                          _loadMoreRepos();
                        }
                      },
                      itemBuilder: (context, index) {
                        final repo = _repos[index];
                        return Center(
                          child: PremiumSwipeableCard(
                            repo: repo,
                            onLike: () => _handleLike(repo),
                            onSave: () => _handleSave(repo),
                            onSkip: _nextRepo,
                            onPreview: () => _handlePreview(repo),
                            onSwipeComplete: _nextRepo,
                          ),
                        );
                      },
                    ),
    );
  }
}

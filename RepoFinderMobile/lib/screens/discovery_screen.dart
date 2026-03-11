import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:appinio_swiper/appinio_swiper.dart';
import 'package:http/http.dart' as http;
import '../models/repository.dart';
import '../models/user_preferences.dart';
import '../services/repo_service.dart';
import '../services/app_supabase_service.dart';
import '../widgets/discovery_card.dart';
import '../widgets/readme_preview_modal.dart';
import '../widgets/empty_state.dart';
import '../theme/app_theme.dart';

class DiscoveryScreen extends StatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  State<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends State<DiscoveryScreen> {
  final AppinioSwiperController _swiperController = AppinioSwiperController();

  // ── Deck state ──────────────────────────────────────────────────────────────
  List<Repository> _deck = [];          // cards currently shown in swiper
  List<Repository> _nextBatch = [];     // pre-fetched, waiting to be added
  bool _isLoading = true;
  bool _isFetchingNext = false;
  String? _error;

  // ── Drag state (for live LIKE / SKIP overlays) ───────────────────────────────
  double _dragOffsetX = 0;
  double _dragOffsetY = 0;
  int _topCardIndex = 0;   // which card index is currently on top

  // ── History for undo ──────────────────────────────────────────────────────────
  final List<Repository> _history = [];

  // ── Cached user data ─────────────────────────────────────────────────────────
  String? _userId;
  UserPreferences? _prefs;

  static const int _batchSize = 15;
  static const int _prefetchAt = 4; // start prefetch when this many cards remain

  // ── Unique key forces AppinioSwiper to rebuild when we swap decks ────────────
  int _deckKey = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initialLoad());
  }

  @override
  void dispose() {
    _swiperController.dispose();
    super.dispose();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // USER
  // ────────────────────────────────────────────────────────────────────────────

  Future<String> _getUserId() async {
    if (_userId != null) return _userId!;
    final svc = Provider.of<AppSupabaseService>(context, listen: false);
    _userId = await svc.getOrCreateUserId();
    return _userId!;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LOAD
  // ────────────────────────────────────────────────────────────────────────────

  Future<void> _initialLoad() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
      _history.clear();
    });

    try {
      final userId = await _getUserId();
      final svc = Provider.of<AppSupabaseService>(context, listen: false);
      _prefs = await svc.getUserPreferences(userId);

      final repos = await _fetchRepos();

      if (mounted) {
        setState(() {
          _deck = repos.take(_batchSize).toList();
          _nextBatch = repos.length > _batchSize
              ? repos.sublist(_batchSize)
              : [];
          _topCardIndex = 0;
          _dragOffsetX = 0;
          _dragOffsetY = 0;
          _deckKey++;          // force fresh swiper
          _isLoading = false;
        });
      }
    } catch (e, st) {
      debugPrint('Discovery load error: $e\n$st');
      if (mounted) setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  /// Fetch a shuffled list of repos using multiple fallbacks.
  Future<List<Repository>> _fetchRepos() async {
    final repoService = Provider.of<RepoService>(context, listen: false);
    final cluster = _prefs?.primaryCluster ?? 'frontend';
    final techStack = _prefs?.techStack ?? [];
    final goals = _prefs?.goals ?? [];

    // 1. Personalised repos
    var repos = await repoService.getPersonalizedRepos(
      primaryCluster: cluster,
      preferredLanguages: techStack,
      goals: goals,
      limit: _batchSize * 4,
    );

    // 2. Cluster only
    if (repos.isEmpty) {
      repos = await repoService.getReposByCluster(
        cluster: cluster,
        userId: _userId ?? 'anon',
        limit: _batchSize * 4,
      );
    }

    // 3. Trending as last resort
    if (repos.isEmpty) {
      repos = await repoService.getTrendingRepos(limit: _batchSize * 4);
    }

    repos.shuffle();
    return repos;
  }

  Future<void> _prefetchMore() async {
    if (_isFetchingNext || !mounted) return;
    _isFetchingNext = true;
    try {
      final more = await _fetchRepos();
      if (mounted) {
        setState(() => _nextBatch = [..._nextBatch, ...more]);
      }
    } catch (e) {
      debugPrint('Prefetch error: $e');
    } finally {
      _isFetchingNext = false;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SWIPER CALLBACKS
  // ────────────────────────────────────────────────────────────────────────────

  void _onCardPositionChanged(SwiperPosition position) {
    setState(() {
      _dragOffsetX = position.offset.dx;
      _dragOffsetY = position.offset.dy;
      _topCardIndex = position.index;
    });
  }

  Future<void> _onSwipeEnd(
    int previousIndex,
    int? currentIndex,
    SwiperActivity activity,
  ) async {
    // Reset drag visuals
    setState(() {
      _dragOffsetX = 0;
      _dragOffsetY = 0;
      if (currentIndex != null) _topCardIndex = currentIndex;
    });

    if (activity == SwiperActivity.unswipe) return; // undo - nothing to track

    if (previousIndex < 0 || previousIndex >= _deck.length) return;
    final repo = _deck[previousIndex];
    _history.add(repo);

    // Background DB calls
    _trackSwipe(repo, activity);

    // Haptic + snack
    switch (activity) {
      case SwiperActivity.swipeRight:
        HapticFeedback.mediumImpact();
        _snack('liked ${repo.name}', AppTheme.success);
        break;
      case SwiperActivity.swipeLeft:
        HapticFeedback.lightImpact();
        break;
      case SwiperActivity.swipeUp:
        HapticFeedback.heavyImpact();
        _snack('saved ${repo.name}', AppTheme.accent);
        break;
      default:
        break;
    }

    // Prefetch / extend deck when nearing end
    if (currentIndex != null) {
      final remaining = _deck.length - currentIndex;
      if (remaining <= _prefetchAt) {
        _extendDeck();
      }
    }
  }

  Future<void> _trackSwipe(Repository repo, SwiperActivity activity) async {
    try {
      final userId = await _getUserId();
      if (!mounted) return;
      final repoSvc = Provider.of<RepoService>(context, listen: false);
      final appSvc = Provider.of<AppSupabaseService>(context, listen: false);

      switch (activity) {
        case SwiperActivity.swipeRight:
          await repoSvc.likeRepo(userId, repo);
          break;
        case SwiperActivity.swipeLeft:
          await appSvc.trackInteraction(
            userId: userId,
            repoGithubId: repo.githubId,
            action: 'skip',
          );
          break;
        case SwiperActivity.swipeUp:
          await repoSvc.saveRepo(userId, repo);
          break;
        default:
          break;
      }
    } catch (e) {
      debugPrint('Track swipe error: $e');
    }
  }

  Future<void> _extendDeck() async {
    if (_nextBatch.isNotEmpty) {
      final add = _nextBatch.take(_batchSize).toList();
      setState(() {
        _deck = [..._deck, ...add];
        _nextBatch = _nextBatch.length > _batchSize
            ? _nextBatch.sublist(_batchSize)
            : [];
      });
    }
    if (_nextBatch.length < _batchSize) {
      _prefetchMore();
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // UNDO
  // ────────────────────────────────────────────────────────────────────────────

  void _undo() {
    if (_history.isEmpty) return;
    _swiperController.unswipe();
    final repo = _history.removeLast();
    setState(() {});
    HapticFeedback.lightImpact();
    _snack('Back to ${repo.name}', AppTheme.textSecondary);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PREVIEW / README
  // ────────────────────────────────────────────────────────────────────────────

  Future<void> _showPreview(Repository repo) async {
    // Track view in background
    _getUserId().then((uid) {
      if (!mounted) return;
      Provider.of<AppSupabaseService>(context, listen: false)
          .trackInteraction(
            userId: uid,
            repoGithubId: repo.githubId,
            action: 'view',
          )
          .catchError((_) {});
    });

    // Fetch README from GitHub
    String? readme;
    for (final branch in ['main', 'master', 'develop']) {
      try {
        final url =
            'https://raw.githubusercontent.com/${repo.fullName}/$branch/README.md';
        final res = await http
            .get(Uri.parse(url))
            .timeout(const Duration(seconds: 6));
        if (res.statusCode == 200 && res.body.isNotEmpty) {
          readme = res.body;
          break;
        }
      } catch (_) {}
    }
    readme ??= _localPreview(repo);

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ReadmePreviewModal(
        repo: repo,
        readmeContent: readme,
        onSave: () async {
          final userId = await _getUserId();
          if (!mounted) return;
          await Provider.of<RepoService>(context, listen: false)
              .saveRepo(userId, repo);
          if (mounted) {
            Navigator.pop(context);
            _snack('saved ${repo.name}', AppTheme.accent);
          }
        },
      ),
    );
  }

  String _localPreview(Repository repo) {
    final parts = <String>[];
    if (repo.description?.isNotEmpty == true) {
      parts.add('## About\n${repo.description}');
    }
    final stats = [
      '⭐ **${_fmt(repo.stars)}** stars',
      '🍴 **${_fmt(repo.forks)}** forks',
      if (repo.language != null) '💻 **${repo.language}**',
      '🕐 Updated **${repo.timeAgo}**',
    ];
    parts.add('## Stats\n${stats.join('  \n')}');
    if (repo.topics.isNotEmpty) {
      parts.add('## Topics\n${repo.topics.map((t) => '`$t`').join('  ')}');
    }
    return parts.join('\n\n');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────────────────────────

  String _fmt(int n) =>
      n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';

  void _snack(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        duration: const Duration(milliseconds: 1200),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        ),
      ),
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // BUILD
  // ────────────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(child: _buildBody()),
            _buildBottomActionBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 12, 0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Discover',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _isLoading
                      ? 'Loading repos…'
                      : _deck.isEmpty
                          ? 'Tap refresh to load more!'
                          : '→ like  •  ← skip  •  ↑ save',
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          if (_history.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.undo_rounded, color: AppTheme.accent),
              tooltip: 'Undo last swipe',
              onPressed: _undo,
            ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded,
                color: AppTheme.textSecondary),
            tooltip: 'Refresh deck',
            onPressed: _initialLoad,
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(AppTheme.accent),
          strokeWidth: 2,
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.wifi_off_rounded,
                  color: AppTheme.textSecondary, size: 52),
              const SizedBox(height: 16),
              Text(
                _error!,
                style: const TextStyle(color: AppTheme.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _initialLoad,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_deck.isEmpty) {
      return EmptyState(
        message: 'No repos to show\nTap refresh to load more!',
        actionLabel: 'Refresh',
        onAction: _initialLoad,
      );
    }

    return KeyedSubtree(
      key: ValueKey(_deckKey),
      child: AppinioSwiper(
        controller: _swiperController,
        cardsCount: _deck.length,
        onSwipeEnd: _onSwipeEnd,
        onCardPositionChanged: _onCardPositionChanged,
        cardBuilder: (BuildContext context, int index) {
          if (index < 0 || index >= _deck.length) {
            return const SizedBox.shrink();
          }
          final repo = _deck[index];
          final isTop = index == _topCardIndex;
          return DiscoveryCard(
            key: ValueKey(repo.id),
            repo: repo,
            dragOffsetX: isTop ? _dragOffsetX : 0,
            dragOffsetY: isTop ? _dragOffsetY : 0,
            onSave: () async {
              final userId = await _getUserId();
              if (!mounted) return;
              await Provider.of<RepoService>(context, listen: false)
                  .saveRepo(userId, repo);
              _snack('saved ${repo.name}', AppTheme.accent);
              _swiperController.swipeLeft();
            },
            onPreview: () => _showPreview(repo),
          );
        },
      ),
    );
  }

  Widget _buildBottomActionBar() {
    if (_isLoading || _deck.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 8, 32, 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _circleBtn(
            icon: Icons.close_rounded,
            color: AppTheme.error,
            size: 58,
            onTap: () => _swiperController.swipeLeft(),
          ),
          _circleBtn(
            icon: Icons.bookmark_add_rounded,
            color: AppTheme.accent,
            size: 48,
            onTap: () => _swiperController.swipeUp(),
          ),
          _circleBtn(
            icon: Icons.favorite_rounded,
            color: AppTheme.success,
            size: 58,
            onTap: () => _swiperController.swipeRight(),
          ),
        ],
      ),
    );
  }

  Widget _circleBtn({
    required IconData icon,
    required Color color,
    required double size,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppTheme.surface,
          border: Border.all(color: color.withOpacity(0.35), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.18),
              blurRadius: 14,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Icon(icon, color: color, size: size * 0.44),
      ),
    );
  }
}

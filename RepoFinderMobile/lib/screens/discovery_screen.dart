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
  List<Repository> _deck = [];
  List<Repository> _nextBatch = [];
  bool _isLoading = true;
  bool _isFetchingNext = false;
  String? _error;

  // ── Drag state (live LIKE / SKIP overlays) ───────────────────────────────────
  double _dragOffsetX = 0;
  double _dragOffsetY = 0;
  int _topCardIndex = 0;

  // ── History for undo ──────────────────────────────────────────────────────────
  final List<Repository> _history = [];

  // ── Cached user / prefs ───────────────────────────────────────────────────────
  String? _userId;
  UserPreferences? _prefs;

  static const int _batchSize = 15;
  static const int _prefetchAt = 4;

  // Forces AppinioSwiper rebuild when deck is replaced
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
  // USER ID
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
          _nextBatch =
              repos.length > _batchSize ? repos.sublist(_batchSize) : [];
          _topCardIndex = 0;
          _dragOffsetX = 0;
          _dragOffsetY = 0;
          _deckKey++;
          _isLoading = false;
        });
      }
    } catch (e, st) {
      debugPrint('Discovery load error: $e\n$st');
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<List<Repository>> _fetchRepos() async {
    final repoService = Provider.of<RepoService>(context, listen: false);
    final cluster = _prefs?.primaryCluster ?? 'frontend';
    final techStack = _prefs?.techStack ?? [];
    final goals = _prefs?.goals ?? [];

    var repos = await repoService.getPersonalizedRepos(
      primaryCluster: cluster,
      preferredLanguages: techStack,
      goals: goals,
      limit: _batchSize * 4,
    );

    if (repos.isEmpty) {
      repos = await repoService.getReposByCluster(
        cluster: cluster,
        userId: _userId ?? 'anon',
        limit: _batchSize * 4,
      );
    }

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
      if (mounted) setState(() => _nextBatch = [..._nextBatch, ...more]);
    } catch (e) {
      debugPrint('Prefetch error: $e');
    } finally {
      _isFetchingNext = false;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SWIPER CALLBACKS  (v2.1.1 API)
  // ────────────────────────────────────────────────────────────────────────────

  void _onCardPositionChanged(SwiperPosition position) {
    setState(() {
      _dragOffsetX = position.offset.dx;
      _dragOffsetY = position.offset.dy;
      _topCardIndex = position.index;
    });
  }

  /// Called after each swipe completes.
  /// [activity] is a sealed class: [Swipe], [Unswipe], [CancelSwipe], [DrivenActivity]
  void _onSwipeEnd(
    int previousIndex,
    int targetIndex,
    SwiperActivity activity,
  ) {
    setState(() {
      _dragOffsetX = 0;
      _dragOffsetY = 0;
      _topCardIndex = targetIndex;
    });

    // Undo — nothing to track
    if (activity is Unswipe) return;
    // Cancelled (didn't reach threshold) — nothing to track
    if (activity is CancelSwipe) return;

    if (previousIndex < 0 || previousIndex >= _deck.length) return;
    final repo = _deck[previousIndex];

    if (activity is Swipe) {
      switch (activity.direction) {
        case AxisDirection.right:
          // LIKE ❤️
          _history.add(repo);
          HapticFeedback.mediumImpact();
          _snack('Liked ${repo.name}', AppTheme.success);
          _trackSwipe(repo, 'like');
          break;
        case AxisDirection.left:
          // SKIP ✕
          _history.add(repo);
          HapticFeedback.lightImpact();
          _trackSwipe(repo, 'skip');
          break;
        default:
          // Up/down disabled via SwipeOptions — should not occur
          break;
      }
    }

    setState(() {});

    // Extend deck when nearing end
    final remaining = _deck.length - targetIndex;
    if (remaining <= _prefetchAt) {
      _extendDeck();
    }
  }

  Future<void> _trackSwipe(Repository repo, String action) async {
    try {
      final userId = await _getUserId();
      if (!mounted) return;
      final repoSvc = Provider.of<RepoService>(context, listen: false);
      final appSvc = Provider.of<AppSupabaseService>(context, listen: false);

      if (action == 'like') {
        await repoSvc.likeRepo(userId, repo);
      } else if (action == 'save') {
        await repoSvc.saveRepo(userId, repo);
      } else {
        await appSvc.trackInteraction(
          userId: userId,
          repoGithubId: repo.githubId,
          action: action,
        );
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
    if (_nextBatch.length < _batchSize) _prefetchMore();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // UNDO
  // ────────────────────────────────────────────────────────────────────────────

  void _undo() {
    if (_history.isEmpty) return;
    // Remove from history BEFORE calling unswipe so the button stays visible
    // during the animation (history will still have entries if there are more)
    final repo = _history.removeLast();
    setState(() {});               // hide undo button if history now empty
    try {
      _swiperController.unswipe();
    } catch (e) {
      // If unswipe fails (e.g. no card to undo), restore history entry
      _history.add(repo);
      setState(() {});
      debugPrint('Undo failed: $e');
      return;
    }
    HapticFeedback.lightImpact();
    _snack('↩ Back to ${repo.name}', AppTheme.textSecondary);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // README PREVIEW
  // ────────────────────────────────────────────────────────────────────────────

  Future<void> _showPreview(Repository repo) async {
    // Track view (fire-and-forget)
    _getUserId().then((uid) {
      if (!mounted) return;
      Provider.of<AppSupabaseService>(context, listen: false)
          .trackInteraction(
              userId: uid, repoGithubId: repo.githubId, action: 'view')
          .catchError((_) {});
    });

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
            _snack('Saved ${repo.name}', AppTheme.accent);
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
                          : '→ like  •  ← skip',
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
              Text(_error!,
                  style: const TextStyle(color: AppTheme.textSecondary),
                  textAlign: TextAlign.center),
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
        cardCount: _deck.length,          // ← v2.1.1: cardCount not cardsCount
        allowUnSwipe: true,
        allowUnlimitedUnSwipe: true,
        // Only horizontal swipes — no up/down/diagonal
        swipeOptions: const SwipeOptions.only(
          left: true,
          right: true,
        ),
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
            cardNumber: index + 1,          // #1, #2, #3 …
            dragOffsetX: isTop ? _dragOffsetX : 0,
            dragOffsetY: isTop ? _dragOffsetY : 0,
            onSave: () async {
              final userId = await _getUserId();
              if (!mounted) return;
              await Provider.of<RepoService>(context, listen: false)
                  .saveRepo(userId, repo);
              _snack('Saved ${repo.name}', AppTheme.accent);
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
            onTap: () async {
              // Save current top card then skip it (no upward swipe)
              if (_topCardIndex < _deck.length) {
                final repo = _deck[_topCardIndex];
                final userId = await _getUserId();
                if (!mounted) return;
                await Provider.of<RepoService>(context, listen: false)
                    .saveRepo(userId, repo);
                _snack('Saved ${repo.name}', AppTheme.accent);
                _swiperController.swipeLeft();
              }
            },
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

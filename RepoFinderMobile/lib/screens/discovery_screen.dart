import 'package:appinio_swiper/appinio_swiper.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

import '../models/repository.dart';
import '../services/app_supabase_service.dart';
import '../services/repo_service.dart';
import '../theme/app_theme.dart';
import '../widgets/discovery_card.dart';
import '../widgets/readme_preview_modal.dart';

class DiscoveryScreen extends StatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  State<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends State<DiscoveryScreen> {
  // ─── Deck state ────────────────────────────────────────────────────────────
  final List<Repository> _currentBatch = [];
  final List<Repository> _nextBatch = [];
  AppinioSwiperController _swiperController = AppinioSwiperController();
  int _deckVersion = 0;         // bump to force swiper rebuild via ValueKey
  int _topCardIndex = 0;        // index of card currently on top
  Offset _cardOffset = Offset.zero; // live drag offset from onCardPositionChanged

  // ─── Action intent ─────────────────────────────────────────────────────────
  /// Set to true before calling swipeRight() from the ❤️ Like button.
  /// Distinguishes LIKE vs SAVE on a right-swipe inside _onSwipeEnd.
  bool _pendingLike = false;

  // ─── Undo history ──────────────────────────────────────────────────────────
  /// Last swiped repos — supports up to 3 undos
  final List<Repository> _swipeHistory = [];

  // ─── Loading / UI ──────────────────────────────────────────────────────────
  bool _isLoading = true;
  bool _prefetching = false;
  bool _exhausted = false;
  bool _showEmpty = false;
  String? _error;

  // ─── Pagination ────────────────────────────────────────────────────────────
  String? _userId;
  int _lastRank = 0;
  final Set<int> _seenIds = {};

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInitial());
  }

  // ─── Data loading ──────────────────────────────────────────────────────────

  Future<void> _loadInitial() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
      _currentBatch.clear();
      _nextBatch.clear();
      _seenIds.clear();
      _lastRank = 0;
      _exhausted = false;
      _showEmpty = false;
      _deckVersion = 0;
      _topCardIndex = 0;
      _cardOffset = Offset.zero;
      _swipeHistory.clear();
    });

    try {
      final supabase = context.read<AppSupabaseService>();
      _userId = await supabase.getOrCreateUserId();

      final batch = await _fetchCards(limit: 20);

      if (mounted) {
        setState(() {
          _currentBatch.addAll(batch);
          _isLoading = false;
          if (batch.isEmpty) _showEmpty = true;
        });
      }
    } catch (e) {
      debugPrint('DiscoveryScreen._loadInitial: $e');
      if (mounted) {
        setState(() {
          _error = 'Could not load repos. Please try again.';
          _isLoading = false;
        });
      }
    }
  }

  Future<List<Repository>> _fetchCards({int limit = 20}) async {
    if (_userId == null) return [];
    final repoService = context.read<RepoService>();

    final repos = await repoService.getDiscoveryFeed(
      userId: _userId!,
      afterRank: _lastRank,
      excludeIds: _seenIds.toList(),
      limit: limit,
    );

    if (repos.isEmpty) {
      _exhausted = true;
    } else {
      for (final r in repos) {
        _seenIds.add(r.githubId);
        if (r.feedRank != null && r.feedRank! > _lastRank) {
          _lastRank = r.feedRank!;
        }
      }
    }
    return repos;
  }

  Future<void> _prefetchNext() async {
    if (_prefetching || _exhausted) return;
    setState(() => _prefetching = true);
    try {
      final batch = await _fetchCards(limit: 20);
      if (mounted) {
        setState(() {
          _nextBatch.addAll(batch);
          _prefetching = false;
        });
      }
    } catch (e) {
      debugPrint('DiscoveryScreen._prefetchNext: $e');
      if (mounted) setState(() => _prefetching = false);
    }
  }

  // ─── AppinioSwiper callbacks ───────────────────────────────────────────────

  void _onCardPositionChanged(SwiperPosition position) {
    setState(() => _cardOffset = position.offset);
  }

  void _onSwipeEnd(int previousIndex, int targetIndex, SwiperActivity activity) {
    setState(() {
      _topCardIndex = targetIndex;
      _cardOffset = Offset.zero;
    });

    if (activity is Swipe) {
      final repo = _currentBatch[previousIndex];

      // Track undo history (keep last 3)
      _swipeHistory.add(repo);
      if (_swipeHistory.length > 3) _swipeHistory.removeAt(0);

      switch (activity.direction) {
        case AxisDirection.right:
          _pendingLike ? _doLike(repo) : _doSave(repo);
          _pendingLike = false;
          break;
        case AxisDirection.left:
          _doSkip(repo);
          break;
        default:
          _pendingLike = false;
          break;
      }

      // Pre-fetch the next batch when < 5 cards remain in this batch
      final remaining = _currentBatch.length - 1 - targetIndex;
      if (remaining < 5 && !_exhausted && !_prefetching && _nextBatch.isEmpty) {
        _prefetchNext();
      }
    }
  }

  void _onEnd() {
    if (_nextBatch.isNotEmpty) {
      _swapInNextBatch();
    } else if (_exhausted) {
      setState(() => _showEmpty = true);
    } else {
      // Haven't pre-fetched yet — do it now then swap in
      _prefetchNext().then((_) {
        if (!mounted) return;
        if (_nextBatch.isNotEmpty) {
          _swapInNextBatch();
        } else {
          setState(() => _showEmpty = true);
        }
      });
    }
  }

  void _swapInNextBatch() {
    final newController = AppinioSwiperController();
    setState(() {
      _currentBatch
        ..clear()
        ..addAll(_nextBatch);
      _nextBatch.clear();
      _swiperController = newController;
      _deckVersion++;
      _topCardIndex = 0;
      _cardOffset = Offset.zero;
      _swipeHistory.clear();
    });
  }

  // ─── Card action handlers (fire-and-forget async) ─────────────────────────

  void _doLike(Repository repo) {
    HapticFeedback.mediumImpact();
    _showSnack('❤️ Liked!', AppTheme.success);
    _doLikeAsync(repo);
  }

  Future<void> _doLikeAsync(Repository repo) async {
    try {
      final supabase = context.read<AppSupabaseService>();
      final repoService = context.read<RepoService>();
      final userId = await supabase.getOrCreateUserId();
      await repoService.likeRepo(userId, repo);
    } catch (e) {
      debugPrint('Like error: $e');
    }
  }

  void _doSave(Repository repo) {
    HapticFeedback.mediumImpact();
    _showSnack('🔖 Saved!', AppTheme.success);
    _doSaveAsync(repo);
  }

  Future<void> _doSaveAsync(Repository repo) async {
    try {
      final supabase = context.read<AppSupabaseService>();
      final repoService = context.read<RepoService>();
      final userId = await supabase.getOrCreateUserId();
      await repoService.saveRepo(userId, repo);
    } catch (e) {
      debugPrint('Save error: $e');
    }
  }

  void _doSkip(Repository repo) {
    HapticFeedback.lightImpact();
    _doSkipAsync(repo);
  }

  Future<void> _doSkipAsync(Repository repo) async {
    try {
      final supabase = context.read<AppSupabaseService>();
      final userId = await supabase.getOrCreateUserId();
      await supabase.trackInteraction(
        userId: userId,
        repoGithubId: repo.githubId,
        action: 'skip',
      );
    } catch (e) {
      debugPrint('Skip error: $e');
    }
  }

  // ─── Undo last swipe ───────────────────────────────────────────────────────

  void _doUndo() {
    if (_swipeHistory.isEmpty) return;
    HapticFeedback.lightImpact();
    _swiperController.unswipe();
    setState(() {
      _swipeHistory.removeLast();
      if (_topCardIndex > 0) _topCardIndex--;
      _cardOffset = Offset.zero;
    });
  }

  // ─── Preview (fetch actual README from GitHub) ─────────────────────────────

  Future<void> _doPreviewAsync(Repository repo) async {
    // Track interaction
    try {
      final supabase = context.read<AppSupabaseService>();
      final userId = await supabase.getOrCreateUserId();
      await supabase.trackInteraction(
        userId: userId,
        repoGithubId: repo.githubId,
        action: 'preview',
      );
    } catch (_) {}

    // Fetch README from GitHub raw content
    String? readmeContent;
    try {
      final parts = repo.fullName.split('/');
      if (parts.length == 2) {
        for (final branch in ['main', 'master']) {
          final url = Uri.parse(
            'https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/$branch/README.md',
          );
          final res = await http.get(url, headers: {
            'Accept': 'text/plain',
          });
          if (res.statusCode == 200 && res.body.isNotEmpty) {
            readmeContent = res.body;
            break;
          }
        }
      }
    } catch (_) {}

    // Fall back to description
    readmeContent ??= repo.description;

    if (mounted) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => ReadmePreviewModal(
          repo: repo,
          readmeContent: readmeContent,
          onSave: () => _doSave(repo),
        ),
      );
    }
  }

  void _showSnack(String text, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        duration: const Duration(milliseconds: 1200),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        ),
      ),
    );
  }

  // ─── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(child: _buildBody()),
            if (!_isLoading && !_showEmpty && _error == null && _currentBatch.isNotEmpty)
              _buildActionButtons(),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 8),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Discover',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                'Swipe right to save · Left to skip',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.38),
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const Spacer(),
          IconButton(
            onPressed: _loadInitial,
            icon: const Icon(Icons.refresh_rounded, color: Colors.white38),
            tooltip: 'Refresh feed',
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) return _buildLoading();
    if (_error != null) return _buildError();
    if (_showEmpty || _currentBatch.isEmpty) return _buildEmpty();
    return _buildSwiper();
  }

  Widget _buildLoading() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            strokeWidth: 2,
          ),
          SizedBox(height: 20),
          Text(
            'Loading your feed…',
            style: TextStyle(color: Colors.white54, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 64, color: Colors.redAccent),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: const TextStyle(color: Colors.white54, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadInitial,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle_outline_rounded,
                size: 72, color: Colors.white24),
            const SizedBox(height: 20),
            const Text(
              "You've seen everything!",
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            const Text(
              'Come back tomorrow for fresh picks ✨',
              style: TextStyle(color: Colors.white54, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: _loadInitial,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Refresh'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                    horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSwiper() {
    return Stack(
      children: [
        AppinioSwiper(
          key: ValueKey(_deckVersion),
          controller: _swiperController,
          cardCount: _currentBatch.length,
          backgroundCardCount: 2,
          backgroundCardScale: 0.92,
          backgroundCardOffset: const Offset(0, 30),
          maxAngle: 20,
          threshold: 80,
          swipeOptions: const SwipeOptions.only(
            left: true,
            right: true,
          ),
          onCardPositionChanged: _onCardPositionChanged,
          onSwipeEnd: _onSwipeEnd,
          onEnd: _onEnd,
          cardBuilder: (context, index) {
            final isTop = index == _topCardIndex;
            final repo = _currentBatch[index];
            return DiscoveryCard(
              repo: repo,
              dragOffsetX: isTop ? _cardOffset.dx : 0,
              dragOffsetY: isTop ? _cardOffset.dy : 0,
              isDragging: isTop && _cardOffset != Offset.zero,
              // Only the top card responds to button taps
              onSave: isTop ? () {
                _pendingLike = false;
                _swiperController.swipeRight();
              } : null,
              onPreview: isTop ? () => _doPreviewAsync(repo) : null,
            );
          },
        ),

        // Subtle pre-fetch indicator at the bottom
        if (_prefetching)
          Positioned(
            bottom: 8,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.65),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.white.withOpacity(0.07),
                    width: 0.5,
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 11,
                      height: 11,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Colors.white38),
                      ),
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Loading more…',
                      style:
                          TextStyle(color: Colors.white38, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildActionButtons() {
    final canUndo = _swipeHistory.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // ↩ Undo
          _ActionButton(
            icon: Icons.undo_rounded,
            color: canUndo
                ? const Color(0xFFFBBF24)
                : Colors.white12,
            size: 48,
            label: 'Undo',
            onTap: canUndo ? _doUndo : null,
          ),

          // ❌ Skip
          _ActionButton(
            icon: Icons.close_rounded,
            color: const Color(0xFFFF4757),
            size: 58,
            label: 'Skip',
            onTap: () {
              _pendingLike = false;
              _swiperController.swipeLeft();
            },
          ),

          // ❤️ Like
          _ActionButton(
            icon: Icons.favorite_rounded,
            color: const Color(0xFF2ED573),
            size: 68,
            label: 'Like',
            onTap: () {
              _pendingLike = true;
              _swiperController.swipeRight();
            },
          ),
        ],
      ),
    );
  }
}

// ─── Action button ────────────────────────────────────────────────────────────

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  final String label;
  final VoidCallback? onTap;   // nullable → disabled state

  const _ActionButton({
    required this.icon,
    required this.color,
    required this.size,
    required this.label,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF1C1C1E),
              border: Border.all(
                color: enabled ? color.withOpacity(0.3) : Colors.white10,
                width: 1.5,
              ),
              boxShadow: enabled
                  ? [
                      BoxShadow(
                        color: color.withOpacity(0.20),
                        blurRadius: 18,
                        spreadRadius: 2,
                      ),
                    ]
                  : null,
            ),
            child: Icon(icon, color: enabled ? color : Colors.white12,
                size: size * 0.45),
          ),
          const SizedBox(height: 5),
          Text(
            label,
            style: TextStyle(
              color: enabled
                  ? Colors.white.withOpacity(0.38)
                  : Colors.white12,
              fontSize: 10,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

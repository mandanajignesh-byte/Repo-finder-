import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/repository.dart';
import '../theme/app_theme.dart';

/// Full-screen Tinder-style discovery card with live LIKE/SKIP overlays.
///
/// Accepts a [dragNotifier] (only for the top card). When the notifier value
/// changes the card updates its own overlays without triggering a rebuild of
/// the parent [DiscoveryScreen] — eliminating the 60 fps setState lag.
///
/// Background cards pass [dragNotifier] = null and are completely static.
class DiscoveryCard extends StatefulWidget {
  final Repository repo;

  /// Non-null only for the *top* card. Null = background card (no overlays).
  final ValueNotifier<Offset>? dragNotifier;

  final int cardNumber; // 1-based (#1, #2 …)
  final VoidCallback? onSave;
  final VoidCallback? onPreview;

  const DiscoveryCard({
    super.key,
    required this.repo,
    this.dragNotifier,
    this.cardNumber = 0,
    this.onSave,
    this.onPreview,
  });

  @override
  State<DiscoveryCard> createState() => _DiscoveryCardState();
}

class _DiscoveryCardState extends State<DiscoveryCard> {
  static const double _threshold = 60.0;
  static const double _maxOffset = 160.0;

  Offset _offset = Offset.zero;

  @override
  void initState() {
    super.initState();
    widget.dragNotifier?.addListener(_onDragUpdate);
  }

  @override
  void didUpdateWidget(DiscoveryCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.dragNotifier != widget.dragNotifier) {
      oldWidget.dragNotifier?.removeListener(_onDragUpdate);
      widget.dragNotifier?.addListener(_onDragUpdate);
      _offset = widget.dragNotifier?.value ?? Offset.zero;
    }
  }

  @override
  void dispose() {
    widget.dragNotifier?.removeListener(_onDragUpdate);
    super.dispose();
  }

  void _onDragUpdate() {
    // Only this card rebuilds — the parent DiscoveryScreen is untouched.
    if (mounted) setState(() => _offset = widget.dragNotifier!.value);
  }

  // ── Overlay values ──────────────────────────────────────────────────────────
  double get _likeOpacity =>
      ((_offset.dx - _threshold) / _maxOffset).clamp(0.0, 1.0);
  double get _skipOpacity =>
      ((-_offset.dx - _threshold) / _maxOffset).clamp(0.0, 1.0);

  Color get _borderColor {
    if (_likeOpacity > 0) {
      return AppTheme.success.withValues(alpha: _likeOpacity.clamp(0.0, 0.85));
    } else if (_skipOpacity > 0) {
      return AppTheme.error.withValues(alpha: _skipOpacity.clamp(0.0, 0.85));
    }
    return AppTheme.hairlineBorder;
  }

  // ────────────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: _borderColor,
          width:
              _likeOpacity > 0 || _skipOpacity > 0 ? 2.5 : 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x8C000000),
            blurRadius: 32,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(27),
        child: Stack(
          children: [
            // ── Scrollable content (static) ────────────────────────────────
            SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildOwnerHeader(),
                  const SizedBox(height: 20),
                  _buildRepoName(),
                  const SizedBox(height: 12),
                  if (widget.repo.description?.isNotEmpty == true) ...[
                    _buildDescription(),
                    const SizedBox(height: 16),
                  ],
                  if (widget.repo.topics.isNotEmpty) ...[
                    _buildTopics(),
                    const SizedBox(height: 16),
                  ],
                  _buildStats(),
                ],
              ),
            ),

            // ── Gradient action bar ────────────────────────────────────────
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _buildActionBar(),
            ),

            // ── Card number badge ──────────────────────────────────────────
            if (widget.cardNumber > 0)
              Positioned(
                bottom: 100,
                right: 14,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0x1F0A84FF),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: const Color(0x4D0A84FF), width: 1),
                  ),
                  child: Text(
                    '#${widget.cardNumber}',
                    style: const TextStyle(
                      color: AppTheme.accent,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),

            // ── LIKE badge ─────────────────────────────────────────────────
            if (_likeOpacity > 0)
              Positioned(
                top: 20,
                left: 16,
                child: _buildBadge('LIKE', AppTheme.success, _likeOpacity),
              ),

            // ── SKIP badge ─────────────────────────────────────────────────
            if (_skipOpacity > 0)
              Positioned(
                top: 20,
                right: 16,
                child: _buildBadge('SKIP', AppTheme.error, _skipOpacity),
              ),
          ],
        ),
      ),
    );
  }

  // ── Overlay badge ────────────────────────────────────────────────────────────
  Widget _buildBadge(String text, Color color, double opacity) {
    return Opacity(
      opacity: opacity.clamp(0.0, 1.0),
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          border: Border.all(color: color, width: 2.5),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          text,
          style: TextStyle(
            color: color,
            fontSize: 20,
            fontWeight: FontWeight.w900,
            letterSpacing: 3,
          ),
        ),
      ),
    );
  }

  // ── Owner header ─────────────────────────────────────────────────────────────
  Widget _buildOwnerHeader() {
    final avatarUrl =
        widget.repo.ownerAvatar ??
        'https://github.com/${widget.repo.ownerLogin}.png';

    return Row(
      children: [
        ClipOval(
          child: CachedNetworkImage(
            imageUrl: avatarUrl,
            width: 44,
            height: 44,
            fit: BoxFit.cover,
            placeholder: (context, url) => _avatarFallback(),
            errorWidget: (context, url, error) => _avatarFallback(),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.repo.ownerLogin,
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                widget.repo.fullName,
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        if (widget.repo.language != null)
          _buildLanguageBadge(widget.repo.language!),
      ],
    );
  }

  Widget _avatarFallback() {
    final initial = widget.repo.ownerLogin.isNotEmpty
        ? widget.repo.ownerLogin[0].toUpperCase()
        : 'R';
    return Container(
      width: 44,
      height: 44,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [Color(0xFF0A84FF), Color(0xFF5E5CE6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
    );
  }

  Widget _buildLanguageBadge(String language) {
    final color = _languageColor(language);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            language,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRepoName() {
    return Text(
      widget.repo.name,
      style: const TextStyle(
        color: AppTheme.textPrimary,
        fontSize: 26,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.5,
        height: 1.2,
      ),
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }

  Widget _buildDescription() {
    return Text(
      widget.repo.description!,
      style: const TextStyle(
        color: AppTheme.textSecondary,
        fontSize: 15,
        height: 1.55,
      ),
      maxLines: 5,
      overflow: TextOverflow.ellipsis,
    );
  }

  Widget _buildTopics() {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: widget.repo.topics
          .take(7)
          .map(
            (topic) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppTheme.elevatedSurface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.hairlineBorder),
              ),
              child: Text(
                '#$topic',
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildStats() {
    return Row(
      children: [
        _statItem(
            Icons.star_outline_rounded, _fmt(widget.repo.stars), const Color(0xFFFFD60A)),
        const SizedBox(width: 14),
        _statItem(Icons.call_split_rounded, _fmt(widget.repo.forks),
            AppTheme.textSecondary),
        if (widget.repo.openIssues > 0) ...[
          const SizedBox(width: 14),
          _statItem(Icons.bug_report_outlined, '${widget.repo.openIssues}',
              AppTheme.textSecondary),
        ],
        const Spacer(),
        Text(
          widget.repo.timeAgo,
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
        ),
      ],
    );
  }

  Widget _statItem(IconData icon, String value, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildActionBar() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.surface.withValues(alpha: 0),
            AppTheme.surface.withValues(alpha: 0.95),
            AppTheme.surface,
          ],
          stops: const [0, 0.4, 1],
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
      child: Row(
        children: [
          Expanded(
            child: _actionBtn(
              icon: Icons.description_outlined,
              label: 'README',
              color: AppTheme.textSecondary,
              bg: AppTheme.elevatedSurface,
              onTap: widget.onPreview,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 2,
            child: _actionBtn(
              icon: Icons.bookmark_add_rounded,
              label: 'Save',
              color: Colors.white,
              bg: AppTheme.accent,
              onTap: widget.onSave,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _actionBtn(
              icon: Icons.open_in_new_rounded,
              label: 'GitHub',
              color: AppTheme.textSecondary,
              bg: AppTheme.elevatedSurface,
              onTap: _openGitHub,
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionBtn({
    required IconData icon,
    required String label,
    required Color color,
    required Color bg,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: bg == AppTheme.accent
                ? Colors.transparent
                : AppTheme.hairlineBorder,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openGitHub() async {
    final raw = widget.repo.repoUrl.isNotEmpty
        ? widget.repo.repoUrl
        : 'https://github.com/${widget.repo.fullName}';
    try {
      await launchUrl(Uri.parse(raw), mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  String _fmt(int n) =>
      n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';

  Color _languageColor(String lang) {
    const map = {
      'Dart': Color(0xFF00B4AB),
      'Swift': Color(0xFFFA7343),
      'Kotlin': Color(0xFF7F52FF),
      'JavaScript': Color(0xFFF7DF1E),
      'TypeScript': Color(0xFF3178C6),
      'Python': Color(0xFF3572A5),
      'Rust': Color(0xFFDEA584),
      'Go': Color(0xFF00ADD8),
      'Java': Color(0xFFB07219),
      'C++': Color(0xFFf34b7d),
      'C#': Color(0xFF178600),
      'Ruby': Color(0xFF701516),
      'PHP': Color(0xFF4F5D95),
      'Shell': Color(0xFF89E051),
      'HTML': Color(0xFFE34C26),
      'CSS': Color(0xFF563D7C),
      'Zig': Color(0xFFEC915C),
      'Elixir': Color(0xFF6E4A7E),
      'Lua': Color(0xFF000080),
      'Haskell': Color(0xFF5D4F85),
      'Scala': Color(0xFFDC322F),
    };
    return map[lang] ?? AppTheme.textSecondary;
  }
}

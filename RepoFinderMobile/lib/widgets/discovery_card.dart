import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/repository.dart';
import '../theme/app_theme.dart';

/// Full-screen Tinder-style discovery card with live LIKE/SKIP overlays.
///
/// [dragOffsetX] drives the border color + badge overlays.
/// Positive [dragOffsetX] = dragging right (LIKE), negative = dragging left (SKIP).
/// [cardNumber] shows the position badge (#1, #2 …) in blue.
class DiscoveryCard extends StatelessWidget {
  final Repository repo;
  final double dragOffsetX;
  final double dragOffsetY;
  final int cardNumber;       // 1-based position shown as #1, #2 …
  final VoidCallback? onSave;
  final VoidCallback? onPreview;

  const DiscoveryCard({
    super.key,
    required this.repo,
    this.dragOffsetX = 0,
    this.dragOffsetY = 0,
    this.cardNumber = 0,
    this.onSave,
    this.onPreview,
  });

  // ── overlay thresholds ──────────────────────────────────────────────────────
  static const double _threshold = 60.0; // px before overlay appears
  static const double _maxOffset = 160.0; // px for full opacity

  double get _likeOpacity =>
      ((dragOffsetX - _threshold) / _maxOffset).clamp(0.0, 1.0);
  double get _skipOpacity =>
      ((-dragOffsetX - _threshold) / _maxOffset).clamp(0.0, 1.0);
  double get _saveOpacity =>
      ((-dragOffsetY - _threshold) / _maxOffset).clamp(0.0, 1.0);

  // ── border color based on drag ───────────────────────────────────────────────
  Color get _borderColor {
    if (_likeOpacity > 0) {
      return AppTheme.success.withOpacity(_likeOpacity.clamp(0.0, 0.85));
    } else if (_skipOpacity > 0) {
      return AppTheme.error.withOpacity(_skipOpacity.clamp(0.0, 0.85));
    } else if (_saveOpacity > 0) {
      return AppTheme.accent.withOpacity(_saveOpacity.clamp(0.0, 0.85));
    }
    return AppTheme.hairlineBorder;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: _borderColor,
          width: _likeOpacity > 0 || _skipOpacity > 0 || _saveOpacity > 0
              ? 2.5
              : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.55),
            blurRadius: 32,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(27),
        child: Stack(
          children: [
            // ── Scrollable content ──────────────────────────────────────────
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
                  if (repo.description?.isNotEmpty == true) ...[
                    _buildDescription(),
                    const SizedBox(height: 16),
                  ],
                  if (repo.topics.isNotEmpty) ...[
                    _buildTopics(),
                    const SizedBox(height: 16),
                  ],
                  _buildStats(),
                ],
              ),
            ),

            // ── Gradient action bar at bottom ───────────────────────────────
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _buildActionBar(),
            ),

            // ── LIKE badge (top-left) ────────────────────────────────────────
            if (_likeOpacity > 0)
              Positioned(
                top: 20,
                left: 16,
                child: _buildBadge('LIKE', AppTheme.success, _likeOpacity),
              ),

            // ── SKIP badge (top-right) ───────────────────────────────────────
            if (_skipOpacity > 0)
              Positioned(
                top: 20,
                right: 16,
                child: _buildBadge('SKIP', AppTheme.error, _skipOpacity),
              ),

            // ── Card number badge (#1, #2…) bottom-right ────────────────────
            if (cardNumber > 0)
              Positioned(
                bottom: 100,
                right: 14,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: AppTheme.accent.withOpacity(0.3), width: 1),
                  ),
                  child: Text(
                    '#$cardNumber',
                    style: const TextStyle(
                      color: AppTheme.accent,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
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
        repo.ownerAvatar ?? 'https://github.com/${repo.ownerLogin}.png';

    return Row(
      children: [
        // Avatar
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

        // Owner + full name
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                repo.ownerLogin,
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                repo.fullName,
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

        // Language badge
        if (repo.language != null) _buildLanguageBadge(repo.language!),
      ],
    );
  }

  Widget _avatarFallback() {
    final initial =
        repo.ownerLogin.isNotEmpty ? repo.ownerLogin[0].toUpperCase() : 'R';
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
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.35)),
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

  // ── Repo name ─────────────────────────────────────────────────────────────
  Widget _buildRepoName() {
    return Text(
      repo.name,
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

  // ── Description ───────────────────────────────────────────────────────────
  Widget _buildDescription() {
    return Text(
      repo.description!,
      style: const TextStyle(
        color: AppTheme.textSecondary,
        fontSize: 15,
        height: 1.55,
      ),
      maxLines: 5,
      overflow: TextOverflow.ellipsis,
    );
  }

  // ── Topics ────────────────────────────────────────────────────────────────
  Widget _buildTopics() {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: repo.topics
          .take(7)
          .map(
            (topic) => Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
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
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
          )
          .toList(),
    );
  }

  // ── Stats row ─────────────────────────────────────────────────────────────
  Widget _buildStats() {
    return Row(
      children: [
        _statItem(Icons.star_outline_rounded, _fmt(repo.stars),
            const Color(0xFFFFD60A)),
        const SizedBox(width: 14),
        _statItem(Icons.call_split_rounded, _fmt(repo.forks),
            AppTheme.textSecondary),
        if (repo.openIssues > 0) ...[
          const SizedBox(width: 14),
          _statItem(Icons.bug_report_outlined, '${repo.openIssues}',
              AppTheme.textSecondary),
        ],
        const Spacer(),
        Text(
          repo.timeAgo,
          style: const TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 12,
          ),
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

  // ── Gradient action bar ───────────────────────────────────────────────────
  Widget _buildActionBar() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.surface.withOpacity(0),
            AppTheme.surface.withOpacity(0.95),
            AppTheme.surface,
          ],
          stops: const [0, 0.4, 1],
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
      child: Row(
        children: [
          // Preview button
          Expanded(
            child: _actionBtn(
              icon: Icons.description_outlined,
              label: 'README',
              color: AppTheme.textSecondary,
              bg: AppTheme.elevatedSurface,
              onTap: onPreview,
            ),
          ),
          const SizedBox(width: 10),

          // Save button (primary)
          Expanded(
            flex: 2,
            child: _actionBtn(
              icon: Icons.bookmark_add_rounded,
              label: 'Save',
              color: Colors.white,
              bg: AppTheme.accent,
              onTap: onSave,
            ),
          ),
          const SizedBox(width: 10),

          // Open in GitHub
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
    final raw = repo.repoUrl.isNotEmpty
        ? repo.repoUrl
        : 'https://github.com/${repo.fullName}';
    try {
      await launchUrl(Uri.parse(raw),
          mode: LaunchMode.externalApplication);
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

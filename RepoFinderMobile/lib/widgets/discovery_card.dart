import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/repository.dart';
import '../theme/app_theme.dart';

/// Full-screen Tinder-style repository discovery card.
///
/// Shows live LIKE/SKIP overlays based on [dragOffsetX].
/// Embeds three action buttons: Save, Preview, GitHub.
class DiscoveryCard extends StatelessWidget {
  final Repository repo;
  final double dragOffsetX;
  final double dragOffsetY;
  final bool isDragging;

  /// Called when user taps the in-card Save button.
  final VoidCallback? onSave;

  /// Called when user taps the in-card Preview button.
  final VoidCallback? onPreview;

  const DiscoveryCard({
    super.key,
    required this.repo,
    this.dragOffsetX = 0,
    this.dragOffsetY = 0,
    this.isDragging = false,
    this.onSave,
    this.onPreview,
  });

  double get _likeStrength => (dragOffsetX / 120).clamp(0.0, 1.0);
  double get _skipStrength => (-dragOffsetX / 120).clamp(0.0, 1.0);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(
            color: _likeStrength > 0.1
                ? AppTheme.success.withOpacity(_likeStrength.clamp(0.0, 0.8))
                : _skipStrength > 0.1
                    ? AppTheme.error.withOpacity(_skipStrength.clamp(0.0, 0.8))
                    : AppTheme.hairlineBorder,
            width: (_likeStrength > 0.1 || _skipStrength > 0.1) ? 2.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.45),
              blurRadius: 28,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Stack(
            children: [
              // Background gradient
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppTheme.elevatedSurface,
                        AppTheme.background,
                      ],
                    ),
                  ),
                ),
              ),

              // Content
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 22, 22, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 20),

                    // Repo name
                    Text(
                      repo.name,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        letterSpacing: -0.5,
                        height: 1.2,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 10),

                    // Description
                    if (repo.description != null &&
                        repo.description!.isNotEmpty) ...[
                      Text(
                        repo.description!,
                        style: const TextStyle(
                          fontSize: 13.5,
                          color: Color(0xFFA1A1AA),
                          height: 1.55,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Badges + topics
                    if (repo.badges.isNotEmpty || repo.topics.isNotEmpty) ...[
                      _buildTags(),
                      const SizedBox(height: 14),
                    ],

                    const Spacer(),

                    // Stats row
                    _buildStats(),
                    const SizedBox(height: 10),

                    // Language + match score
                    _buildFooter(),
                    const SizedBox(height: 16),

                    // ── Action buttons ─────────────────────────────────────
                    _buildActionButtons(),
                  ],
                ),
              ),

              // SAVE indicator (right swipe)
              if (_likeStrength > 0.05)
                Positioned(
                  top: 28,
                  left: 22,
                  child: _SwipeLabel(
                    text: 'SAVE',
                    color: AppTheme.success,
                    strength: _likeStrength,
                    rotateLeft: true,
                  ),
                ),

              // SKIP indicator (left swipe)
              if (_skipStrength > 0.05)
                Positioned(
                  top: 28,
                  right: 22,
                  child: _SwipeLabel(
                    text: 'SKIP',
                    color: AppTheme.error,
                    strength: _skipStrength,
                    rotateLeft: false,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        // Owner avatar
        ClipOval(
          child: CachedNetworkImage(
            imageUrl: repo.ownerAvatar ??
                'https://github.com/${repo.ownerLogin}.png',
            width: 42,
            height: 42,
            fit: BoxFit.cover,
            placeholder: (_, __) => Container(
              width: 42,
              height: 42,
              color: AppTheme.divider,
            ),
            errorWidget: (_, __, ___) => Container(
              width: 42,
              height: 42,
              color: AppTheme.divider,
              child: const Icon(
                Icons.person_outline,
                color: AppTheme.textSecondary,
                size: 20,
              ),
            ),
          ),
        ),
        const SizedBox(width: 11),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                repo.ownerLogin,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFFA1A1AA),
                  fontWeight: FontWeight.w400,
                ),
              ),
              Text(
                repo.fullName,
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF6B7280),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        // Feed rank badge
        if (repo.feedRank != null)
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.accent.withOpacity(0.14),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: AppTheme.accent.withOpacity(0.25),
                width: 0.5,
              ),
            ),
            child: Text(
              '#${repo.feedRank}',
              style: const TextStyle(
                fontSize: 11,
                color: AppTheme.accent,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildTags() {
    // Badges first (with colors), then grey topic tags
    final badges = repo.badges.take(3).toList();
    final remaining = 4 - badges.length;
    final topics = repo.topics.take(remaining).toList();

    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final badge in badges)
          _BadgeTag(text: badge, color: _badgeColor(badge)),
        for (final topic in topics)
          _TopicTag(text: topic),
      ],
    );
  }

  Widget _buildStats() {
    return Row(
      children: [
        const Icon(Icons.star_outline_rounded,
            size: 15, color: Color(0xFFF59E0B)),
        const SizedBox(width: 4),
        Text(
          _fmt(repo.stars),
          style: const TextStyle(
            fontSize: 13,
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(width: 16),
        const Icon(Icons.call_split_outlined,
            size: 15, color: Color(0xFFA1A1AA)),
        const SizedBox(width: 4),
        Text(
          _fmt(repo.forks),
          style: const TextStyle(fontSize: 12, color: Color(0xFFA1A1AA)),
        ),
        if (repo.openIssues > 0) ...[
          const SizedBox(width: 16),
          const Icon(Icons.bug_report_outlined,
              size: 14, color: Color(0xFFA1A1AA)),
          const SizedBox(width: 4),
          Text(
            _fmt(repo.openIssues),
            style: const TextStyle(
                fontSize: 12, color: Color(0xFFA1A1AA)),
          ),
        ],
        const Spacer(),
        if (repo.pushedAt != null)
          Text(
            repo.timeAgo,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF6B7280),
            ),
          ),
      ],
    );
  }

  Widget _buildFooter() {
    final langColor = _langColor(repo.language);
    return Row(
      children: [
        if (repo.language != null) ...[
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(
              color: langColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            repo.language!,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFFA1A1AA),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
        const Spacer(),
        if (repo.recommendationScore > 0)
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: AppTheme.accent.withOpacity(0.12),
              borderRadius: BorderRadius.circular(7),
            ),
            child: Text(
              '${(repo.recommendationScore * 100).toInt()}% match',
              style: const TextStyle(
                fontSize: 10,
                color: AppTheme.accent,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        // 🔖 Save
        Expanded(
          child: _CardButton(
            icon: Icons.bookmark_rounded,
            label: 'Save',
            color: const Color(0xFF22C55E),
            bgColor: const Color(0xFF166534).withOpacity(0.5),
            onTap: onSave,
          ),
        ),
        const SizedBox(width: 8),
        // 👁 Preview
        Expanded(
          child: _CardButton(
            icon: Icons.article_outlined,
            label: 'Preview',
            color: const Color(0xFF60A5FA),
            bgColor: const Color(0xFF1E3A5F).withOpacity(0.6),
            onTap: onPreview,
          ),
        ),
        const SizedBox(width: 8),
        // GitHub
        Expanded(
          child: _CardButton(
            icon: Icons.open_in_new_rounded,
            label: 'GitHub',
            color: const Color(0xFFA78BFA),
            bgColor: const Color(0xFF2E1065).withOpacity(0.5),
            onTap: () => _openGitHub(),
          ),
        ),
      ],
    );
  }

  void _openGitHub() {
    launchUrl(
      Uri.parse(repo.repoUrl),
      mode: LaunchMode.externalApplication,
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  String _fmt(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
    return '$n';
  }

  /// Returns a badge color based on the badge text content.
  Color _badgeColor(String badge) {
    final b = badge.toLowerCase();
    if (b.contains('actively') || b.contains('well-maint') || b.contains('active')) {
      return const Color(0xFF22C55E); // green
    }
    if (b.contains('community') || b.contains('driven')) {
      return const Color(0xFF14B8A6); // teal
    }
    if (b.contains('needs') || b.contains('maintenance') || b.contains('stale')) {
      return const Color(0xFFEF4444); // red
    }
    if (b.contains('trending') || b.contains('popular')) {
      return const Color(0xFFF59E0B); // amber
    }
    if (b.contains('beginner') || b.contains('friendly') || b.contains('good first')) {
      return const Color(0xFF06B6D4); // cyan
    }
    if (b.contains('production') || b.contains('ready')) {
      return const Color(0xFF8B5CF6); // purple
    }
    if (b.contains('fast') || b.contains('performance')) {
      return const Color(0xFFF97316); // orange
    }
    return AppTheme.accent;
  }

  Color _langColor(String? lang) {
    switch (lang?.toLowerCase()) {
      case 'python':        return const Color(0xFF3572A5);
      case 'javascript':    return const Color(0xFFF1E05A);
      case 'typescript':    return const Color(0xFF2B7489);
      case 'dart':          return const Color(0xFF00B4AB);
      case 'java':          return const Color(0xFFB07219);
      case 'kotlin':        return const Color(0xFFA97BFF);
      case 'swift':         return const Color(0xFFFFAC45);
      case 'rust':          return const Color(0xFFDEA584);
      case 'go':            return const Color(0xFF00ADD8);
      case 'c++':           return const Color(0xFFF34B7D);
      case 'c':             return const Color(0xFF555555);
      case 'ruby':          return const Color(0xFF701516);
      case 'php':           return const Color(0xFF4F5D95);
      case 'shell':         return const Color(0xFF89E051);
      case 'html':          return const Color(0xFFE34C26);
      case 'css':           return const Color(0xFF563D7C);
      default:              return AppTheme.textSecondary;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// In-card action button
// ─────────────────────────────────────────────────────────────────────────────

class _CardButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color bgColor;
  final VoidCallback? onTap;

  const _CardButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.bgColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 42,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withOpacity(0.3),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge tag (colored)
// ─────────────────────────────────────────────────────────────────────────────

class _BadgeTag extends StatelessWidget {
  final String text;
  final Color color;

  const _BadgeTag({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withOpacity(0.35),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            margin: const EdgeInsets.only(right: 5),
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Topic tag (grey, plain)
// ─────────────────────────────────────────────────────────────────────────────

class _TopicTag extends StatelessWidget {
  final String text;

  const _TopicTag({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppTheme.divider,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          color: Color(0xFFA1A1AA),
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Swipe label overlay (SAVE / SKIP)
// ─────────────────────────────────────────────────────────────────────────────

class _SwipeLabel extends StatelessWidget {
  final String text;
  final Color color;
  final double strength;
  final bool rotateLeft;

  const _SwipeLabel({
    required this.text,
    required this.color,
    required this.strength,
    required this.rotateLeft,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: strength.clamp(0.0, 1.0),
      child: Transform.rotate(
        angle: rotateLeft ? -0.35 : 0.35,
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            border: Border.all(color: color, width: 2.5),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            text,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: 3,
            ),
          ),
        ),
      ),
    );
  }
}

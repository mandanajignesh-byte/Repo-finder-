import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:http/http.dart' as http;
import '../models/repository.dart';
import '../services/repo_service.dart';
import '../services/app_supabase_service.dart';
import '../widgets/readme_preview_modal.dart';
import '../widgets/empty_state.dart';
import '../theme/app_theme.dart';

// ─── Category definitions ──────────────────────────────────────────────────
class _Category {
  final String label;
  final String cluster; // empty = "All"
  final IconData icon;
  final Color color;
  const _Category(this.label, this.cluster, this.icon, this.color);
}

const _categories = [
  _Category('All',       '',            Icons.local_fire_department_rounded, Color(0xFFFF6B35)),
  _Category('AI / ML',  'ai-ml',       Icons.psychology_rounded,            Color(0xFF9B59B6)),
  _Category('Frontend', 'frontend',    Icons.web_rounded,                   Color(0xFF0A84FF)),
  _Category('Backend',  'backend',     Icons.dns_rounded,                   Color(0xFF34C759)),
  _Category('Mobile',   'mobile',      Icons.phone_iphone_rounded,          Color(0xFF5AC8FA)),
  _Category('DevOps',   'devops',      Icons.cloud_rounded,                 Color(0xFF00BCD4)),
  _Category('Security', 'security',    Icons.security_rounded,              Color(0xFFFF3B30)),
  _Category('Data',     'data-science',Icons.bar_chart_rounded,             Color(0xFFFFCC00)),
  _Category('Games',    'games',       Icons.sports_esports_rounded,        Color(0xFFFF2D78)),
  _Category('Tools',    'tools',       Icons.construction_rounded,          Color(0xFFFF9500)),
];

// ─── Language colour map ────────────────────────────────────────────────────
Color _langColor(String? lang) {
  switch (lang?.toLowerCase()) {
    case 'dart':       return const Color(0xFF0175C2);
    case 'python':     return const Color(0xFF3572A5);
    case 'javascript': return const Color(0xFFF1E05A);
    case 'typescript': return const Color(0xFF2B7489);
    case 'rust':       return const Color(0xFFDEA584);
    case 'go':         return const Color(0xFF00ADD8);
    case 'java':       return const Color(0xFFB07219);
    case 'kotlin':     return const Color(0xFFA97BFF);
    case 'swift':      return const Color(0xFFFF6B35);
    case 'c++':        return const Color(0xFFF34B7D);
    case 'c':          return const Color(0xFF555555);
    case 'c#':         return const Color(0xFF178600);
    case 'ruby':       return const Color(0xFF701516);
    case 'php':        return const Color(0xFF4F5D95);
    case 'shell':      return const Color(0xFF89E051);
    case 'html':       return const Color(0xFFE34C26);
    case 'css':        return const Color(0xFF563D7C);
    default:           return const Color(0xFF8E8E93);
  }
}

// ─── Screen ────────────────────────────────────────────────────────────────
class TrendingScreen extends StatefulWidget {
  const TrendingScreen({super.key});

  @override
  State<TrendingScreen> createState() => _TrendingScreenState();
}

class _TrendingScreenState extends State<TrendingScreen> {
  List<Repository> _repos = [];
  bool _isLoading = true;
  String? _error;
  int _selectedCategory = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() { _isLoading = true; _error = null; });

    try {
      final repoService = Provider.of<RepoService>(context, listen: false);
      final cluster = _categories[_selectedCategory].cluster;

      List<Repository> repos;
      if (cluster.isEmpty) {
        repos = await repoService.getTrendingRepos(limit: 50);
      } else {
        repos = await repoService.getReposByCluster(
          cluster: cluster, userId: 'trending', limit: 50,
        );
        repos.sort((a, b) => b.trendingScore.compareTo(a.trendingScore));
      }

      if (mounted) setState(() { _repos = repos; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  // ── README fetch (same logic as discovery_screen) ──────────────────────
  Future<void> _showReadme(Repository repo) async {
    String? readme;
    try {
      final rawUrl =
          'https://raw.githubusercontent.com/${repo.fullName}/HEAD/README.md';
      final resp = await http.get(Uri.parse(rawUrl))
          .timeout(const Duration(seconds: 8));
      if (resp.statusCode == 200) readme = resp.body;
    } catch (_) {}

    readme ??= '# ${repo.name}\n\n${repo.description ?? 'No description available.'}';

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ReadmePreviewModal(
        repo: repo,
        readmeContent: readme,
        onSave: () async {
          final supabaseSvc =
              Provider.of<AppSupabaseService>(context, listen: false);
          final userId = await supabaseSvc.getOrCreateUserId();
          if (!mounted) return;
          await Provider.of<RepoService>(context, listen: false)
              .saveRepo(userId, repo);
          if (mounted) {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Saved ${repo.name}'),
                backgroundColor: AppTheme.accent,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            _buildCategoryBar(),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  // ── Header ──────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 8, 0),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Trending',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.5,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Top repos right now',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.textSecondary),
            onPressed: _load,
            tooltip: 'Refresh',
          ),
        ],
      ),
    );
  }

  // ── Category filter bar ──────────────────────────────────────────────────
  Widget _buildCategoryBar() {
    return SizedBox(
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final cat = _categories[i];
          final selected = i == _selectedCategory;
          return GestureDetector(
            onTap: () {
              if (_selectedCategory == i) return;
              HapticFeedback.selectionClick();
              setState(() => _selectedCategory = i);
              _load();
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOut,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: selected
                    ? cat.color.withOpacity(0.18)
                    : AppTheme.surface,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: selected ? cat.color : AppTheme.hairlineBorder,
                  width: selected ? 1.5 : 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    cat.icon,
                    size: 15,
                    color: selected ? cat.color : AppTheme.textSecondary,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    cat.label,
                    style: TextStyle(
                      color: selected ? cat.color : AppTheme.textSecondary,
                      fontSize: 13,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ── Body ──────────────────────────────────────────────────────────────────
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
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, color: AppTheme.textSecondary, size: 48),
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppTheme.textSecondary), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _load,
              style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent, foregroundColor: Colors.white),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    if (_repos.isEmpty) {
      return EmptyState(
        message: 'No trending repos in this category',
        actionLabel: 'Refresh',
        onAction: _load,
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppTheme.accent,
      backgroundColor: AppTheme.surface,
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 8, bottom: 40),
        itemCount: _repos.length,
        addAutomaticKeepAlives: false,
        itemBuilder: (context, index) {
          return RepaintBoundary(
            key: ValueKey(_repos[index].id),
            child: _TrendingRepoCard(
              rank: index + 1,
              repo: _repos[index],
              onPreviewReadme: () => _showReadme(_repos[index]),
            ),
          );
        },
      ),
    );
  }
}

// ─── Trending repo card ────────────────────────────────────────────────────
class _TrendingRepoCard extends StatelessWidget {
  final int rank;
  final Repository repo;
  final VoidCallback onPreviewReadme;

  const _TrendingRepoCard({
    required this.rank,
    required this.repo,
    required this.onPreviewReadme,
  });

  // Pre-computed static consts — avoids Color allocation on every scroll frame
  static const _shadowColor    = Color(0x2E000000); // black.withOpacity(0.18)
  static const _tagBgColor     = Color(0x1A0A84FF); // accent.withOpacity(0.10)
  static const _tagBorderColor = Color(0x400A84FF); // accent.withOpacity(0.25)

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.hairlineBorder, width: 1),
        boxShadow: const [
          BoxShadow(
            color: _shadowColor,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Top row: avatar, name, rank badge ──────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 14, 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildAvatar(),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        repo.ownerLogin,
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        repo.name,
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _buildRankBadge(),
              ],
            ),
          ),

          // ── Description ───────────────────────────────────────────────
          if (repo.description != null && repo.description!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(
                repo.description!,
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 13,
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),

          // ── Topics ───────────────────────────────────────────────────
          if (repo.topics.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: repo.topics.take(4).map((t) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: const BoxDecoration(
                      color: _tagBgColor,
                      borderRadius: BorderRadius.all(Radius.circular(10)),
                      border: Border.fromBorderSide(
                        BorderSide(color: _tagBorderColor, width: 1),
                      ),
                    ),
                    child: Text(
                      t,
                      style: const TextStyle(
                        color: AppTheme.accent,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

          // ── Stats row ─────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
            child: Row(
              children: [
                // Language dot
                if (repo.language != null) ...[
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: _langColor(repo.language),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    repo.language!,
                    style: const TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 14),
                ],
                // Stars
                const Icon(Icons.star_rounded, size: 14, color: Color(0xFFFFCC00)),
                const SizedBox(width: 3),
                Text(
                  _fmt(repo.stars),
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
                const SizedBox(width: 14),
                // Forks
                const Icon(Icons.call_split_rounded, size: 14, color: AppTheme.textSecondary),
                const SizedBox(width: 3),
                Text(
                  _fmt(repo.forks),
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
                const Spacer(),
                // Health grade
                if (repo.cluster.isNotEmpty)
                  _buildHealthChip(),
              ],
            ),
          ),

          // ── Divider + Action buttons ───────────────────────────────────
          const Padding(
            padding: EdgeInsets.only(top: 12),
            child: Divider(color: AppTheme.hairlineBorder, height: 1, thickness: 1),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                // Preview README
                Expanded(
                  child: _ActionButton(
                    icon: Icons.article_outlined,
                    label: 'Preview README',
                    color: AppTheme.textSecondary,
                    onTap: onPreviewReadme,
                  ),
                ),
                Container(width: 1, height: 28, color: AppTheme.hairlineBorder),
                // Open on GitHub
                Expanded(
                  child: _ActionButton(
                    icon: Icons.open_in_new_rounded,
                    label: 'Open GitHub',
                    color: AppTheme.accent,
                    onTap: () => _openGitHub(repo.repoUrl),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar() {
    final avatarUrl = repo.ownerAvatar ?? 'https://github.com/${repo.ownerLogin}.png';
    return ClipOval(
      child: CachedNetworkImage(
        imageUrl: avatarUrl,
        width: 38,
        height: 38,
        fit: BoxFit.cover,
        placeholder: (_, __) => Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [const Color(0x990A84FF), const Color(0xFF5E5CE6)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Center(
            child: Text(
              repo.ownerLogin.isNotEmpty ? repo.ownerLogin[0].toUpperCase() : '?',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16),
            ),
          ),
        ),
        errorWidget: (_, __, ___) => Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [const Color(0x990A84FF), const Color(0xFF5E5CE6)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Center(
            child: Text(
              repo.ownerLogin.isNotEmpty ? repo.ownerLogin[0].toUpperCase() : '?',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRankBadge() {
    if (rank <= 3) {
      return Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: _rankGradient(rank),
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: _rankGradient(rank)[0].withOpacity(0.4),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Center(
          child: Text(
            _rankLabel(rank),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
        ),
      );
    }
    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        color: AppTheme.elevatedSurface,
        shape: BoxShape.circle,
        border: Border.all(color: AppTheme.hairlineBorder, width: 1),
      ),
      child: Center(
        child: Text(
          '$rank',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppTheme.textSecondary,
          ),
        ),
      ),
    );
  }

  // Pre-computed grade chip colors — avoids per-frame withOpacity() allocation
  static const _gradeA = (Color(0xFF34C759), Color(0x1F34C759), Color(0x5934C759));
  static const _gradeB = (Color(0xFF30D158), Color(0x1F30D158), Color(0x5930D158));
  static const _gradeC = (Color(0xFFFFCC00), Color(0x1FFFFF00), Color(0x59FFCC00));
  static const _gradeD = (Color(0xFFFF3B30), Color(0x1FFF3B30), Color(0x59FF3B30));

  Widget _buildHealthChip() {
    final score = (repo.recommendationScore * 100).toInt();
    final (Color chipColor, Color bgColor, Color borderColor);
    String grade;
    if (score >= 80)      { grade = 'A'; (chipColor, bgColor, borderColor) = _gradeA; }
    else if (score >= 60) { grade = 'B'; (chipColor, bgColor, borderColor) = _gradeB; }
    else if (score >= 40) { grade = 'C'; (chipColor, bgColor, borderColor) = _gradeC; }
    else                  { grade = 'D'; (chipColor, bgColor, borderColor) = _gradeD; }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Text(
        grade,
        style: TextStyle(color: chipColor, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }

  List<Color> _rankGradient(int rank) {
    switch (rank) {
      case 1: return [const Color(0xFFFFD700), const Color(0xFFFF8C00)];
      case 2: return [const Color(0xFFB0BEC5), const Color(0xFF78909C)];
      case 3: return [const Color(0xFFCD7F32), const Color(0xFF8B4513)];
      default: return [AppTheme.elevatedSurface, AppTheme.elevatedSurface];
    }
  }

  String _rankLabel(int rank) {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '$rank';
    }
  }

  String _fmt(int n) {
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
    return '$n';
  }

  Future<void> _openGitHub(String url) async {
    final uri = Uri.parse(url.isNotEmpty ? url : 'https://github.com/${repo.fullName}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

// ─── Small action button ──────────────────────────────────────────────────
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/repository.dart';
import '../services/repo_service.dart';
import '../services/app_supabase_service.dart';
import '../widgets/empty_state.dart';
import '../theme/app_theme.dart';

class SavedScreen extends StatefulWidget {
  const SavedScreen({super.key});

  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  List<Repository> _savedRepos = [];
  bool _isLoading = true;
  String _filter = 'all'; // 'all' | language name

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSavedRepos());
  }

  Future<void> _loadSavedRepos() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final supabaseService =
          Provider.of<AppSupabaseService>(context, listen: false);
      final repoService = Provider.of<RepoService>(context, listen: false);
      final userId = await supabaseService.getOrCreateUserId();
      await repoService.loadSavedRepos(userId);

      if (mounted) {
        setState(() {
          _savedRepos = repoService.savedRepos;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Repository> get _filtered {
    if (_filter == 'all') return _savedRepos;
    return _savedRepos
        .where((r) => (r.language ?? '').toLowerCase() == _filter)
        .toList();
  }

  List<String> get _languages {
    final langs = _savedRepos
        .map((r) => r.language)
        .whereType<String>()
        .toSet()
        .toList()
      ..sort();
    return langs;
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
            if (!_isLoading && _savedRepos.isNotEmpty) _buildFilterBar(),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Saved',
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
                      ? 'Loading…'
                      : '${_savedRepos.length} repos saved',
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          if (!_isLoading && _savedRepos.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.refresh_rounded,
                  color: AppTheme.textSecondary),
              onPressed: _loadSavedRepos,
            ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    final langs = _languages;
    if (langs.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        children: [
          _filterChip('All', 'all'),
          ...langs.map((lang) => _filterChip(lang, lang.toLowerCase())),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String value) {
    final selected = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() => _filter = value);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
          decoration: BoxDecoration(
            color: selected ? AppTheme.accent : AppTheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? AppTheme.accent : AppTheme.hairlineBorder,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : AppTheme.textSecondary,
              fontSize: 13,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
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

    if (_savedRepos.isEmpty) {
      return EmptyState(
        message: 'Nothing saved yet\nSwipe right or tap Save on repos you like!',
        actionLabel: 'Refresh',
        onAction: _loadSavedRepos,
      );
    }

    final repos = _filtered;
    if (repos.isEmpty) {
      return Center(
        child: Text(
          'No $_filter repos saved',
          style: const TextStyle(color: AppTheme.textSecondary),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadSavedRepos,
      color: AppTheme.accent,
      backgroundColor: AppTheme.surface,
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 8, bottom: 40),
        itemCount: repos.length,
        itemBuilder: (context, index) => _SavedRepoCard(repo: repos[index]),
      ),
    );
  }
}

// ─── Saved repo card ──────────────────────────────────────────────────────
class _SavedRepoCard extends StatelessWidget {
  final Repository repo;
  const _SavedRepoCard({required this.repo});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.hairlineBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ───────────────────────────────────────────────────
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
                      const SizedBox(height: 3),
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
                // Saved bookmark indicator
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.bookmark_rounded,
                    color: AppTheme.accent,
                    size: 16,
                  ),
                ),
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

          // ── Topics ────────────────────────────────────────────────────
          if (repo.topics.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: repo.topics.take(4).map((t) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.elevatedSurface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.hairlineBorder),
                    ),
                    child: Text(
                      '#$t',
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 11,
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
                if (repo.language != null) ...[
                  Container(
                    width: 9,
                    height: 9,
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
                const Icon(Icons.star_rounded, size: 13, color: Color(0xFFFFCC00)),
                const SizedBox(width: 3),
                Text(
                  _fmt(repo.stars),
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
                const Spacer(),
                Text(
                  repo.timeAgo,
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                ),
              ],
            ),
          ),

          // ── Action buttons ────────────────────────────────────────────
          const Padding(
            padding: EdgeInsets.only(top: 12),
            child: Divider(color: AppTheme.hairlineBorder, height: 1),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                // Open on GitHub
                Expanded(
                  child: _ActionBtn(
                    icon: Icons.open_in_new_rounded,
                    label: 'Open GitHub',
                    color: AppTheme.accent,
                    onTap: () => _openGitHub(repo),
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
    final url = repo.ownerAvatar ??
        'https://github.com/${repo.ownerLogin}.png';
    return ClipOval(
      child: CachedNetworkImage(
        imageUrl: url,
        width: 36,
        height: 36,
        fit: BoxFit.cover,
        placeholder: (_, __) => _avatarFallback(),
        errorWidget: (_, __, ___) => _avatarFallback(),
      ),
    );
  }

  Widget _avatarFallback() {
    final initial =
        repo.ownerLogin.isNotEmpty ? repo.ownerLogin[0].toUpperCase() : '?';
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.accent.withValues(alpha: 0.7),
            const Color(0xFF5E5CE6),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
        ),
      ),
    );
  }

  Future<void> _openGitHub(Repository repo) async {
    final url = repo.repoUrl.isNotEmpty
        ? repo.repoUrl
        : 'https://github.com/${repo.fullName}';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  String _fmt(int n) =>
      n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';

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
      case 'shell':      return const Color(0xFF89E051);
      case 'html':       return const Color(0xFFE34C26);
      default:           return const Color(0xFF8E8E93);
    }
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionBtn({
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

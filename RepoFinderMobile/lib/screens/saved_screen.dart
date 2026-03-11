import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/repository.dart';
import '../services/repo_service.dart';
import '../services/app_supabase_service.dart';
import '../theme/app_theme.dart';

class SavedScreen extends StatefulWidget {
  const SavedScreen({super.key});

  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  List<Repository> _savedRepos = [];
  bool _isLoading = true;
  String _filter = 'All';
  List<String> _languages = ['All'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final supabase =
          context.read<AppSupabaseService>();
      final repoService = context.read<RepoService>();
      final userId = await supabase.getOrCreateUserId();
      await repoService.loadSavedRepos(userId);
      if (mounted) {
        final repos = repoService.savedRepos;
        final langs = repos
            .map((r) => r.language ?? 'Other')
            .toSet()
            .toList()
          ..sort();
        setState(() {
          _savedRepos = repos;
          _languages = ['All', ...langs];
          _filter = 'All';
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Repository> get _filtered => _filter == 'All'
      ? _savedRepos
      : _savedRepos
          .where((r) => (r.language ?? 'Other') == _filter)
          .toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            if (!_isLoading && _savedRepos.isNotEmpty)
              _buildLanguageFilter(),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 8),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Saved',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                _isLoading
                    ? 'Loading…'
                    : '${_savedRepos.length} repositories',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const Spacer(),
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded, color: Colors.white38),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageFilter() {
    if (_languages.length <= 1) return const SizedBox.shrink();
    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        itemCount: _languages.length,
        itemBuilder: (context, i) {
          final lang = _languages[i];
          final active = _filter == lang;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _filter = lang),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: active
                      ? AppTheme.accent.withOpacity(0.18)
                      : const Color(0xFF141416),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: active
                        ? AppTheme.accent.withOpacity(0.5)
                        : Colors.white.withOpacity(0.07),
                    width: active ? 1.2 : 0.7,
                  ),
                ),
                child: Text(
                  lang,
                  style: TextStyle(
                    color: active ? AppTheme.accent : Colors.white54,
                    fontSize: 12,
                    fontWeight:
                        active ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
            ),
          );
        },
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
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppTheme.accent.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.bookmark_outline_rounded,
                  size: 36, color: AppTheme.accent),
            ),
            const SizedBox(height: 18),
            const Text(
              'No saved repos yet',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Swipe right or tap Save on any card\nto bookmark repos here.',
              style: TextStyle(
                color: Color(0xFF6B7280),
                fontSize: 13,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    final repos = _filtered;
    if (repos.isEmpty) {
      return Center(
        child: Text(
          'No $_filter repos saved',
          style: const TextStyle(color: Colors.white54),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppTheme.accent,
      backgroundColor: const Color(0xFF1C1C1E),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: repos.length,
        itemBuilder: (context, index) =>
            _SavedCard(repo: repos[index]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _SavedCard extends StatelessWidget {
  final Repository repo;

  const _SavedCard({required this.repo});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF111218),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.06),
          width: 0.7,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                ClipOval(
                  child: Image.network(
                    repo.ownerAvatar ??
                        'https://github.com/${repo.ownerLogin}.png',
                    width: 32,
                    height: 32,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 32,
                      height: 32,
                      color: AppTheme.divider,
                      child: const Icon(Icons.person_outline,
                          color: AppTheme.textSecondary, size: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        repo.fullName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        repo.ownerLogin,
                        style: const TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                // GitHub button
                GestureDetector(
                  onTap: () => launchUrl(
                    Uri.parse(repo.repoUrl),
                    mode: LaunchMode.externalApplication,
                  ),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2E1065).withOpacity(0.5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: const Color(0xFFA78BFA).withOpacity(0.3),
                        width: 0.8,
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.open_in_new_rounded,
                            size: 12, color: Color(0xFFA78BFA)),
                        SizedBox(width: 4),
                        Text(
                          'GitHub',
                          style: TextStyle(
                            color: Color(0xFFA78BFA),
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Description
            if (repo.description != null &&
                repo.description!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                repo.description!,
                style: const TextStyle(
                  color: Color(0xFF8B8B99),
                  fontSize: 13,
                  height: 1.45,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            const SizedBox(height: 12),

            // Stats
            Row(
              children: [
                const Icon(Icons.star_rounded,
                    size: 13, color: Color(0xFFF59E0B)),
                const SizedBox(width: 3),
                Text(
                  _fmt(repo.stars),
                  style: const TextStyle(
                    color: Color(0xFFF59E0B),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 14),
                const Icon(Icons.call_split_outlined,
                    size: 12, color: Color(0xFF6B7280)),
                const SizedBox(width: 3),
                Text(
                  _fmt(repo.forks),
                  style: const TextStyle(
                      color: Color(0xFF6B7280), fontSize: 12),
                ),
                if (repo.language != null) ...[
                  const SizedBox(width: 14),
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: _langColor(repo.language),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    repo.language!,
                    style: const TextStyle(
                        color: Color(0xFF6B7280), fontSize: 12),
                  ),
                ],
                const Spacer(),
                if (repo.topics.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.divider,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      repo.topics.first,
                      style: const TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
    return '$n';
  }

  Color _langColor(String? lang) {
    switch (lang?.toLowerCase()) {
      case 'python':     return const Color(0xFF3572A5);
      case 'javascript': return const Color(0xFFF1E05A);
      case 'typescript': return const Color(0xFF2B7489);
      case 'dart':       return const Color(0xFF00B4AB);
      case 'java':       return const Color(0xFFB07219);
      case 'kotlin':     return const Color(0xFFA97BFF);
      case 'swift':      return const Color(0xFFFFAC45);
      case 'rust':       return const Color(0xFFDEA584);
      case 'go':         return const Color(0xFF00ADD8);
      case 'c++':        return const Color(0xFFF34B7D);
      default:           return const Color(0xFF6B7280);
    }
  }
}

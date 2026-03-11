import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/repository.dart';
import '../services/repo_service.dart';
import '../theme/app_theme.dart';

class TrendingScreen extends StatefulWidget {
  const TrendingScreen({super.key});

  @override
  State<TrendingScreen> createState() => _TrendingScreenState();
}

class _TrendingScreenState extends State<TrendingScreen> {
  List<Repository> _repos = [];
  List<Repository> _filtered = [];
  bool _isLoading = true;
  String? _error;
  String _period = 'daily';
  String _selectedCategory = 'All';
  List<String> _categories = ['All'];

  static const _periods = [
    {'id': 'daily', 'label': 'Today'},
    {'id': 'weekly', 'label': 'This Week'},
    {'id': 'monthly', 'label': 'Month'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final repoService = context.read<RepoService>();
      final repos = await repoService.getTrendingRepos(
        limit: 50,
        period: _period,
      );
      if (mounted) {
        final rawCats = repos.map((r) => r.cluster).toSet().toList()..sort();
        final cats = rawCats.map(_catLabel).where((c) => c.isNotEmpty).toSet().toList();
        setState(() {
          _repos = repos;
          _categories = ['All', ...cats];
          _selectedCategory = 'All';
          _filtered = repos;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _setPeriod(String period) {
    if (_period == period) return;
    setState(() => _period = period);
    _load();
  }

  void _setCategory(String category) {
    setState(() {
      _selectedCategory = category;
      _filtered = category == 'All'
          ? _repos
          : _repos.where((r) => _catLabel(r.cluster) == category).toList();
    });
  }

  String _catLabel(String cluster) {
    switch (cluster) {
      case 'ai_ml':         return 'AI / ML';
      case 'web_dev':       return 'Web';
      case 'mobile':        return 'Mobile';
      case 'devops':        return 'DevOps';
      case 'data_science':  return 'Data';
      case 'cybersecurity': return 'Security';
      case 'game_dev':      return 'Games';
      case 'blockchain':    return 'Web3';
      case 'automation':    return 'Automation';
      case 'open_source':   return 'Open Source';
      case 'database':      return 'Database';
      case 'general':       return '';        // skip
      default:
        final s = cluster.replaceAll('_', ' ');
        return s.isNotEmpty ? '${s[0].toUpperCase()}${s.substring(1)}' : '';
    }
  }

  Color _catColor(String label) {
    switch (label) {
      case 'AI / ML':     return const Color(0xFF8B5CF6);
      case 'Web':         return const Color(0xFF60A5FA);
      case 'Mobile':      return const Color(0xFF34D399);
      case 'DevOps':      return const Color(0xFFF59E0B);
      case 'Data':        return const Color(0xFF06B6D4);
      case 'Security':    return const Color(0xFFEF4444);
      case 'Games':       return const Color(0xFFF97316);
      case 'Web3':        return const Color(0xFFA78BFA);
      case 'Automation':  return const Color(0xFF4ADE80);
      case 'Database':    return const Color(0xFFFBBF24);
      default:            return AppTheme.accent;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            _buildPeriodTabs(),
            if (_categories.length > 1) _buildCategoryChips(),
            const SizedBox(height: 4),
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
                'Trending',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                'Most-starred repos right now',
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

  Widget _buildPeriodTabs() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: _periods.map((p) {
          final active = _period == p['id'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => _setPeriod(p['id']!),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: active ? AppTheme.accent : const Color(0xFF1C1C1E),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: active
                        ? AppTheme.accent
                        : Colors.white.withOpacity(0.08),
                    width: 1,
                  ),
                ),
                child: Text(
                  p['label']!,
                  style: TextStyle(
                    color: active ? Colors.white : Colors.white54,
                    fontSize: 13,
                    fontWeight:
                        active ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildCategoryChips() {
    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        itemCount: _categories.length,
        itemBuilder: (context, i) {
          final cat = _categories[i];
          final active = _selectedCategory == cat;
          final color = cat == 'All' ? AppTheme.accent : _catColor(cat);
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => _setCategory(cat),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: active
                      ? color.withOpacity(0.18)
                      : const Color(0xFF141416),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: active ? color.withOpacity(0.5) : Colors.white.withOpacity(0.07),
                    width: active ? 1.2 : 0.7,
                  ),
                ),
                child: Text(
                  cat,
                  style: TextStyle(
                    color: active ? color : Colors.white54,
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
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 48, color: Colors.redAccent),
            const SizedBox(height: 12),
            Text(_error!,
                style: const TextStyle(color: Colors.white54, fontSize: 13),
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _load,
              style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: Colors.white),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    if (_filtered.isEmpty) {
      return const Center(
        child: Text('No repos found.',
            style: TextStyle(color: Colors.white54)),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppTheme.accent,
      backgroundColor: const Color(0xFF1C1C1E),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        itemCount: _filtered.length,
        itemBuilder: (context, index) =>
            _TrendingCard(repo: _filtered[index], rank: index + 1),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trending card widget
// ─────────────────────────────────────────────────────────────────────────────

class _TrendingCard extends StatelessWidget {
  final Repository repo;
  final int rank;

  const _TrendingCard({required this.repo, required this.rank});

  @override
  Widget build(BuildContext context) {
    final isTop3 = rank <= 3;
    final rankColor = rank == 1
        ? const Color(0xFFFFD700)
        : rank == 2
            ? const Color(0xFFC0C0C0)
            : rank == 3
                ? const Color(0xFFCD7F32)
                : Colors.white24;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF111218),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isTop3
              ? rankColor.withOpacity(0.25)
              : Colors.white.withOpacity(0.05),
          width: isTop3 ? 1.2 : 0.7,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => launchUrl(
          Uri.parse(repo.repoUrl),
          mode: LaunchMode.externalApplication,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Rank
              SizedBox(
                width: 32,
                child: Text(
                  '#$rank',
                  style: TextStyle(
                    color: rankColor,
                    fontSize: isTop3 ? 18 : 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Owner + name
                    Row(
                      children: [
                        _OwnerAvatar(url: repo.ownerAvatar, login: repo.ownerLogin, size: 22),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            repo.fullName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    if (repo.description != null &&
                        repo.description!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        repo.description!,
                        style: const TextStyle(
                          color: Color(0xFF8B8B99),
                          fontSize: 12.5,
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 10),

                    // Stats row
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
                            width: 8,
                            height: 8,
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
                        // Trending score badge
                        if (repo.trendingScore > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF22C55E).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.trending_up_rounded,
                                    size: 10, color: Color(0xFF22C55E)),
                                const SizedBox(width: 3),
                                Text(
                                  '${(repo.trendingScore * 100).toInt()}',
                                  style: const TextStyle(
                                    color: Color(0xFF22C55E),
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
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
      case 'ruby':       return const Color(0xFF701516);
      case 'shell':      return const Color(0xFF89E051);
      case 'html':       return const Color(0xFFE34C26);
      default:           return const Color(0xFF6B7280);
    }
  }
}

class _OwnerAvatar extends StatelessWidget {
  final String? url;
  final String login;
  final double size;

  const _OwnerAvatar({this.url, required this.login, required this.size});

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: Image.network(
        url ?? 'https://github.com/$login.png',
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          width: size,
          height: size,
          color: AppTheme.divider,
          child: const Icon(Icons.person_outline,
              color: AppTheme.textSecondary, size: 12),
        ),
      ),
    );
  }
}

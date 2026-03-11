import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/repository.dart';
import '../services/repo_service.dart';
import '../widgets/premium_repo_card.dart';
import '../widgets/empty_state.dart';
import '../theme/app_theme.dart';

// Category chips for trending
const _categories = [
  ('🔥 All',        ''),
  ('🤖 AI / ML',    'ai-ml'),
  ('🌐 Frontend',   'frontend'),
  ('⚙️ Backend',    'backend'),
  ('📱 Mobile',     'mobile'),
  ('☁️ DevOps',     'devops'),
  ('🔒 Security',   'security'),
  ('📊 Data',       'data-science'),
  ('🎮 Games',      'games'),
  ('🛠 Tools',      'tools'),
];

class TrendingScreen extends StatefulWidget {
  const TrendingScreen({super.key});

  @override
  State<TrendingScreen> createState() => _TrendingScreenState();
}

class _TrendingScreenState extends State<TrendingScreen> {
  List<Repository> _repos = [];
  bool _isLoading = true;
  String? _error;
  int _selectedCategory = 0; // index into _categories

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
      final cluster = _categories[_selectedCategory].$2;

      List<Repository> repos;
      if (cluster.isEmpty) {
        repos = await repoService.getTrendingRepos(limit: 50);
      } else {
        repos = await repoService.getReposByCluster(
          cluster: cluster,
          userId: 'trending',
          limit: 50,
        );
        // Sort by trending score descending
        repos.sort((a, b) => b.trendingScore.compareTo(a.trendingScore));
      }

      if (mounted) setState(() { _repos = repos; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _isLoading = false; });
    }
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

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 0),
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
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.textSecondary),
            onPressed: _load,
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryBar() {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final selected = i == _selectedCategory;
          return GestureDetector(
            onTap: () {
              if (_selectedCategory == i) return;
              setState(() => _selectedCategory = i);
              _load();
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: selected ? AppTheme.accent : AppTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: selected
                      ? AppTheme.accent
                      : AppTheme.hairlineBorder,
                  width: 1,
                ),
              ),
              child: Text(
                _categories[i].$1,
                style: TextStyle(
                  color: selected ? Colors.white : AppTheme.textSecondary,
                  fontSize: 13,
                  fontWeight:
                      selected ? FontWeight.w600 : FontWeight.w400,
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
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded,
                color: AppTheme.textSecondary, size: 48),
            const SizedBox(height: 16),
            Text(_error!,
                style: const TextStyle(color: AppTheme.textSecondary),
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _load,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: Colors.white,
              ),
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
        padding: const EdgeInsets.only(top: 4, bottom: 32),
        itemCount: _repos.length,
        itemBuilder: (context, index) {
          final repo = _repos[index];
          return _TrendingRepoTile(
            rank: index + 1,
            repo: repo,
          );
        },
      ),
    );
  }
}

/// A trending repo tile with rank badge and premium card inside
class _TrendingRepoTile extends StatelessWidget {
  final int rank;
  final Repository repo;

  const _TrendingRepoTile({required this.rank, required this.repo});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        PremiumRepoCard(repo: repo),
        // Rank badge
        Positioned(
          top: 16,
          right: 28,
          child: Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: rank <= 3
                  ? _rankColor(rank)
                  : AppTheme.elevatedSurface,
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.hairlineBorder, width: 1),
            ),
            child: Center(
              child: Text(
                rank <= 3 ? _rankEmoji(rank) : '$rank',
                style: TextStyle(
                  fontSize: rank <= 3 ? 14 : 11,
                  fontWeight: FontWeight.w700,
                  color: rank <= 3 ? Colors.white : AppTheme.textSecondary,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Color _rankColor(int rank) {
    switch (rank) {
      case 1: return const Color(0xFFFFD700); // gold
      case 2: return const Color(0xFF9E9E9E); // silver
      case 3: return const Color(0xFFCD7F32); // bronze
      default: return AppTheme.elevatedSurface;
    }
  }

  String _rankEmoji(int rank) {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '$rank';
    }
  }
}

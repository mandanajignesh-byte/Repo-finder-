import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/repository.dart';
import '../services/repo_service.dart';
import '../services/app_supabase_service.dart';
import '../widgets/premium_repo_card.dart';
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
        onTap: () => setState(() => _filter = value),
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
        message: 'Nothing saved yet\nSwipe right on repos you like!',
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
        padding: const EdgeInsets.only(top: 4, bottom: 32),
        itemCount: repos.length,
        itemBuilder: (context, index) => PremiumRepoCard(repo: repos[index]),
      ),
    );
  }
}

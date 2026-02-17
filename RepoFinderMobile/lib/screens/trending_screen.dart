import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/repository.dart';
import '../services/repo_service.dart';
import '../widgets/repo_card.dart';
import '../widgets/empty_state.dart';

class TrendingScreen extends StatefulWidget {
  const TrendingScreen({super.key});

  @override
  State<TrendingScreen> createState() => _TrendingScreenState();
}

class _TrendingScreenState extends State<TrendingScreen> {
  List<Repository> _repos = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Delay loading until after first frame to avoid build phase issues
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTrending();
    });
  }

  Future<void> _loadTrending() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repoService = Provider.of<RepoService>(context, listen: false);
      final repos = await repoService.getTrendingRepos(limit: 50);

      if (mounted) {
        setState(() {
          _repos = repos;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text(
          'Trending',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.black,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadTrending,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Error: $_error',
                        style: const TextStyle(color: Colors.red),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadTrending,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _repos.isEmpty
                  ? EmptyState(
                      message: 'No trending repos found',
                      actionLabel: 'Refresh',
                      onAction: _loadTrending,
                    )
                  : RefreshIndicator(
                      onRefresh: _loadTrending,
                      color: Colors.white,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _repos.length,
                        itemBuilder: (context, index) {
                          final repo = _repos[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: RepoCard(
                              repo: repo,
                              onLike: () {
                                // Handle like
                              },
                              onSave: () {
                                // Handle save
                              },
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

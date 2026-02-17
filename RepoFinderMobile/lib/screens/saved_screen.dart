import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/repository.dart';
import '../services/repo_service.dart';
import '../services/app_supabase_service.dart';
import '../widgets/repo_card.dart';
import '../widgets/empty_state.dart';

class SavedScreen extends StatefulWidget {
  const SavedScreen({super.key});

  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  List<Repository> _savedRepos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSavedRepos();
  }

  Future<void> _loadSavedRepos() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final supabaseService = Provider.of<AppSupabaseService>(context, listen: false);
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
      if (mounted) {
        setState(() {
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
          'Saved Repos',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.black,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : _savedRepos.isEmpty
              ? EmptyState(
                  message: 'No saved repos yet\nStart swiping and save repos you like!',
                )
              : RefreshIndicator(
                  onRefresh: _loadSavedRepos,
                  color: Colors.white,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _savedRepos.length,
                    itemBuilder: (context, index) {
                      final repo = _savedRepos[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: RepoCard(
                          repo: repo,
                          onSave: () {
                            // Already saved
                          },
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

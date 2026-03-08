import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/github_service.dart';
import '../services/app_supabase_service.dart';

/// GitHub connection card shown on the profile screen.
/// Shows connect button when disconnected, and GitHub profile + starred repos when connected.
class GitHubConnectCard extends StatefulWidget {
  const GitHubConnectCard({super.key});

  @override
  State<GitHubConnectCard> createState() => _GitHubConnectCardState();
}

class _GitHubConnectCardState extends State<GitHubConnectCard> {
  List<StarredRepo> _starredRepos = [];
  bool _reposLoading = false;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _showDisconnectConfirm = false;

  static const _bg = Color(0xFF161B22);
  static const _border = Color(0xFF30363D);
  static const _textPrimary = Color(0xFFE6EDF3);
  static const _textSecondary = Color(0xFF8B949E);
  static const _blue = Color(0xFF2563EB);
  static const _gold = Color(0xFFE3B341);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  Future<void> _init() async {
    if (!mounted) return;
    final github = Provider.of<GitHubService>(context, listen: false);
    final supabaseService =
        Provider.of<AppSupabaseService>(context, listen: false);
    final userId = await supabaseService.getOrCreateUserId();
    if (!mounted) return;
    await github.loadConnection(userId);
    if (!mounted) return;
    if (github.isConnected) {
      await _loadStarred();
    }
  }

  Future<void> _loadStarred() async {
    if (!mounted) return;
    final github = Provider.of<GitHubService>(context, listen: false);
    final supabaseService =
        Provider.of<AppSupabaseService>(context, listen: false);
    final userId = await supabaseService.getOrCreateUserId();
    if (!mounted) return;
    setState(() => _reposLoading = true);
    final repos = await github.getStarredRepos(
      userId,
      limit: 40,
      search: _searchQuery.isEmpty ? null : _searchQuery,
    );
    if (mounted) setState(() { _starredRepos = repos; _reposLoading = false; });
  }

  Future<void> _connect() async {
    final github = Provider.of<GitHubService>(context, listen: false);
    final supabaseService =
        Provider.of<AppSupabaseService>(context, listen: false);
    final userId = await supabaseService.getOrCreateUserId();
    await github.connectGitHub(userId);
  }

  Future<void> _disconnect() async {
    final github = Provider.of<GitHubService>(context, listen: false);
    final supabaseService =
        Provider.of<AppSupabaseService>(context, listen: false);
    final userId = await supabaseService.getOrCreateUserId();
    await github.disconnect(userId);
    if (mounted) setState(() { _starredRepos = []; _showDisconnectConfirm = false; });
  }

  Future<void> _resync() async {
    if (!mounted) return;
    final github = Provider.of<GitHubService>(context, listen: false);
    final supabaseService =
        Provider.of<AppSupabaseService>(context, listen: false);
    final userId = await supabaseService.getOrCreateUserId();
    if (!mounted) return;
    await github.syncStarredRepos(userId);
    if (!mounted) return;
    await _loadStarred();
  }

  String _fmtCount(int n) => n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';

  String _timeAgo(DateTime? dt) {
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inDays > 30) return '${(diff.inDays / 30).floor()}mo ago';
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    return '${diff.inMinutes}m ago';
  }

  Color _langColor(String? lang) {
    const colors = {
      'JavaScript': Color(0xFFF1E05A),
      'TypeScript': Color(0xFF3178C6),
      'Python': Color(0xFF3572A5),
      'Java': Color(0xFFB07219),
      'Go': Color(0xFF00ADD8),
      'Rust': Color(0xFFDEA584),
      'C++': Color(0xFFF34B7D),
      'C#': Color(0xFF178600),
      'Ruby': Color(0xFF701516),
      'PHP': Color(0xFF4F5D95),
      'Swift': Color(0xFFF05138),
      'Kotlin': Color(0xFFA97BFF),
      'Dart': Color(0xFF00B4AB),
      'Shell': Color(0xFF89E051),
      'CSS': Color(0xFF563D7C),
      'HTML': Color(0xFFE34C26),
      'Vue': Color(0xFF41B883),
      'Svelte': Color(0xFFFF3E00),
    };
    return colors[lang] ?? _textSecondary;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<GitHubService>(
      builder: (context, github, _) {
        if (github.loading && !github.isConnected) {
          return Container(
            height: 80,
            decoration: BoxDecoration(
              color: _bg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _border),
            ),
          );
        }

        if (!github.isConnected) {
          return _buildConnectCard(github);
        }

        return Column(
          children: [
            _buildConnectedCard(github),
            if (github.connection!.starredReposCount > 0) ...[
              const SizedBox(height: 12),
              _buildStarredReposSection(github),
            ],
          ],
        );
      },
    );
  }

  // ── Not connected card ──────────────────────────────────────────────────

  Widget _buildConnectCard(GitHubService github) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFF0D1117),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _border),
                ),
                child: const Center(child: _GitHubIcon(size: 20)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Connect GitHub Account',
                        style: TextStyle(
                            color: _textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600)),
                    SizedBox(height: 2),
                    Text('Sync starred repos & improve recommendations',
                        style: TextStyle(color: _textSecondary, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Benefits
          ...[
            ['⭐', 'Sync all your GitHub starred repos'],
            ['🔍', 'Browse your stars right inside the app'],
            ['🤖', 'AI uses your stars to improve recommendations'],
          ].map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Text(item[0], style: const TextStyle(fontSize: 14)),
                    const SizedBox(width: 8),
                    Text(item[1],
                        style: const TextStyle(
                            color: _textSecondary, fontSize: 12)),
                  ],
                ),
              )),

          if (github.error != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0x1AEF4444),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0x33EF4444)),
              ),
              child: Text(github.error!,
                  style: const TextStyle(color: Color(0xFFF87171), fontSize: 12)),
            ),
          ],

          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: GestureDetector(
              onTap: _connect,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF238636),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF2EA043)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    _GitHubIcon(size: 16, color: Colors.white),
                    SizedBox(width: 8),
                    Text('Connect with GitHub',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Connected card ──────────────────────────────────────────────────────

  Widget _buildConnectedCard(GitHubService github) {
    final conn = github.connection!;

    return Stack(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: _bg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _border),
          ),
          child: Column(
            children: [
              // Profile row
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Image.network(
                      conn.githubAvatarUrl,
                      width: 48, height: 48,
                      errorBuilder: (_, __, ___) => Container(
                        width: 48, height: 48,
                        color: const Color(0xFF21262D),
                        child: const Icon(Icons.person, color: _textSecondary),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                conn.githubName ?? conn.githubLogin,
                                style: const TextStyle(
                                    color: _textPrimary,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0x1F22C55E),
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(
                                    color: const Color(0x4022C55E)),
                              ),
                              child: const Text('Connected',
                                  style: TextStyle(
                                      color: Color(0xFF4ADE80),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text('@${conn.githubLogin}',
                            style: const TextStyle(
                                color: _textSecondary, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Stats row
              Row(
                children: [
                  const Icon(Icons.star_rounded, color: _gold, size: 16),
                  const SizedBox(width: 4),
                  Text(_fmtCount(conn.starredReposCount),
                      style: const TextStyle(
                          color: _textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(width: 4),
                  const Text('starred repos',
                      style: TextStyle(color: _textSecondary, fontSize: 12)),
                  if (conn.lastSyncedAt != null) ...[
                    const Spacer(),
                    Text('Synced ${_timeAgo(conn.lastSyncedAt)}',
                        style: const TextStyle(
                            color: _textSecondary, fontSize: 11)),
                  ],
                ],
              ),

              // Sync progress bar
              if (github.syncing) ...[
                const SizedBox(height: 12),
                Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Syncing${github.syncTotal > 0 ? ' ${github.syncProgress} / ${github.syncTotal}' : ' ${github.syncProgress}'} repos…',
                          style: const TextStyle(
                              color: _textSecondary, fontSize: 12),
                        ),
                        if (github.syncTotal > 0)
                          Text(
                            '${((github.syncProgress / github.syncTotal) * 100).round()}%',
                            style: const TextStyle(
                                color: Color(0xFF60A5FA), fontSize: 12),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: github.syncTotal > 0
                            ? github.syncProgress / github.syncTotal
                            : null,
                        backgroundColor: const Color(0xFF21262D),
                        valueColor:
                            const AlwaysStoppedAnimation<Color>(_blue),
                        minHeight: 3,
                      ),
                    ),
                  ],
                ),
              ],

              // Re-sync button
              if (!github.syncing) ...[
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _resync,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D1117),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.sync_rounded,
                            color: _textSecondary, size: 16),
                        SizedBox(width: 6),
                        Text('Re-sync starred repos',
                            style: TextStyle(
                                color: _textSecondary, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
              ],

              if (github.error != null) ...[
                const SizedBox(height: 8),
                Text(github.error!,
                    style: const TextStyle(
                        color: Color(0xFFF87171), fontSize: 12)),
              ],
            ],
          ),
        ),

        // Disconnect button (top-right)
        Positioned(
          top: 16, right: 16,
          child: GestureDetector(
            onTap: () => setState(() => _showDisconnectConfirm = true),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFF0D1117),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _border),
              ),
              child: const Text('Disconnect',
                  style: TextStyle(color: _textSecondary, fontSize: 12)),
            ),
          ),
        ),

        // Disconnect confirm overlay
        if (_showDisconnectConfirm)
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xE6161B22),
                borderRadius: BorderRadius.circular(16),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Disconnect GitHub?',
                      style: TextStyle(
                          color: _textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  const Text(
                    'This will remove your GitHub connection and delete all synced starred repos.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: _textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () =>
                              setState(() => _showDisconnectConfirm = false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0D1117),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: _border),
                            ),
                            child: const Text('Cancel',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    color: _textPrimary, fontSize: 13)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: GestureDetector(
                          onTap: _disconnect,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0x1AEF4444),
                              borderRadius: BorderRadius.circular(12),
                              border:
                                  Border.all(color: const Color(0x4DEF4444)),
                            ),
                            child: const Text('Disconnect',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    color: Color(0xFFF87171), fontSize: 13,
                                    fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  // ── Starred repos section ───────────────────────────────────────────────

  Widget _buildStarredReposSection(GitHubService github) {
    final conn = github.connection!;

    return Container(
      decoration: BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(Icons.star_rounded, color: _gold, size: 18),
                    const SizedBox(width: 8),
                    const Text('Starred Repos',
                        style: TextStyle(
                            color: _textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF21262D),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(_fmtCount(conn.starredReposCount),
                          style: const TextStyle(
                              color: _textSecondary, fontSize: 11)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Search bar
                Container(
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D1117),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _border),
                  ),
                  child: TextField(
                    controller: _searchController,
                    style: const TextStyle(color: _textPrimary, fontSize: 13),
                    decoration: const InputDecoration(
                      hintText: 'Search your stars…',
                      hintStyle:
                          TextStyle(color: _textSecondary, fontSize: 13),
                      prefixIcon: Icon(Icons.search,
                          color: _textSecondary, size: 18),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(vertical: 10),
                    ),
                    onChanged: (v) {
                      setState(() => _searchQuery = v);
                      _loadStarred();
                    },
                  ),
                ),
              ],
            ),
          ),

          const Divider(color: Color(0xFF21262D), height: 1),

          // Repos list
          if (_reposLoading)
            ..._buildSkeletonRows()
          else if (_starredRepos.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  _searchQuery.isNotEmpty
                      ? 'No results for "$_searchQuery"'
                      : 'No starred repos yet',
                  style: const TextStyle(color: _textSecondary, fontSize: 13),
                ),
              ),
            )
          else
            ...List.generate(_starredRepos.length, (i) {
              final repo = _starredRepos[i];
              final isLast = i == _starredRepos.length - 1;
              return Column(
                children: [
                  _buildRepoRow(repo),
                  if (!isLast)
                    const Divider(
                        color: Color(0xFF21262D), height: 1, indent: 52),
                ],
              );
            }),

          // Footer hint if more repos exist
          if (!_searchQuery.isNotEmpty && conn.starredReposCount > 40) ...[
            const Divider(color: Color(0xFF21262D), height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: Text(
                  'Showing 40 of ${_fmtCount(conn.starredReposCount)} — use search to find more',
                  style: const TextStyle(color: _textSecondary, fontSize: 12),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRepoRow(StarredRepo repo) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Owner avatar
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.network(
              repo.ownerAvatarUrl,
              width: 28, height: 28,
              errorBuilder: (_, __, ___) => Container(
                width: 28, height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFF21262D),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.person, color: _textSecondary, size: 16),
              ),
            ),
          ),
          const SizedBox(width: 10),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(repo.fullName,
                    style: const TextStyle(
                        color: Color(0xFF58A6FF),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        fontFamily: 'monospace')),
                if (repo.description != null &&
                    repo.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(repo.description!,
                      style: const TextStyle(
                          color: _textSecondary, fontSize: 12, height: 1.4),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                ],
                const SizedBox(height: 6),
                Wrap(
                  spacing: 12, runSpacing: 4,
                  children: [
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.star_rounded, color: _gold, size: 13),
                      const SizedBox(width: 3),
                      Text(_fmtCount(repo.stars),
                          style: const TextStyle(
                              color: _textSecondary, fontSize: 12)),
                    ]),
                    if (repo.language != null)
                      Row(mainAxisSize: MainAxisSize.min, children: [
                        Container(
                          width: 10, height: 10,
                          decoration: BoxDecoration(
                            color: _langColor(repo.language),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(repo.language!,
                            style: const TextStyle(
                                color: _textSecondary, fontSize: 12)),
                      ]),
                    if (repo.starredAt != null)
                      Text('starred ${_timeAgo(repo.starredAt)}',
                          style: const TextStyle(
                              color: _textSecondary, fontSize: 11)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildSkeletonRows() {
    return List.generate(
      5,
      (i) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color: const Color(0xFF21262D),
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 13,
                    width: 140,
                    decoration: BoxDecoration(
                      color: const Color(0xFF21262D),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: 12,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFF21262D),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}

/// Minimal GitHub Octocat/mark SVG icon
class _GitHubIcon extends StatelessWidget {
  final double size;
  final Color color;
  const _GitHubIcon({this.size = 20, this.color = const Color(0xFFE6EDF3)});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size, height: size,
      child: CustomPaint(painter: _GitHubMarkPainter(color)),
    );
  }
}

class _GitHubMarkPainter extends CustomPainter {
  final Color color;
  const _GitHubMarkPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color..style = PaintingStyle.fill;
    final path = Path();
    final s = size.width / 24.0;

    // GitHub mark path (simplified)
    path.moveTo(12 * s, 0);
    path.cubicTo(5.374 * s, 0, 0, 5.373 * s, 0, 12 * s);
    path.cubicTo(0, 17.302 * s, 3.438 * s, 21.8 * s, 8.207 * s, 23.387 * s);
    path.cubicTo(8.806 * s, 23.498 * s, 9.0 * s, 23.126 * s, 9.0 * s, 22.81 * s);
    path.lineTo(9.0 * s, 20.576 * s);
    path.cubicTo(5.662 * s, 21.302 * s, 4.967 * s, 18.886 * s, 4.967 * s, 18.886 * s);
    path.cubicTo(4.421 * s, 17.499 * s, 3.634 * s, 17.13 * s, 3.634 * s, 17.13 * s);
    path.cubicTo(2.545 * s, 16.385 * s, 3.717 * s, 16.401 * s, 3.717 * s, 16.401 * s);
    path.cubicTo(4.922 * s, 16.485 * s, 5.556 * s, 17.638 * s, 5.556 * s, 17.638 * s);
    path.cubicTo(6.626 * s, 19.472 * s, 8.363 * s, 18.942 * s, 9.048 * s, 18.635 * s);
    path.cubicTo(9.155 * s, 17.86 * s, 9.466 * s, 17.33 * s, 9.81 * s, 17.031 * s);
    path.cubicTo(7.145 * s, 16.726 * s, 4.343 * s, 15.697 * s, 4.343 * s, 11.17 * s);
    path.cubicTo(4.343 * s, 9.859 * s, 4.812 * s, 8.789 * s, 5.579 * s, 7.949 * s);
    path.cubicTo(5.455 * s, 7.646 * s, 5.044 * s, 6.425 * s, 5.696 * s, 4.773 * s);
    path.cubicTo(5.696 * s, 4.773 * s, 6.704 * s, 4.451 * s, 8.997 * s, 5.981 * s);
    path.cubicTo(9.717 * s, 5.715 * s, 10.864 * s, 5.715 * s - 0.002 * s, 12.003 * s, 5.803 * s);
    path.cubicTo(13.023 * s, 5.808 * s, 14.05 * s, 5.941 * s, 15.009 * s, 6.207 * s);
    path.cubicTo(17.3 * s, 4.655 * s, 18.306 * s, 4.977 * s, 18.306 * s, 4.977 * s);
    path.cubicTo(18.959 * s, 6.63 * s, 18.548 * s, 7.851 * s, 18.424 * s, 8.153 * s);
    path.cubicTo(19.194 * s, 8.993 * s, 19.659 * s, 10.064 * s, 19.659 * s, 11.374 * s);
    path.cubicTo(19.659 * s, 15.983 * s, 16.852 * s, 16.998 * s, 14.18 * s, 17.295 * s);
    path.cubicTo(14.61 * s, 17.667 * s, 15.003 * s, 18.397 * s, 15.003 * s, 19.517 * s);
    path.lineTo(15.003 * s, 22.81 * s);
    path.cubicTo(15.003 * s, 23.129 * s, 15.195 * s, 23.504 * s, 15.804 * s, 23.376 * s);
    path.cubicTo(20.566 * s, 21.797 * s, 24.0 * s, 17.3 * s, 24.0 * s, 12.0 * s);
    path.cubicTo(24.0 * s, 5.373 * s, 18.627 * s, 0, 12.0 * s, 0);
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_GitHubMarkPainter old) => old.color != color;
}

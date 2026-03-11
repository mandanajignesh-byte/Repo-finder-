class Repository {
  final String id;
  final int githubId;
  final String name;
  final String fullName;
  final String? description;
  final String ownerLogin;
  final String? ownerAvatar;
  final int stars;
  final int forks;
  final int watchers;
  final int openIssues;
  final String? language;
  final List<String> topics;
  final String? license;
  final String repoUrl;
  final String? homepageUrl;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? pushedAt;
  final String cluster;
  final double recommendationScore;
  final double popularityScore;
  final double activityScore;
  final double freshnessScore;
  final double qualityScore;
  final double trendingScore;
  /// Badges from repo_recommendations_feed (e.g. ["well-maintained", "trending"])
  final List<String> badges;
  /// Pre-computed rank in the user's feed (1–500)
  final int? feedRank;

  Repository({
    required this.id,
    required this.githubId,
    required this.name,
    required this.fullName,
    this.description,
    required this.ownerLogin,
    this.ownerAvatar,
    required this.stars,
    required this.forks,
    required this.watchers,
    required this.openIssues,
    this.language,
    required this.topics,
    this.license,
    required this.repoUrl,
    this.homepageUrl,
    this.createdAt,
    this.updatedAt,
    this.pushedAt,
    required this.cluster,
    required this.recommendationScore,
    required this.popularityScore,
    required this.activityScore,
    required this.freshnessScore,
    required this.qualityScore,
    required this.trendingScore,
    this.badges = const [],
    this.feedRank,
  });

  // ---------------------------------------------------------------------------
  // Factory: repo_recommendations_feed  (NEW primary source)
  // ---------------------------------------------------------------------------
  factory Repository.fromFeed(Map<String, dynamic> json) {
    final repoId = (json['repo_id'] as int?) ?? 0;
    final fullName = json['repo_full_name'] as String? ?? '';
    final parts = fullName.split('/');
    final ownerLogin = parts.length >= 2 ? parts[0] : '';
    final repoName = json['repo_name'] as String? ?? parts.lastOrNull ?? '';

    // badges is a jsonb array – can be null, list of strings, or list of maps
    List<String> parsedBadges = [];
    final rawBadges = json['badges'];
    if (rawBadges is List) {
      parsedBadges = rawBadges
          .map((b) => b is String ? b : b.toString())
          .where((b) => b.isNotEmpty && b != 'null')
          .toList();
    }

    return Repository(
      id: repoId.toString(),
      githubId: repoId,
      name: repoName,
      fullName: fullName,
      description: json['description'],
      ownerLogin: ownerLogin,
      ownerAvatar: json['avatar_url'] ??
          (ownerLogin.isNotEmpty ? 'https://github.com/$ownerLogin.png' : null),
      stars: (json['stars'] as int?) ?? 0,
      forks: (json['forks'] as int?) ?? 0,
      watchers: 0,
      openIssues: 0,
      language: json['language'],
      topics: const [],
      license: null,
      repoUrl: 'https://github.com/$fullName',
      homepageUrl: null,
      cluster: 'general',
      recommendationScore:
          ((json['final_score'] as num?)?.toDouble() ?? 0.0).clamp(0.0, 1.0),
      popularityScore:
          ((json['popularity_score'] as num?)?.toDouble() ?? 0.0).clamp(0.0, 1.0),
      activityScore:
          ((json['activity_score'] as num?)?.toDouble() ?? 0.0).clamp(0.0, 1.0),
      freshnessScore:
          ((json['freshness_score'] as num?)?.toDouble() ?? 0.0).clamp(0.0, 1.0),
      qualityScore:
          ((json['health_score'] as num?)?.toDouble() ?? 0.0).clamp(0.0, 1.0),
      trendingScore: 0.0,
      badges: parsedBadges,
      feedRank: json['rank'] as int?,
    );
  }

  // ---------------------------------------------------------------------------
  // Factory: repos_master  (used for trending / saved / liked display)
  // ---------------------------------------------------------------------------
  factory Repository.fromMaster(Map<String, dynamic> json) {
    final repoId = (json['repo_id'] as int?) ?? 0;
    final fullName = json['full_name'] as String? ?? '';
    final parts = fullName.split('/');
    final ownerLogin = parts.length >= 2 ? parts[0] : '';

    return Repository(
      id: repoId.toString(),
      githubId: repoId,
      name: json['name'] as String? ?? '',
      fullName: fullName,
      description: json['description'],
      ownerLogin: ownerLogin,
      ownerAvatar: json['avatar_url'] ??
          (ownerLogin.isNotEmpty ? 'https://github.com/$ownerLogin.png' : null),
      stars: (json['stars'] as int?) ?? 0,
      forks: (json['forks'] as int?) ?? 0,
      watchers: 0,
      openIssues: (json['open_issues'] as int?) ?? 0,
      language: json['language'],
      topics: List<String>.from(json['topics'] ?? []),
      license: json['license'],
      repoUrl: json['html_url'] ?? json['url'] ?? 'https://github.com/$fullName',
      homepageUrl: json['homepage'],
      cluster: 'general',
      recommendationScore: 0.7,
      popularityScore: ((json['stars'] as int?) ?? 0) / 100000.0,
      activityScore: 0.5,
      freshnessScore: 0.5,
      qualityScore: 0.5,
      trendingScore: 0.0,
      badges: const [],
    );
  }

  // ---------------------------------------------------------------------------
  // Legacy fromJson – kept for backwards compatibility
  // ---------------------------------------------------------------------------
  factory Repository.fromJson(Map<String, dynamic> json) {
    return Repository(
      id: json['id']?.toString() ?? json['github_id']?.toString() ?? '',
      githubId: (json['github_id'] as int?) ?? 0,
      name: json['name'] ?? '',
      fullName: json['full_name'] ?? '',
      description: json['description'],
      ownerLogin: json['owner_login'] ?? '',
      ownerAvatar: json['owner_avatar'],
      stars: (json['stars'] as int?) ?? 0,
      forks: (json['forks'] as int?) ?? 0,
      watchers: (json['watchers'] as int?) ?? 0,
      openIssues: (json['open_issues'] as int?) ?? 0,
      language: json['language'],
      topics: List<String>.from(json['topics'] ?? []),
      license: json['license'],
      repoUrl: json['repo_url'] ?? '',
      homepageUrl: json['homepage_url'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'])
          : null,
      pushedAt: json['pushed_at'] != null
          ? DateTime.tryParse(json['pushed_at'])
          : null,
      cluster: json['cluster'] ?? 'general',
      recommendationScore: (json['recommendation_score'] ?? 0).toDouble(),
      popularityScore: (json['popularity_score'] ?? 0).toDouble(),
      activityScore: (json['activity_score'] ?? 0).toDouble(),
      freshnessScore: (json['freshness_score'] ?? 0).toDouble(),
      qualityScore: (json['quality_score'] ?? 0).toDouble(),
      trendingScore: (json['trending_score'] ?? 0).toDouble(),
      badges: List<String>.from(json['badges'] ?? []),
    );
  }

  String get timeAgo {
    if (pushedAt == null) return '';
    final now = DateTime.now();
    final difference = now.difference(pushedAt!);
    if (difference.inDays > 365) {
      return '${(difference.inDays / 365).floor()}y ago';
    } else if (difference.inDays > 30) {
      return '${(difference.inDays / 30).floor()}mo ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else {
      return 'just now';
    }
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'github_id': githubId,
        'name': name,
        'full_name': fullName,
        'description': description,
        'owner_login': ownerLogin,
        'owner_avatar': ownerAvatar,
        'stars': stars,
        'forks': forks,
        'watchers': watchers,
        'open_issues': openIssues,
        'language': language,
        'topics': topics,
        'license': license,
        'repo_url': repoUrl,
        'homepage_url': homepageUrl,
        'cluster': cluster,
        'recommendation_score': recommendationScore,
        'popularity_score': popularityScore,
        'activity_score': activityScore,
        'freshness_score': freshnessScore,
        'quality_score': qualityScore,
        'trending_score': trendingScore,
        'badges': badges,
        'feed_rank': feedRank,
      };
}

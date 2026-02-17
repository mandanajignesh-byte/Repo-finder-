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
  });

  factory Repository.fromJson(Map<String, dynamic> json) {
    return Repository(
      id: json['id']?.toString() ?? json['github_id']?.toString() ?? '',
      githubId: json['github_id'] ?? 0,
      name: json['name'] ?? '',
      fullName: json['full_name'] ?? '',
      description: json['description'],
      ownerLogin: json['owner_login'] ?? '',
      ownerAvatar: json['owner_avatar'],
      stars: json['stars'] ?? 0,
      forks: json['forks'] ?? 0,
      watchers: json['watchers'] ?? 0,
      openIssues: json['open_issues'] ?? 0,
      language: json['language'],
      topics: List<String>.from(json['topics'] ?? []),
      license: json['license'],
      repoUrl: json['repo_url'] ?? '',
      homepageUrl: json['homepage_url'],
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : null,
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at']) 
          : null,
      pushedAt: json['pushed_at'] != null 
          ? DateTime.parse(json['pushed_at']) 
          : null,
      cluster: json['cluster'] ?? 'general',
      recommendationScore: (json['recommendation_score'] ?? 0).toDouble(),
      popularityScore: (json['popularity_score'] ?? 0).toDouble(),
      activityScore: (json['activity_score'] ?? 0).toDouble(),
      freshnessScore: (json['freshness_score'] ?? 0).toDouble(),
      qualityScore: (json['quality_score'] ?? 0).toDouble(),
      trendingScore: (json['trending_score'] ?? 0).toDouble(),
    );
  }

  String get timeAgo {
    if (pushedAt == null) return 'Unknown';
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
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'just now';
    }
  }

  Map<String, dynamic> toJson() {
    return {
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
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'pushed_at': pushedAt?.toIso8601String(),
      'cluster': cluster,
      'recommendation_score': recommendationScore,
      'popularity_score': popularityScore,
      'activity_score': activityScore,
      'freshness_score': freshnessScore,
      'quality_score': qualityScore,
      'trending_score': trendingScore,
    };
  }
}

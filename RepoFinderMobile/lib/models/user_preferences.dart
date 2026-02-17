class UserPreferences {
  final String? name;
  final String? primaryCluster;
  final List<String> secondaryClusters;
  final List<String> techStack;
  final List<String> interests;
  final String experienceLevel;
  final List<String> goals;
  final List<String>? projectTypes;
  final String activityPreference;
  final String popularityWeight;
  final String? documentationImportance;
  final List<String> licensePreference;
  final List<String> repoSize;
  final bool onboardingCompleted;

  UserPreferences({
    this.name,
    this.primaryCluster,
    this.secondaryClusters = const [],
    this.techStack = const [],
    this.interests = const [],
    this.experienceLevel = 'intermediate',
    this.goals = const [],
    this.projectTypes,
    this.activityPreference = 'any',
    this.popularityWeight = 'medium',
    this.documentationImportance,
    this.licensePreference = const [],
    this.repoSize = const [],
    this.onboardingCompleted = false,
  });

  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      name: json['name'],
      primaryCluster: json['primary_cluster'],
      secondaryClusters: List<String>.from(json['secondary_clusters'] ?? []),
      techStack: List<String>.from(json['tech_stack'] ?? []),
      interests: List<String>.from(json['interests'] ?? []),
      experienceLevel: json['experience_level'] ?? 'intermediate',
      goals: List<String>.from(json['goals'] ?? []),
      projectTypes: json['project_types'] != null 
          ? List<String>.from(json['project_types']) 
          : null,
      activityPreference: json['activity_preference'] ?? 'any',
      popularityWeight: json['popularity_weight'] ?? 'medium',
      documentationImportance: json['documentation_importance'],
      licensePreference: List<String>.from(json['license_preference'] ?? []),
      repoSize: List<String>.from(json['repo_size'] ?? []),
      onboardingCompleted: json['onboarding_completed'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'primary_cluster': primaryCluster,
      'secondary_clusters': secondaryClusters,
      'tech_stack': techStack,
      'interests': interests,
      'experience_level': experienceLevel,
      'goals': goals,
      'project_types': projectTypes,
      'activity_preference': activityPreference,
      'popularity_weight': popularityWeight,
      'documentation_importance': documentationImportance,
      'license_preference': licensePreference,
      'repo_size': repoSize,
      'onboarding_completed': onboardingCompleted,
    };
  }
}

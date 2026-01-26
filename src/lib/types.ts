/**
 * Shared types for the application
 */

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  tags: string[];
  stars: number;
  forks: number;
  lastUpdated: string;
  fitScore?: number;
  language?: string;
  url: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
  license?: string;
  topics?: string[];
}

export interface TrendingRepo extends Repository {
  trending: string;
  rank: number;
}

export interface GitHubApiRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  language: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  license?: {
    name: string;
  } | null;
  topics?: string[];
}

export interface Recommendation {
  name: string;
  description: string;
  reason: string;
  url?: string;
  stars?: number;
}

export interface UserPreferences {
  // NEW: Primary cluster selection (required for new onboarding)
  primaryCluster?: string; // 'frontend', 'backend', 'mobile', 'desktop', 'data-science', 'devops', 'game-dev', 'ai-ml'
  secondaryClusters?: string[]; // Optional secondary interests
  
  // Existing
  techStack: string[];
  interests: string[]; // Keep for backward compatibility
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  projectType?: string;
  
  // Enhanced preferences
  goals?: ('learning-new-tech' | 'building-project' | 'contributing' | 'finding-solutions' | 'exploring' | 'learning' | 'discovering' | 'building')[]; // Support both old and new formats
  projectTypes?: ('library' | 'framework' | 'tool' | 'tutorial' | 'full-app' | 'boilerplate')[];
  activityPreference?: 'active' | 'stable' | 'trending' | 'any';
  popularityWeight?: 'high' | 'medium' | 'low';
  licensePreference?: ('MIT' | 'Apache' | 'GPL' | 'BSD' | 'any')[];
  repoSize?: ('small' | 'medium' | 'large' | 'any')[];
  documentationImportance?: 'critical' | 'important' | 'nice-to-have';
  onboardingCompleted?: boolean;
}

export interface UserInteraction {
  repoId: string;
  action: 'save' | 'like' | 'skip' | 'view' | 'click-through' | 'fork';
  timestamp: Date;
  sessionId: string;
  timeSpent?: number; // milliseconds
  context?: {
    position: number;
    source: 'discover' | 'trending' | 'agent';
  };
}

export interface RecommendationScores {
  content: number;
  collaborative: number;
  session: number;
  finalScore: number;
}

export interface EnhancedRepository extends Repository {
  contributors?: number;
  openIssues?: number;
  closedIssues?: number;
  pullRequests?: number;
  commitsLast30Days?: number;
  readmeLength?: number;
  hasDocumentation?: boolean;
  hasTests?: boolean;
  hasCI?: boolean;
  size?: number; // KB
  age?: number; // days since creation
  growthRate?: number; // stars per day
  scores?: RecommendationScores;
}

export interface CreditBalance {
  free: number;
  paid: number;
  total: number;
}

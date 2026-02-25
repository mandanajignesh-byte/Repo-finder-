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
  pushed_at?: string;
  created_at?: string;
  language: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  license?: {
    name: string;
    spdx_id?: string;
  } | null;
  topics?: string[];
}

export interface Recommendation {
  name: string;
  description: string;
  reason: string;
  url?: string;
  stars?: number;
  fitScore?: number;
}

export interface UserPreferences {
  // User basic info
  name?: string; // User's name
  
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

// ─── Enhanced Agent Types ───────────────────────────────────────

/** Raw health signals fetched from GitHub API */
export interface RepoHealthSignals {
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  /** ISO date of last push */
  lastPush: string;
  /** ISO date of repo creation */
  createdAt: string;
  license: string | null;
  language: string | null;
  topics: string[];
  defaultBranch: string;
  /** Number of contributors (top-level) */
  contributorCount: number;
  /** Average days to close an issue (last 30 closed issues) */
  avgIssueCloseTimeDays: number | null;
  /** Ratio of closed issues to total (closed+open) */
  issueCloseRate: number | null;
  /** Number of commits in the last 52 weeks */
  commitActivity52w: number;
  /** Number of releases */
  releaseCount: number;
  /** ISO date of most recent release */
  lastReleaseDate: string | null;
  /** Has README */
  hasReadme: boolean;
  /** Has CONTRIBUTING.md or similar */
  hasContributing: boolean;
  /** Size in KB */
  sizeKB: number;
}

/** Composite health score breakdown */
export interface RepoHealthScore {
  overall: number; // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  breakdown: {
    popularity: number;        // 0-100 (stars, watchers)
    activity: number;          // 0-100 (commit frequency, last push)
    maintenance: number;       // 0-100 (issue close rate, issue response time)
    community: number;         // 0-100 (contributors, PR activity)
    documentation: number;     // 0-100 (readme, contributing, description)
    maturity: number;          // 0-100 (releases, age, license)
  };
  signals: RepoHealthSignals;
  /** Human-readable summary */
  summary: string;
}

/** A repository enriched with health score for the agent */
export interface ScoredRepository extends Repository {
  healthScore: RepoHealthScore;
  /** Stars gained per month (velocity) */
  starVelocity: number;
}

/** Comparison result for two or more repos */
export interface RepoComparison {
  repos: ScoredRepository[];
  verdict: string;
  /** Which repo wins each category */
  categoryWinners: Record<string, string>;
  /** AI-generated comparison summary */
  summary: string;
}

/** Agent message types */
export type AgentMessageType =
  | 'text'
  | 'recommendations'
  | 'comparison'
  | 'health-report'
  | 'alternatives'
  | 'error';

export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  sender: 'user' | 'agent';
  text: string;
  loading?: boolean;
  error?: boolean;
  // Payload (depends on type)
  recommendations?: ScoredRepository[];
  comparison?: RepoComparison;
  healthReport?: RepoHealthScore & { repoName: string };
  /** Quick action buttons */
  actions?: string[];
}

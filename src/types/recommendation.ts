// ─── Repo returned by get_scored_repos() Supabase function ───
export interface Repo {
  id:           number;
  name:         string;
  full_name:    string;
  description:  string | null;
  stars:        number;
  forks:        number;
  language:     string | null;
  tags:         string[];
  topics:       string[];
  url:          string;
  owner_avatar: string | null;
  health_score: number;
  like_rate:    number;
  final_score:  number;
}

// ─── User preferences from user_preferences table ───
export interface UserPreferences {
  user_id:              string;
  primary_cluster:      string | null;
  tech_stack:           string[];
  goals:                string[];
  onboarding_completed: boolean;
}

// ─── Options passed to engine.loadBatch() ───
export interface BatchOptions {
  append:  boolean;   // true = add to existing cards, false = replace
  attempt: number;    // retry attempt 0-3
}

// ─── Retry widening config ───
export interface RetryConfig {
  minStars: number;
  maxStars: number;
}

// ─── Actions a user can take on a repo ───
export type SwipeAction = "like" | "skip" | "save" | "share";
export type ViewAction  = "view";
export type RepoAction  = SwipeAction | ViewAction;

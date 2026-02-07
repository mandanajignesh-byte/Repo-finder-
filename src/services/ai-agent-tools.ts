/**
 * AI Agent Tools
 * Tool definitions and execution for the enhanced AI agent
 * These tools give the agent access to RepoVerse's powerful data and services
 */

import { Repository, UserPreferences } from '@/lib/types';
import { clusterService } from './cluster.service';
import { repoPoolService } from './repo-pool.service';
import { enhancedRecommendationService } from './enhanced-recommendation.service';
import { supabaseService } from './supabase.service';
import { githubService } from './github.service';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; required?: boolean }>;
    required?: string[];
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  reasoning?: string;
}

/**
 * Available tools for the AI agent
 */
export const AI_AGENT_TOOLS: Tool[] = [
  {
    name: 'search_repos_by_need',
    description: 'Search for repositories based on user needs, tech stack, and goals. This uses RepoVerse\'s curated clusters and intelligent filtering.',
    parameters: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'What the user wants to achieve (e.g., "build a web app", "learn React", "find automation tools")',
        },
        tech_stack: {
          type: 'array',
          description: 'Array of technologies/languages (e.g., ["react", "typescript"])',
        },
        difficulty: {
          type: 'string',
          description: 'Experience level: "beginner", "intermediate", or "advanced"',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of repos to return (default: 10)',
        },
      },
      required: ['goal'],
    },
  },
  {
    name: 'get_repo_details',
    description: 'Get detailed information about a specific repository including quality scores, tags, and metadata.',
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: 'The repository ID or full name (e.g., "owner/repo-name")',
        },
      },
      required: ['repo_id'],
    },
  },
  {
    name: 'get_similar_repos',
    description: 'Find repositories similar to a given one based on tech stack, topics, and purpose.',
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: 'The repository ID or full name to find similar repos for',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of similar repos to return (default: 5)',
        },
      },
      required: ['repo_id'],
    },
  },
  {
    name: 'get_learning_path',
    description: 'Generate a structured learning path with ordered repositories for a specific technology or goal.',
    parameters: {
      type: 'object',
      properties: {
        tech_stack: {
          type: 'array',
          description: 'Array of technologies to learn (e.g., ["react", "node.js"])',
        },
        time_budget: {
          type: 'string',
          description: 'Time available: "weekend", "week", "month", or "long-term"',
        },
        experience_level: {
          type: 'string',
          description: 'Current experience level: "beginner", "intermediate", or "advanced"',
        },
      },
      required: ['tech_stack'],
    },
  },
  {
    name: 'get_user_history',
    description: 'Get the user\'s interaction history including liked, saved, and viewed repositories.',
    parameters: {
      type: 'object',
      properties: {
        include_interactions: {
          type: 'boolean',
          description: 'Whether to include interaction details (default: true)',
        },
      },
    },
  },
  {
    name: 'search_by_category',
    description: 'Search repositories within a specific category (e.g., "ai-automation", "open-source-alternatives", "templates").',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Category name (e.g., "ai-automation", "templates", "learn-to-code")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of repos to return (default: 10)',
        },
      },
      required: ['category'],
    },
  },
];

/**
 * Tool execution engine
 */
export class ToolExecutor {
  private userId: string;
  private preferences: UserPreferences;

  constructor(userId: string, preferences: UserPreferences) {
    this.userId = userId;
    this.preferences = preferences;
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    try {
      switch (toolCall.name) {
        case 'search_repos_by_need':
          return await this.searchReposByNeed(toolCall.arguments);
        case 'get_repo_details':
          return await this.getRepoDetails(toolCall.arguments);
        case 'get_similar_repos':
          return await this.getSimilarRepos(toolCall.arguments);
        case 'get_learning_path':
          return await this.getLearningPath(toolCall.arguments);
        case 'get_user_history':
          return await this.getUserHistory(toolCall.arguments);
        case 'search_by_category':
          return await this.searchByCategory(toolCall.arguments);
        default:
          return {
            success: false,
            error: `Unknown tool: ${toolCall.name}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Tool execution failed',
      };
    }
  }

  /**
   * Search repos by user need
   * Only uses explicitly provided parameters - no profile interests/preferences
   */
  private async searchReposByNeed(args: any): Promise<ToolResult> {
    const { goal, tech_stack, difficulty, limit = 10 } = args;

    // Build a GitHub search query directly from the user's goal and tech stack.
    // This intentionally bypasses Supabase/cluster data and hits the GitHub Search API.
    // Only uses what the user explicitly asked for - no profile preferences.
    const keywords: string[] = [];

    if (goal && typeof goal === 'string') {
      keywords.push(goal);
    }

    // Only use tech_stack if explicitly provided - no fallback to preferences
    const stack = (tech_stack as string[] | undefined) || [];
    if (stack.length > 0) {
      keywords.push(...stack);
    }

    // Add a simple popularity filter and avoid mega‑popular repos
    let searchQuery = keywords.join(' ').trim() || 'stars:>50';
    searchQuery += ' stars:>20 stars:<50000';

    // Only use difficulty if explicitly provided - no fallback to preferences
    const diff = (difficulty as string | undefined);
    if (diff === 'beginner') {
      searchQuery += ' language:javascript';
    }

    const repos = await githubService.searchRepos(searchQuery, {
      sort: 'stars',
      order: 'desc',
      perPage: Math.min(limit * 3, 60),
      usePagination: false,
    });

    // Sort by stars only - no preference-based scoring
    const sorted = repos.sort((a, b) => (b.stars || 0) - (a.stars || 0));

    return {
      success: true,
      data: sorted.slice(0, limit),
      reasoning: `Searched GitHub for "${searchQuery}" based on goal "${goal}"${stack.length > 0 ? ` and tech stack ${JSON.stringify(stack)}` : ''}; ranked by stars.`,
    };
  }

  /**
   * Get detailed repo information
   */
  private async getRepoDetails(args: any): Promise<ToolResult> {
    const { repo_id } = args;
    
    // Try to find repo in clusters first (fastest)
    const clusters = await clusterService.getClusters();
    for (const cluster of clusters) {
      const repos = await clusterService.getBestOfCluster(cluster.name, 100, [], this.userId);
      const repo = repos.find(r => r.id === repo_id || r.fullName === repo_id);
      if (repo) {
        // Return repo without preference-based scoring
        return {
          success: true,
          data: repo,
          reasoning: `Found repository in ${cluster.name} cluster`,
        };
      }
    }

    // Fallback: search GitHub (slower)
    try {
      const repos = await githubService.searchRepos(repo_id, { perPage: 1 });
      if (repos.length > 0) {
        const repo = repos[0];
        return {
          success: true,
          data: repo,
          reasoning: `Found repository via GitHub search`,
        };
      }
    } catch (error) {
      // Ignore
    }

    return {
      success: false,
      error: `Repository not found: ${repo_id}`,
    };
  }

  /**
   * Get similar repositories
   */
  private async getSimilarRepos(args: any): Promise<ToolResult> {
    const { repo_id, limit = 5 } = args;
    
    // First, get the target repo
    const targetResult = await this.getRepoDetails({ repo_id });
    if (!targetResult.success || !targetResult.data) {
      return {
        success: false,
        error: `Cannot find similar repos: ${targetResult.error}`,
      };
    }

    const targetRepo = targetResult.data as Repository;
    
    // Find repos with similar tech stack and topics
    const similarRepos: Repository[] = [];
    const clusters = await clusterService.getClusters();
    
    for (const cluster of clusters) {
      const repos = await clusterService.getBestOfCluster(cluster.name, 50, [targetRepo.id], this.userId);
      
      // Calculate similarity
      for (const repo of repos) {
        const similarity = this.calculateSimilarity(targetRepo, repo);
        if (similarity > 0.3) {
          similarRepos.push({ ...repo, fitScore: Math.round(similarity * 100) });
        }
      }
    }

    // Sort by similarity and return top N
    similarRepos.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
    
    return {
      success: true,
      data: similarRepos.slice(0, limit),
      reasoning: `Found ${similarRepos.length} similar repositories based on tech stack and topics`,
    };
  }

  /**
   * Generate learning path
   * Only uses explicitly provided parameters - no profile preferences
   */
  private async getLearningPath(args: any): Promise<ToolResult> {
    const { tech_stack, time_budget, experience_level } = args;
    
    // Only use explicitly provided parameters - no fallback to preferences
    const pathPreferences: UserPreferences = {
      techStack: (tech_stack as string[] | undefined) || [],
      experienceLevel: (experience_level as string | undefined) || 'intermediate',
      goals: ['learning-new-tech'],
      projectTypes: ['tutorial', 'course'],
    };

    // Get repos for learning
    const repos = await repoPoolService.getRecommendations(
      this.userId,
      pathPreferences,
      time_budget === 'weekend' ? 3 : time_budget === 'week' ? 7 : time_budget === 'month' ? 15 : 30
    );

    // Order by difficulty (beginner first)
    const ordered = repos.sort((a, b) => {
      const aDifficulty = this.estimateDifficulty(a);
      const bDifficulty = this.estimateDifficulty(b);
      return aDifficulty - bDifficulty;
    });

    return {
      success: true,
      data: {
        repos: ordered,
        estimated_time: time_budget,
        steps: ordered.map((repo, index) => ({
          step: index + 1,
          repo: repo.fullName,
          description: repo.description,
          difficulty: this.estimateDifficulty(repo),
        })),
      },
      reasoning: `Generated ${ordered.length}-step learning path for ${tech_stack.join(', ')}`,
    };
  }

  /**
   * Get user history
   */
  private async getUserHistory(args: any): Promise<ToolResult> {
    const { include_interactions = true } = args;
    
    const [saved, liked, interactions] = await Promise.all([
      supabaseService.getSavedRepositories(this.userId),
      supabaseService.getLikedRepositories(this.userId),
      include_interactions ? supabaseService.getUserInteractions(this.userId, 50) : Promise.resolve([]),
    ]);

    return {
      success: true,
      data: {
        saved: saved,
        liked: liked,
        interactions: include_interactions ? interactions : undefined,
        summary: {
          total_saved: saved.length,
          total_liked: liked.length,
          total_interactions: interactions.length,
        },
      },
      reasoning: `Retrieved user history: ${saved.length} saved, ${liked.length} liked, ${interactions.length} interactions`,
    };
  }

  /**
   * Search by category
   */
  private async searchByCategory(args: any): Promise<ToolResult> {
    const { category, limit = 10 } = args;
    
    const repos = await clusterService.getBestOfCluster(
      category,
      limit,
      [],
      this.userId
    );

    return {
      success: true,
      data: repos,
      reasoning: `Found ${repos.length} repositories in ${category} category`,
    };
  }

  /**
   * Calculate similarity between two repos
   */
  private calculateSimilarity(repo1: Repository, repo2: Repository): number {
    let score = 0;
    let factors = 0;

    // Language match (30%)
    if (repo1.language && repo2.language && repo1.language === repo2.language) {
      score += 0.3;
      factors++;
    }

    // Tag overlap (40%)
    const tags1 = new Set(repo1.tags.map(t => t.toLowerCase()));
    const tags2 = new Set(repo2.tags.map(t => t.toLowerCase()));
    const tagIntersection = Array.from(tags1).filter(t => tags2.has(t));
    const tagUnion = new Set([...tags1, ...tags2]);
    if (tagUnion.size > 0) {
      score += (tagIntersection.length / tagUnion.size) * 0.4;
      factors++;
    }

    // Topic overlap (30%)
    if (repo1.topics && repo2.topics) {
      const topics1 = new Set(repo1.topics.map(t => t.toLowerCase()));
      const topics2 = new Set(repo2.topics.map(t => t.toLowerCase()));
      const topicIntersection = Array.from(topics1).filter(t => topics2.has(t));
      const topicUnion = new Set([...topics1, ...topics2]);
      if (topicUnion.size > 0) {
        score += (topicIntersection.length / topicUnion.size) * 0.3;
        factors++;
      }
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Estimate repository difficulty
   */
  private estimateDifficulty(repo: Repository): number {
    // 1 = beginner, 2 = intermediate, 3 = advanced
    const text = `${repo.description} ${repo.tags.join(' ')}`.toLowerCase();
    
    if (text.includes('beginner') || text.includes('tutorial') || text.includes('starter')) {
      return 1;
    }
    if (text.includes('advanced') || text.includes('enterprise') || text.includes('production')) {
      return 3;
    }
    return 2;
  }
}

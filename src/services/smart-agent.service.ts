/**
 * Smart Agent Service
 * A completely rebuilt AI agent that:
 *  - Understands natural language queries
 *  - Searches GitHub intelligently (not just keyword matching)
 *  - Calculates real health scores for results
 *  - Compares repos side-by-side
 *  - Finds alternatives to any repo
 *  - Uses intent detection to route queries
 *
 * No more credit system. No more 3-round clarification questionnaires.
 * Just type and get results.
 */

import { config } from '@/lib/config';
import {
  Repository,
  UserPreferences,
  ScoredRepository,
  RepoComparison,
  RepoHealthScore,
  AgentMessage,
} from '@/lib/types';
import { githubEnhancedService } from './github-enhanced.service';
import { repoHealthScoreService } from './repo-health-score.service';
import { repoComparisonService } from './repo-comparison.service';

// ── Intent types ─────────────────────────────────────────────

type QueryIntent =
  | { type: 'search'; searchTerms: string; language?: string; minStars?: number }
  | { type: 'compare'; repos: string[] }
  | { type: 'health'; repo: string }
  | { type: 'alternatives'; repo: string }
  | { type: 'trending'; language?: string; period?: string }
  | { type: 'general'; query: string };

// ── Response types ───────────────────────────────────────────

export interface SmartAgentResponse {
  type: 'recommendations' | 'comparison' | 'health-report' | 'alternatives' | 'text';
  text: string;
  recommendations?: ScoredRepository[];
  comparison?: RepoComparison;
  healthReport?: RepoHealthScore & { repoName: string };
  actions?: string[];
}

// ── Service ──────────────────────────────────────────────────

class SmartAgentService {
  private baseUrl = config.openai.baseUrl;
  private apiKey = config.openai.apiKey;
  private model = config.openai.model;

  /**
   * Check if OpenAI is configured (for LLM synthesis).
   * The agent still works without it — just skips LLM synthesis.
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Main entry: process a user message and return a rich response.
   */
  async processMessage(
    userMessage: string,
    preferences?: UserPreferences
  ): Promise<SmartAgentResponse> {
    try {
      // First try regex-based intent detection (fast, no API call)
      let intent = this.detectIntent(userMessage);

      // If the query looks conversational and LLM is available,
      // use LLM to extract better search terms
      if (
        intent.type === 'search' &&
        this.isConfigured() &&
        this.isConversational(userMessage)
      ) {
        const llmTerms = await this.llmExtractSearchTerms(userMessage);
        if (llmTerms) {
          intent = { ...intent, searchTerms: llmTerms };
        }
      }

      switch (intent.type) {
        case 'compare':
          return await this.handleCompare(intent.repos);
        case 'health':
          return await this.handleHealthCheck(intent.repo);
        case 'alternatives':
          return await this.handleAlternatives(intent.repo);
        case 'trending':
          return await this.handleTrending(intent.language, intent.period);
        case 'search':
          return await this.handleSearch(intent.searchTerms, intent.language, intent.minStars, preferences);
        case 'general':
        default:
          return await this.handleSearch(intent.query, undefined, undefined, preferences);
      }
    } catch (error) {
      console.error('Smart agent error:', error);
      return {
        type: 'text',
        text: 'Something went wrong while processing your request. Please try again.',
        actions: ['Try again'],
      };
    }
  }

  /**
   * Check if the query looks conversational (vs. a simple keyword search).
   * Conversational queries are longer, contain pronouns, greetings, etc.
   */
  private isConversational(query: string): boolean {
    const lower = query.toLowerCase();
    const wordCount = query.split(/\s+/).length;

    // Short queries (1-4 words) are likely direct search terms
    if (wordCount <= 4) return false;

    // Check for conversational markers
    const markers = [
      /^(hi|hey|hello|yo)\b/i,
      /\b(i'm|i am|i want|i need|i wanna|can you|could you|please|suggest|recommend)\b/i,
      /\b(how do i|what should|which one|tell me|show me|help me)\b/i,
      /\b(building|working on|looking for|trying to)\b/i,
      /\?\s*$/,  // Ends with question mark
    ];

    return markers.some(m => m.test(lower)) || wordCount >= 8;
  }

  /**
   * Use LLM to extract concise search terms from a conversational query.
   * Returns null if extraction fails (falls back to regex extraction).
   */
  private async llmExtractSearchTerms(query: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'Extract 2-5 concise GitHub search keywords from the user\'s message. ' +
                'Return ONLY the keywords, nothing else. No explanation, no formatting. ' +
                'Focus on technologies, tools, concepts, and project types. ' +
                'Example: "I want to build a chat app with React" → "react chat application real-time"',
            },
            { role: 'user', content: query },
          ],
          temperature: 0.2,
          max_tokens: 50,
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const terms = data.choices?.[0]?.message?.content?.trim();

      // Validate: should be short (under 60 chars) and not look like a full sentence
      if (terms && terms.length < 60 && terms.split(/\s+/).length <= 8) {
        return terms;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ── Intent detection ─────────────────────────────────────────

  /**
   * Detect user intent from natural language.
   * Uses regex-based patterns — no LLM call needed for routing.
   */
  private detectIntent(query: string): QueryIntent {
    const q = query.trim();
    const lower = q.toLowerCase();

    // ── Compare intent: "compare X vs Y" or "X vs Y"
    const comparePatterns = [
      /compare\s+(.+?)\s+(?:vs|versus|and|with)\s+(.+)/i,
      /(.+?)\s+(?:vs|versus)\s+(.+)/i,
      /(?:which is better|difference between)\s+(.+?)\s+(?:and|or|vs)\s+(.+)/i,
    ];
    for (const pattern of comparePatterns) {
      const match = q.match(pattern);
      if (match) {
        const repos = this.parseRepoNames(match[1], match[2]);
        if (repos.length >= 2) return { type: 'compare', repos };
      }
    }

    // ── Health check intent: "health of X", "is X maintained?", "how healthy is X"
    const healthPatterns = [
      /(?:health|score|status|maintained|active|alive)\s+(?:of|for|check)?\s*(.+)/i,
      /(?:is|how)\s+(.+?)\s+(?:maintained|active|healthy|alive|good)/i,
      /(?:analyze|check|inspect|review)\s+(.+)/i,
    ];
    for (const pattern of healthPatterns) {
      const match = q.match(pattern);
      if (match) {
        const repoName = this.cleanRepoName(match[1]);
        if (repoName.includes('/')) return { type: 'health', repo: repoName };
      }
    }

    // ── Alternatives intent: "alternatives to X", "like X but", "similar to X"
    const altPatterns = [
      /(?:alternatives?|replacement|substitute|similar|like)\s+(?:to|for)?\s*(.+)/i,
      /(?:what can i use instead of|something like|repos? like)\s+(.+)/i,
    ];
    for (const pattern of altPatterns) {
      const match = q.match(pattern);
      if (match) {
        const repoName = this.cleanRepoName(match[1]);
        if (repoName.includes('/')) return { type: 'alternatives', repo: repoName };
      }
    }

    // ── Trending intent
    const trendingMatch = lower.match(
      /(?:trending|popular|hot|rising|new)\s*(?:repos?|repositories?|projects?)?\s*(?:in|for)?\s*([\w#+.]*)/i
    );
    if (trendingMatch || lower.includes('trending') || lower.includes('rising stars')) {
      return {
        type: 'trending',
        language: trendingMatch?.[1] || undefined,
        period: lower.includes('week') ? 'weekly' : lower.includes('month') ? 'monthly' : 'daily',
      };
    }

    // ── Search intent (default)
    // Extract language hints
    const languageHints: Record<string, string> = {
      typescript: 'TypeScript', javascript: 'JavaScript', python: 'Python',
      rust: 'Rust', go: 'Go', java: 'Java', kotlin: 'Kotlin', swift: 'Swift',
      dart: 'Dart', ruby: 'Ruby', php: 'PHP', 'c#': 'C#', 'c++': 'C++',
      react: 'TypeScript', nextjs: 'TypeScript', vue: 'JavaScript',
      angular: 'TypeScript', svelte: 'JavaScript', flutter: 'Dart',
    };

    let detectedLanguage: string | undefined;
    for (const [keyword, lang] of Object.entries(languageHints)) {
      if (lower.includes(keyword)) {
        detectedLanguage = lang;
        break;
      }
    }

    // Extract meaningful search keywords from conversational queries
    const searchTerms = this.extractSearchTerms(q);

    return {
      type: 'search',
      searchTerms,
      language: detectedLanguage,
    };
  }

  // ── Keyword extraction ──────────────────────────────────────

  /**
   * Extract meaningful search keywords from a conversational query.
   * Strips greetings, filler words, question patterns, and stop words
   * to produce a concise GitHub-search-friendly query.
   *
   * Example: "hi I'm building repoverse and i wanna make recommendation system
   *           of github repos ... so can you suggest some repos that i can use"
   * → "recommendation system github repos"
   */
  private extractSearchTerms(query: string): string {
    let q = query;

    // 1) Remove greeting patterns
    q = q.replace(/^(hi|hey|hello|yo|sup|hola|howdy|greetings)[,!.\s]*/i, '');

    // 2) Remove "I'm building X" preambles — but keep the project-type context
    q = q.replace(/i(?:'m| am)\s+(?:building|making|creating|working on|developing)\s+(?:a\s+)?(?:\w+\s+)?(?:and|but)?\s*/gi, '');

    // 3) Remove polite request patterns
    q = q.replace(/(?:can you|could you|please|would you|i want you to|i need you to|i'd like you to)\s*/gi, '');
    q = q.replace(/(?:suggest|recommend|find|show|give|list|tell)\s*(?:me|us)?\s*(?:some|a few|the best|good)?\s*/gi, '');

    // 4) Remove filler phrases
    q = q.replace(/(?:i wanna|i want to|i need to|i'd like to|i would like to)\s*/gi, '');
    q = q.replace(/(?:that i can use|that we can use|that would be|to use for this)\s*/gi, '');
    q = q.replace(/(?:so\s+)?(?:can you|could you)\s*/gi, '');
    q = q.replace(/\.\.\./g, ' ');

    // 5) Remove stop words (keep technical terms)
    const stopWords = new Set([
      'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'the', 'a', 'an',
      'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'shall', 'would', 'should',
      'may', 'might', 'must', 'can', 'could',
      'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither',
      'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'about', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
      'if', 'then', 'than', 'when', 'where', 'how', 'what', 'which', 'who', 'whom',
      'this', 'that', 'these', 'those', 'there', 'here',
      'some', 'any', 'many', 'few', 'more', 'most', 'all', 'each', 'every',
      'also', 'just', 'very', 'really', 'quite', 'too', 'enough', 'even',
      'like', 'want', 'need', 'make', 'use', 'get', 'know', 'think', 'look',
      'help', 'try', 'ask', 'tell', 'give', 'take', 'come', 'go', 'see',
      'good', 'best', 'great', 'nice', 'cool', 'awesome',
      'please', 'thanks', 'thank', 'hi', 'hey', 'hello',
      'something', 'anything', 'nothing', 'everything',
      'im', 'ive', 'dont', 'doesnt', 'wanna', 'gonna',
    ]);

    const words = q
      .replace(/[^\w\s#+.-]/g, ' ')   // Keep # + . - for tech terms
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w.toLowerCase()))
      .map(w => w.trim())
      .filter(Boolean);

    // 6) Deduplicate while preserving order
    const seen = new Set<string>();
    const unique = words.filter(w => {
      const low = w.toLowerCase();
      if (seen.has(low)) return false;
      seen.add(low);
      return true;
    });

    // 7) If we still have too many words (>6), keep first 6 (most relevant)
    const result = unique.slice(0, 6).join(' ');

    // 8) If extraction left us with nothing, fall back to the original query
    //    but still cleaned up (first 8 significant words)
    if (result.length < 3) {
      const fallback = query
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 8)
        .join(' ');
      return fallback || query;
    }

    return result;
  }

  // ── Intent handlers ──────────────────────────────────────────

  private async handleSearch(
    query: string,
    language?: string,
    minStars?: number,
    preferences?: UserPreferences
  ): Promise<SmartAgentResponse> {
    // Multi-strategy search: try progressively broader queries
    let repos = await githubEnhancedService.smartSearch(query, {
      language,
      limit: 8,
      minStars: minStars || 20,
    });

    // Strategy 2: If no results, try with fewer keywords (first 3 words)
    if (repos.length === 0) {
      const shorterQuery = query.split(/\s+/).slice(0, 3).join(' ');
      if (shorterQuery !== query && shorterQuery.length >= 3) {
        repos = await githubEnhancedService.smartSearch(shorterQuery, {
          language,
          limit: 8,
          minStars: 10,
        });
      }
    }

    // Strategy 3: If still no results, try each significant keyword individually
    if (repos.length === 0) {
      const keywords = query.split(/\s+/).filter(w => w.length > 3);
      for (const kw of keywords.slice(0, 3)) {
        const kwRepos = await githubEnhancedService.smartSearch(kw, {
          language,
          sort: 'stars',
          limit: 4,
          minStars: 50,
        });
        repos.push(...kwRepos);
        if (repos.length >= 6) break;
      }
      // Deduplicate
      const seen = new Set<string>();
      repos = repos.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    }

    // Strategy 4: Try best-match sort instead of stars
    if (repos.length === 0) {
      repos = await githubEnhancedService.smartSearch(query, {
        language,
        sort: 'best-match',
        limit: 8,
        minStars: 5,
      });
    }

    if (repos.length === 0) {
      return {
        type: 'text',
        text: `I couldn't find repositories for that query. Try being more specific — for example, "react state management" or "python web scraping".`,
        actions: ['Try different terms', 'Search trending instead'],
      };
    }

    // Step 2: Fetch health scores for top results (parallel, limited to top 5 for speed)
    const scoredRepos = await this.enrichWithHealthScores(repos.slice(0, 6));

    // Step 3: Sort by health score (not just stars)
    scoredRepos.sort((a, b) => b.healthScore.overall - a.healthScore.overall);

    // Step 4: Generate response text
    const text = await this.generateSearchSummary(query, scoredRepos);

    return {
      type: 'recommendations',
      text,
      recommendations: scoredRepos,
      actions: this.getRecommendationActions(scoredRepos),
    };
  }

  private async handleCompare(repos: string[]): Promise<SmartAgentResponse> {
    const comparison = await repoComparisonService.compare(repos);

    if (!comparison) {
      return {
        type: 'text',
        text: `I couldn't compare those repositories. Make sure you're using the format "owner/repo" (e.g., "facebook/react vs vuejs/vue").`,
        actions: ['Try again'],
      };
    }

    return {
      type: 'comparison',
      text: comparison.verdict,
      comparison,
      actions: comparison.repos.map((r) => `Alternatives to ${r.fullName}`),
    };
  }

  private async handleHealthCheck(repoName: string): Promise<SmartAgentResponse> {
    const signals = await githubEnhancedService.getHealthSignals(repoName);

    if (!signals) {
      return {
        type: 'text',
        text: `I couldn't find or analyze "${repoName}". Make sure the repository exists (format: owner/repo).`,
        actions: ['Try again'],
      };
    }

    const healthScore = repoHealthScoreService.calculate(signals);

    return {
      type: 'health-report',
      text: `**${repoName}** — Health Score: ${healthScore.overall}/100 (${healthScore.grade})`,
      healthReport: { ...healthScore, repoName },
      actions: [`Alternatives to ${repoName}`, `Compare ${repoName} with...`],
    };
  }

  private async handleAlternatives(repoName: string): Promise<SmartAgentResponse> {
    const alternatives = await githubEnhancedService.findAlternatives(repoName);

    if (alternatives.length === 0) {
      return {
        type: 'text',
        text: `I couldn't find alternatives to "${repoName}". The repo might be too niche or unique.`,
        actions: [`Health of ${repoName}`, 'Search for something else'],
      };
    }

    // Enrich with health scores
    const scored = await this.enrichWithHealthScores(alternatives.slice(0, 6));
    scored.sort((a, b) => b.healthScore.overall - a.healthScore.overall);

    const text = `Here are alternatives to **${repoName}**, ranked by health score:`;

    return {
      type: 'alternatives',
      text,
      recommendations: scored,
      actions: [`Compare top 2`, `Health of ${repoName}`],
    };
  }

  private async handleTrending(language?: string, period?: string): Promise<SmartAgentResponse> {
    let query = 'stars:>100';
    const now = new Date();

    if (period === 'weekly') {
      now.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      now.setMonth(now.getMonth() - 1);
    } else {
      now.setDate(now.getDate() - 1);
    }

    query += ` pushed:>${now.toISOString().split('T')[0]}`;

    const repos = await githubEnhancedService.smartSearch(query, {
      language,
      sort: 'stars',
      limit: 8,
      minStars: 50,
    });

    const scored = await this.enrichWithHealthScores(repos.slice(0, 6));
    scored.sort((a, b) => b.starVelocity - a.starVelocity);

    const langLabel = language ? ` in ${language}` : '';
    const text = `Here are the trending repos${langLabel} (${period || 'daily'}):`;

    return {
      type: 'recommendations',
      text,
      recommendations: scored,
      actions: ['Weekly trending', 'Monthly trending'],
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  /**
   * Enrich repositories with health scores.
   * Fetches signals in parallel for speed.
   */
  private async enrichWithHealthScores(repos: Repository[]): Promise<ScoredRepository[]> {
    const results = await Promise.allSettled(
      repos.map(async (repo) => {
        const signals = await githubEnhancedService.getHealthSignals(repo.fullName);
        if (!signals) {
          // Return a minimal score if we can't fetch signals
          return {
            ...repo,
            healthScore: this.fallbackScore(repo),
            starVelocity: 0,
          } as ScoredRepository;
        }

        const healthScore = repoHealthScoreService.calculate(signals);
        const ageDays = Math.max(1, (Date.now() - new Date(signals.createdAt).getTime()) / 86400000);
        const starVelocity = Math.round((signals.stars / ageDays) * 30);

        return { ...repo, healthScore, starVelocity } as ScoredRepository;
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ScoredRepository> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  /** Fallback score when we can't fetch full signals */
  private fallbackScore(repo: Repository): RepoHealthScore {
    const starScore = Math.min(100, Math.round(Math.log10(Math.max(1, repo.stars)) * 25));
    return {
      overall: starScore,
      grade: starScore >= 75 ? 'B+' : starScore >= 50 ? 'C+' : 'D',
      breakdown: {
        popularity: starScore,
        activity: 50,
        maintenance: 50,
        community: 50,
        documentation: 50,
        maturity: 50,
      },
      signals: {} as any,
      summary: `${repo.stars.toLocaleString()} stars. Health data unavailable — showing estimate.`,
    };
  }

  /**
   * Generate a human-readable search summary.
   * Uses LLM if configured; otherwise uses a template.
   */
  private async generateSearchSummary(
    query: string,
    repos: ScoredRepository[]
  ): Promise<string> {
    if (!this.isConfigured() || repos.length === 0) {
      return this.templateSummary(query, repos);
    }

    try {
      const repoSummaries = repos.slice(0, 5).map((r, i) =>
        `${i + 1}. ${r.fullName} — ${r.stars.toLocaleString()} stars, ` +
        `health: ${r.healthScore.overall}/100 (${r.healthScore.grade}), ` +
        `${r.starVelocity} stars/month. ${r.description}`
      ).join('\n');

      const prompt = `You are RepoVerse's AI agent. The user searched: "${query}"

Here are the top results (ranked by health score, not just stars):
${repoSummaries}

Write a 2-3 sentence summary explaining why these repos are good choices. Be specific about what makes each one stand out. Mention health scores. Be concise and conversational — no fluff.`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a helpful GitHub repository discovery agent. Be concise and specific.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.6,
          max_tokens: 300,
        }),
      });

      if (!response.ok) throw new Error('LLM request failed');
      const data = await response.json();
      return data.choices?.[0]?.message?.content || this.templateSummary(query, repos);
    } catch {
      return this.templateSummary(query, repos);
    }
  }

  private templateSummary(query: string, repos: ScoredRepository[]): string {
    if (repos.length === 0) return `No results found for "${query}".`;

    const best = repos[0];
    const avgHealth = Math.round(
      repos.reduce((sum, r) => sum + r.healthScore.overall, 0) / repos.length
    );

    return (
      `Found ${repos.length} repositories ranked by health score (avg: ${avgHealth}/100). ` +
      `**${best.fullName}** leads with a ${best.healthScore.grade} grade ` +
      `(${best.healthScore.overall}/100) and ${best.stars.toLocaleString()} stars.`
    );
  }

  /** Parse repo names from comparison query */
  private parseRepoNames(...parts: string[]): string[] {
    const repos: string[] = [];
    for (const part of parts) {
      // Split by commas or "and"
      const segments = part.split(/[,&]|\s+and\s+/).map((s) => s.trim());
      for (const seg of segments) {
        const cleaned = this.cleanRepoName(seg);
        if (cleaned.includes('/')) repos.push(cleaned);
      }
    }
    return repos;
  }

  /** Clean up a repo name string */
  private cleanRepoName(input: string): string {
    return input
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^https?:\/\/github\.com\//i, '') // Remove GitHub URL prefix
      .replace(/\.git$/i, '') // Remove .git suffix
      .replace(/^@/, '') // Remove @ prefix
      .trim();
  }

  /** Generate smart action buttons based on results */
  private getRecommendationActions(repos: ScoredRepository[]): string[] {
    const actions: string[] = [];

    if (repos.length >= 2) {
      actions.push(`Compare ${repos[0].fullName} vs ${repos[1].fullName}`);
    }
    if (repos.length > 0) {
      actions.push(`Alternatives to ${repos[0].fullName}`);
      actions.push(`Health of ${repos[0].fullName}`);
    }

    return actions;
  }
}

export const smartAgentService = new SmartAgentService();

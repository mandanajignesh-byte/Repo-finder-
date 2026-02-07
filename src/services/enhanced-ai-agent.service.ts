/**
 * Enhanced AI Agent Service
 * Orchestrator that uses tools, planning, and reasoning to provide
 * better-than-LLM GitHub repository recommendations
 */

import { config } from '@/lib/config';
import { Repository, UserPreferences, Recommendation } from '@/lib/types';
import { ToolExecutor, AI_AGENT_TOOLS, ToolCall } from './ai-agent-tools';
import { supabaseService } from './supabase.service';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type GoalType =
  | 'learn-concepts'
  | 'ship-feature-fast'
  | 'explore-best-practices'
  | 'copy-and-adapt';

export interface FeatureRequestContext {
  featureDescription: string;
  techStack?: string;
  platform?: string[];
  language?: string;
  experienceLevel?: ExperienceLevel;
  goalType?: GoalType;
}

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
}

export interface ClarificationQuestion {
  id: 'techStack' | 'platform' | 'language' | 'experienceLevel' | 'goalType';
  question: string;
  multiSelect?: boolean;
  options: ClarificationOption[];
}

export type ClarificationAnswers = Record<string, string | string[]>;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

interface AgentResponse {
  text: string;
  recommendations: Recommendation[];
  reasoning?: string;
  tools_used?: string[];
  confidence?: number;
  clarificationQuestions?: ClarificationQuestion[];
  featureContext?: FeatureRequestContext;
}

class EnhancedAIAgentService {
  private baseUrl = config.openai.baseUrl;
  private apiKey = config.openai.apiKey;
  private model = config.openai.model;

  /**
   * Check if AI service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Main entry point: Get intelligent recommendations with reasoning
   */
  async getRecommendations(
    userQuery: string,
    preferences?: UserPreferences,
    featureContext?: FeatureRequestContext,
    clarificationAnswers?: ClarificationAnswers
  ): Promise<AgentResponse> {
    if (!this.isConfigured()) {
      return this.getFallbackResponse(userQuery, preferences);
    }

    try {
      const userId = await supabaseService.getOrCreateUserId();
      const executor = new ToolExecutor(userId, preferences || {});

       // Feature builder flow with slot filling
      if (this.isFeatureBuilderQuery(userQuery)) {
        const {
          context,
          questions,
        } = this.buildFeatureContext(userQuery, preferences, featureContext, clarificationAnswers);

        // If we still need more information, ask clarification questions instead of searching
        if (questions.length > 0) {
          return {
            text: 'To recommend the best repos for this feature, I need a bit more info. Please choose from the options below.',
            recommendations: [],
            reasoning: 'Collecting core slots (tech stack, platform, language, experience, goal) before searching',
            tools_used: [],
            confidence: 0.0,
            clarificationQuestions: questions,
            featureContext: context,
          };
        }

        // We have enough context → run a targeted search without an extra planning LLM call
        const goal = this.buildGoalFromContext(context);

        const searchResult = await executor.executeTool({
          name: 'search_repos_by_need',
          arguments: {
            goal,
            tech_stack: context.techStack ? [context.techStack] : undefined,
            difficulty: context.experienceLevel,
            limit: 10,
          },
        });

        const toolResults = [{
          tool: 'search_repos_by_need',
          result: searchResult.success ? searchResult.data : null,
          reasoning: searchResult.reasoning,
        }];

        const response = await this.synthesizeResponse(
          goal,
          toolResults,
          preferences,
          ['search_repos_by_need']
        );

        response.featureContext = context;
        return response;
      }

      // Step 1: Planning - Let AI decide which tools to use
      const plan = await this.planToolUsage(userQuery, preferences);
      
      // Step 2: Execute tools
      const toolResults: Array<{ tool: string; result: any; reasoning?: string }> = [];
      const toolsUsed: string[] = [];

      for (const toolCall of plan.toolCalls) {
        toolsUsed.push(toolCall.name);
        const result = await executor.executeTool(toolCall);
        toolResults.push({
          tool: toolCall.name,
          result: result.success ? result.data : null,
          reasoning: result.reasoning,
        });
      }

      // Step 3: Synthesize final answer with reasoning
      const response = await this.synthesizeResponse(
        userQuery,
        toolResults,
        preferences,
        toolsUsed
      );

      return response;
    } catch (error) {
      console.error('Error in enhanced AI agent:', error);
      return this.getFallbackResponse(userQuery, preferences);
    }
  }

  /**
   * Step 1: Plan which tools to use based on user query
   */
  private async planToolUsage(
    userQuery: string,
    preferences?: UserPreferences
  ): Promise<{ toolCalls: ToolCall[]; reasoning: string }> {
    const systemPrompt = this.buildPlanningPrompt(preferences);
    const userPrompt = `User query: "${userQuery}"

Based on this query, decide which tools to use and in what order. Return a JSON object with:
{
  "reasoning": "Why you chose these tools",
  "tool_calls": [
    {
      "name": "tool_name",
      "arguments": { "param": "value" }
    }
  ]
}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3, // Lower temperature for more consistent planning
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      const plan = JSON.parse(content);

      // Parse tool calls
      const toolCalls: ToolCall[] = (plan.tool_calls || []).map((tc: any) => ({
        name: tc.name,
        arguments: tc.arguments || {},
      }));

      // Default: if no tools planned, use search
      // Only use what's explicitly in the user query - no preferences
      if (toolCalls.length === 0) {
        toolCalls.push({
          name: 'search_repos_by_need',
          arguments: {
            goal: userQuery,
            limit: 10,
          },
        });
      }

      return {
        toolCalls,
        reasoning: plan.reasoning || 'Using default search strategy',
      };
    } catch (error) {
      console.error('Error in planning:', error);
      // Fallback: simple search - only use user query, no preferences
      return {
        toolCalls: [{
          name: 'search_repos_by_need',
          arguments: {
            goal: userQuery,
            limit: 10,
          },
        }],
        reasoning: 'Using fallback search strategy',
      };
    }
  }

  /**
   * Step 2: Synthesize final response from tool results
   */
  private async synthesizeResponse(
    userQuery: string,
    toolResults: Array<{ tool: string; result: any; reasoning?: string }>,
    preferences?: UserPreferences,
    toolsUsed: string[] = []
  ): Promise<AgentResponse> {
    const systemPrompt = this.buildSynthesisPrompt(preferences);
    
    // Format tool results for AI (defensively handle partial/undefined repo rows)
    const toolResultsText = toolResults.map((tr, idx) => {
      const rawRepos: any[] = Array.isArray(tr.result) ? tr.result : tr.result?.repos || [];
      const repos = (rawRepos as (Repository | null | undefined)[])
        .filter((r): r is Repository => !!r);

      const repoList = repos
        .slice(0, 10)
        .map((repo: Repository, i: number) => {
          const name = repo.fullName || repo.name || 'Unknown repository';
          const stars = typeof repo.stars === 'number' ? repo.stars : 0;
          const fit = typeof repo.fitScore === 'number' ? repo.fitScore : 'N/A';
          const desc = repo.description || '';
          return `${i + 1}. ${name} (${stars} stars, fit: ${fit}) - ${desc}`;
        })
        .join('\n');

      return `Tool ${idx + 1}: ${tr.tool}
Reasoning: ${tr.reasoning || 'N/A'}
Results:
${repoList || 'No results'}
---`;
    }).join('\n\n');

    const userPrompt = `User query: "${userQuery}"

Tool execution results:
${toolResultsText}

Based on these results, provide:
1. A natural, helpful response explaining the recommendations
2. Why these repos are good fits
3. Any tradeoffs or considerations
4. Next steps the user should take

Return JSON:
{
  "text": "Your natural language response",
  "recommendations": [
    {
      "name": "owner/repo",
      "description": "Brief description",
      "reason": "Why this fits",
      "url": "https://github.com/...",
      "stars": 1234,
      "fitScore": 85
    }
  ],
  "reasoning": "Your internal reasoning process",
  "confidence": 0.95
}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      const parsed = JSON.parse(content);

      // Extract repos from tool results
      const allRepos: Repository[] = [];
      for (const tr of toolResults) {
        if (Array.isArray(tr.result)) {
          allRepos.push(...(tr.result as (Repository | null | undefined)[]).filter((r): r is Repository => !!r));
        } else if (tr.result?.repos) {
          allRepos.push(...(tr.result.repos as (Repository | null | undefined)[]).filter((r): r is Repository => !!r));
        }
      }

      // Match recommendations with actual repo data
      const recommendations: Recommendation[] = (parsed.recommendations || []).map((rec: any) => {
        const repo = allRepos.find(r => 
          r.fullName === rec.name || 
          r.id === rec.name ||
          r.name === rec.name.split('/')[1]
        );
        
        return {
          name: rec.name || repo?.fullName || 'Unknown',
          description: rec.description || repo?.description || '',
          reason: rec.reason || 'Recommended based on your needs',
          url: rec.url || repo?.url || '',
          stars: rec.stars || repo?.stars || 0,
          fitScore: rec.fitScore || repo?.fitScore,
        };
      });

      return {
        text: parsed.text || 'Here are my recommendations:',
        recommendations,
        reasoning: parsed.reasoning,
        tools_used: toolsUsed,
        confidence: parsed.confidence || 0.8,
      };
    } catch (error) {
      console.error('Error synthesizing response:', error);
      // Fallback: use tool results directly
      const allRepos: Repository[] = [];
      for (const tr of toolResults) {
        if (Array.isArray(tr.result)) {
          allRepos.push(...tr.result);
        }
      }

      return {
        text: `Based on your query "${userQuery}", here are ${allRepos.length} repositories I found:`,
        recommendations: allRepos.slice(0, 5).map(repo => ({
          name: repo.fullName,
          description: repo.description || '',
          reason: `Fit score: ${repo.fitScore || 'N/A'}, ${repo.stars} stars`,
          url: repo.url,
          stars: repo.stars,
          fitScore: repo.fitScore,
        })),
        tools_used: toolsUsed,
        confidence: 0.6,
      };
    }
  }

  /**
   * Build planning prompt
   * No longer includes user preferences - only uses what user explicitly asks for
   */
  private buildPlanningPrompt(preferences?: UserPreferences): string {
    const toolsDescription = AI_AGENT_TOOLS.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    let prompt = `You are RepoVerse's intelligent GitHub universe navigator. Your job is to help users find the perfect repositories by searching GitHub directly.

You have access to these powerful tools:
${toolsDescription}

Your strategy:
1. Analyze the user's query to understand their intent
2. Choose the right tools (1-3 tools usually sufficient)
3. Extract explicit requirements from the user's query (tech stack, goals, etc.)
4. Plan tool execution order (some tools depend on others)
5. Only use information explicitly mentioned in the user's query - do not use profile preferences

Return a JSON object with your plan.`;

    return prompt;
  }

  /**
   * Build synthesis prompt
   * No longer includes user preferences - only uses what user explicitly asked for
   */
  private buildSynthesisPrompt(preferences?: UserPreferences): string {
    let prompt = `You are RepoVerse's intelligent GitHub universe navigator. You've executed tools and gathered repository data by searching GitHub directly.

Your job is to synthesize a helpful response that:
1. Explains WHY each recommendation fits the user's explicit needs (from their query)
2. Highlights tradeoffs (e.g., "This is production-ready but complex")
3. Provides actionable next steps
4. Is honest about limitations or alternatives

Be specific and helpful. Don't just list repos - explain the journey based on what the user explicitly asked for.`;

    return prompt;
  }

  /**
   * Detect if the query looks like a feature-building request
   */
  private isFeatureBuilderQuery(userQuery: string): boolean {
    const q = userQuery.toLowerCase();
    const builders = [
      'i am building',
      "i'm building",
      'i want to build',
      'i want to add',
      'i want to create',
      'help me build',
      'add this feature',
      'build this feature',
      'implement this feature',
    ];

    return builders.some((p) => q.includes(p));
  }

  /**
   * Build or refine the feature request context and derive clarification questions
   */
  private buildFeatureContext(
    userQuery: string,
    preferences?: UserPreferences,
    existingContext?: FeatureRequestContext,
    clarificationAnswers?: ClarificationAnswers
  ): { context: FeatureRequestContext; questions: ClarificationQuestion[] } {
    const base: FeatureRequestContext = existingContext || {
      featureDescription: userQuery.trim(),
    };

    const context: FeatureRequestContext = { ...base };

    // No longer using preferences as defaults - only use what's explicitly provided

    // 2) Infer from free-text query
    const lower = userQuery.toLowerCase();

    if (!context.platform || context.platform.length === 0) {
      const platforms: string[] = [];
      if (lower.includes('mobile') || lower.includes('android') || lower.includes('ios')) {
        platforms.push('mobile');
      }
      if (lower.includes('web') || lower.includes('dashboard') || lower.includes('website')) {
        platforms.push('web');
      }
      if (lower.includes('api') || lower.includes('backend')) {
        platforms.push('backend');
      }
      context.platform = platforms.length ? platforms : context.platform;
    }

    if (!context.language) {
      const languageKeywords: { keyword: string; lang: string }[] = [
        { keyword: 'typescript', lang: 'typescript' },
        { keyword: 'ts ', lang: 'typescript' },
        { keyword: 'javascript', lang: 'javascript' },
        { keyword: 'js ', lang: 'javascript' },
        { keyword: 'python', lang: 'python' },
        { keyword: 'dart', lang: 'dart' },
        { keyword: 'kotlin', lang: 'kotlin' },
        { keyword: 'swift', lang: 'swift' },
      ];
      const found = languageKeywords.find((entry) => lower.includes(entry.keyword));
      if (found) {
        context.language = found.lang;
      } else if (context.techStack === 'nextjs' || context.techStack === 'react') {
        context.language = 'typescript';
      }
    }

    if (!context.techStack) {
      const stackKeywords: { keyword: string; stack: string }[] = [
        { keyword: 'next', stack: 'nextjs' },
        { keyword: 'react native', stack: 'react-native' },
        { keyword: 'react', stack: 'react' },
        { keyword: 'flutter', stack: 'flutter' },
        { keyword: 'vue', stack: 'vue' },
        { keyword: 'angular', stack: 'angular' },
        { keyword: 'node', stack: 'node-express' },
        { keyword: 'nestjs', stack: 'nestjs' },
      ];
      const found = stackKeywords.find((entry) => lower.includes(entry.keyword));
      if (found) {
        context.techStack = found.stack;
      }
    }

    if (!context.experienceLevel) {
      if (lower.includes('beginner') || lower.includes('new to')) {
        context.experienceLevel = 'beginner';
      } else if (lower.includes('advanced') || lower.includes('senior')) {
        context.experienceLevel = 'advanced';
      } else {
        context.experienceLevel = 'intermediate';
      }
    }

    if (!context.goalType) {
      if (lower.includes('learn') || lower.includes('understand')) {
        context.goalType = 'learn-concepts';
      } else if (lower.includes('ship') || lower.includes('launch') || lower.includes('production')) {
        context.goalType = 'ship-feature-fast';
      } else {
        context.goalType = 'ship-feature-fast';
      }
    }

    // 3) Apply explicit clarification answers (override everything)
    if (clarificationAnswers) {
      Object.entries(clarificationAnswers).forEach(([key, value]) => {
        switch (key) {
          case 'techStack':
            context.techStack = Array.isArray(value) ? value[0] : value;
            break;
          case 'platform':
            context.platform = Array.isArray(value) ? value : [value];
            break;
          case 'language':
            context.language = Array.isArray(value) ? value[0] : value;
            break;
          case 'experienceLevel':
            context.experienceLevel = (Array.isArray(value) ? value[0] : value) as ExperienceLevel;
            break;
          case 'goalType':
            context.goalType = (Array.isArray(value) ? value[0] : value) as GoalType;
            break;
          default:
            break;
        }
      });
    }

    // 4) Determine which core slots are still missing
    const questions: ClarificationQuestion[] = [];

    if (!context.techStack) {
      questions.push({
        id: 'techStack',
        question: 'What tech stack are you using (or want to use) for this feature?',
        multiSelect: false,
        options: [
          { id: 'nextjs', label: 'Next.js (React + TypeScript)' },
          { id: 'react', label: 'React SPA' },
          { id: 'react-native', label: 'React Native' },
          { id: 'flutter', label: 'Flutter' },
          { id: 'vue', label: 'Vue' },
          { id: 'angular', label: 'Angular' },
          { id: 'node-express', label: 'Node.js (Express)' },
          { id: 'nestjs', label: 'NestJS' },
          { id: 'other', label: 'Other / not sure' },
        ],
      });
    }

    if (!context.platform || context.platform.length === 0) {
      questions.push({
        id: 'platform',
        question: 'Where will this feature run?',
        multiSelect: true,
        options: [
          { id: 'web', label: 'Web app' },
          { id: 'mobile', label: 'Mobile app' },
          { id: 'desktop', label: 'Desktop app' },
          { id: 'backend', label: 'Backend / API only' },
        ],
      });
    }

    if (!context.language) {
      questions.push({
        id: 'language',
        question: 'What is your primary programming language for this feature?',
        multiSelect: false,
        options: [
          { id: 'typescript', label: 'TypeScript' },
          { id: 'javascript', label: 'JavaScript' },
          { id: 'python', label: 'Python' },
          { id: 'dart', label: 'Dart' },
          { id: 'kotlin', label: 'Kotlin' },
          { id: 'swift', label: 'Swift' },
          { id: 'other', label: 'Other / not sure' },
        ],
      });
    }

    if (!context.experienceLevel) {
      questions.push({
        id: 'experienceLevel',
        question: 'What is your experience level with this stack?',
        multiSelect: false,
        options: [
          { id: 'beginner', label: 'Beginner' },
          { id: 'intermediate', label: 'Intermediate' },
          { id: 'advanced', label: 'Advanced' },
        ],
      });
    }

    if (!context.goalType) {
      questions.push({
        id: 'goalType',
        question: 'What is your main goal right now?',
        multiSelect: false,
        options: [
          { id: 'learn-concepts', label: 'Learn concepts and patterns' },
          { id: 'ship-feature-fast', label: 'Ship this feature as fast as possible' },
          { id: 'explore-best-practices', label: 'See best-practice architectures' },
          { id: 'copy-and-adapt', label: 'Copy a good repo and adapt it' },
        ],
      });
    }

    // To avoid overwhelming the user, only ask at most 3 questions in one round
    const limitedQuestions = questions.slice(0, 3);

    return { context, questions: limitedQuestions };
  }

  /**
   * Build a focused goal string for repo search from the feature context
   */
  private buildGoalFromContext(context: FeatureRequestContext): string {
    const parts: string[] = [];

    parts.push(context.featureDescription);

    if (context.techStack) {
      parts.push(`tech stack: ${context.techStack}`);
    }

    if (context.platform && context.platform.length > 0) {
      parts.push(`platform: ${context.platform.join(', ')}`);
    }

    if (context.language) {
      parts.push(`language: ${context.language}`);
    }

    if (context.experienceLevel) {
      parts.push(`experience: ${context.experienceLevel}`);
    }

    if (context.goalType) {
      parts.push(`goal: ${context.goalType}`);
    }

    return parts.join(' | ');
  }

  /**
   * Fallback response when AI is not configured
   */
  private async getFallbackResponse(
    userQuery: string,
    preferences?: UserPreferences
  ): Promise<AgentResponse> {
    // Use basic search
    const executor = new ToolExecutor(
      await supabaseService.getOrCreateUserId(),
      preferences || {}
    );

    const result = await executor.executeTool({
      name: 'search_repos_by_need',
      arguments: {
        goal: userQuery,
        limit: 5,
      },
    });

    const repos = result.success && Array.isArray(result.data) ? result.data : [];

    return {
      text: `I found ${repos.length} repositories matching your query. Here are my recommendations:`,
      recommendations: repos.slice(0, 5).map(repo => ({
        name: repo.fullName,
        description: repo.description || '',
        reason: `Fit score: ${repo.fitScore || 'N/A'}, ${repo.stars} stars`,
        url: repo.url,
        stars: repo.stars,
        fitScore: repo.fitScore,
      })),
      confidence: 0.5,
    };
  }
}

export const enhancedAIAgentService = new EnhancedAIAgentService();

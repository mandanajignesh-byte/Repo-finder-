/**
 * Enhanced AI Agent Service
 * Orchestrator that uses tools, planning, and reasoning to provide
 * better-than-LLM GitHub repository recommendations
 */

import { config } from '@/lib/config';
import { Repository, UserPreferences, Recommendation } from '@/lib/types';
import { ToolExecutor, AI_AGENT_TOOLS, ToolCall } from './ai-agent-tools';
import { supabaseService } from './supabase.service';

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
    preferences?: UserPreferences
  ): Promise<AgentResponse> {
    if (!this.isConfigured()) {
      return this.getFallbackResponse(userQuery, preferences);
    }

    try {
      const userId = await supabaseService.getOrCreateUserId();
      const executor = new ToolExecutor(userId, preferences || {});

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
      if (toolCalls.length === 0) {
        toolCalls.push({
          name: 'search_repos_by_need',
          arguments: {
            goal: userQuery,
            tech_stack: preferences?.techStack || [],
            difficulty: preferences?.experienceLevel || 'intermediate',
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
      // Fallback: simple search
      return {
        toolCalls: [{
          name: 'search_repos_by_need',
          arguments: {
            goal: userQuery,
            tech_stack: preferences?.techStack || [],
            difficulty: preferences?.experienceLevel || 'intermediate',
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
    
    // Format tool results for AI
    const toolResultsText = toolResults.map((tr, idx) => {
      const repos = Array.isArray(tr.result) ? tr.result : tr.result?.repos || [];
      const repoList = repos.slice(0, 10).map((repo: Repository, i: number) => 
        `${i + 1}. ${repo.fullName} (${repo.stars} stars, fit: ${repo.fitScore || 'N/A'}) - ${repo.description}`
      ).join('\n');

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
          allRepos.push(...tr.result);
        } else if (tr.result?.repos) {
          allRepos.push(...tr.result.repos);
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
   */
  private buildPlanningPrompt(preferences?: UserPreferences): string {
    const toolsDescription = AI_AGENT_TOOLS.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    let prompt = `You are RepoVerse's intelligent GitHub universe navigator. Your job is to help users find the perfect repositories.

You have access to these powerful tools:
${toolsDescription}

User context:
${preferences ? `
- Tech stack: ${preferences.techStack?.join(', ') || 'Not specified'}
- Experience: ${preferences.experienceLevel || 'intermediate'}
- Goals: ${preferences.goals?.join(', ') || 'Not specified'}
- Interests: ${preferences.interests?.join(', ') || 'Not specified'}
` : '- No preferences set'}

Your strategy:
1. Analyze the user's query to understand their intent
2. Choose the right tools (1-3 tools usually sufficient)
3. Consider the user's preferences and experience level
4. Plan tool execution order (some tools depend on others)

Return a JSON object with your plan.`;

    return prompt;
  }

  /**
   * Build synthesis prompt
   */
  private buildSynthesisPrompt(preferences?: UserPreferences): string {
    let prompt = `You are RepoVerse's intelligent GitHub universe navigator. You've executed tools and gathered repository data.

Your job is to synthesize a helpful, personalized response that:
1. Explains WHY each recommendation fits the user's needs
2. Highlights tradeoffs (e.g., "This is production-ready but complex")
3. Considers the user's experience level
4. Provides actionable next steps
5. Is honest about limitations or alternatives

User context:
${preferences ? `
- Tech stack: ${preferences.techStack?.join(', ') || 'Not specified'}
- Experience: ${preferences.experienceLevel || 'intermediate'}
- Goals: ${preferences.goals?.join(', ') || 'Not specified'}
` : '- No preferences set'}

Be specific, helpful, and personalized. Don't just list repos - explain the journey.`;

    return prompt;
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
        tech_stack: preferences?.techStack || [],
        difficulty: preferences?.experienceLevel || 'intermediate',
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

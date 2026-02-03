/**
 * AI Agent Service
 * Handles AI-powered repository recommendations
 * Now uses enhanced agent with tools and reasoning
 */

import { config } from '@/lib/config';
import { Recommendation, Repository, UserPreferences } from '@/lib/types';
import { githubService } from './github.service';
import { enhancedAIAgentService } from './enhanced-ai-agent.service';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class AIService {
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
   * Get recommendations based on user query
   * Uses enhanced AI agent with tools and reasoning
   */
  async getRecommendations(
    userQuery: string,
    preferences?: UserPreferences
  ): Promise<Recommendation[]> {
    // Use enhanced AI agent if configured
    if (enhancedAIAgentService.isConfigured()) {
      try {
        const response = await enhancedAIAgentService.getRecommendations(userQuery, preferences);
        return response.recommendations;
      } catch (error) {
        console.error('Error with enhanced AI agent, falling back:', error);
        // Fall through to legacy implementation
      }
    }

    // Legacy implementation (fallback)
    if (!this.isConfigured()) {
      return this.getFallbackRecommendations(userQuery, preferences);
    }

    try {
      // First, search GitHub for relevant repos
      const repos = await this.searchRelevantRepos(userQuery, preferences);
      
      // Then use AI to analyze and rank them
      const recommendations = await this.analyzeWithAI(userQuery, repos, preferences);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      // Fallback to rule-based
      return this.getFallbackRecommendations(userQuery, preferences);
    }
  }

  /**
   * Search GitHub for relevant repositories
   */
  private async searchRelevantRepos(
    query: string,
    preferences?: UserPreferences
  ): Promise<Repository[]> {
    try {
      // Extract tech stack from query or preferences
      const techStack = preferences?.techStack || [];
      const language = this.extractLanguage(query) || techStack[0];

      // Search GitHub
      const repos = await githubService.searchRepos(query, {
        language,
        sort: 'stars',
        order: 'desc',
        perPage: 10,
      });

      return repos;
    } catch (error) {
      console.error('Error searching repos:', error);
      return [];
    }
  }

  /**
   * Use AI to analyze and rank repositories
   */
  private async analyzeWithAI(
    userQuery: string,
    repos: Repository[],
    preferences?: UserPreferences
  ): Promise<Recommendation[]> {
    const systemPrompt = this.buildSystemPrompt(preferences);
    const userPrompt = this.buildUserPrompt(userQuery, repos);

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
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      // Parse AI response (expecting JSON format)
      return this.parseAIResponse(content, repos);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      // Fallback to simple ranking
      return repos.slice(0, 3).map((repo, index) => ({
        name: repo.fullName,
        description: repo.description,
        reason: `Highly rated repository with ${repo.stars} stars`,
        url: repo.url,
        stars: repo.stars,
      }));
    }
  }

  /**
   * Build system prompt for AI
   */
  private buildSystemPrompt(preferences?: UserPreferences): string {
    let prompt = `You are a helpful GitHub repository discovery assistant. Your job is to recommend the best repositories based on user needs.

Guidelines:
- Recommend repositories that match the user's tech stack and requirements
- Explain why each repository is a good fit
- Prioritize well-maintained, popular repositories
- Consider the user's experience level`;

    if (preferences) {
      prompt += `\n\nUser preferences:
- Tech stack: ${preferences.techStack.join(', ')}
- Experience level: ${preferences.experienceLevel}
- Interests: ${preferences.interests.join(', ')}`;
    }

    prompt += `\n\nReturn your recommendations as a JSON array with this format:
[
  {
    "name": "owner/repo-name",
    "description": "Brief description",
    "reason": "Why this fits the user's needs"
  }
]`;

    return prompt;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(userQuery: string, repos: Repository[]): string {
    const reposList = repos.slice(0, 5).map((repo, index) => 
      `${index + 1}. ${repo.fullName} (${repo.stars} stars) - ${repo.description}`
    ).join('\n');

    return `User query: "${userQuery}"

Here are some relevant repositories I found:
${reposList}

Please analyze these and recommend the top 3 that best match the user's needs. Explain why each is a good fit.`;
  }

  /**
   * Parse AI response
   */
  private parseAIResponse(content: string, repos: Repository[]): Recommendation[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((rec: any) => {
          const repo = repos.find(r => r.fullName === rec.name);
          return {
            name: rec.name,
            description: rec.description || repo?.description || '',
            reason: rec.reason || '',
            url: repo?.url,
            stars: repo?.stars,
          };
        });
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback: return top repos
    return repos.slice(0, 3).map(repo => ({
      name: repo.fullName,
      description: repo.description,
      reason: `Highly rated repository with ${repo.stars} stars and good community support`,
      url: repo.url,
      stars: repo.stars,
    }));
  }

  /**
   * Fallback recommendations (rule-based)
   */
  private async getFallbackRecommendations(
    query: string,
    preferences?: UserPreferences
  ): Promise<Recommendation[]> {
    try {
      const repos = await this.searchRelevantRepos(query, preferences);
      
      return repos.slice(0, 3).map(repo => ({
        name: repo.fullName,
        description: repo.description,
        reason: `Popular repository with ${repo.stars} stars, actively maintained`,
        url: repo.url,
        stars: repo.stars,
      }));
    } catch (error) {
      console.error('Error in fallback recommendations:', error);
      return [];
    }
  }

  /**
   * Extract language from query
   */
  private extractLanguage(query: string): string | null {
    const languages = [
      'javascript', 'typescript', 'python', 'java', 'go', 'rust',
      'cpp', 'c', 'csharp', 'php', 'ruby', 'swift', 'kotlin', 'dart'
    ];

    const lowerQuery = query.toLowerCase();
    for (const lang of languages) {
      if (lowerQuery.includes(lang)) {
        return lang;
      }
    }

    return null;
  }
}

export const aiService = new AIService();

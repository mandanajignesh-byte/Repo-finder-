/**
 * AI API Service (Backend)
 * Calls backend API for AI recommendations
 */

import { apiClient } from '../api.client';
import { Recommendation, UserPreferences } from '@/lib/types';

export class AIApiService {
  /**
   * Get AI recommendations
   */
  async getRecommendations(
    query: string,
    preferences?: UserPreferences
  ): Promise<Recommendation[]> {
    const response = await apiClient.post<{ recommendations: Recommendation[] }>(
      '/ai/recommendations',
      { query, preferences }
    );
    return response.recommendations;
  }
}

export const aiApiService = new AIApiService();

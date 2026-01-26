/**
 * User API Service (Backend)
 * Handles user data, preferences, saved repos, credits
 */

import { apiClient } from '../api.client';
import { Repository, UserPreferences, CreditBalance } from '@/lib/types';

const USER_ID = 'default'; // In production, use actual user ID from auth

export class UserApiService {
  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const response = await apiClient.get<{ preferences: UserPreferences }>(
      '/user/preferences',
      { userId: USER_ID }
    );
    return response.preferences;
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences: UserPreferences): Promise<void> {
    await apiClient.post('/user/preferences', {
      userId: USER_ID,
      preferences,
    });
  }

  /**
   * Get saved repositories
   */
  async getSavedRepos(): Promise<Repository[]> {
    const response = await apiClient.get<{ repos: Repository[] }>(
      '/user/saved-repos',
      { userId: USER_ID }
    );
    return response.repos;
  }

  /**
   * Save a repository
   */
  async saveRepo(repo: Repository): Promise<void> {
    await apiClient.post('/user/saved-repos', {
      userId: USER_ID,
      repo,
    });
  }

  /**
   * Get credit balance
   */
  async getCredits(): Promise<CreditBalance> {
    const response = await apiClient.get<{ credits: CreditBalance }>(
      '/user/credits',
      { userId: USER_ID }
    );
    return response.credits;
  }

  /**
   * Use credits
   */
  async useCredits(amount: number): Promise<CreditBalance> {
    const response = await apiClient.post<{ credits: CreditBalance }>(
      '/user/credits/use',
      { userId: USER_ID, amount }
    );
    return response.credits;
  }
}

export const userApiService = new UserApiService();

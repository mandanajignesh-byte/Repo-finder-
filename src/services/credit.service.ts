/**
 * Credit Service
 * Manages user credits for AI agent queries
 */

import { CreditBalance } from '@/lib/types';

const STORAGE_KEY = 'github_repo_app_credits';
const FREE_QUERIES_PER_DAY = 1;
const FREE_QUERIES_ON_SIGNUP = 5;

class CreditService {
  /**
   * Get current credit balance
   */
  getBalance(): CreditBalance {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Initialize with free credits
    const initial: CreditBalance = {
      free: FREE_QUERIES_ON_SIGNUP,
      paid: 0,
      total: FREE_QUERIES_ON_SIGNUP,
    };
    this.saveBalance(initial);
    return initial;
  }

  /**
   * Save credit balance
   */
  private saveBalance(balance: CreditBalance): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(balance));
  }

  /**
   * Check if user has enough credits
   */
  hasCredits(amount = 1): boolean {
    const balance = this.getBalance();
    return balance.total >= amount;
  }

  /**
   * Use credits
   */
  useCredits(amount = 1): boolean {
    const balance = this.getBalance();
    
    if (balance.total < amount) {
      return false;
    }

    // Use paid credits first
    if (balance.paid >= amount) {
      balance.paid -= amount;
    } else {
      const remaining = amount - balance.paid;
      balance.paid = 0;
      balance.free -= remaining;
    }

    balance.total = balance.free + balance.paid;
    this.saveBalance(balance);
    return true;
  }

  /**
   * Add credits (for purchases)
   */
  addCredits(amount: number, type: 'free' | 'paid' = 'paid'): void {
    const balance = this.getBalance();
    
    if (type === 'free') {
      balance.free += amount;
    } else {
      balance.paid += amount;
    }

    balance.total = balance.free + balance.paid;
    this.saveBalance(balance);
  }

  /**
   * Refill daily free credits
   */
  refillDailyCredits(): void {
    const lastRefill = localStorage.getItem('last_credit_refill');
    const today = new Date().toDateString();

    if (lastRefill !== today) {
      const balance = this.getBalance();
      balance.free += FREE_QUERIES_PER_DAY;
      balance.total = balance.free + balance.paid;
      this.saveBalance(balance);
      localStorage.setItem('last_credit_refill', today);
    }
  }

  /**
   * Reset credits (for testing)
   */
  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('last_credit_refill');
  }
}

export const creditService = new CreditService();

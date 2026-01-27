/**
 * Payment Service
 * Handles donation/payment processing via PayPal
 */

import { config } from '@/lib/config';

class PaymentService {
  private paypalUsername: string;

  constructor() {
    // Get PayPal username from config
    this.paypalUsername = config.payment.paypalUsername;
  }

  /**
   * Check if payment is configured
   */
  isConfigured(): boolean {
    return !!this.paypalUsername;
  }

  /**
   * Open PayPal.me link for donation
   * @param amount Amount in dollars (e.g., 5 for $5). If not provided, opens page where user can enter custom amount
   */
  async openDonationCheckout(amount?: number): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Payment not configured. Please set VITE_PAYPAL_USERNAME in .env');
      alert('Payment integration is not configured. Please contact the developer for donation options.');
      return;
    }

    try {
      let paypalUrl: string;
      
      if (amount && amount > 0) {
        // PayPal.me format: https://paypal.me/username/amount
        paypalUrl = `https://paypal.me/${this.paypalUsername}/${amount}`;
      } else {
        // Base PayPal.me URL - user can enter custom amount on PayPal page
        paypalUrl = `https://paypal.me/${this.paypalUsername}`;
      }
      
      // Open PayPal in new window
      window.open(paypalUrl, '_blank');
    } catch (error) {
      console.error('Error opening PayPal checkout:', error);
      alert('Failed to open payment page. Please try again.');
    }
  }

  /**
   * Open custom amount donation page
   */
  async openCustomAmountDonation(): Promise<void> {
    // Same as opening without amount - PayPal.me allows custom amount entry
    await this.openDonationCheckout();
  }
}

export const paymentService = new PaymentService();

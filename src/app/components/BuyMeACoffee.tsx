/**
 * Buy Me a Coffee Component
 * Allows users to pay any amount they think the service is worth
 */

import { useState } from 'react';
import { SignatureCard } from './SignatureCard';
import { paymentService } from '@/services/payment.service';

const PRESET_AMOUNTS = [3, 5, 10, 25, 50];

export function BuyMeACoffee() {
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async (amount: number) => {
    setIsProcessing(true);
    try {
      await paymentService.openDonationCheckout(amount);
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomPay = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than $0');
      return;
    }
    
    if (amount < 1) {
      alert('Minimum amount is $1');
      return;
    }
    
    setIsProcessing(true);
    try {
      // PayPal.me supports amounts in URL: paypal.me/username/amount
      await paymentService.openDonationCheckout(amount);
      setCustomAmount('');
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SignatureCard className="p-6" showLayers={false}>
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
          <img 
            src="/coffee.png" 
            alt="Coffee" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-xl text-white mb-2" style={{ fontWeight: 700 }}>
            Choose Your Price
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            This is a new project and I haven't figured out pricing yet. I thought it would be fair 
            to let you decide what this app is worth to you. Enter the honest amount you're willing to pay 
            for this service. All payments are processed securely through PayPal.
          </p>
        </div>
      </div>

      {/* Preset Amounts */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-3">Quick select:</p>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => handlePay(amount)}
              disabled={isProcessing}
              className="px-4 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div className="border-t border-gray-700 pt-6">
        <p className="text-gray-400 text-sm mb-3">Or enter your amount:</p>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={customAmount}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty, numbers, and one decimal point
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setCustomAmount(value);
                }
              }}
              placeholder="Enter your amount"
              disabled={isProcessing}
              className="w-full pl-8 pr-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleCustomPay}
            disabled={isProcessing || !customAmount}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            Pay
          </button>
        </div>
      </div>

      {/* Thank you message */}
      <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
        <p className="text-gray-300 text-xs text-center">
          Thank you for your payment! Your feedback on pricing helps shape the future of this project.
        </p>
      </div>
    </SignatureCard>
  );
}

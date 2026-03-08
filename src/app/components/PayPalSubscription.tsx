/**
 * PayPal Subscription Component
 * Handles PayPal subscription with proper debit/credit card support
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

interface PayPalSubscriptionProps {
  planId: string;
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}

// Extend Window interface for PayPal SDK
declare global {
  interface Window {
    paypal?: any;
  }
}

export function PayPalSubscription({
  planId,
  onSuccess,
  onError,
  onCancel,
}: PayPalSubscriptionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paypalRef = useRef<HTMLDivElement>(null);
  const isRendered = useRef(false);

  useEffect(() => {
    // Prevent double rendering in React StrictMode
    if (isRendered.current) return;

    const renderPayPalButton = () => {
      if (!window.paypal || !paypalRef.current) {
        setError('PayPal SDK not available');
        return;
      }

      // Clear any existing buttons
      if (paypalRef.current) {
        paypalRef.current.innerHTML = '';
      }

      try {
        window.paypal
          .Buttons({
            style: {
              shape: 'pill',
              color: 'blue',
              layout: 'vertical',
              label: 'subscribe',
              height: 48,
            },
            createSubscription: function (data: any, actions: any) {
              return actions.subscription.create({
                plan_id: planId,
              });
            },
            onApprove: function (data: any, actions: any) {
              console.log('Subscription approved:', data.subscriptionID);
              onSuccess?.(data.subscriptionID);
            },
            onCancel: function (data: any) {
              console.log('Subscription cancelled:', data);
              onCancel?.();
            },
            onError: function (err: any) {
              console.error('PayPal error:', err);
              setError('Payment failed. Please try again.');
              onError?.(err);
            },
          })
          .render(paypalRef.current)
          .catch((err: any) => {
            console.error('Error rendering PayPal button:', err);
            setError('Failed to load payment button. Please refresh.');
            onError?.(err);
          });

        isRendered.current = true;
      } catch (err) {
        console.error('Error initializing PayPal:', err);
        setError('Failed to initialize PayPal. Please refresh.');
        onError?.(err);
      }
    };

    // Check if PayPal SDK is already loaded
    if (window.paypal) {
      setIsLoading(false);
      renderPayPalButton();
      return;
    }

    // Wait for SDK to load (it's in index.html)
    const checkPayPal = setInterval(() => {
      if (window.paypal) {
        clearInterval(checkPayPal);
        setIsLoading(false);
        renderPayPalButton();
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkPayPal);
      if (!window.paypal) {
        setIsLoading(false);
        setError('Failed to load PayPal. Please refresh the page.');
        onError?.(new Error('PayPal SDK timeout'));
      }
    }, 10000);

    // Cleanup
    return () => {
      clearInterval(checkPayPal);
      clearTimeout(timeout);
    };
  }, [planId, onSuccess, onError, onCancel]);

  if (error) {
    return (
      <div
        className="p-6 rounded-xl border text-center"
        style={{
          background: 'rgba(239,68,68,0.1)',
          borderColor: 'rgba(239,68,68,0.3)',
        }}
      >
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-sm font-semibold mb-2 text-white">
          Payment System Error
        </p>
        <p className="text-xs mb-4" style={{ color: '#fca5a5' }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: 'rgba(239,68,68,0.2)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
          }}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-10">
        <div 
          className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4"
          style={{ 
            borderColor: '#60a5fa',
            borderTopColor: 'transparent',
          }}
        />
        <span className="text-sm font-medium text-white mb-1">
          Loading payment options
        </span>
        <span className="text-xs" style={{ color: '#64748b' }}>
          This may take a few seconds...
        </span>
      </div>
    );
  }

  return (
    <div>
      <div ref={paypalRef} id="paypal-button-container" />
      
      {/* Payment methods info */}
      <div className="mt-3 text-center">
        <p className="text-xs" style={{ color: '#6b7280' }}>
          💳 Credit Card • 🏦 Debit Card • PayPal
        </p>
      </div>
    </div>
  );
}

/**
 * PayPal Subscription Modal
 * Full modal wrapper with subscription details
 */
interface PayPalSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  price: string;
  features: string[];
}

export function PayPalSubscriptionModal({
  isOpen,
  onClose,
  planId,
  price,
  features,
}: PayPalSubscriptionModalProps) {
  const [subscribed, setSubscribed] = useState(false);

  if (!isOpen) return null;

  const handleSuccess = (subscriptionId: string) => {
    console.log('Subscription successful:', subscriptionId);
    setSubscribed(true);
    
    // Store subscription ID (you can save this to Supabase)
    localStorage.setItem('paypal_subscription_id', subscriptionId);
    localStorage.setItem('subscription_status', 'active');
    
    // Close modal after 2 seconds
    setTimeout(() => {
      onClose();
      // Reload to apply pro features
      window.location.reload();
    }, 2000);
  };

  const handleError = (error: any) => {
    console.error('Subscription error:', error);
  };

  const handleCancel = () => {
    console.log('User cancelled subscription');
  };

  if (subscribed) {
    return (
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        style={{
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="max-w-md w-full rounded-[32px] p-10 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
            border: '2px solid rgba(34,197,94,0.3)',
            boxShadow: '0 25px 70px rgba(0,0,0,0.6), 0 0 120px rgba(34,197,94,0.2)',
          }}
        >
          {/* Success glow */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.4) 0%, transparent 70%)',
            }}
          />

          {/* Success icon with animation */}
          <div className="relative inline-block mb-6">
            <div
              className="w-24 h-24 mx-auto rounded-full flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(16,185,129,0.2) 100%)',
                border: '3px solid rgba(34,197,94,0.4)',
                boxShadow: '0 0 60px rgba(34,197,94,0.4), inset 0 0 30px rgba(34,197,94,0.1)',
                animation: 'successPulse 2s ease-in-out infinite',
              }}
            >
              <Check className="w-12 h-12" style={{ color: '#22c55e' }} />
            </div>
            <div className="absolute -top-4 -right-4 text-5xl" style={{ animation: 'celebrationFloat 2s ease-in-out infinite' }}>
              🎉
            </div>
          </div>

          <h2 
            className="text-3xl font-bold mb-3"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Welcome to Pro!
          </h2>
          
          <p className="text-base mb-6" style={{ color: '#94a3b8' }}>
            Your subscription is now active. Enjoy unlimited access to all premium features!
          </p>

          {/* Pro badges */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div 
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e',
              }}
            >
              ♾️ Unlimited Swipes
            </div>
            <div 
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                color: '#60a5fa',
              }}
            >
              🤖 AI Powered
            </div>
          </div>

          <p className="text-sm" style={{ color: '#64748b' }}>
            Redirecting you back...
          </p>
        </div>

        {/* Add celebration animation styles */}
        <style>{`
          @keyframes successPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes celebrationFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(10deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-w-lg w-full rounded-[32px] p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
          border: '1px solid rgba(148,163,184,0.15)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 70px rgba(0,0,0,0.6), 0 0 120px rgba(59,130,246,0.15)',
        }}
      >
        {/* Animated gradient background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.4) 0%, transparent 60%)',
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full transition-all z-10"
          style={{ 
            background: 'rgba(255,255,255,0.05)',
            color: '#94a3b8',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = '#94a3b8';
          }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-block mb-4">
            <div
              className="text-5xl font-extrabold mb-2"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {price}
            </div>
            <div className="text-sm" style={{ color: '#94a3b8' }}>
              per month
            </div>
          </div>
          
          <h2 
            className="text-3xl font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Upgrade to Pro
          </h2>
          
          <p className="text-base" style={{ color: '#94a3b8' }}>
            Cancel anytime • No commitment
          </p>
        </div>

        {/* Features Grid */}
        <div 
          className="mb-8 p-6 rounded-2xl relative z-10"
          style={{
            background: 'rgba(15,23,42,0.5)',
            border: '1px solid rgba(148,163,184,0.1)',
          }}
        >
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-4 group">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(147,51,234,0.2) 100%)',
                    border: '1px solid rgba(59,130,246,0.3)',
                  }}
                >
                  <Check className="w-4 h-4" style={{ color: '#60a5fa' }} />
                </div>
                <span 
                  className="text-base font-medium transition-colors"
                  style={{ color: '#e2e8f0' }}
                >
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Section */}
        <div className="relative z-10 mb-6">
          <div 
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(15,23,42,0.5)',
              border: '1px solid rgba(148,163,184,0.1)',
            }}
          >
            <div className="mb-4 text-center">
              <p className="text-sm font-semibold text-white mb-2">
                Choose your payment method
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                💳 Credit/Debit Card • 💰 PayPal • 📅 Pay Later
              </p>
            </div>
            
            <PayPalSubscription
              planId={planId}
              onSuccess={handleSuccess}
              onError={handleError}
              onCancel={handleCancel}
            />
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ background: '#22c55e' }}
            />
            <span className="text-xs" style={{ color: '#64748b' }}>Secure Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ background: '#22c55e' }}
            />
            <span className="text-xs" style={{ color: '#64748b' }}>No Hidden Fees</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center relative z-10 pt-4 border-t" style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
          <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
            Powered by PayPal • SSL Encrypted • PCI Compliant
          </p>
        </div>
      </div>
    </div>
  );
}

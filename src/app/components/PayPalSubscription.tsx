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

    const loadPayPalScript = () => {
      // Check if script already exists
      if (window.paypal) {
        renderPayPalButton();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      
      // ✅ FIX: Add enable-funding to allow debit/credit cards
      script.src = `https://www.paypal.com/sdk/js?client-id=AYwkXJG9M9cemxGfH7Cd96oYoqXQAnVzwSEg80-Vo1ti_2OLXc_9TWGyOC_eFBRqIfmgxRipMmyfjxKT&vault=true&intent=subscription&enable-funding=card,paylater&disable-funding=credit&currency=USD`;
      script.async = true;
      script.onload = () => {
        setIsLoading(false);
        renderPayPalButton();
      };
      script.onerror = () => {
        setIsLoading(false);
        setError('Failed to load PayPal. Please refresh the page.');
        onError?.(new Error('PayPal SDK failed to load'));
      };

      document.body.appendChild(script);
    };

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

    loadPayPalScript();

    // Cleanup
    return () => {
      // PayPal buttons auto-cleanup when parent element is removed
    };
  }, [planId, onSuccess, onError, onCancel]);

  if (error) {
    return (
      <div
        className="p-4 rounded-lg border text-center"
        style={{
          background: 'rgba(239,68,68,0.1)',
          borderColor: 'rgba(239,68,68,0.3)',
        }}
      >
        <p className="text-sm" style={{ color: '#f87171' }}>
          {error}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#60a5fa' }} />
        <span className="ml-2 text-sm" style={{ color: '#8b949e' }}>
          Loading payment options...
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
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="max-w-sm w-full rounded-[24px] p-8 text-center"
          style={{
            background: 'rgba(28,28,30,0.97)',
            border: '1px solid rgba(34,197,94,0.3)',
          }}
        >
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.15)' }}
          >
            <Check className="w-8 h-8" style={{ color: '#22c55e' }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Welcome to Pro! 🎉</h2>
          <p className="text-sm" style={{ color: '#8b949e' }}>
            Your subscription is now active. Enjoy unlimited access!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-w-md w-full rounded-[24px] p-6 relative"
        style={{
          background: 'rgba(28,28,30,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full transition-colors"
          style={{ color: '#4b5563' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#9ca3af')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h2>
          <div className="text-3xl font-bold text-white mb-1">{price}</div>
          <p className="text-sm" style={{ color: '#8b949e' }}>
            per month • Cancel anytime
          </p>
        </div>

        {/* Features */}
        <div className="mb-6 space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(34,197,94,0.15)' }}
              >
                <Check className="w-3 h-3" style={{ color: '#22c55e' }} />
              </div>
              <span className="text-sm text-white">{feature}</span>
            </div>
          ))}
        </div>

        {/* PayPal Button */}
        <PayPalSubscription
          planId={planId}
          onSuccess={handleSuccess}
          onError={handleError}
          onCancel={handleCancel}
        />

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-[10px]" style={{ color: '#4b5563' }}>
            Secure payment powered by PayPal
          </p>
        </div>
      </div>
    </div>
  );
}

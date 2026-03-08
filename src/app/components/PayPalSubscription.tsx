/**
 * PayPal Subscription Component
 * Uses @paypal/react-paypal-js for reliable SDK loading
 */

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const PAYPAL_CLIENT_ID = 'AYwkXJG9M9cemxGfH7Cd96oYoqXQAnVzwSEg80-Vo1ti_2OLXc_9TWGyOC_eFBRqIfmgxRipMmyfjxKT';

interface PayPalSubscriptionProps {
  planId: string;
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: unknown) => void;
  onCancel?: () => void;
}

export function PayPalSubscription({
  planId,
  onSuccess,
  onError,
  onCancel,
}: PayPalSubscriptionProps) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        vault: true,
        intent: 'subscription',
        components: 'buttons',
        enableFunding: 'card,paylater',
        disableFunding: 'credit',
        currency: 'USD',
      }}
    >
      <PayPalButtons
        style={{
          shape: 'pill',
          color: 'blue',
          layout: 'vertical',
          label: 'subscribe',
          height: 48,
        }}
        createSubscription={(_data, actions) => {
          return actions.subscription.create({
            plan_id: planId,
          });
        }}
        onApprove={(data) => {
          if (data.subscriptionID) {
            onSuccess?.(data.subscriptionID);
          }
        }}
        onCancel={() => {
          onCancel?.();
        }}
        onError={(err) => {
          console.error('PayPal error:', err);
          onError?.(err);
        }}
      />
    </PayPalScriptProvider>
  );
}

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

    localStorage.setItem('paypal_subscription_id', subscriptionId);
    localStorage.setItem('subscription_status', 'active');

    setTimeout(() => {
      onClose();
      window.location.reload();
    }, 2000);
  };

  const handleError = (error: unknown) => {
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
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.4) 0%, transparent 70%)',
            }}
          />
          <div
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center relative mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(16,185,129,0.2) 100%)',
              border: '3px solid rgba(34,197,94,0.4)',
              boxShadow: '0 0 60px rgba(34,197,94,0.4)',
            }}
          >
            <Check className="w-12 h-12" style={{ color: '#22c55e' }} />
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
            Your subscription is now active. Enjoy unlimited access!
          </p>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Redirecting you back...
          </p>
        </div>
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
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.4) 0%, transparent 60%)',
          }}
        />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full transition-all z-10"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#94a3b8',
          }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8 relative z-10">
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
          <div className="text-sm mb-2" style={{ color: '#94a3b8' }}>
            per month
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

        <div
          className="mb-8 p-6 rounded-2xl relative z-10"
          style={{
            background: 'rgba(15,23,42,0.5)',
            border: '1px solid rgba(148,163,184,0.1)',
          }}
        >
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(147,51,234,0.2) 100%)',
                    border: '1px solid rgba(59,130,246,0.3)',
                  }}
                >
                  <Check className="w-4 h-4" style={{ color: '#60a5fa' }} />
                </div>
                <span className="text-base font-medium" style={{ color: '#e2e8f0' }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mb-6">
          <div
            className="p-6 rounded-2xl min-h-[120px]"
            style={{
              background: 'rgba(15,23,42,0.5)',
              border: '1px solid rgba(148,163,184,0.1)',
            }}
          >
            <div className="mb-4 text-center">
              <p className="text-sm font-semibold text-white mb-2">Choose your payment method</p>
              <p className="text-xs mb-4" style={{ color: '#64748b' }}>
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

        <div className="flex items-center justify-center gap-4 mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>Secure Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>No Hidden Fees</span>
          </div>
        </div>

        <div
          className="text-center relative z-10 pt-4 border-t"
          style={{ borderColor: 'rgba(148,163,184,0.1)' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
            Powered by PayPal • SSL Encrypted • PCI Compliant
          </p>
        </div>
      </div>
    </div>
  );
}

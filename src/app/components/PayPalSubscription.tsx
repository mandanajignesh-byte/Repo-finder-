/**
 * PayPal Subscription Component
 * Uses @paypal/react-paypal-js for reliable SDK loading
 */

import { useState } from 'react';
import { Check, X, Crown, Zap, Bot, Database, Sparkles } from 'lucide-react';
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

const FEATURE_ICONS = [
  { icon: <Zap className="w-4 h-4" style={{ color: '#60a5fa' }} />, bg: 'rgba(59,130,246,0.12)' },
  { icon: <Bot className="w-4 h-4" style={{ color: '#a78bfa' }} />, bg: 'rgba(147,51,234,0.12)' },
  { icon: <Database className="w-4 h-4" style={{ color: '#34d399' }} />, bg: 'rgba(16,185,129,0.12)' },
  { icon: <Sparkles className="w-4 h-4" style={{ color: '#f472b6' }} />, bg: 'rgba(236,72,153,0.12)' },
  { icon: <Check className="w-4 h-4" style={{ color: '#60a5fa' }} />, bg: 'rgba(59,130,246,0.12)' },
  { icon: <Check className="w-4 h-4" style={{ color: '#60a5fa' }} />, bg: 'rgba(59,130,246,0.12)' },
];

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
          className="max-w-sm w-full rounded-[28px] p-10 text-center relative overflow-hidden"
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
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center relative mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(16,185,129,0.2) 100%)',
              border: '3px solid rgba(34,197,94,0.4)',
              boxShadow: '0 0 60px rgba(34,197,94,0.4)',
            }}
          >
            <Check className="w-10 h-10" style={{ color: '#22c55e' }} />
          </div>
          <h2
            className="text-2xl font-bold mb-3"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Welcome to Pro!
          </h2>
          <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
            Your subscription is now active. Enjoy unlimited access!
          </p>
          <p className="text-xs" style={{ color: '#64748b' }}>Redirecting you back…</p>
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
      {/* Modal — two-column layout on wider screens */}
      <div
        className="w-full rounded-[28px] relative overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.99) 0%, rgba(22,33,56,0.99) 100%)',
          border: '1px solid rgba(148,163,184,0.15)',
          maxWidth: 560,
          maxHeight: '92vh',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.08)',
        }}
      >
        {/* Gradient accent top */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-[28px]"
          style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)' }}
        />

        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 60%)',
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-all z-10"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.color = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = '#94a3b8';
          }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center relative z-10">
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(139,92,246,0.25) 100%)',
                border: '1.5px solid rgba(59,130,246,0.35)',
                boxShadow: '0 0 30px rgba(59,130,246,0.2)',
              }}
            >
              <Crown className="w-7 h-7" style={{ color: '#60a5fa' }} />
            </div>
            <div
              className="text-4xl font-extrabold leading-none mb-1"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {price}
              <span className="text-base font-medium ml-1" style={{ color: '#64748b', WebkitTextFillColor: '#64748b' }}>
                / month
              </span>
            </div>
            <h2
              className="text-xl font-bold mb-1"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Upgrade to Pro
            </h2>
            <p className="text-sm" style={{ color: '#64748b' }}>Cancel anytime · No commitment</p>
          </div>

          {/* Features grid */}
          <div className="px-8 pb-6 relative z-10">
            <div className="grid grid-cols-2 gap-2">
              {features.map((feature, index) => {
                const fi = FEATURE_ICONS[index] ?? FEATURE_ICONS[0];
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: fi.bg }}
                    >
                      {fi.icon}
                    </div>
                    <span className="text-xs font-medium leading-snug" style={{ color: '#cbd5e1' }}>
                      {feature.replace(/^[^\s]+\s/, '')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PayPal buttons */}
          <div className="px-8 pb-6 relative z-10">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-xs font-semibold text-center mb-1" style={{ color: '#94a3b8' }}>
                Choose payment method
              </p>
              <p className="text-xs text-center mb-4" style={{ color: '#475569' }}>
                PayPal · Credit/Debit Card · Pay Later
              </p>
              <PayPalSubscription
                planId={planId}
                onSuccess={handleSuccess}
                onError={handleError}
                onCancel={handleCancel}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-8 pb-7 text-center relative z-10"
          >
            <div className="flex items-center justify-center gap-5">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#22c55e' }} />
                Secure Payment
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#22c55e' }} />
                SSL Encrypted
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#22c55e' }} />
                PCI Compliant
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PayPal Subscription Component
 * Uses @paypal/react-paypal-js for reliable SDK loading
 */

import { useState } from 'react';
import { Check, X, Zap, Bot, Bookmark, User, BarChart2, Headphones, Lock } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { supabaseService } from '@/services/supabase.service';

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
  const [sdkError, setSdkError] = useState(false);
  const directLink = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${planId}`;

  if (sdkError) {
    return (
      <div className="flex flex-col gap-3">
        <a
          href={directLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm text-white text-center flex items-center justify-center gap-2.5 transition-opacity hover:opacity-90"
          style={{ background: '#2563eb', textDecoration: 'none' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
          </svg>
          Continue with PayPal
        </a>
        <p className="text-center text-xs" style={{ color: '#6e7681' }}>
          You'll be taken to PayPal to complete your subscription
        </p>
      </div>
    );
  }

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
          shape: 'rect',
          color: 'blue',
          layout: 'vertical',
          label: 'subscribe',
          height: 44,
        }}
        createSubscription={(_data, actions) => {
          return actions.subscription.create({ plan_id: planId });
        }}
        onApprove={(data) => {
          if (data.subscriptionID) onSuccess?.(data.subscriptionID);
        }}
        onCancel={() => onCancel?.()}
        onError={(err) => {
          console.error('PayPal error:', err);
          setSdkError(true);
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

const FEATURE_ITEMS = [
  { icon: Zap,       label: 'Unlimited daily swipes'         },
  { icon: Bot,       label: 'Unlimited AI Agent queries'     },
  { icon: Bookmark,  label: 'Save unlimited repositories'    },
  { icon: User,      label: 'Full profile access'            },
  { icon: BarChart2, label: 'Personalized recommendations'   },
  { icon: Headphones,label: 'Priority support'               },
];

export function PayPalSubscriptionModal({
  isOpen,
  onClose,
  planId,
  price,
}: PayPalSubscriptionModalProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  if (!isOpen) return null;

  const handleSuccess = async (subscriptionId: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email to save your Pro access.');
      return;
    }
    // Save to Supabase DB with email — this is the source of truth
    await supabaseService.saveSubscription(subscriptionId, planId, trimmedEmail);
    // Also cache email in localStorage for future restore lookups
    localStorage.setItem('pro_email', trimmedEmail);
    setSubscribed(true);
    setTimeout(() => { onClose(); window.location.reload(); }, 2200);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (subscribed) {
    return (
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div
          className="max-w-xs w-full rounded-2xl p-8 text-center"
          style={{ background: '#0d1117', border: '1px solid #21262d' }}
        >
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-5"
            style={{ background: 'rgba(37,99,235,0.15)', border: '1.5px solid rgba(37,99,235,0.4)' }}
          >
            <Check className="w-7 h-7" style={{ color: '#2563eb' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#e6edf3' }}>
            You're now Pro
          </h2>
          <p className="text-sm" style={{ color: '#8b949e' }}>
            All features unlocked. Redirecting…
          </p>
        </div>
      </div>
    );
  }

  // ── Main modal ──────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-2xl flex flex-col relative"
        style={{
          background: '#0d1117',
          border: '1px solid #21262d',
          maxWidth: 420,
          maxHeight: '92vh',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Blue top bar */}
        <div className="h-0.5 rounded-t-2xl" style={{ background: '#2563eb' }} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors z-10"
          style={{ color: '#6e7681' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#e6edf3'; e.currentTarget.style.background = '#161b22'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#6e7681'; e.currentTarget.style.background = 'transparent'; }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="px-6 pt-7 pb-5">
            {/* Logo + brand */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#161b22', border: '1px solid #30363d' }}
              >
                <img src="/logo.png" alt="RepoVerse" className="w-6 h-6 object-contain rounded-lg" />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#e6edf3' }}>RepoVerse Pro</div>
                <div className="text-xs" style={{ color: '#6e7681' }}>Unlock everything</div>
              </div>
            </div>

            {/* Price block */}
            <div
              className="rounded-xl p-4 mb-1"
              style={{ background: '#161b22', border: '1px solid #21262d' }}
            >
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-bold tracking-tight" style={{ color: '#e6edf3' }}>
                  {price}
                </span>
                <span className="text-sm mb-1" style={{ color: '#6e7681' }}>/month</span>
              </div>
              <p className="text-xs" style={{ color: '#8b949e' }}>
                Cancel anytime · Billed monthly · No hidden fees
              </p>
            </div>
          </div>

          {/* ── Features ───────────────────────────────────────────────────── */}
          <div className="px-6 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6e7681' }}>
              What's included
            </p>
            <div className="space-y-2.5">
              {FEATURE_ITEMS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)' }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                  </div>
                  <span className="text-sm" style={{ color: '#c9d1d9' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Email (for cross-device restore) ───────────────────────── */}
          <div className="px-6 pb-4">
            <div className="mb-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8b949e' }}>
                Your email — to restore Pro on any device
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="you@example.com"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: '#161b22',
                  border: `1px solid ${emailError ? '#ef4444' : '#30363d'}`,
                  color: '#e6edf3',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = emailError ? '#ef4444' : '#2563eb'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = emailError ? '#ef4444' : '#30363d'; }}
              />
              {emailError && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{emailError}</p>
              )}
            </div>
          </div>

          {/* ── Payment ────────────────────────────────────────────────────── */}
          <div className="px-6 pb-4">
            <div
              className="rounded-xl p-4"
              style={{ background: '#161b22', border: '1px solid #21262d' }}
            >
              <p className="text-xs text-center mb-3" style={{ color: '#6e7681' }}>
                Secure checkout · PayPal &amp; card accepted
              </p>
              <PayPalSubscription
                planId={planId}
                onSuccess={handleSuccess}
                onError={(err) => console.error('Subscription error:', err)}
                onCancel={() => {}}
              />
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="px-6 pb-6 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" style={{ color: '#6e7681' }} />
            <span className="text-xs" style={{ color: '#6e7681' }}>
              Secured by PayPal · SSL encrypted · PCI compliant
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

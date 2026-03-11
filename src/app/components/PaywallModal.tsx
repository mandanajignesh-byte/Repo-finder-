import { useState } from 'react';
import { X, Zap, Bot, Bookmark, User, BarChart2, Headphones, Lock, RotateCcw } from 'lucide-react';
import { PayPalSubscriptionModal } from './PayPalSubscription';
import { supabaseService } from '@/services/supabase.service';

const PAYPAL_PLAN_ID = 'P-40J96093905927145NGWZMVI';

export type PaywallType = 'swipes' | 'agent' | 'save' | 'profile';

interface PaywallModalProps {
  type: PaywallType;
  onClose: () => void;
}

const PAYWALL_CONTENT: Record<PaywallType, { headline: string; body: string }> = {
  swipes: {
    headline: 'Daily Limit Reached',
    body: "You've used all your free swipes for today.",
  },
  agent: {
    headline: 'AI Agent Limit Reached',
    body: 'Upgrade for unlimited AI-powered recommendations.',
  },
  save: {
    headline: 'Unlock Saved Repositories',
    body: 'Save unlimited repos and build your personal collection.',
  },
  profile: {
    headline: 'Access Your Profile',
    body: 'Get full profile access with personalized insights.',
  },
};

const FEATURES = [
  { icon: Zap,        label: 'Unlimited daily swipes'       },
  { icon: Bot,        label: 'Unlimited AI Agent queries'   },
  { icon: Bookmark,   label: 'Save unlimited repositories'  },
  { icon: User,       label: 'Full profile access'          },
  { icon: BarChart2,  label: 'Personalized recommendations' },
  { icon: Headphones, label: 'Priority support'             },
];

export function PaywallModal({ type, onClose }: PaywallModalProps) {
  const { headline, body } = PAYWALL_CONTENT[type];
  const [showPayPal, setShowPayPal] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'notfound'>('idle');

  const handleRestore = async () => {
    const trimmed = restoreEmail.trim();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) return;
    setRestoreStatus('loading');
    const found = await supabaseService.restoreSubscriptionByEmail(trimmed);
    if (found) {
      setRestoreStatus('success');
      setTimeout(() => { onClose(); window.location.reload(); }, 1500);
    } else {
      setRestoreStatus('notfound');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full rounded-2xl relative flex flex-col overflow-hidden"
          style={{
            maxWidth: 380,
            maxHeight: '90vh',
            background: '#0d1117',
            border: '1px solid #21262d',
            boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          }}
        >
          {/* Blue top bar */}
          <div style={{ height: 2, background: '#2563eb', flexShrink: 0 }} />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg z-10 transition-colors"
            style={{ color: '#6e7681' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#e6edf3'; e.currentTarget.style.background = '#161b22'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6e7681'; e.currentTarget.style.background = 'transparent'; }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>

            {/* Header */}
            <div className="px-6 pt-7 pb-5">
              {/* Brand */}
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

              {/* Context message */}
              <div
                className="rounded-xl p-4 mb-1"
                style={{ background: '#161b22', border: '1px solid #21262d' }}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: '#e6edf3' }}>{headline}</p>
                <p className="text-xs" style={{ color: '#8b949e' }}>{body}</p>
              </div>
            </div>

            {/* Price */}
            <div className="px-6 pb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold" style={{ color: '#e6edf3' }}>$4.99</span>
                <span className="text-sm" style={{ color: '#6e7681' }}>/month</span>
                <span className="ml-auto text-xs" style={{ color: '#6e7681' }}>Cancel anytime</span>
              </div>
            </div>

            {/* Features */}
            <div className="px-6 pb-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6e7681' }}>
                What's included
              </p>
              <div className="space-y-2.5">
                {FEATURES.map(({ icon: Icon, label }) => (
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

            {/* CTA */}
            <div className="px-6 pb-4">
              <button
                onClick={() => setShowPayPal(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ background: '#2563eb' }}
              >
                Upgrade to Pro
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm mt-2 transition-colors"
                style={{ color: '#6e7681' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#8b949e')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6e7681')}
              >
                Maybe later
              </button>
            </div>

            {/* Already Pro? Restore access */}
            {!showRestore ? (
              <div className="px-6 pb-2 text-center">
                <button
                  onClick={() => setShowRestore(true)}
                  className="text-xs flex items-center gap-1.5 mx-auto transition-colors"
                  style={{ color: '#6e7681' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#3b82f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6e7681')}
                >
                  <RotateCcw className="w-3 h-3" />
                  Already Pro? Restore access
                </button>
              </div>
            ) : (
              <div className="px-6 pb-3">
                <div className="rounded-xl p-3" style={{ background: '#161b22', border: '1px solid #21262d' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#8b949e' }}>Enter your subscription email</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={restoreEmail}
                      onChange={(e) => { setRestoreEmail(e.target.value); setRestoreStatus('idle'); }}
                      placeholder="you@example.com"
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
                      style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }}
                      onKeyDown={(e) => e.key === 'Enter' && handleRestore()}
                    />
                    <button
                      onClick={handleRestore}
                      disabled={restoreStatus === 'loading' || restoreStatus === 'success'}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#2563eb' }}
                    >
                      {restoreStatus === 'loading' ? '…' : restoreStatus === 'success' ? '✓' : 'Restore'}
                    </button>
                  </div>
                  {restoreStatus === 'notfound' && (
                    <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>
                      No active subscription found for that email.
                    </p>
                  )}
                  {restoreStatus === 'success' && (
                    <p className="text-xs mt-1.5" style={{ color: '#22c55e' }}>
                      ✓ Pro restored! Reloading…
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" style={{ color: '#6e7681' }} />
              <span className="text-xs" style={{ color: '#6e7681' }}>
                Secured by PayPal · SSL encrypted · PCI compliant
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* PayPal Modal */}
      {showPayPal && (
        <PayPalSubscriptionModal
          isOpen={showPayPal}
          onClose={() => { setShowPayPal(false); onClose(); }}
          planId={PAYPAL_PLAN_ID}
          price="$4.99"
          features={[]}
        />
      )}
    </>
  );
}

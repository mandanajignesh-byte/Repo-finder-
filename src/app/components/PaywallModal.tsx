import { X, Lock } from 'lucide-react';

const APP_STORE_LINK = 'https://apps.apple.com/app/repoverse/id6746498585';

export type PaywallType = 'swipes' | 'agent' | 'save' | 'profile';

interface PaywallModalProps {
  type: PaywallType;
  onClose: () => void;
}

const PAYWALL_CONTENT: Record<PaywallType, { headline: string; body: string }> = {
  swipes: {
    headline: "You've met your match limit for today 😅",
    body: "Come back tomorrow for 5 more free swipes — or go unlimited right now.",
  },
  agent: {
    headline: "Your Agent needs a coffee ☕",
    body: "You've used your 2 free queries for today. Upgrade for unlimited access.",
  },
  save: {
    headline: "Saving repos is a Pro feature 🔒",
    body: "Upgrade to Pro to save unlimited repos and build your personal collection.",
  },
  profile: {
    headline: "Profile is a Pro feature 🔒",
    body: "Upgrade to Pro to access your profile, saved history, and personalised settings.",
  },
};

export function PaywallModal({ type, onClose }: PaywallModalProps) {
  const { headline, body } = PAYWALL_CONTENT[type];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="max-w-sm w-full rounded-[24px] p-6 text-center relative"
        style={{
          background: 'rgba(28,28,30,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Close */}
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

        {/* Icon */}
        <div
          className="w-16 h-16 mx-auto mb-5 rounded-[18px] flex items-center justify-center"
          style={{
            background: 'rgba(37,99,235,0.15)',
            border: '1px solid rgba(37,99,235,0.3)',
          }}
        >
          <Lock className="w-7 h-7" style={{ color: '#60a5fa' }} />
        </div>

        {/* Text */}
        <h2 className="text-lg font-bold text-white mb-3 leading-snug">{headline}</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: '#6b7280' }}>{body}</p>

        {/* Buttons */}
        <div className="space-y-3">
          <a
            href={APP_STORE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-6 rounded-full font-semibold text-sm text-white transition-all hover:brightness-110"
            style={{
              background: '#2563eb',
              boxShadow: '0 0 24px rgba(37,99,235,0.35)',
            }}
          >
            Upgrade to Pro — $4.99/month
          </a>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm transition-colors"
            style={{ color: '#4b5563' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#9ca3af')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}
          >
            Come back tomorrow
          </button>
        </div>

        <p className="text-[10px] mt-4" style={{ color: '#374151' }}>
          Free usage resets daily at midnight
        </p>
      </div>
    </div>
  );
}

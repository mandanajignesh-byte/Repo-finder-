import { useState } from 'react';
import { X, Sparkles, Zap, Heart, Bot, Database, User, Crown } from 'lucide-react';
import { PayPalSubscriptionModal } from './PayPalSubscription';

const PAYPAL_PLAN_ID = 'P-40J96093905927145NGWZMVI';

export type PaywallType = 'swipes' | 'agent' | 'save' | 'profile';

interface PaywallModalProps {
  type: PaywallType;
  onClose: () => void;
}

const PAYWALL_CONTENT: Record<PaywallType, { headline: string; body: string; emoji: string }> = {
  swipes: {
    headline: "Daily Limit Reached",
    body: "You've explored your free swipes for today. Unlock unlimited discovery now.",
    emoji: "🚀",
  },
  agent: {
    headline: "AI Agent Limit Reached",
    body: "Your AI assistant is taking a break. Upgrade for unlimited intelligent recommendations.",
    emoji: "🤖",
  },
  save: {
    headline: "Unlock Saved Repositories",
    body: "Build your personal collection with unlimited saves and never lose track of amazing projects.",
    emoji: "💎",
  },
  profile: {
    headline: "Access Your Profile",
    body: "Get full profile access with personalized insights, saved history, and custom preferences.",
    emoji: "✨",
  },
};

export function PaywallModal({ type, onClose }: PaywallModalProps) {
  const { headline, body, emoji } = PAYWALL_CONTENT[type];
  const [showPayPal, setShowPayPal] = useState(false);

  const handleUpgradeClick = () => {
    setShowPayPal(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="max-w-sm w-full rounded-[24px] p-6 text-center relative overflow-y-auto"
          style={{
            maxHeight: '90vh',
            background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
            border: '1px solid rgba(148,163,184,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 100px rgba(59,130,246,0.1)',
          }}
        >
          {/* Animated gradient background */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.3) 0%, transparent 50%)',
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

          {/* Crown Icon with glow */}
          <div className="relative inline-block mb-6">
            <div
              className="w-20 h-20 mx-auto rounded-[24px] flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(147,51,234,0.2) 100%)',
                border: '2px solid rgba(59,130,246,0.3)',
                boxShadow: '0 0 40px rgba(59,130,246,0.3), inset 0 0 20px rgba(59,130,246,0.1)',
              }}
            >
              <Crown className="w-10 h-10" style={{ color: '#60a5fa' }} />
              <div 
                className="absolute inset-0 rounded-[24px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(147,51,234,0.1) 100%)',
                  filter: 'blur(8px)',
                }}
              />
            </div>
            {/* Floating emoji */}
            <div 
              className="absolute -top-2 -right-2 text-3xl"
              style={{
                animation: 'float 3s ease-in-out infinite',
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              {emoji}
            </div>
          </div>

          {/* Headline */}
          <h2 
            className="text-2xl font-bold mb-3 leading-tight"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {headline}
          </h2>
          
          {/* Body text */}
          <p className="text-base leading-relaxed mb-8 px-2" style={{ color: '#94a3b8' }}>
            {body}
          </p>

          {/* Quick features grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div 
              className="p-3 rounded-2xl text-left"
              style={{
                background: 'rgba(59,130,246,0.05)',
                border: '1px solid rgba(59,130,246,0.1)',
              }}
            >
              <Zap className="w-5 h-5 mb-2" style={{ color: '#60a5fa' }} />
              <div className="text-xs font-semibold text-white">Unlimited Swipes</div>
              <div className="text-[10px]" style={{ color: '#64748b' }}>Never run out</div>
            </div>
            
            <div 
              className="p-3 rounded-2xl text-left"
              style={{
                background: 'rgba(147,51,234,0.05)',
                border: '1px solid rgba(147,51,234,0.1)',
              }}
            >
              <Bot className="w-5 h-5 mb-2" style={{ color: '#a78bfa' }} />
              <div className="text-xs font-semibold text-white">AI Agent</div>
              <div className="text-[10px]" style={{ color: '#64748b' }}>Unlimited queries</div>
            </div>
            
            <div 
              className="p-3 rounded-2xl text-left"
              style={{
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.1)',
              }}
            >
              <Database className="w-5 h-5 mb-2" style={{ color: '#34d399' }} />
              <div className="text-xs font-semibold text-white">Save Repos</div>
              <div className="text-[10px]" style={{ color: '#64748b' }}>Unlimited saves</div>
            </div>
            
            <div 
              className="p-3 rounded-2xl text-left"
              style={{
                background: 'rgba(236,72,153,0.05)',
                border: '1px solid rgba(236,72,153,0.1)',
              }}
            >
              <Sparkles className="w-5 h-5 mb-2" style={{ color: '#f472b6' }} />
              <div className="text-xs font-semibold text-white">Pro Features</div>
              <div className="text-[10px]" style={{ color: '#64748b' }}>All unlocked</div>
            </div>
          </div>

          {/* Price badge */}
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
            }}
          >
            <span className="text-sm" style={{ color: '#94a3b8' }}>Only</span>
            <span className="text-2xl font-bold text-white">$4.99</span>
            <span className="text-sm" style={{ color: '#94a3b8' }}>/month</span>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleUpgradeClick}
            className="w-full py-4 px-6 rounded-full font-bold text-base text-white transition-all mb-4 relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              boxShadow: '0 10px 40px rgba(59,130,246,0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 15px 50px rgba(59,130,246,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(59,130,246,0.4)';
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Crown className="w-5 h-5" />
              Upgrade to Pro
            </span>
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              }}
            />
          </button>

          {/* Secondary action */}
          <button
            onClick={onClose}
            className="w-full py-3 text-sm transition-all"
            style={{ color: '#64748b' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            Maybe later
          </button>

          {/* Footer note */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
            <p className="text-xs" style={{ color: '#475569' }}>
              Cancel anytime • Secure payment • No hidden fees
            </p>
          </div>
        </div>
      </div>

      {/* Add animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* PayPal Modal */}
      {showPayPal && (
        <PayPalSubscriptionModal
          isOpen={showPayPal}
          onClose={() => {
            setShowPayPal(false);
            onClose();
          }}
          planId={PAYPAL_PLAN_ID}
          price="$4.99"
          features={[
            '♾️ Unlimited daily swipes',
            '🤖 Unlimited AI Agent queries',
            '💾 Save unlimited repositories',
            '👤 Full profile access',
            '📊 Personalized recommendations',
            '🔔 Priority support',
          ]}
        />
      )}
    </>
  );
}

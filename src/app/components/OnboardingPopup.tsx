/**
 * OnboardingPopup Component
 * A dismissible modal that prompts new users to complete onboarding
 * Shows on first visit and can be dismissed, but will reappear on next session
 */

import { X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingPopupProps {
  onStartOnboarding: () => void;
  onDismiss: () => void;
  show: boolean;
}

export function OnboardingPopup({ onStartOnboarding, onDismiss, show }: OnboardingPopupProps) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 rounded-full transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
          >
            <X className="w-5 h-5" style={{ color: '#8b949e' }} />
          </button>

          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
            }}
          >
            <Sparkles className="w-8 h-8" style={{ color: '#fff' }} />
          </div>

          {/* Title */}
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ color: '#e6edf3' }}
          >
            Welcome to Repoverse!
          </h2>

          {/* Description */}
          <p
            className="text-center mb-6 leading-relaxed"
            style={{ color: '#8b949e', fontSize: '15px' }}
          >
            Get personalized repository recommendations tailored to your interests, tech stack, and goals.
          </p>

          {/* Benefits list */}
          <div className="space-y-3 mb-8">
            {[
              { emoji: '🎯', text: 'Discover repos matching your tech stack' },
              { emoji: '⚡', text: 'Get AI-powered personalized recommendations' },
              { emoji: '🚀', text: 'Save time finding quality projects' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(37,99,235,0.1)',
                    border: '1px solid rgba(37,99,235,0.2)',
                  }}
                >
                  <span className="text-base">{item.emoji}</span>
                </div>
                <p className="text-sm" style={{ color: '#c9d1d9' }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={onStartOnboarding}
            className="w-full py-3.5 rounded-xl font-semibold text-base transition-all mb-3"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.3)';
            }}
          >
            Complete Setup (30 seconds)
          </button>

          {/* Skip text */}
          <button
            onClick={onDismiss}
            className="w-full text-sm py-2 transition-colors"
            style={{ color: '#8b949e' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#c9d1d9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8b949e';
            }}
          >
            I'll do this later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

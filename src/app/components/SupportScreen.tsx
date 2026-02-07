/**
 * Support Screen Component
 * Contains Feedback Dashboard, Feedback Section, and Buy Me a Coffee
 */

import { useState } from 'react';
import { BuyMeACoffee } from './BuyMeACoffee';
import { FeedbackSection } from './FeedbackSection';
import { FeedbackDashboard } from './FeedbackDashboard';

export function SupportScreen() {
  const [showDashboard, setShowDashboard] = useState(true); // Show dashboard by default

  return (
    <div 
      className="h-full bg-black p-4 md:p-6 overflow-y-auto pb-24 md:pb-0"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl text-white mb-2" style={{ fontWeight: 700 }}>Feedback</h1>
          <p className="text-gray-400 text-sm">
            View all feedback and share your thoughts
          </p>
        </div>

        {/* Toggle Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            {showDashboard ? 'Hide' : 'Show'} Feedback Dashboard
          </button>
        </div>

        {/* Feedback Dashboard - Shown by default */}
        {showDashboard && (
          <div className="mb-6">
            <FeedbackDashboard />
          </div>
        )}

        {/* Feedback Section */}
        <div className="mb-6">
          <FeedbackSection />
        </div>

        {/* Buy Me a Coffee Section */}
        <div className="mb-6">
          <BuyMeACoffee />
        </div>
      </div>
    </div>
  );
}

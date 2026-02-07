/**
 * Support Screen Component
 * Contains Buy Me a Coffee, Feedback sections, and Feedback Dashboard
 */

import { useState } from 'react';
import { BuyMeACoffee } from './BuyMeACoffee';
import { FeedbackSection } from './FeedbackSection';
import { FeedbackDashboard } from './FeedbackDashboard';

export function SupportScreen() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div 
      className="h-full bg-black p-4 md:p-6 overflow-y-auto pb-24 md:pb-0"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl text-white mb-2" style={{ fontWeight: 700 }}>Buy Me a Coffee & Feedback</h1>
          <p className="text-gray-400 text-sm">
            Choose your price and share your feedback
          </p>
        </div>

        {/* Toggle Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            {showDashboard ? 'Hide' : 'View'} Feedback Dashboard
          </button>
        </div>

        {/* Feedback Dashboard */}
        {showDashboard && (
          <div className="mb-6">
            <FeedbackDashboard />
          </div>
        )}

        {/* Buy Me a Coffee Section */}
        <div className="mb-6">
          <BuyMeACoffee />
        </div>

        {/* Feedback Section */}
        <div className="mb-6">
          <FeedbackSection />
        </div>
      </div>
    </div>
  );
}

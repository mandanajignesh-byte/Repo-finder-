/**
 * Support Screen Component
 * Contains Buy Me a Coffee and Feedback sections
 */

import { BuyMeACoffee } from './BuyMeACoffee';
import { FeedbackSection } from './FeedbackSection';

export function SupportScreen() {
  return (
    <div 
      className="h-full bg-black p-4 md:p-6 overflow-y-auto pb-24 md:pb-0"
      style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(219, 39, 119, 0.05) 0%, transparent 50%)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl text-white mb-2" style={{ fontWeight: 700 }}>Buy Me a Coffee & Feedback</h1>
          <p className="text-gray-400 text-sm">
            Choose your price and share your feedback
          </p>
        </div>

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

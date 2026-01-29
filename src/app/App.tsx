import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import { SplashScreen } from '@/app/components/SplashScreen';
import { DiscoveryScreen } from '@/app/components/DiscoveryScreen';
import { TrendingScreen } from '@/app/components/TrendingScreen';
import { AgentScreen } from '@/app/components/AgentScreen';
import { ProfileScreen } from '@/app/components/ProfileScreen';
import { SupportScreen } from '@/app/components/SupportScreen';
import { BottomNavigation } from '@/app/components/BottomNavigation';
import { SwipeHintPopup } from '@/app/components/SwipeHintPopup';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'trending' | 'agent' | 'profile' | 'support'>('discover');

  useEffect(() => {
    // Show splash screen for 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden flex flex-col dark" style={{
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(219, 39, 119, 0.05) 0%, transparent 50%)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar navigation (desktop) */}
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'discover' && (
              <motion.div
                key="discover"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <DiscoveryScreen />
              </motion.div>
            )}
            {activeTab === 'trending' && (
              <motion.div
                key="trending"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <TrendingScreen />
              </motion.div>
            )}
            {activeTab === 'agent' && (
              <motion.div
                key="agent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <AgentScreen />
              </motion.div>
            )}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <ProfileScreen onClose={() => setActiveTab('discover')} />
              </motion.div>
            )}
            {activeTab === 'support' && (
              <motion.div
                key="support"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <SupportScreen />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Swipe hint popup for first-time visitors */}
      <SwipeHintPopup />
      
      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}

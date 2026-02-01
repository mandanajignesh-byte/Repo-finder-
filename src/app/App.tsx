import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import { SplashScreen } from '@/app/components/SplashScreen';
import { DiscoveryScreen } from '@/app/components/DiscoveryScreen';
import { BottomNavigation } from '@/app/components/BottomNavigation';
import { SwipeHintPopup } from '@/app/components/SwipeHintPopup';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components for code splitting
const TrendingScreen = lazy(() => import('@/app/components/TrendingScreen').then(m => ({ default: m.TrendingScreen })));
const AgentScreen = lazy(() => import('@/app/components/AgentScreen').then(m => ({ default: m.AgentScreen })));
const ProfileScreen = lazy(() => import('@/app/components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const SupportScreen = lazy(() => import('@/app/components/SupportScreen').then(m => ({ default: m.SupportScreen })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="h-full bg-black flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  </div>
);

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'trending' | 'agent' | 'profile' | 'support'>('discover');

  useEffect(() => {
    // Show splash screen for 1 second (reduced from 2.5s for faster loading)
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);

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
                <Suspense fallback={<LoadingFallback />}>
                  <TrendingScreen />
                </Suspense>
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
                <Suspense fallback={<LoadingFallback />}>
                  <AgentScreen />
                </Suspense>
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
                <Suspense fallback={<LoadingFallback />}>
                  <ProfileScreen onClose={() => setActiveTab('discover')} />
                </Suspense>
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
                <Suspense fallback={<LoadingFallback />}>
                  <SupportScreen />
                </Suspense>
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

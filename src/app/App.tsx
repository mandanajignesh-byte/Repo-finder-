import { useState, useEffect, lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { SplashScreen } from '@/app/components/SplashScreen';
import { DiscoveryScreen } from '@/app/components/DiscoveryScreen';
import { BottomNavigation } from '@/app/components/BottomNavigation';
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
      <Loader2 className="w-8 h-8 text-gray-400" />
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
    <div className="h-screen w-full bg-black relative overflow-hidden flex flex-col dark">
      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar navigation (desktop) */}
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'discover' && <DiscoveryScreen />}
          {activeTab === 'trending' && (
            <Suspense fallback={<LoadingFallback />}>
              <TrendingScreen />
            </Suspense>
          )}
          {activeTab === 'agent' && (
            <Suspense fallback={<LoadingFallback />}>
              <AgentScreen />
            </Suspense>
          )}
          {activeTab === 'profile' && (
            <Suspense fallback={<LoadingFallback />}>
              <ProfileScreen onClose={() => setActiveTab('discover')} />
            </Suspense>
          )}
          {activeTab === 'support' && (
            <Suspense fallback={<LoadingFallback />}>
              <SupportScreen />
            </Suspense>
          )}
        </div>
      </div>

      {/* Vercel Analytics */}
      <Analytics />
      
      {/* Vercel Speed Insights */}
      <SpeedInsights />
    </div>
  );
}

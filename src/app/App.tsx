import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { SplashScreen } from '@/app/components/SplashScreen';
import { DiscoveryScreen } from '@/app/components/DiscoveryScreen';
import { BottomNavigation } from '@/app/components/BottomNavigation';
import { RepositoryRedirect } from '@/app/components/RepositoryRedirect';
import { Loader2 } from 'lucide-react';
import { initGA, trackPageView } from '@/utils/analytics';
import { updateSEO, getSEOForRoute } from '@/utils/seo';

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

function AppContent() {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(true);

  // Initialize Google Analytics on mount
  useEffect(() => {
    initGA();
  }, []);

  // Update SEO and track page views on route change
  useEffect(() => {
    if (!showSplash) {
      const path = location.pathname;
      const seoData = getSEOForRoute(path);
      
      // Update meta tags for SEO
      updateSEO({
        ...seoData,
        url: window.location.href,
      });
      
      // Track page view in Google Analytics
      const pageTitle = seoData.title || `RepoVerse - ${path === '/' ? 'Discover' : path.slice(1).charAt(0).toUpperCase() + path.slice(2)}`;
      trackPageView(path, pageTitle);
    }
  }, [location.pathname, showSplash]);

  useEffect(() => {
    // Show splash screen for 1 second (reduced from 2.5s for faster loading)
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Determine active tab from pathname
  const getActiveTab = (): 'discover' | 'trending' | 'agent' | 'profile' | 'support' => {
    const path = location.pathname;
    // Exclude /r/ routes from affecting active tab
    if (path.startsWith('/r/')) return 'discover';
    if (path === '/trending') return 'trending';
    if (path === '/agent') return 'agent';
    if (path === '/profile') return 'profile';
    if (path === '/support') return 'support';
    return 'discover';
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen w-full bg-transparent relative overflow-hidden flex flex-col dark">
      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar navigation (desktop) */}
        <BottomNavigation activeTab={getActiveTab()} />
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="/discover" element={<DiscoveryScreen />} />
            <Route path="/r/:owner/:repo" element={<RepositoryRedirect />} />
            <Route 
              path="/trending" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <TrendingScreen />
                </Suspense>
              } 
            />
            <Route 
              path="/agent" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AgentScreen />
                </Suspense>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProfileScreen onClose={() => window.history.back()} />
                </Suspense>
              } 
            />
            <Route 
              path="/support" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <SupportScreen />
                </Suspense>
              } 
            />
            <Route path="*" element={<Navigate to="/discover" replace />} />
          </Routes>
        </div>
      </div>

      {/* Vercel Analytics */}
      <Analytics />
      
      {/* Vercel Speed Insights */}
      <SpeedInsights />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

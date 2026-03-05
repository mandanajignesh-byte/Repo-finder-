import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { SplashScreen } from '@/app/components/SplashScreen';
import { BottomNavigation } from '@/app/components/BottomNavigation';
import { Loader2 } from 'lucide-react';
import { updateSEO, getSEOForRoute } from '@/utils/seo';

// Lazy load ALL heavy components for code splitting - including DiscoveryScreen
const LandingPage = lazy(() => import('@/app/components/LandingPage').then(m => ({ default: m.LandingPage })));
const LandingRoute = lazy(() => import('@/app/components/LandingRoute').then(m => ({ default: m.LandingRoute })));
const DiscoveryScreen = lazy(() => import('@/app/components/DiscoveryScreen').then(m => ({ default: m.DiscoveryScreen })));
const TrendingScreen = lazy(() => import('@/app/components/TrendingScreen').then(m => ({ default: m.TrendingScreen })));
const AgentScreen = lazy(() => import('@/app/components/AgentScreen').then(m => ({ default: m.AgentScreen })));
const ProfileScreen = lazy(() => import('@/app/components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const SupportScreen = lazy(() => import('@/app/components/SupportScreen').then(m => ({ default: m.SupportScreen })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center" style={{ background: '#0d1117' }}>
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-gray-400" />
      <p className="text-sm" style={{ color: '#8b949e' }}>Loading...</p>
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  // Defer analytics initialization until after initial render for faster load
  useEffect(() => {
    // Use requestIdleCallback if available, otherwise setTimeout
    const loadAnalytics = async () => {
      const { initGA, trackPageView } = await import('@/utils/analytics');
    initGA();
      setAnalyticsLoaded(true);
      
      // Track initial page view after analytics is loaded
      const path = location.pathname;
      const seoData = getSEOForRoute(path);
      const pageTitle = seoData.title || `RepoVerse - ${path === '/' ? 'Discover' : path.slice(1).charAt(0).toUpperCase() + path.slice(2)}`;
      trackPageView(path, pageTitle);
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        loadAnalytics();
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        loadAnalytics();
      }, 1000);
    }
  }, [location.pathname]);

  // Update SEO and track page views on route change
  useEffect(() => {
    if (!showSplash && analyticsLoaded) {
      const path = location.pathname;
      const seoData = getSEOForRoute(path);
      
      // Update meta tags for SEO
      updateSEO({
        ...seoData,
        url: window.location.href,
      });
      
      // Track page view in Google Analytics (only if analytics is loaded)
      import('@/utils/analytics').then(({ trackPageView }) => {
      const pageTitle = seoData.title || `RepoVerse - ${path === '/' ? 'Discover' : path.slice(1).charAt(0).toUpperCase() + path.slice(2)}`;
      trackPageView(path, pageTitle);
      });
    }
  }, [location.pathname, showSplash, analyticsLoaded]);

  useEffect(() => {
    // OPTIMIZATION: Show splash screen for minimal time - just enough for initial render
    // Reduced to 300ms for even faster perceived load time
    // Users see content structure immediately
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Determine active tab from pathname (all app routes live under /app/*)
  const getActiveTab = (): 'discover' | 'trending' | 'agent' | 'profile' | 'support' => {
    const path = location.pathname;
    if (path.startsWith('/app/r/') || path.startsWith('/r/')) return 'discover';
    if (path.startsWith('/app/trending')) return 'trending';
    if (path.startsWith('/app/agent')) return 'agent';
    if (path.startsWith('/app/profile')) return 'profile';
    if (path.startsWith('/app/support')) return 'support';
    return 'discover';
  };

  // "/" — new public landing page (RepoverseLanding + live Trending feed)
  // No sidebar. No splash. Fully public.
  const isNewLanding = location.pathname === '/';

  // The global CSS sets html/body to overflow:hidden for the app screens.
  // On the landing page we need normal document scrolling, so we override it.
  useEffect(() => {
    if (isNewLanding) {
      document.documentElement.style.overflow = 'auto';
      document.documentElement.style.height = 'auto';
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
    } else {
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
    }
  }, [isNewLanding]);

  if (isNewLanding) {
    return (
      <div style={{ minHeight: '100vh', overflowY: 'auto', background: '#0d1117' }}>
        <Suspense fallback={<LoadingFallback />}>
          <LandingRoute />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </div>
    );
  }

  // "/trending" — public standalone trending page (no sidebar, no splash)
  const isPublicTrending = location.pathname === '/trending';
  if (isPublicTrending) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', overflowY: 'auto' }}>
        <Suspense fallback={<LoadingFallback />}>
          <TrendingScreen />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </div>
    );
  }

  // /download is a standalone landing page (no nav bar, no splash)
  const isLandingPage = location.pathname === '/download';

  if (isLandingPage) {
    return (
      <div className="h-screen w-full overflow-y-auto bg-black">
        <Suspense fallback={<LoadingFallback />}>
          <LandingPage />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen w-full relative overflow-hidden flex flex-col dark" style={{ background: '#0d1117' }}>
      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar navigation (desktop) */}
        <BottomNavigation activeTab={getActiveTab()} />
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <Routes>
            {/* All app screens live under /app/* */}
            <Route path="/app/discover"
              element={<Suspense fallback={<LoadingFallback />}><DiscoveryScreen /></Suspense>}
            />
            <Route path="/app/r/:owner/:repo"
              element={<Suspense fallback={<LoadingFallback />}><DiscoveryScreen /></Suspense>}
            />
            {/* Legacy /r/:owner/:repo — keep working */}
            <Route path="/r/:owner/:repo"
              element={<Suspense fallback={<LoadingFallback />}><DiscoveryScreen /></Suspense>}
            />
            <Route path="/app/trending"
              element={<Suspense fallback={<LoadingFallback />}><TrendingScreen /></Suspense>}
            />
            <Route path="/app/agent"
              element={<Suspense fallback={<LoadingFallback />}><AgentScreen /></Suspense>}
            />
            <Route path="/app/profile"
              element={<Suspense fallback={<LoadingFallback />}><ProfileScreen onClose={() => window.history.back()} /></Suspense>}
            />
            <Route path="/app/support"
              element={<Suspense fallback={<LoadingFallback />}><SupportScreen /></Suspense>}
            />

            {/* Legacy short-path redirects → keep old bookmarks/shares working */}
            <Route path="/discover"   element={<Navigate to="/app/discover"  replace />} />
            <Route path="/agent"      element={<Navigate to="/app/agent"     replace />} />
            <Route path="/profile"    element={<Navigate to="/app/profile"   replace />} />
            <Route path="/support"    element={<Navigate to="/app/support"   replace />} />

            {/* /app with no sub-path → discover */}
            <Route path="/app" element={<Navigate to="/app/discover" replace />} />

            {/* Catch-all → discover */}
            <Route path="*" element={<Navigate to="/app/discover" replace />} />
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

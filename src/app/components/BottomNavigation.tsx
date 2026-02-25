import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, TrendingUp, Bot, User, Heart, Smartphone, X } from 'lucide-react';

const APP_STORE_LINK = 'https://apps.apple.com/app/repoverse/id6746498585';

interface BottomNavigationProps {
  activeTab: 'discover' | 'trending' | 'agent' | 'profile' | 'support';
}

export function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const location = useLocation();
  const [showMobileBanner, setShowMobileBanner] = useState(() => {
    // Only show banner once per session
    return !sessionStorage.getItem('app_banner_dismissed');
  });
  
  const navItems = [
    { id: 'discover' as const, icon: Compass, label: 'Explore', path: '/discover' },
    { id: 'trending' as const, icon: TrendingUp, label: 'Trending', path: '/trending' },
    { id: 'agent' as const, icon: Bot, label: 'Agent', path: '/agent' },
    { id: 'profile' as const, icon: User, label: 'Profile', path: '/profile' },
    { id: 'support' as const, icon: Heart, label: 'Buy Me a Coffee', path: '/support' },
  ];

  const dismissBanner = () => {
    setShowMobileBanner(false);
    sessionStorage.setItem('app_banner_dismissed', 'true');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-black border-r border-gray-800 flex-col py-6">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="/logo.png" 
              alt="RepoVerse Logo" 
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-2xl font-bold text-white" style={{ fontWeight: 700 }}>RepoVerse</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Navigate GitHub repositories</p>
        </div>
        <nav className="flex-1 space-y-2 px-4">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/discover' && location.pathname === '/');
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors relative ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-400 hover:bg-gray-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 relative z-10`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="font-medium relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Download App CTA - Desktop Sidebar */}
        <div className="px-4 mt-4">
          <a
            href={APP_STORE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-purple-600/5 p-4 hover:border-blue-500/30 hover:from-blue-600/15 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Get the App</div>
                <div className="text-[10px] text-gray-500">Unlimited AI + More</div>
              </div>
            </div>
            <div className="text-[11px] text-gray-400 leading-relaxed">
              Unlock unlimited AI agent queries, push notifications, offline access & more.
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-400 group-hover:text-blue-300 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
              </svg>
              Download on App Store
            </div>
          </a>
        </div>
      </div>

      {/* Mobile: Smart App Banner (top of screen) */}
      {showMobileBanner && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-gray-900/95 backdrop-blur-xl border-b border-white/5 px-3 py-2.5 safe-area-inset-top">
          <div className="flex items-center gap-3">
            <button
              onClick={dismissBanner}
              className="text-gray-500 hover:text-gray-300 p-0.5"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <img src="/logo.png" alt="RepoVerse" className="w-9 h-9 rounded-xl" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white leading-tight">RepoVerse</div>
              <div className="text-[11px] text-gray-400 leading-tight">Unlimited AI Agent & More</div>
            </div>
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 text-xs font-bold rounded-full bg-blue-500 text-white flex-shrink-0"
            >
              GET
            </a>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 px-4 py-2.5 pb-safe z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/discover' && location.pathname === '/');
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 transition-colors relative px-2 py-1 ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
              >
                <div>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] md:text-xs font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

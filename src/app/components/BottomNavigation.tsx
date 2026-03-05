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
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <div
        className="hidden md:flex flex-col py-6"
        style={{
          width: '256px',
          minWidth: '256px',
          background: '#0d1117',
          borderRight: '1px solid #21262d',
        }}
      >
        {/* Logo */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <img
              src="/logo.png"
              alt="RepoVerse Logo"
              className="h-8 w-8 object-contain rounded-xl"
            />
            <h1
              className="text-xl"
              style={{ fontWeight: 700, color: '#e6edf3' }}
            >
              RepoVerse
            </h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>
            Navigate GitHub repositories
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/discover' && location.pathname === '/');

            return (
              <Link
                key={item.id}
                to={item.path}
                className="w-full flex items-center gap-3 rounded-lg transition-all duration-150 relative group"
                style={{
                  padding: '10px 14px',
                  // Active: blue left accent + subtle blue bg
                  background: isActive ? '#1d2939' : 'transparent',
                  borderLeft: isActive
                    ? '3px solid #2563eb'
                    : '3px solid transparent',
                  color: isActive ? '#e6edf3' : '#8b949e',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background =
                      '#161b22';
                    (e.currentTarget as HTMLElement).style.color = '#c9d1d9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background =
                      'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#8b949e';
                  }
                }}
              >
                <Icon
                  style={{ width: '20px', height: '20px', flexShrink: 0 }}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className="text-sm"
                  style={{ fontWeight: isActive ? 600 : 400 }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: subtle Pro badge + muted App Store link */}
        <div className="px-4 mt-6 space-y-3">
          {/* Pro upgrade — subtle, not intrusive */}
          <Link
            to="/profile"
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150"
            style={{ color: '#8b949e' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#161b22';
              (e.currentTarget as HTMLElement).style.color = '#c9d1d9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#8b949e';
            }}
          >
            <span style={{ fontSize: '14px' }}>⚡</span>
            <span className="text-xs" style={{ fontWeight: 500 }}>
              Upgrade to Pro
            </span>
          </Link>

          {/* iOS App link — muted, small */}
          <a
            href={APP_STORE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{ color: '#8b949e', textDecoration: 'none' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#c9d1d9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#8b949e';
            }}
          >
            <Smartphone style={{ width: '13px', height: '13px', flexShrink: 0 }} />
            <span style={{ fontSize: '11px' }}>Download iOS App</span>
          </a>
        </div>
      </div>

      {/* ── Mobile: Smart App Banner (top) ──────────────────────────── */}
      {showMobileBanner && (
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-[60] backdrop-blur-xl border-b px-3 py-2.5"
          style={{
            background: 'rgba(13,17,23,0.96)',
            borderColor: '#21262d',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={dismissBanner}
              className="p-0.5"
              aria-label="Dismiss"
              style={{ color: '#8b949e' }}
            >
              <X className="w-4 h-4" />
            </button>
            <img src="/logo.png" alt="RepoVerse" className="w-9 h-9 rounded-xl" />
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold leading-tight"
                style={{ color: '#e6edf3' }}
              >
                RepoVerse
              </div>
              <div className="text-[11px] leading-tight" style={{ color: '#8b949e' }}>
                Unlimited AI Agent &amp; More
              </div>
            </div>
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 text-xs font-bold rounded-full flex-shrink-0"
              style={{ background: '#2563eb', color: '#fff' }}
            >
              GET
            </a>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Navigation ─────────────────────────────────── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 px-4 py-2.5 pb-safe z-50"
        style={{
          background: '#0d1117',
          borderTop: '1px solid #21262d',
        }}
      >
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/discover' && location.pathname === '/');

            return (
              <Link
                key={item.id}
                to={item.path}
                className="flex flex-col items-center gap-0.5 transition-colors relative px-2 py-1"
                style={{ color: isActive ? '#2563eb' : '#8b949e' }}
              >
                <div>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span
                  className="text-[10px] leading-tight"
                  style={{ fontWeight: isActive ? 600 : 400 }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

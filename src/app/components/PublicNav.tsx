import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, TrendingUp, Home, Menu, X, Globe } from 'lucide-react';

const APP_STORE_LINK = 'https://apps.apple.com/us/app/repoverse/id6759513548';

function AppleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </svg>
  );
}

/**
 * Sticky navigation bar shared by the public landing page ("/") and
 * the public trending page ("/trending").
 *
 * Mobile: hamburger menu with App Store link.
 * Desktop: inline nav links + CTA.
 */
export function PublicNav() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLanding  = location.pathname === '/';
  const isTrending = location.pathname === '/trending';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 640) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navLinkStyle = (active: boolean, id: string): React.CSSProperties => ({
    display:        'inline-flex',
    alignItems:     'center',
    gap:            '6px',
    padding:        '6px 14px',
    borderRadius:   '8px',
    fontSize:       '14px',
    fontWeight:     500,
    color:          active ? '#e6edf3' : hovered === id ? '#c9d1d9' : '#8b949e',
    textDecoration: 'none',
    background:     active ? 'rgba(255,255,255,0.07)' : hovered === id ? 'rgba(255,255,255,0.04)' : 'transparent',
    border:         active ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
    transition:     'all 0.15s ease',
    cursor:         'pointer',
  });

  return (
    <>
      <nav
        style={{
          position:            'sticky',
          top:                 0,
          zIndex:              200,
          background:          scrolled ? 'rgba(13,17,23,0.95)' : 'rgba(13,17,23,0.75)',
          backdropFilter:      'blur(14px)',
          WebkitBackdropFilter:'blur(14px)',
          borderBottom:        scrolled
            ? '1px solid rgba(255,255,255,0.07)'
            : '1px solid rgba(255,255,255,0.04)',
          transition:          'background 0.25s ease, border-color 0.25s ease',
        }}
      >
        {/* Main bar */}
        <div
          style={{
            height:          '60px',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            padding:         '0 20px',
            maxWidth:        '1200px',
            margin:          '0 auto',
          }}
        >
          {/* ── Logo ────────────────────────────────────────────────── */}
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}
          >
            <img
              src="/logo.png"
              alt="RepoVerse"
              style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'contain' }}
            />
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#e6edf3', letterSpacing: '-0.01em' }}>
              RepoVerse
            </span>
          </Link>

          {/* ── Desktop center nav links ─────────────────────────────── */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            className="hidden sm:flex"
          >
            <Link
              to="/"
              style={navLinkStyle(isLanding, 'home')}
              onMouseEnter={() => setHovered('home')}
              onMouseLeave={() => setHovered(null)}
            >
              <Home size={14} strokeWidth={1.5} />
              Home
            </Link>

            <Link
              to="/trending"
              style={navLinkStyle(isTrending, 'trending')}
              onMouseEnter={() => setHovered('trending')}
              onMouseLeave={() => setHovered(null)}
            >
              <TrendingUp size={14} strokeWidth={1.5} />
              Trending
            </Link>
          </div>

          {/* ── Desktop right side ───────────────────────────────────── */}
          <div className="hidden sm:flex items-center gap-3">
            {/* App Store pill */}
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            '6px',
                padding:        '7px 14px',
                borderRadius:   '10px',
                fontSize:       '13px',
                fontWeight:     600,
                color:          '#e6edf3',
                textDecoration: 'none',
                background:     'rgba(255,255,255,0.05)',
                border:         '1px solid rgba(255,255,255,0.1)',
                transition:     'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.18)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              <AppleIcon className="w-3.5 h-3.5" />
              App Store
            </a>

            {/* Try Web App */}
            <Link
              to="/app/discover"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            '6px',
                padding:        '8px 18px',
                borderRadius:   '10px',
                fontSize:       '14px',
                fontWeight:     600,
                color:          '#fff',
                textDecoration: 'none',
                background:     'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow:      hovered === 'cta'
                  ? '0 0 24px rgba(37,99,235,0.5)'
                  : '0 0 14px rgba(37,99,235,0.3)',
                transform:      hovered === 'cta' ? 'scale(1.03)' : 'scale(1)',
                transition:     'all 0.15s ease',
                whiteSpace:     'nowrap',
              }}
              onMouseEnter={() => setHovered('cta')}
              onMouseLeave={() => setHovered(null)}
            >
              Try Web App
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>

          {/* ── Mobile right side: App pill + hamburger ──────────────── */}
          <div className="flex sm:hidden items-center gap-2">
            {/* Compact App Store button */}
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            '5px',
                padding:        '6px 12px',
                borderRadius:   '999px',
                fontSize:       '12px',
                fontWeight:     600,
                color:          '#0d1117',
                textDecoration: 'none',
                background:     '#ffffff',
                whiteSpace:     'nowrap',
              }}
            >
              <AppleIcon className="w-3 h-3" />
              Get App
            </a>

            {/* Hamburger button */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              style={{
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                width:           '36px',
                height:          '36px',
                borderRadius:    '10px',
                border:          '1px solid rgba(255,255,255,0.1)',
                background:      mobileOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                color:           '#e6edf3',
                cursor:          'pointer',
                transition:      'all 0.15s ease',
              }}
            >
              {mobileOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ─────────────────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="sm:hidden"
            style={{
              borderTop:          '1px solid rgba(255,255,255,0.06)',
              background:         'rgba(13,17,23,0.97)',
              backdropFilter:     'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding:            '8px 16px 16px',
            }}
          >
            {/* Home */}
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '12px',
                padding:        '12px 16px',
                borderRadius:   '10px',
                fontSize:       '14px',
                fontWeight:     500,
                color:          isLanding ? '#e6edf3' : '#8b949e',
                textDecoration: 'none',
                background:     isLanding ? 'rgba(255,255,255,0.06)' : 'transparent',
                marginBottom:   '2px',
              }}
            >
              <Home size={16} strokeWidth={1.5} color="#8b949e" />
              Home
            </Link>

            {/* Trending */}
            <Link
              to="/trending"
              onClick={() => setMobileOpen(false)}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '12px',
                padding:        '12px 16px',
                borderRadius:   '10px',
                fontSize:       '14px',
                fontWeight:     500,
                color:          isTrending ? '#e6edf3' : '#8b949e',
                textDecoration: 'none',
                background:     isTrending ? 'rgba(255,255,255,0.06)' : 'transparent',
                marginBottom:   '2px',
              }}
            >
              <TrendingUp size={16} strokeWidth={1.5} color="#a78bfa" />
              Trending Repos
            </Link>

            {/* Try Web Version */}
            <Link
              to="/app/discover"
              onClick={() => setMobileOpen(false)}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '12px',
                padding:        '12px 16px',
                borderRadius:   '10px',
                fontSize:       '14px',
                fontWeight:     500,
                color:          '#8b949e',
                textDecoration: 'none',
                marginBottom:   '8px',
              }}
            >
              <Globe size={16} strokeWidth={1.5} color="#60a5fa" />
              Try Web Version
            </Link>

            {/* App Store — full width pill */}
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '12px',
                padding:        '13px 16px',
                borderRadius:   '12px',
                fontSize:       '14px',
                fontWeight:     600,
                color:          '#0d1117',
                textDecoration: 'none',
                background:     '#ffffff',
              }}
            >
              <AppleIcon className="w-4 h-4" />
              <span style={{ flex: 1 }}>Download on the App Store</span>
              <ArrowRight size={15} strokeWidth={2} />
            </a>
          </div>
        )}
      </nav>
    </>
  );
}

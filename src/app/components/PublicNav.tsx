import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const APP_STORE_LINK = 'https://apps.apple.com/us/app/repoverse/id6759513548';

// ── Apple logo SVG ───────────────────────────────────────────────────────────
function AppleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </svg>
  );
}

// ── Animated hamburger → × (3 lines morph) ──────────────────────────────────
function HamburgerIcon({ open }: { open: boolean }) {
  const base: React.CSSProperties = {
    display: 'block',
    height: '1.5px',
    borderRadius: '2px',
    background: '#e6edf3',
    transformOrigin: 'center',
    transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), opacity 0.2s ease, width 0.25s ease',
  };
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '22px' }}>
      <span style={{
        ...base,
        width: '22px',
        transform: open ? 'translateY(6.5px) rotate(45deg)' : 'none',
      }} />
      <span style={{
        ...base,
        width: open ? '22px' : '16px',
        opacity: open ? 0 : 1,
        transform: open ? 'scaleX(0)' : 'none',
      }} />
      <span style={{
        ...base,
        width: '22px',
        transform: open ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
      }} />
    </span>
  );
}

// ── Trending up arrow SVG ────────────────────────────────────────────────────
function TrendingIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

// ── Arrow right SVG ──────────────────────────────────────────────────────────
function ArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

/**
 * Public nav — used on "/" and "/trending".
 * Desktop: logo · center links · CTA buttons
 * Mobile:  logo · hamburger → full-screen overlay menu
 */
export function PublicNav() {
  const location = useLocation();
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  const isLanding  = location.pathname === '/';
  const isTrending = location.pathname === '/trending';

  // Scroll effect
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Auto-close on desktop resize
  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const close = () => setMobileOpen(false);

  return (
    <>
      {/* ─────────────────────── NAV BAR ─────────────────────────── */}
      <nav
        style={{
          position:            'sticky',
          top:                 0,
          zIndex:              300,
          background:          scrolled || mobileOpen
            ? 'rgba(13,17,23,0.98)'
            : 'rgba(13,17,23,0.72)',
          backdropFilter:      'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          borderBottom:        scrolled
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid transparent',
          transition:          'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        <div
          style={{
            height:         '60px',
            maxWidth:       '1200px',
            margin:         '0 auto',
            padding:        '0 20px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
          }}
        >
          {/* ── Logo ─────────────────────────────────────────────── */}
          <Link
            to="/"
            onClick={close}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}
          >
            <img
              src="/logo.png"
              alt="RepoVerse"
              style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'contain' }}
            />
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#e6edf3', letterSpacing: '-0.02em' }}>
              RepoVerse
            </span>
          </Link>

          {/* ── Desktop center nav ───────────────────────────────── */}
          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '2px',
              background:     'rgba(255,255,255,0.04)',
              border:         '1px solid rgba(255,255,255,0.07)',
              borderRadius:   '12px',
              padding:        '3px',
            }}
            className="hidden md:flex"
          >
            {[
              { to: '/',         label: 'Home',     active: isLanding  },
              { to: '/trending', label: 'Trending',  active: isTrending },
            ].map(({ to, label, active }) => (
              <Link
                key={to}
                to={to}
                style={{
                  padding:        '6px 16px',
                  borderRadius:   '9px',
                  fontSize:       '13px',
                  fontWeight:     500,
                  color:          active ? '#e6edf3' : '#6b7280',
                  textDecoration: 'none',
                  background:     active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border:         active ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                  transition:     'all 0.15s ease',
                  whiteSpace:     'nowrap',
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* ── Desktop right CTA ────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-2.5">
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
                color:          '#c9d1d9',
                textDecoration: 'none',
                background:     'rgba(255,255,255,0.05)',
                border:         '1px solid rgba(255,255,255,0.1)',
                transition:     'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,0.09)';
                el.style.color = '#e6edf3';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,0.05)';
                el.style.color = '#c9d1d9';
              }}
            >
              <AppleIcon size={14} />
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
                fontSize:       '13px',
                fontWeight:     600,
                color:          '#fff',
                textDecoration: 'none',
                background:     'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)',
                boxShadow:      '0 0 16px rgba(37,99,235,0.35)',
                transition:     'all 0.15s ease',
                whiteSpace:     'nowrap',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = '0 0 28px rgba(37,99,235,0.55)';
                el.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = '0 0 16px rgba(37,99,235,0.35)';
                el.style.transform = 'none';
              }}
            >
              Try Web App
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* ── Mobile: logo + hamburger only (clean minimal) ───── */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="flex md:hidden"
            style={{
              alignItems:      'center',
              justifyContent:  'center',
              width:           '36px',
              height:          '36px',
              borderRadius:    '10px',
              background:      'transparent',
              border:          'none',
              cursor:          'pointer',
              color:           '#e6edf3',
              padding:         0,
              flexShrink:      0,
            }}
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        </div>
      </nav>

      {/* ─────────────── FULL-SCREEN MOBILE OVERLAY ────────────────── */}
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     200,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity:    mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        className="md:hidden"
      />

      {/* Slide-down panel */}
      <div
        style={{
          position:   'fixed',
          top:        '60px',
          left:       0,
          right:      0,
          zIndex:     250,
          background: 'rgba(13,17,23,0.99)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '0 0 24px 24px',
          padding:    '4px 16px 20px',
          transform:  mobileOpen ? 'translateY(0)' : 'translateY(-110%)',
          opacity:    mobileOpen ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.25s ease',
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
        className="md:hidden"
      >
        {/* Nav links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '12px' }}>
          {[
            {
              to: '/',
              label: 'Home',
              sub: 'Back to the main page',
              active: isLanding,
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
                  <path d="M9 21V12h6v9"/>
                </svg>
              ),
              accent: '#a78bfa',
            },
            {
              to: '/trending',
              label: 'Trending',
              sub: 'Top repos rising right now',
              active: isTrending,
              icon: <TrendingIcon size={18} />,
              accent: '#34d399',
            },
            {
              to: '/app/discover',
              label: 'Try Web Version',
              sub: 'Discover repos in the app',
              active: false,
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
              ),
              accent: '#60a5fa',
            },
          ].map(({ to, label, sub, active, icon, accent }) => (
            <Link
              key={to}
              to={to}
              onClick={close}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '14px',
                padding:        '12px 14px',
                borderRadius:   '12px',
                textDecoration: 'none',
                background:     active ? 'rgba(255,255,255,0.06)' : 'transparent',
                border:         active ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
                transition:     'background 0.15s ease',
              }}
            >
              {/* Icon circle */}
              <span
                style={{
                  width:          '36px',
                  height:         '36px',
                  borderRadius:   '10px',
                  background:     `${accent}18`,
                  border:         `1px solid ${accent}30`,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  color:          accent,
                  flexShrink:     0,
                }}
              >
                {icon}
              </span>

              {/* Text */}
              <span style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: active ? '#e6edf3' : '#c9d1d9', letterSpacing: '-0.01em' }}>
                  {label}
                </span>
                <span style={{ fontSize: '11px', color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sub}
                </span>
              </span>

              {/* Active dot */}
              {active && (
                <span
                  style={{
                    marginLeft:  'auto',
                    width:       '6px',
                    height:      '6px',
                    borderRadius:'50%',
                    background:  accent,
                    flexShrink:  0,
                  }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '12px' }} />

        {/* App Store CTA — full width */}
        <a
          href={APP_STORE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            '12px',
            padding:        '14px 16px',
            borderRadius:   '14px',
            textDecoration: 'none',
            background:     '#ffffff',
            color:          '#0d1117',
          }}
        >
          <span
            style={{
              width:          '36px',
              height:         '36px',
              borderRadius:   '10px',
              background:     '#0d1117',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          '#ffffff',
              flexShrink:     0,
            }}
          >
            <AppleIcon size={18} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#374151', letterSpacing: '0.01em' }}>
              DOWNLOAD ON THE
            </span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0d1117', letterSpacing: '-0.02em', lineHeight: 1 }}>
              App Store
            </span>
          </span>
          <span style={{ marginLeft: 'auto', color: '#374151', flexShrink: 0 }}>
            <ArrowRight size={16} />
          </span>
        </a>
      </div>
    </>
  );
}

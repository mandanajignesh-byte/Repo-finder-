import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, TrendingUp, Home } from 'lucide-react';

/**
 * Sticky navigation bar shared by the public landing page ("/") and
 * the public trending page ("/trending").
 *
 * On scroll it gains a slightly stronger glass background.
 */
export function PublicNav() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const isLanding  = location.pathname === '/';
  const isTrending = location.pathname === '/trending';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
    <nav
      style={{
        position:            'sticky',
        top:                 0,
        zIndex:              200,
        height:              '60px',
        display:             'flex',
        alignItems:          'center',
        justifyContent:      'space-between',
        padding:             '0 24px',
        background:          scrolled
          ? 'rgba(13,17,23,0.92)'
          : 'rgba(13,17,23,0.75)',
        backdropFilter:      'blur(14px)',
        WebkitBackdropFilter:'blur(14px)',
        borderBottom:        scrolled
          ? '1px solid rgba(255,255,255,0.07)'
          : '1px solid rgba(255,255,255,0.04)',
        transition:          'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* ── Logo ──────────────────────────────────────────────────── */}
      <Link
        to="/"
        style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
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

      {/* ── Center nav links (hidden on small screens) ─────────── */}
      <div
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '4px',
          // hide on mobile via inline media-query alternative: we use a class
        }}
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

      {/* ── CTA button ──────────────────────────────────────────── */}
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
    </nav>
  );
}

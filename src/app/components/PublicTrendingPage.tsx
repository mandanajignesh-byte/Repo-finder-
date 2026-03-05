import { Link } from 'react-router-dom';
import { TrendingScreen } from './TrendingScreen';
import { PublicNav } from './PublicNav';
import { ArrowRight, Sparkles } from 'lucide-react';

/**
 * Public-facing trending page — repoverse.space/trending
 *
 * Wraps TrendingScreen with:
 *  - Shared PublicNav (logo, Home link, Try Web App CTA)
 *  - Page hero banner explaining what this page shows
 *  - Footer CTA nudging visitors to try the full web app
 */
export function PublicTrendingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', overflowX: 'hidden' }}>
      {/* ── Sticky nav ──────────────────────────────────────────── */}
      <PublicNav />

      {/* ── Page hero banner ──────────────────────────────────── */}
      <div
        style={{
          padding:         '48px 24px 32px',
          textAlign:       'center',
          borderBottom:    '1px solid rgba(255,255,255,0.05)',
          background:      'linear-gradient(180deg, rgba(37,99,235,0.06) 0%, transparent 100%)',
          position:        'relative',
          overflow:        'hidden',
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position:   'absolute',
            top:        '-60px',
            left:       '50%',
            transform:  'translateX(-50%)',
            width:      '600px',
            height:     '300px',
            background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Label pill */}
        <div
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            '6px',
            padding:        '4px 14px',
            borderRadius:   '999px',
            fontSize:       '11px',
            fontWeight:     600,
            textTransform:  'uppercase',
            letterSpacing:  '0.08em',
            background:     'rgba(37,99,235,0.12)',
            border:         '1px solid rgba(37,99,235,0.25)',
            color:          '#93c5fd',
            marginBottom:   '16px',
          }}
        >
          <Sparkles size={11} strokeWidth={1.5} />
          Updated daily · Powered by GitHub
        </div>

        <h1
          style={{
            fontFamily:     "'Cal Sans', 'Plus Jakarta Sans', 'Inter', sans-serif",
            fontSize:       'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight:     700,
            color:          '#fff',
            letterSpacing:  '-0.02em',
            marginBottom:   '12px',
            lineHeight:     1.2,
          }}
        >
          What's trending on GitHub right now.
        </h1>

        <p
          style={{
            fontSize:   '1rem',
            color:      '#8b949e',
            lineHeight: 1.6,
            maxWidth:   '480px',
            margin:     '0 auto 20px',
          }}
        >
          495 repos health-scored daily. Ranked by real commits and activity —
          not just stars from 3 years ago.
        </p>

        <Link
          to="/"
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            '6px',
            fontSize:       '13px',
            fontWeight:     500,
            color:          '#8b949e',
            textDecoration: 'none',
            padding:        '6px 14px',
            borderRadius:   '8px',
            border:         '1px solid rgba(255,255,255,0.08)',
            transition:     'color 0.15s ease',
          }}
        >
          ← Back to Home
        </Link>
      </div>

      {/* ── Trending content ────────────────────────────────────── */}
      <TrendingScreen />

      {/* ── Footer CTA ──────────────────────────────────────────── */}
      <div
        style={{
          padding:      '64px 24px',
          textAlign:    'center',
          borderTop:    '1px solid rgba(255,255,255,0.05)',
          background:   'linear-gradient(180deg, transparent 0%, rgba(37,99,235,0.04) 100%)',
        }}
      >
        <p
          style={{
            fontSize:    '11px',
            fontWeight:  600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color:       '#2563eb',
            marginBottom: '12px',
          }}
        >
          Like what you see?
        </p>
        <h2
          style={{
            fontFamily:    "'Cal Sans', 'Plus Jakarta Sans', 'Inter', sans-serif",
            fontSize:      'clamp(1.5rem, 3vw, 2.2rem)',
            fontWeight:    700,
            color:         '#fff',
            letterSpacing: '-0.02em',
            marginBottom:  '12px',
            lineHeight:    1.2,
          }}
        >
          There's a whole lot more inside.
        </h2>
        <p
          style={{
            fontSize:    '1rem',
            color:       '#8b949e',
            marginBottom: '28px',
            lineHeight:  1.6,
          }}
        >
          Swipe to discover repos, ask the AI agent, and get a personalised feed.
          <br />No credit card. Free to start.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            to="/app/discover"
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            '8px',
              padding:        '13px 28px',
              borderRadius:   '12px',
              background:     'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color:          '#fff',
              fontWeight:     600,
              fontSize:       '15px',
              textDecoration: 'none',
              boxShadow:      '0 0 28px rgba(37,99,235,0.35)',
            }}
          >
            Start Swiping Free
            <ArrowRight size={16} strokeWidth={2} />
          </Link>

          <Link
            to="/"
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            '8px',
              padding:        '13px 24px',
              borderRadius:   '12px',
              background:     'rgba(255,255,255,0.05)',
              border:         '1px solid rgba(255,255,255,0.1)',
              color:          '#e6edf3',
              fontWeight:     500,
              fontSize:       '15px',
              textDecoration: 'none',
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

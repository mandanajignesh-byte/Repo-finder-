import { useNavigate } from 'react-router-dom';
import { RepoverseLanding } from './RepoverseLanding';
import { TrendingScreen } from './TrendingScreen';

/**
 * "/" route — public landing page with live trending section below.
 * No sidebar. No splash screen.
 */
export function LandingRoute() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* ── Main landing page ─────────────────────────────────── */}
      <RepoverseLanding />

      {/* ── Trending section bridge ──────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0d1117' }}>
        <div className="px-4 pt-10 pb-4 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-1">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: '#2563eb' }}
              >
                Live on GitHub
              </p>
              <h2
                className="text-2xl md:text-3xl font-bold text-white"
                style={{ letterSpacing: '-0.02em' }}
              >
                What's trending right now
              </h2>
            </div>
            <button
              onClick={() => navigate('/discover')}
              className="self-start sm:self-auto flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:brightness-110"
              style={{
                background: '#2563eb',
                color: '#fff',
                boxShadow: '0 0 18px rgba(37,99,235,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              Start Exploring →
            </button>
          </div>
          <p className="text-xs" style={{ color: '#4b5563' }}>
            Updated every few hours · Powered by GitHub
          </p>
        </div>

        {/* Trending component rendered naturally (not h-full constrained) */}
        <TrendingScreen />

        {/* Bottom nudge */}
        <div
          className="py-12 px-4 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <p className="text-sm font-medium mb-4" style={{ color: '#6b7280' }}>
            Like what you see? There's a lot more inside.
          </p>
          <button
            onClick={() => navigate('/discover')}
            className="px-7 py-3 rounded-full font-semibold text-sm text-white transition-all hover:brightness-110"
            style={{ background: '#2563eb', boxShadow: '0 0 20px rgba(37,99,235,0.3)' }}
          >
            Start Swiping Free →
          </button>
        </div>
      </div>
    </div>
  );
}

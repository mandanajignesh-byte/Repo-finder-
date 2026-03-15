/**
 * GitHubCallbackPage
 * Rendered at /app/github-callback after GitHub OAuth.
 * Supabase JS automatically processes the URL hash (#access_token=...) into
 * an in-memory session. We extract the provider_token, save the connection,
 * sync starred repos, then redirect to the profile page.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { gitHubAuthService } from '@/services/github-auth.service';
import { supabaseService } from '@/services/supabase.service';

type Step = 'connecting' | 'syncing' | 'success' | 'error';

export function GitHubCallbackPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('connecting');
  const [syncCount, setSyncCount] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [login, setLogin] = useState('');
  const [errText, setErrText] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Always use the persistent anon_id — not the transient Supabase OAuth
        // session user. After handleCallback calls supabase.auth.signOut(), the
        // app reverts to anon_id for all lookups, so we must save the connection
        // under that same key to avoid a mismatch in ProfileScreen.
        let userId = localStorage.getItem('anon_id');
        if (!userId) {
          userId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          localStorage.setItem('anon_id', userId);
        }

        // ── Step 1: Extract GitHub token from Supabase OAuth session ──────
        const result = await gitHubAuthService.handleCallback(userId);
        if (cancelled) return;

        if (!result) {
          setStep('error');
          setErrText('Could not retrieve GitHub token. Please try again.');
          setTimeout(() => navigate('/app/profile'), 3500);
          return;
        }

        setLogin(result.profile.login);

        // ── Step 2: Sync starred repos ────────────────────────────────────
        setStep('syncing');
        await gitHubAuthService.syncStarredRepos(userId, (synced, total) => {
          if (!cancelled) {
            setSyncCount(synced);
            setSyncTotal(total);
          }
        });

        if (cancelled) return;

        setStep('success');
        setTimeout(() => navigate('/app/profile'), 2200);
      } catch (err: any) {
        if (cancelled) return;
        setStep('error');
        setErrText(err.message ?? 'Something went wrong. Please try again.');
        setTimeout(() => navigate('/app/profile'), 3500);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [navigate]);

  const progress = syncTotal > 0 ? Math.min(100, Math.round((syncCount / syncTotal) * 100)) : 0;

  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center gap-6 px-6"
      style={{ background: '#0d1117', color: '#e6edf3' }}
    >
      {/* GitHub mark */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
        style={{ background: '#161b22', border: '1px solid #30363d' }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" style={{ color: '#e6edf3' }}>
          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
      </div>

      {/* ── Connecting ───────────────────────────────────────────────────── */}
      {step === 'connecting' && (
        <>
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#2563eb' }} />
          <div className="text-center">
            <p className="font-semibold text-base" style={{ color: '#e6edf3' }}>Connecting your GitHub account…</p>
            <p className="text-sm mt-1" style={{ color: '#8b949e' }}>Securing token and fetching profile</p>
          </div>
        </>
      )}

      {/* ── Syncing starred repos ─────────────────────────────────────────── */}
      {step === 'syncing' && (
        <>
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#2563eb' }} />
          <div className="text-center">
            <p className="font-semibold text-base" style={{ color: '#e6edf3' }}>
              @{login} connected! Syncing stars…
            </p>
            <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
              {syncTotal > 0
                ? `${syncCount} / ${syncTotal} repos`
                : syncCount > 0
                ? `${syncCount} repos so far…`
                : 'Fetching your starred repositories…'}
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ width: 260, height: 4, background: '#21262d', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #1d4ed8, #2563eb)',
                width: syncTotal > 0 ? `${progress}%` : '30%',
                transition: 'width 0.4s ease',
                animation: syncTotal === 0 ? 'ghpulse 1.4s ease-in-out infinite' : undefined,
              }}
            />
          </div>

          <style>{`
            @keyframes ghpulse {
              0%   { width: 10%; opacity: 1; }
              50%  { width: 70%; opacity: 0.7; }
              100% { width: 10%; opacity: 1; }
            }
          `}</style>
        </>
      )}

      {/* ── Success ───────────────────────────────────────────────────────── */}
      {step === 'success' && (
        <>
          <CheckCircle className="w-8 h-8" style={{ color: '#22c55e' }} />
          <div className="text-center">
            <p className="font-semibold text-base" style={{ color: '#e6edf3' }}>
              {syncCount > 0 ? `${syncCount} starred repos synced!` : 'GitHub connected!'}
            </p>
            <p className="text-sm mt-1" style={{ color: '#8b949e' }}>Redirecting to your profile…</p>
          </div>
        </>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {step === 'error' && (
        <>
          <XCircle className="w-8 h-8" style={{ color: '#ef4444' }} />
          <div className="text-center">
            <p className="font-semibold text-base" style={{ color: '#e6edf3' }}>Connection failed</p>
            <p className="text-sm mt-1" style={{ color: '#8b949e' }}>{errText}</p>
          </div>
        </>
      )}
    </div>
  );
}

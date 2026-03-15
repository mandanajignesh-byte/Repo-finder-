import { useState } from 'react';
import { X, Check, Loader2, AlertCircle, Github, Sparkles } from 'lucide-react';
import { trendingCommunityService } from '@/services/trending-community.service';

interface SubmitRepoModalProps {
  onClose: () => void;
}

const GITHUB_URL_RE = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/.*)?$/i;

export function SubmitRepoModal({ onClose }: SubmitRepoModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = GITHUB_URL_RE.test(url.trim());

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const userInfo = await trendingCommunityService.getCurrentUserInfo();
      await trendingCommunityService.submitRepo(userInfo.userId, userInfo.displayName, url.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: '#0d1117',
            border: '1px solid #30363d',
            boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
            animation: 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`
            @keyframes modalIn {
              from { transform: scale(0.94) translateY(8px); opacity: 0; }
              to   { transform: scale(1) translateY(0);      opacity: 1; }
            }
          `}</style>

          {/* Header stripe */}
          <div
            className="px-6 pt-6 pb-5"
            style={{ borderBottom: '1px solid #21262d' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)' }}
                >
                  <Sparkles size={16} strokeWidth={1.5} style={{ color: '#60a5fa' }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold" style={{ color: '#e6edf3' }}>Submit a Repo</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: '#4b5563' }}>
                    We'll review and feature great ones
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ color: '#6b7280', background: 'transparent', border: '1px solid transparent' }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#e6edf3';
                  e.currentTarget.style.background = '#161b22';
                  e.currentTarget.style.borderColor = '#21262d';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="px-6 py-5">
            {success ? (
              <div className="flex flex-col items-center py-6 gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  <Check size={26} strokeWidth={1.5} style={{ color: '#4ade80' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold mb-1.5" style={{ color: '#e6edf3' }}>Submitted!</p>
                  <p className="text-xs leading-relaxed max-w-[220px]" style={{ color: '#6b7280' }}>
                    We'll review your submission and feature it on trending if it's approved.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2 rounded-xl text-sm font-semibold transition-opacity"
                  style={{ background: '#161b22', color: '#8b949e', border: '1px solid #21262d' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* URL input */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#8b949e' }}>
                    GitHub Repository URL
                  </label>
                  <div className="relative">
                    <Github
                      size={14}
                      strokeWidth={1.5}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: '#6b7280' }}
                    />
                    <input
                      type="url"
                      value={url}
                      onChange={e => { setUrl(e.target.value); setError(null); }}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      placeholder="https://github.com/owner/repo"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                      style={{
                        background: '#161b22',
                        border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : isValid && url ? 'rgba(74,222,128,0.4)' : '#30363d'}`,
                        color: '#e6edf3',
                      }}
                      onFocus={e => {
                        if (!error) e.target.style.borderColor = '#2563eb';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = error
                          ? 'rgba(248,113,113,0.5)'
                          : isValid && url ? 'rgba(74,222,128,0.4)' : '#30363d';
                      }}
                      autoFocus
                    />
                  </div>
                  {url && !isValid && (
                    <p className="flex items-center gap-1 text-[11px] mt-1.5" style={{ color: '#f87171' }}>
                      <AlertCircle size={11} strokeWidth={1.5} />
                      Must be a valid github.com/owner/repo URL
                    </p>
                  )}
                </div>

                {/* What gets featured info box */}
                <div
                  className="mb-5 p-3.5 rounded-xl"
                  style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.12)' }}
                >
                  <p className="text-[11px] font-semibold mb-1.5" style={{ color: '#60a5fa' }}>
                    What gets featured?
                  </p>
                  <ul className="space-y-0.5">
                    {[
                      'Active development (recent commits)',
                      'Clear documentation & README',
                      'Genuine developer utility',
                      'Open source with a valid license',
                    ].map(item => (
                      <li key={item} className="flex items-center gap-1.5 text-[11px]" style={{ color: '#4b5563' }}>
                        <span style={{ color: '#2563eb' }}>·</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="mb-4 p-3 rounded-xl flex items-center gap-2"
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <AlertCircle size={13} strokeWidth={1.5} style={{ color: '#f87171' }} />
                    <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
                    style={{ background: '#161b22', color: '#6b7280', border: '1px solid #21262d' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid || loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
                    style={{
                      background: isValid ? '#2563eb' : '#161b22',
                      color: isValid ? '#fff' : '#4b5563',
                      border: isValid ? 'none' : '1px solid #21262d',
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading && <Loader2 size={13} className="animate-spin" />}
                    {loading ? 'Submitting…' : 'Submit Repo'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

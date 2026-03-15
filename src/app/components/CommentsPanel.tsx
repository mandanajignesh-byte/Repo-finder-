import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, MessageCircle, Github } from 'lucide-react';
import { trendingCommunityService, TrendingComment } from '@/services/trending-community.service';

interface CommentsPanelProps {
  repoFullName: string;
  onClose: () => void;
  onCountChange: (count: number) => void;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function CommentsPanel({ repoFullName, onClose, onCountChange }: CommentsPanelProps) {
  const [comments, setComments] = useState<TrendingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    userId: string; displayName: string; avatarUrl?: string; isAuthenticated: boolean;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const repoName = repoFullName.split('/')[1] ?? repoFullName;

  useEffect(() => {
    trendingCommunityService.getCurrentUserInfo().then(setUserInfo);
    loadComments();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const loadComments = async () => {
    setLoading(true);
    const data = await trendingCommunityService.getComments(repoFullName);
    setComments(data);
    onCountChange(data.length);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  const handleSubmit = async () => {
    if (!input.trim() || !userInfo?.isAuthenticated || submitting) return;
    setSubmitting(true);
    try {
      const comment = await trendingCommunityService.addComment(
        userInfo.userId, repoFullName, userInfo.displayName, userInfo.avatarUrl, input.trim(),
      );
      setComments(prev => {
        const updated = [...prev, comment];
        onCountChange(updated.length);
        return updated;
      });
      setInput('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
    setSubmitting(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 'min(420px, 100vw)',
          background: '#0d1117',
          borderLeft: '1px solid #21262d',
          boxShadow: '-24px 0 64px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #21262d' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)' }}
            >
              <MessageCircle size={14} strokeWidth={1.5} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#e6edf3' }}>Discussion</p>
              <p className="text-[11px] font-mono" style={{ color: '#6b7280' }}>{repoName}</p>
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

        {/* Comment count bar */}
        <div
          className="px-5 py-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid #21262d', background: '#0d1117' }}
        >
          <p className="text-xs" style={{ color: '#4b5563' }}>
            {loading ? '…' : comments.length === 0 ? 'No comments yet' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {/* Comments list */}
        <div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#21262d transparent' }}
        >
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 size={20} className="animate-spin" style={{ color: '#2563eb' }} />
            </div>
          )}

          {!loading && comments.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}
              >
                <MessageCircle size={22} strokeWidth={1.3} style={{ color: '#60a5fa' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Start the discussion</p>
              <p className="text-xs text-center max-w-[180px] leading-relaxed" style={{ color: '#4b5563' }}>
                Be the first to share your thoughts on this repo
              </p>
            </div>
          )}

          {!loading && comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              {comment.avatarUrl ? (
                <img
                  src={comment.avatarUrl}
                  alt={comment.displayName}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ border: '1px solid #21262d' }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                >
                  {comment.displayName[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color: '#e6edf3' }}>
                    {comment.displayName}
                  </span>
                  <span className="text-[10px]" style={{ color: '#4b5563' }}>
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>
                  {comment.content}
                </p>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          className="flex-shrink-0 px-5 py-4"
          style={{ borderTop: '1px solid #21262d', background: '#0d1117' }}
        >
          {userInfo?.isAuthenticated ? (
            <div className="flex items-end gap-3">
              {userInfo.avatarUrl ? (
                <img
                  src={userInfo.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ border: '1px solid #21262d' }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: '#21262d', color: '#8b949e' }}
                >
                  {userInfo.displayName[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                  }}
                  placeholder="Share your thoughts… (Enter to send)"
                  rows={2}
                  maxLength={1000}
                  className="w-full resize-none text-sm px-3 py-2.5 pr-10 rounded-xl outline-none transition-colors"
                  style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    color: '#e6edf3',
                    scrollbarWidth: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#2563eb')}
                  onBlur={e => (e.target.style.borderColor = '#30363d')}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || submitting}
                  className="absolute bottom-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                  style={{
                    background: input.trim() ? '#2563eb' : '#21262d',
                    color: input.trim() ? '#fff' : '#4b5563',
                  }}
                >
                  {submitting
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Send size={12} strokeWidth={1.5} />
                  }
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-between p-3.5 rounded-xl"
              style={{ background: '#161b22', border: '1px solid #21262d' }}
            >
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Connect GitHub to join the discussion
              </p>
              <a
                href="/app/github-callback"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                style={{ background: '#2563eb', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <Github size={12} strokeWidth={1.5} />
                Connect
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, GitBranch, Bookmark, FileX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoFullName: string;     // "owner/repo"
  repoUrl: string;
  ownerAvatarUrl?: string;
  onSave?: () => void;
  readme: string | null;
  loading: boolean;
  error: string | null;
}

// ─── Shimmer skeleton ────────────────────────────────────────────────────────
function SkeletonLine({ width, height = 14 }: { width: string; height?: number }) {
  return (
    <div
      style={{
        width,
        height: `${height}px`,
        borderRadius: '6px',
        background: 'linear-gradient(90deg, #161b22 25%, #21262d 50%, #161b22 75%)',
        backgroundSize: '200% 100%',
        animation: 'readmeShimmer 1.5s infinite',
      }}
    />
  );
}

// ─── Code block with language label ──────────────────────────────────────────
function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : null;
  return (
    <div style={{ position: 'relative', margin: '12px 0' }}>
      {lang && (
        <span
          style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            fontSize: '0.7rem',
            color: '#8b949e',
            fontFamily: 'JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {lang}
        </span>
      )}
      <pre
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          background: '#161b22',
          border: '1px solid #21262d',
          borderRadius: '8px',
          padding: '16px',
          paddingRight: lang ? '60px' : '16px',
          overflowX: 'auto',
          fontSize: '0.85rem',
          color: '#e6edf3',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{children}</code>
      </pre>
    </div>
  );
}

// ─── Markdown components map ──────────────────────────────────────────────────
const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => (
    <h1 style={{ fontFamily: '"Cal Sans", "Inter", sans-serif', color: '#e6edf3', borderBottom: '1px solid #21262d', paddingBottom: '8px', margin: '24px 0 12px', fontSize: '1.4rem', fontWeight: 700 }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontFamily: '"Cal Sans", "Inter", sans-serif', color: '#e6edf3', borderBottom: '1px solid #21262d', paddingBottom: '8px', margin: '24px 0 12px', fontSize: '1.15rem', fontWeight: 700 }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontFamily: '"Cal Sans", "Inter", sans-serif', color: '#e6edf3', borderBottom: '1px solid #21262d', paddingBottom: '6px', margin: '20px 0 10px', fontSize: '1rem', fontWeight: 600 }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 style={{ color: '#c9d1d9', margin: '16px 0 8px', fontSize: '0.95rem', fontWeight: 600 }}>{children}</h4>
  ),
  p: ({ children }) => (
    <p style={{ color: '#8b949e', lineHeight: 1.7, marginBottom: '16px' }}>{children}</p>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ color: '#2563eb', textDecoration: 'none' }}
      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt || ''}
      style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #21262d', display: 'inline-block', margin: '2px' }}
      loading="lazy"
    />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = 'node' in props && !!(props as any).node?.type === 'code';
    const isInBlock = className?.includes('language-');
    if (isInBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <code style={{ fontFamily: 'JetBrains Mono, monospace', background: '#161b22', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85em' }}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '16px 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ background: '#161b22', color: '#e6edf3', padding: '8px 12px', textAlign: 'left', border: '1px solid #21262d', fontWeight: 600 }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ padding: '8px 12px', border: '1px solid #21262d', color: '#8b949e' }}>{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '3px solid #2563eb', paddingLeft: '16px', color: '#8b949e', margin: '16px 0' }}>
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul style={{ color: '#8b949e', paddingLeft: '24px', lineHeight: 1.8, marginBottom: '12px' }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ color: '#8b949e', paddingLeft: '24px', lineHeight: 1.8, marginBottom: '12px' }}>{children}</ol>
  ),
  li: ({ children }) => <li style={{ color: '#8b949e', marginBottom: '2px' }}>{children}</li>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid #21262d', margin: '20px 0' }} />,
  strong: ({ children }) => <strong style={{ color: '#c9d1d9', fontWeight: 600 }}>{children}</strong>,
  em: ({ children }) => <em style={{ color: '#8b949e' }}>{children}</em>,
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function ReadmeModal({
  isOpen,
  onClose,
  repoFullName,
  repoUrl,
  ownerAvatarUrl,
  onSave,
  readme,
  loading,
  error,
}: ReadmeModalProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  // Swipe state
  const touchStartY = useRef<number | null>(null);
  const currentDragY = useRef(0);

  // ── Open / close animation logic ────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      // Small tick so CSS transition triggers
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const triggerClose = useCallback(() => {
    setClosing(true);
    setVisible(false);
    // Wait for slide-out animation then call onClose
    setTimeout(onClose, 280);
  }, [onClose]);

  // ── Escape key ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') triggerClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, triggerClose]);

  // ── Body scroll lock ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Swipe-to-close touch handlers ───────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    currentDragY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy <= 0) return; // Don't allow dragging upward
    currentDragY.current = dy;
    if (modalRef.current) {
      modalRef.current.style.transform = `translateY(${dy}px)`;
      modalRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;
    const dy = currentDragY.current;
    touchStartY.current = null;
    currentDragY.current = 0;
    if (dy > 100) {
      triggerClose();
    } else {
      // Snap back
      if (modalRef.current) {
        modalRef.current.style.transform = 'translateY(0)';
        modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
      }
    }
  };

  if (!isOpen && !closing) return null;

  const [owner] = repoFullName.split('/');

  return createPortal(
    <>
      {/* ── Shimmer keyframe (injected once) ── */}
      <style>{`
        @keyframes readmeShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={triggerClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* ── Modal sheet ── */}
      <div
        ref={modalRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '75vh',
          background: '#0d1117',
          borderTop: '1px solid #21262d',
          borderRadius: '20px 20px 0 0',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: visible
            ? 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
            : 'transform 0.25s ease-in',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Drag handle ── */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px', cursor: 'grab', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#30363d' }} />
        </div>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', flexShrink: 0 }}>
          {/* Left: avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {ownerAvatarUrl ? (
              <img
                src={ownerAvatarUrl}
                alt={owner}
                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #21262d', flexShrink: 0 }}
                loading="lazy"
              />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#21262d', flexShrink: 0 }} />
            )}
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                color: '#e6edf3',
                fontSize: '0.9rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {repoFullName}
            </span>
          </div>

          {/* Right: close button */}
          <button
            onClick={triggerClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid #21262d',
              cursor: 'pointer',
              color: '#8b949e',
              flexShrink: 0,
              marginLeft: '12px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.color = '#e6edf3'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e'; }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: '1px', background: '#21262d', flexShrink: 0 }} />

        {/* ── Content area ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`.readme-modal-content::-webkit-scrollbar { display: none; }`}</style>

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <SkeletonLine width="60%" height={20} />
              <SkeletonLine width="100%" height={14} />
              <SkeletonLine width="80%" height={14} />
              <div style={{ height: '20px' }} />
              <SkeletonLine width="45%" height={18} />
              <SkeletonLine width="100%" height={14} />
              <SkeletonLine width="90%" height={14} />
              <SkeletonLine width="70%" height={14} />
              <div style={{ height: '12px' }} />
              <SkeletonLine width="55%" height={18} />
              <SkeletonLine width="100%" height={14} />
              <SkeletonLine width="85%" height={14} />
            </div>
          )}

          {/* Error state */}
          {!loading && (error || readme === null) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
              <FileX size={32} strokeWidth={1.5} color="#8b949e" />
              <p style={{ color: '#8b949e', fontSize: '0.9rem', textAlign: 'center' }}>
                {error || 'No README found for this repo'}
              </p>
            </div>
          )}

          {/* README content */}
          {!loading && !error && readme && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={mdComponents}
            >
              {readme}
            </ReactMarkdown>
          )}
        </div>

        {/* ── Footer bar ── */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid #21262d',
            padding: '12px 24px',
            background: '#0d1117',
            display: 'flex',
            gap: '12px',
          }}
        >
          {/* View on GitHub */}
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #30363d',
              background: 'transparent',
              color: '#e6edf3',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b949e'; e.currentTarget.style.background = '#161b22'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = 'transparent'; }}
          >
            <GitBranch size={15} strokeWidth={1.75} />
            View on GitHub
          </a>

          {/* Save Repo */}
          <button
            onClick={(e) => { e.stopPropagation(); onSave?.(); }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #2563eb',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.borderColor = '#1d4ed8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.borderColor = '#2563eb'; }}
          >
            <Bookmark size={15} strokeWidth={1.75} />
            Save Repo
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

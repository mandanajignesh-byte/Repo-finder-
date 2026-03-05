import { useEffect, useRef, useState } from 'react';
import { PublicNav } from './PublicNav';
import {
  Star,
  GitFork,
  Clock,
  Zap,
  Heart,
  Check,
  Cpu,
  Smartphone,
  TrendingUp,
  Activity,
  Filter,
  User,
} from 'lucide-react';

// ─── App Store Link ────────────────────────────────────────────────────────────
const APP_STORE_LINK = 'https://apps.apple.com/app/repoverse/id6746498585';

// ─── Terminal content ─────────────────────────────────────────────────────────
const TERMINAL_LINES = [
  { type: 'cmd', text: '$ git clone github.com/cool-repo-2021' },
  { type: 'out', text: "Cloning into 'cool-repo'..." },
  { type: 'cmd', text: '$ npm install' },
  { type: 'out', text: '[████████████████] installing...' },
  { type: 'cmd', text: '$ npm run dev' },
  { type: 'err', text: "ERROR: Cannot find module 'react-scripts'" },
  { type: 'err', text: 'ERROR: peer dep conflict' },
  { type: 'err', text: 'ERROR: last commit was 847 days ago' },
  { type: 'ctrl', text: '^C' },
];

// ─── CSS animations (injected via <style>) ────────────────────────────────────
const LANDING_CSS = `
/* Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

@font-face {
  font-family: 'Cal Sans';
  src: url('https://cdn.jsdelivr.net/npm/cal-sans@1.0.1/fonts/CalSans-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
}

.lp-root {
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  font-feature-settings: "cv02","cv03","cv04","tnum" !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
}

/* Cal Sans for all headings */
.lp-root h1,
.lp-root h2 {
  font-family: 'Cal Sans', 'Plus Jakarta Sans', 'Inter', sans-serif !important;
  letter-spacing: -0.02em !important;
}

/* Mono utility */
.lp-mono {
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace !important;
}

/* ── Keyframes ─────────────────────────────────────────────── */
@keyframes lp-shimmer {
  0%   { background-position: -400% center; }
  100% { background-position:  400% center; }
}
@keyframes lp-shine {
  0%         { left: -80px;                opacity: 0; }
  15%, 85%   { opacity: 1; }
  100%       { left: calc(100% + 80px);   opacity: 0; }
}
@keyframes lp-float {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-8px); }
}
@keyframes lp-word-in {
  from { opacity: 0; transform: translateY(13px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes lp-grad-border {
  0%, 100% { background-position: 0% 50%;   }
  50%      { background-position: 100% 50%; }
}
@keyframes lp-pulse-dot {
  0%, 100% { opacity: 1;   transform: scale(1);   }
  50%      { opacity: 0.4; transform: scale(1.5); }
}
@keyframes lp-spin-star {
  from { transform: rotate(0deg);   }
  to   { transform: rotate(360deg); }
}
@keyframes lp-cursor {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}
@keyframes lp-fade-up {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0);    }
}

/* ── Announcement pill shimmer ─────────────────────────────── */
.lp-pill-shimmer {
  background: linear-gradient(
    90deg,
    #161b22 0%, #161b22 35%,
    rgba(255,255,255,0.08) 50%,
    #161b22 65%, #161b22 100%
  );
  background-size: 400% 100%;
  animation: lp-shimmer 3.5s ease-in-out infinite;
}

/* ── Primary CTA shine sweep ───────────────────────────────── */
.lp-btn-primary {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: none;
}
.lp-btn-primary::after {
  content: '';
  position: absolute;
  top: -10%;
  left: -80px;
  width: 60px;
  height: 120%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: skewX(-15deg);
  animation: lp-shine 4s ease-in-out 1.5s infinite;
  pointer-events: none;
}

/* ── Floating badges ───────────────────────────────────────── */
.lp-badge-1 { animation: lp-float 3.2s ease-in-out infinite; }
.lp-badge-2 { animation: lp-float 3.2s ease-in-out 1.1s infinite; }
.lp-badge-3 { animation: lp-float 3.2s ease-in-out 2.2s infinite; }

/* ── Word-by-word headline ─────────────────────────────────── */
.lp-word {
  display: inline-block;
  opacity: 0;
  animation: lp-word-in 0.5s ease forwards;
}

/* ── Animated gradient border (final CTA) ──────────────────── */
.lp-grad-border {
  position: relative;
  border-radius: 28px;
}
.lp-grad-border::before {
  content: '';
  position: absolute;
  inset: -1.5px;
  border-radius: 29.5px;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #2563eb 100%);
  background-size: 200% 200%;
  animation: lp-grad-border 3s linear infinite;
  z-index: 0;
}
.lp-grad-border-inner {
  position: relative;
  z-index: 1;
  border-radius: 28px;
  background: #0d1117;
}

/* ── Pulse dot (active indicator) ──────────────────────────── */
.lp-pulse-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  animation: lp-pulse-dot 2s ease-in-out infinite;
}

/* ── Star doodle rotation ──────────────────────────────────── */
.lp-star { animation: lp-spin-star 20s linear infinite; }

/* ── Terminal cursor ───────────────────────────────────────── */
.lp-cursor {
  display: inline-block;
  width: 8px; height: 16px;
  background: #22c55e;
  border-radius: 1px;
  animation: lp-cursor 1s step-end infinite;
  vertical-align: middle;
  margin-left: 2px;
}

/* ── Section fade-up on scroll ─────────────────────────────── */
.lp-section-hidden  { opacity: 0; transform: translateY(30px); }
.lp-section-visible { animation: lp-fade-up 0.6s ease-out forwards; }

/* ── Screenshot rock animation (Discover section) ─────────── */
@keyframes lp-rock {
  0%, 100% { transform: translateX(-4px) rotate(-0.3deg); }
  50%       { transform: translateX(4px)  rotate( 0.3deg); }
}
.lp-rock { animation: lp-rock 3s ease-in-out infinite; }

/* ── Feature cards (Personalisation section) ────────────── */
.lp-feature-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 16px;
  padding: 24px;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
.lp-feature-card:hover {
  border-color: #2563eb;
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(37,99,235,0.15);
}

/* ── Reduce motion ─────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .lp-pill-shimmer,
  .lp-btn-primary::after,
  .lp-badge-1, .lp-badge-2, .lp-badge-3,
  .lp-star, .lp-pulse-dot, .lp-cursor,
  .lp-rock,
  .lp-grad-border::before { animation: none !important; }
  .lp-word {
    animation: none !important;
    opacity: 1 !important;
  }
  .lp-section-hidden  { opacity: 1 !important; transform: none !important; }
  .lp-section-visible { animation: none !important; opacity: 1 !important; }
}
`;

// ─── useFadeIn ─────────────────────────────────────────────────────────────────
function useFadeIn() {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.12 }
    );
    Object.values(refs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    refs.current[id] = el;
  };

  return { visible, setRef };
}

// ─── useScrollVisible ─────────────────────────────────────────────────────────
function useScrollVisible(threshold = 0.2) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// ─── useParallax ──────────────────────────────────────────────────────────────
function useParallax(factor = 0.04) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let rafId = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * factor;
      el.style.transform = `translateY(${offset}px)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId); };
  }, [factor]);
  return ref;
}

// ─── Screenshot shared style ───────────────────────────────────────────────────
const SCREENSHOT_STYLE: React.CSSProperties = {
  borderRadius: '16px',
  border: '1px solid #21262d',
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  maxWidth: '100%',
  display: 'block',
  width: '100%',
};

// ─── Section label pill ────────────────────────────────────────────────────────
const SECTION_PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 12px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  background: 'rgba(37,99,235,0.12)',
  color: '#93c5fd',
  border: '1px solid rgba(37,99,235,0.25)',
  marginBottom: '20px',
};

// ─── useTerminalTyping ────────────────────────────────────────────────────────
function useTerminalTyping(isVisible: boolean) {
  const [doneLines, setDoneLines] = useState<typeof TERMINAL_LINES>([]);
  const [currentText, setCurrentText] = useState('');
  const started = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liRef = useRef(0);
  const ciRef = useRef(0);

  useEffect(() => {
    if (!isVisible || started.current) return;
    started.current = true;

    function tick() {
      const li = liRef.current;
      const ci = ciRef.current;
      if (li >= TERMINAL_LINES.length) { setCurrentText(''); return; }
      const line = TERMINAL_LINES[li];
      if (ci < line.text.length) {
        setCurrentText(line.text.slice(0, ci + 1));
        ciRef.current = ci + 1;
        timerRef.current = setTimeout(tick, line.type === 'cmd' ? 38 : 16);
      } else {
        setDoneLines((prev) => [...prev, line]);
        setCurrentText('');
        liRef.current = li + 1;
        ciRef.current = 0;
        timerRef.current = setTimeout(tick, line.type === 'err' ? 160 : line.type === 'cmd' ? 420 : 220);
      }
    }

    timerRef.current = setTimeout(tick, 700);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isVisible]);

  const isDone = doneLines.length >= TERMINAL_LINES.length;
  const currentLineType = isDone ? null : (TERMINAL_LINES[doneLines.length]?.type ?? null);
  return { doneLines, currentText, isDone, currentLineType };
}

// ─── AppleIcon SVG ────────────────────────────────────────────────────────────
function AppleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </svg>
  );
}

// ─── StarDoodles ──────────────────────────────────────────────────────────────
function StarDoodles() {
  const stars = [
    { top: '11%',  left: '4%',   size: 10, delay: '0s' },
    { top: '22%',  left: '93%',  size: 14, delay: '7s' },
    { top: '58%',  left: '6%',   size:  6, delay: '14s' },
    { top: '72%',  left: '94%',  size: 10, delay: '3.5s' },
    { top: '38%',  left: '2%',   size:  8, delay: '10s' },
    { top: '14%',  left: '87%',  size:  6, delay: '17s' },
  ];
  return (
    <>
      {stars.map((s, i) => (
        <div
          key={i}
          className="lp-star pointer-events-none select-none"
          style={{
            position: 'absolute',
            top: s.top, left: s.left,
            fontSize: `${s.size}px`,
            color: '#e6edf3',
            opacity: 0.15,
            animationDelay: s.delay,
          }}
        >✦</div>
      ))}
    </>
  );
}

// ─── HanddrawnArrow ───────────────────────────────────────────────────────────
function HanddrawnArrow() {
  return (
    <div
      className="hidden sm:block"
      style={{
        position: 'absolute',
        bottom: '-56px',
        left: '6px',
        opacity: 0.65,
        transform: 'rotate(-12deg)',
        pointerEvents: 'none',
      }}
    >
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
        {/* Curve */}
        <path
          d="M10,50 Q40,10 70,30"
          stroke="#8b949e" strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="200" strokeDashoffset="200"
        >
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="0.9s" begin="0.7s" fill="freeze" />
        </path>
        {/* Arrowhead */}
        <path
          d="M57,22 L70,30 L61,42"
          stroke="#8b949e" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="50" strokeDashoffset="50"
        >
          <animate attributeName="stroke-dashoffset" from="50" to="0" dur="0.35s" begin="1.6s" fill="freeze" />
        </path>
      </svg>
    </div>
  );
}

// ─── AnnouncementPill ─────────────────────────────────────────────────────────
function AnnouncementPill() {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm lp-pill-shimmer"
      style={{ border: '1px solid #21262d', color: '#93c5fd' }}
    >
      <Zap size={13} strokeWidth={1.5} color="#93c5fd" />
      Now with AI Agent — searches GitHub live
    </div>
  );
}

// ─── AnimatedHeadline ─────────────────────────────────────────────────────────
function AnimatedHeadline() {
  const line1 = ['She', 'had', '40k', 'stars', 'but'];
  const line2 = ["hadn't", 'committed', 'in', '2', 'years.'];

  const renderWord = (word: string, index: number) => {
    const isCommitted = word === 'committed';
    return (
      <span
        key={index}
        className="lp-word"
        style={{
          animationDelay: `${index * 0.1}s`,
          position: 'relative',
          marginRight: '0.28em',
          paddingBottom: isCommitted ? '10px' : undefined,
          /* Gradient text applied per-word so background-clip works through inline-block */
          background: 'linear-gradient(180deg, #ffffff 30%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {word}
        {isCommitted && (
          <svg
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '10px',
              overflow: 'visible',
            }}
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
          >
            <path
              d="M2,7 Q25,1 50,7 Q75,13 98,7"
              stroke="#2563eb"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="200"
              strokeDashoffset="200"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="200" to="0"
                dur="0.7s"
                begin={`${index * 0.1 + 0.5}s`}
                fill="freeze"
              />
            </path>
          </svg>
        )}
      </span>
    );
  };

  return (
    <h1
      style={{
        fontSize: 'clamp(2.5rem, 6vw, 5rem)',
        fontWeight: 800,
        lineHeight: 1.08,
        letterSpacing: '-0.03em',
        marginBottom: '1.25rem',
        color: '#ffffff', /* fallback; each word span carries the gradient */
      }}
    >
      <span style={{ display: 'block' }}>
        {line1.map((w, i) => renderWord(w, i))}
      </span>
      <span style={{ display: 'block' }}>
        {line2.map((w, i) => renderWord(w, line1.length + i))}
      </span>
    </h1>
  );
}

// ─── FloatingBadges ───────────────────────────────────────────────────────────
function FloatingBadges() {
  const badges = [
    {
      text: '⭐ 40k stars — last commit 2019',
      cls: 'lp-badge-1',
      style: {
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.25)',
        color: '#fca5a5',
      },
    },
    {
      text: '✅ A+ Health Score',
      cls: 'lp-badge-2',
      style: {
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.25)',
        color: '#86efac',
      },
    },
    {
      text: '🤖 AI scored in real-time',
      cls: 'lp-badge-3',
      style: {
        background: 'rgba(37,99,235,0.12)',
        border: '1px solid rgba(37,99,235,0.3)',
        color: '#93c5fd',
      },
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 flex-wrap">
      {badges.map((b, i) => (
        <span
          key={i}
          className={`${b.cls} inline-flex items-center px-4 py-2 rounded-full text-xs font-medium`}
          style={b.style}
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}

// ─── CTAButtons ───────────────────────────────────────────────────────────────
function CTAButtons({ onStartSwiping }: { onStartSwiping?: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 relative">
      {/* Primary */}
      <button
        onClick={onStartSwiping}
        className="lp-btn-primary w-full sm:w-auto font-semibold text-sm transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#fff',
          borderRadius: '12px',
          padding: '14px 28px',
          boxShadow: '0 0 24px rgba(37,99,235,0.4)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 44px rgba(37,99,235,0.65)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(37,99,235,0.4)';
        }}
      >
        Start Swiping Free
      </button>

      {/* Secondary — glassmorphism */}
      <a
        href={APP_STORE_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full sm:w-auto flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: '#fff',
          borderRadius: '12px',
          padding: '14px 28px',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.10)';
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.18)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)';
        }}
      >
        <AppleIcon className="w-4 h-4" />
        Download iOS App
      </a>

      {/* Handdrawn arrow pointing at the primary button */}
      <HanddrawnArrow />
    </div>
  );
}

// ─── TerminalCard ─────────────────────────────────────────────────────────────
function TerminalCard({ isVisible }: { isVisible: boolean }) {
  const { doneLines, currentText, isDone, currentLineType } = useTerminalTyping(isVisible);

  const lineColor = (type: string) => {
    if (type === 'cmd')  return '#22c55e';
    if (type === 'err')  return '#ef4444';
    if (type === 'ctrl') return '#ef4444';
    return '#9ca3af';
  };

  return (
    <div
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
      }}
    >
      {/* macOS window bar */}
      <div
        style={{
          background: '#1c1c1e',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', flexShrink: 0 }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', flexShrink: 0 }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
            fontFamily: '"SF Mono", "Fira Code", monospace',
            marginLeft: '-36px',
          }}
        >
          bash — cool-repo
        </span>
      </div>

      {/* Terminal body */}
      <div
        style={{
          background: '#0d1117',
          padding: '20px 24px',
          fontFamily: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
          fontSize: '13px',
          lineHeight: '1.75',
          minHeight: '200px',
          overflowX: 'auto',
        }}
      >
        {doneLines.map((line, i) => (
          <div key={i} style={{ color: lineColor(line.type), whiteSpace: 'pre' }}>
            {line.text}
          </div>
        ))}

        {/* Currently-typing line */}
        {!isDone && (
          <div style={{ color: lineColor(currentLineType ?? 'cmd'), whiteSpace: 'pre' }}>
            {currentText}
            <span className="lp-cursor" />
          </div>
        )}

        {/* Idle cursor after all lines done */}
        {isDone && <span className="lp-cursor" />}
      </div>
    </div>
  );
}

// ─── ComparisonCard ───────────────────────────────────────────────────────────
function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ color: '#6b7280', fontSize: '13px' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function ComparisonCard() {
  const { ref, isVisible } = useScrollVisible(0.2);

  const slide = (dir: 'left' | 'right'): React.CSSProperties => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible
      ? 'translateX(0)'
      : dir === 'left' ? 'translateX(-40px)' : 'translateX(40px)',
    transition: 'opacity 0.7s ease, transform 0.7s ease',
    flex: 1,
  });

  return (
    <div ref={ref} className="flex flex-col sm:flex-row gap-4 items-stretch relative">
      {/* Bad repo */}
      <div style={slide('left')}>
        <div
          style={{
            borderRadius: '16px',
            padding: '24px',
            height: '100%',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>💀</span>
            <span style={{ fontFamily: 'monospace', color: '#fca5a5', fontWeight: 600, fontSize: '14px' }}>
              stale-awesome-lib
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <StatRow
              label="Health"
              value={
                <span style={{ color: '#ef4444', fontWeight: 800, textShadow: '0 0 12px rgba(239,68,68,0.5)' }}>
                  F
                </span>
              }
            />
            <StatRow label="Last commit" value={<span style={{ color: '#ef4444' }}>847 days ago</span>} />
            <StatRow label="Issues" value={<span style={{ color: '#f87171' }}>234 unresolved</span>} />
            <StatRow
              label="Stars"
              value={
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4b5563' }}>
                  <Star size={12} strokeWidth={1.5} />
                  40k (stale)
                </span>
              }
            />
          </div>
        </div>
      </div>

      {/* VS divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: '8px 0',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#161b22',
            border: '1px solid #21262d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8b949e',
            fontWeight: 700,
            fontSize: '13px',
            flexShrink: 0,
          }}
        >
          VS
        </div>
      </div>

      {/* Good repo */}
      <div style={slide('right')}>
        <div
          style={{
            borderRadius: '16px',
            padding: '24px',
            height: '100%',
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>🔥</span>
            <span style={{ fontFamily: 'monospace', color: '#86efac', fontWeight: 600, fontSize: '14px' }}>
              fresh-modern-lib
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <StatRow
              label="Health"
              value={
                <span style={{ color: '#22c55e', fontWeight: 800, textShadow: '0 0 12px rgba(34,197,94,0.5)' }}>
                  A+
                </span>
              }
            />
            <StatRow label="Last commit" value={<span style={{ color: '#86efac' }}>2 days ago</span>} />
            <StatRow label="Issues" value={<span style={{ color: '#86efac' }}>12 open · fast</span>} />
            <StatRow
              label="Stars"
              value={
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#86efac' }}>
                  <Star size={12} strokeWidth={1.5} />
                  8k
                  <TrendingUp size={11} strokeWidth={1.5} />
                </span>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PricingCard ──────────────────────────────────────────────────────────────
interface PricingCardProps {
  label: string;
  price?: string;
  features: string[];
  isPro?: boolean;
  ctaText?: string;
  ctaHref?: string;
}

function PricingCard({ label, price, features, isPro, ctaText, ctaHref }: PricingCardProps) {
  return (
    <div
      style={{
        borderRadius: '20px',
        padding: '32px',
        background: isPro
          ? 'linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(17,24,39,0.92) 100%)'
          : 'rgba(22,27,34,0.85)',
        border: isPro ? '1px solid rgba(37,99,235,0.45)' : '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '20px',
        position: 'relative' as const,
        overflow: 'hidden',
      }}
    >
      {isPro && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            padding: '6px 16px',
            borderBottomLeftRadius: '12px',
            background: '#2563eb',
            color: '#fff',
          }}
        >
          Most Popular
        </div>
      )}

      <div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: isPro ? '#60a5fa' : '#9ca3af',
          }}
        >
          {label}
        </span>
        {price ? (
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', marginTop: '4px', marginBottom: 0 }}>
            {price}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: '#9ca3af' }}> /month</span>
          </p>
        ) : (
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', marginTop: '4px', marginBottom: 0 }}>Free</p>
        )}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {features.map((feat, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isPro
              ? <Zap size={15} strokeWidth={1.5} color="#2563eb" />
              : <Check size={15} strokeWidth={1.5} color="#6b7280" />
            }
            <span style={{ fontSize: '14px', color: '#d1d5db' }}>{feat}</span>
          </li>
        ))}
      </ul>

      {ctaText && ctaHref && (
        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '12px 24px',
            borderRadius: '999px',
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 0 20px rgba(37,99,235,0.35)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.02)';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 32px rgba(37,99,235,0.55)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 20px rgba(37,99,235,0.35)';
          }}
        >
          {ctaText}
        </a>
      )}
    </div>
  );
}

// ─── FadeSection ──────────────────────────────────────────────────────────────
interface SectionProps {
  id: string;
  visible: boolean;
  setRef: (el: HTMLElement | null) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function FadeSection({ id, visible, setRef, children, className = '', style }: SectionProps) {
  return (
    <section
      id={id}
      ref={setRef}
      className={`${visible ? 'lp-section-visible' : 'lp-section-hidden'} ${className}`}
      style={style}
    >
      {children}
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
// ─── SECTION A: Discover / Swipe ─────────────────────────────────────────────
function DiscoverSection() {
  const { ref, isVisible } = useScrollVisible(0.1);
  const parallaxRef = useParallax(0.04);

  const pills = [
    '✦ Health scored before you see it',
    '✦ 5 free swipes daily',
    '✦ No setup required',
  ];

  return (
    <section
      ref={ref}
      className={isVisible ? 'lp-section-visible' : 'lp-section-hidden'}
      style={{ padding: '96px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '64px',
          alignItems: 'center',
        }}
      >
        {/* ── Text ── */}
        <div style={{ order: 2 }}>
          <div style={SECTION_PILL_STYLE}>Discover</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.2, color: '#fff', marginBottom: '16px' }}>
            Find repos worth your time.
          </h2>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.7, color: '#8b949e', marginBottom: '32px' }}>
            Swipe right to save. Swipe left to skip.<br />
            Every card is health scored before it reaches you.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {pills.map((text) => (
              <span
                key={text}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: '#161b22',
                  border: '1px solid #21262d',
                  color: '#8b949e',
                }}
              >
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* ── Screenshot ── */}
        <div style={{ order: 1, position: 'relative' }} ref={parallaxRef}>
          {/* SKIP label */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '-16px',
              transform: 'translateY(-50%)',
              zIndex: 10,
              padding: '8px 14px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              pointerEvents: 'none',
            }}
          >
            ← SKIP
          </div>
          {/* SAVE label */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '-16px',
              transform: 'translateY(-50%)',
              zIndex: 10,
              padding: '8px 14px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#22c55e',
              pointerEvents: 'none',
            }}
          >
            SAVE →
          </div>
          {/* Rocking screenshot */}
          <div className="lp-rock">
            <img
              src="/discover-screenshot.png"
              alt="Repoverse Discover page — swipe repos"
              style={SCREENSHOT_STYLE}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SECTION B: Trending ──────────────────────────────────────────────────────
function TrendingFeatureSection() {
  const { ref, isVisible } = useScrollVisible(0.1);
  const parallaxRef = useParallax(0.04);

  const features = [
    {
      icon: <Activity size={20} strokeWidth={1.5} color="#2563eb" />,
      title: 'Quality scored',
      body: 'Every repo gets an A to F health grade based on commits, forks and activity.',
    },
    {
      icon: <TrendingUp size={20} strokeWidth={1.5} color="#2563eb" />,
      title: 'Updated daily',
      body: 'Not a static list. Refreshed every single day.',
    },
    {
      icon: <Filter size={20} strokeWidth={1.5} color="#2563eb" />,
      title: 'Filter by category',
      body: 'AI & ML, Frontend, Backend, DevOps and more. Find what matters to you.',
    },
  ];

  return (
    <section
      ref={ref}
      className={isVisible ? 'lp-section-visible' : 'lp-section-hidden'}
      style={{ padding: '96px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '64px',
          alignItems: 'center',
        }}
      >
        {/* ── Screenshot (left on desktop, top on mobile) ── */}
        <div style={{ position: 'relative' }} ref={parallaxRef}>
          {/* Blue glow */}
          <div
            style={{
              position: 'absolute',
              inset: '-40px',
              background: 'radial-gradient(circle at center, rgba(37,99,235,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
              borderRadius: '50%',
            }}
          />
          <img
            src="/trending-screenshot.png"
            alt="Repoverse Trending page"
            style={SCREENSHOT_STYLE}
          />
        </div>

        {/* ── Text (right on desktop) ── */}
        <div>
          <div style={SECTION_PILL_STYLE}>Trending</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.2, color: '#fff', marginBottom: '16px' }}>
            Know before the world does.
          </h2>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.7, color: '#8b949e', marginBottom: '36px' }}>
            495 repos scored daily.<br />
            Ranked by real activity — not just stars from 3 years ago.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(37,99,235,0.12)',
                    border: '1px solid rgba(37,99,235,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#e6edf3', marginBottom: '4px', fontSize: '15px' }}>{f.title}</p>
                  <p style={{ fontSize: '14px', color: '#8b949e', lineHeight: 1.6 }}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SECTION C: AI Agent ──────────────────────────────────────────────────────
function AgentFeatureSection() {
  const { ref, isVisible } = useScrollVisible(0.1);
  const parallaxRef = useParallax(0.04);

  const rows = [
    { label: 'Source of data', bad: 'Old blog posts & articles',   good: 'Direct from GitHub API'      },
    { label: 'Freshness',      bad: 'Could be 2 years old',        good: 'Updated today'               },
    { label: 'Health check',   bad: 'No scoring',                  good: 'Every repo scored A–F'       },
    { label: 'Accuracy',       bad: 'Guesses based on training',   good: 'Real numbers, real repos'    },
  ];

  return (
    <section
      ref={ref}
      className={isVisible ? 'lp-section-visible' : 'lp-section-hidden'}
      style={{ padding: '96px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ ...SECTION_PILL_STYLE, margin: '0 auto 20px' }}>AI Agent</div>
        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.2, color: '#fff', marginBottom: '16px' }}>
          An AI that actually knows GitHub.
        </h2>
        <p style={{ fontSize: '1.125rem', lineHeight: 1.7, color: '#8b949e', marginBottom: '44px', maxWidth: '480px', margin: '0 auto 44px' }}>
          Not Google. Not old blog posts.<br />
          Direct from GitHub. Right now.
        </p>

        {/* Screenshot */}
        <div ref={parallaxRef} style={{ marginBottom: '40px' }}>
          <img
            src="/agent-screenshot.png"
            alt="Repoverse AI Agent"
            style={{ ...SCREENSHOT_STYLE, margin: '0 auto' }}
          />
        </div>

        {/* Comparison table */}
        <div
          style={{
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '16px',
            padding: '24px',
            overflowX: 'auto',
            textAlign: 'left',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr',
              gap: '16px',
              paddingBottom: '16px',
              borderBottom: '1px solid #21262d',
              marginBottom: '4px',
              minWidth: '480px',
            }}
          >
            <div />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#8b949e' }}>
              ChatGPT / Google
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Zap size={13} strokeWidth={1.5} />
              RepoVerse Agent
            </div>
          </div>
          {/* Data rows */}
          {rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr',
                gap: '16px',
                padding: '13px 0',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                alignItems: 'start',
                minWidth: '480px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3' }}>{row.label}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>✗ {row.bad}</div>
              <div style={{ fontSize: '13px', color: '#22c55e' }}>✓ {row.good}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SECTION D: Personalisation ──────────────────────────────────────────────
function PersonalisationSection() {
  const { ref, isVisible } = useScrollVisible(0.1);

  const cards = [
    {
      icon: <User size={24} strokeWidth={1.5} color="#2563eb" />,
      step: '01',
      title: 'Set your interests',
      body: 'Pick your languages, frameworks and goals once.',
    },
    {
      icon: <Zap size={24} strokeWidth={1.5} color="#2563eb" />,
      step: '02',
      title: 'We learn your taste',
      body: 'The more you swipe, the sharper your feed gets.',
    },
    {
      icon: <Star size={24} strokeWidth={1.5} color="#2563eb" />,
      step: '03',
      title: 'Only relevant repos',
      body: 'No more scrolling through PHP repos when you code in Python.',
    },
  ];

  return (
    <section
      ref={ref}
      className={isVisible ? 'lp-section-visible' : 'lp-section-hidden'}
      style={{ padding: '96px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ ...SECTION_PILL_STYLE, margin: '0 auto 20px' }}>Personalisation</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.2, color: '#fff', marginBottom: '16px' }}>
            The more you use it,<br />the better it gets.
          </h2>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.7, color: '#8b949e', maxWidth: '380px', margin: '0 auto' }}>
            Tell us what you like once.<br />We handle the rest.
          </p>
        </div>

        {/* Cards + connecting line */}
        <div style={{ position: 'relative' }}>
          {/* Horizontal connector line (desktop) */}
          <div
            className="hidden-mobile"
            style={{
              position: 'absolute',
              top: '50px',
              left: '12%',
              right: '12%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, #21262d 15%, #21262d 85%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
          {/* Connector dots */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="hidden-mobile"
              style={{
                position: 'absolute',
                top: '44px',
                left: i === 0 ? 'calc(16.67%)' : i === 1 ? '50%' : 'calc(83.33%)',
                transform: 'translateX(-50%)',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#2563eb',
                border: '2px solid #0d1117',
                boxShadow: '0 0 8px rgba(37,99,235,0.5)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
          ))}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
            }}
          >
            {cards.map((card, i) => (
              <div key={i} className="lp-feature-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'rgba(37,99,235,0.12)',
                      border: '1px solid rgba(37,99,235,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {card.icon}
                  </div>
                  <span className="lp-mono" style={{ fontSize: '11px', color: '#374151' }}>{card.step}</span>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#e6edf3', marginBottom: '8px', fontSize: '16px' }}>{card.title}</p>
                  <p style={{ fontSize: '14px', color: '#8b949e', lineHeight: 1.65 }}>{card.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function RepoverseLanding() {
  const { visible, setRef } = useFadeIn();
  const { ref: terminalRef, isVisible: isTerminalVisible } = useScrollVisible(0.15);

  const handleStartSwiping = () => {
    window.location.href = '/app/discover';
  };

  return (
    <>
      {/* Inject CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      <div
        className="lp-root min-h-screen text-white overflow-x-hidden"
        style={{
          backgroundColor: '#0d1117',
          /* Subtle grid pattern — graph-paper feel */
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        {/* ── Shared sticky nav ───────────────────────────────────────────── */}
        <PublicNav />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — HERO
        ══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-24 text-center overflow-hidden">

          {/* Background glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Primary blue hero glow */}
            <div
              style={{
                position: 'absolute',
                top: '-200px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '800px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            {/* Subtle purple accent */}
            <div
              style={{
                position: 'absolute',
                bottom: '-100px',
                left: '25%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Subtle star doodles */}
          <StarDoodles />

          {/* Hero content */}
          <div className="relative max-w-3xl mx-auto">
            {/* Announcement pill */}
            <div className="flex justify-center mb-8">
              <AnnouncementPill />
            </div>

            {/* Headline — word-by-word animation + gradient + underline on "committed" */}
            <AnimatedHeadline />

            {/* Sub-headline */}
            <p className="text-xl sm:text-2xl font-medium mb-5" style={{ color: '#9ca3af' }}>
              We've all been there.
            </p>

            {/* Body */}
            <p className="text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto" style={{ color: '#6b7280' }}>
              Repoverse helps you find repos that are actually active, healthy, and worth your time.
              It's like Tinder — but the matches are actually worth committing to.
            </p>

            {/* CTA buttons */}
            <div className="flex justify-center mb-5">
              <CTAButtons onStartSwiping={handleStartSwiping} />
            </div>

            {/* Fine print */}
            <p className="text-xs" style={{ color: '#4b5563' }}>
              5 free swipes daily. No credit card. No commitment issues.
            </p>

            {/* Floating badges */}
            <FloatingBadges />
          </div>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
            style={{ color: '#374151' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            FEATURE SECTIONS (Discover · Trending · Agent · Personalisation)
        ══════════════════════════════════════════════════════════════════ */}
        <DiscoverSection />
        <TrendingFeatureSection />
        <AgentFeatureSection />
        <PersonalisationSection />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — PAIN POINT + TERMINAL
        ══════════════════════════════════════════════════════════════════ */}
        <FadeSection
          id="pain"
          visible={visible['pain']}
          setRef={setRef('pain')}
          className="py-20 sm:py-28 px-4"
        >
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8" style={{ letterSpacing: '-0.02em' }}>
              You know this feeling.
            </h2>

            <div className="space-y-5 text-base sm:text-lg leading-relaxed mb-10" style={{ color: '#9ca3af' }}>
              <p>
                You find a repo. Great README.{' '}
                <span className="text-white font-medium">Thousands of stars.</span> Looks promising.
              </p>
              <p>
                You spend a weekend setting it up.
                <br />
                <span style={{ color: '#ef4444' }}>Broken dependencies.</span>{' '}
                <span style={{ color: '#ef4444' }}>Unanswered issues.</span>{' '}
                <span style={{ color: '#ef4444' }}>Last commit: March 2022.</span>
              </p>
              <p className="text-white font-semibold text-xl">
                That's not a repo. That's a situationship.
              </p>
            </div>

            {/* Terminal — starts typing when scrolled into view */}
            <div ref={terminalRef}>
              <TerminalCard isVisible={isTerminalVisible} />
            </div>
          </div>
        </FadeSection>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — HEALTH SCORE + COMPARISON CARD
        ══════════════════════════════════════════════════════════════════ */}
        <FadeSection
          id="health"
          visible={visible['health']}
          setRef={setRef('health')}
          className="py-20 sm:py-28 px-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
                We check their history before
                <br />
                you catch feelings.
              </h2>
              <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style={{ color: '#6b7280' }}>
                Every repo gets a health score — calculated from real commits, star growth,
                forks and activity.
                <br />
                <br />
                You see the score before you clone anything.
                <span className="text-white"> No more bad surprises at 2am.</span>
              </p>
            </div>

            {/* Animated comparison card */}
            <ComparisonCard />
          </div>
        </FadeSection>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — AI AGENT
        ══════════════════════════════════════════════════════════════════ */}
        <FadeSection
          id="agent"
          visible={visible['agent']}
          setRef={setRef('agent')}
          className="py-20 sm:py-28 px-4"
        >
          <div className="max-w-3xl mx-auto">
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: '24px',
                padding: '48px',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(17,24,39,0.8) 100%)',
                border: '1px solid rgba(37,99,235,0.2)',
              }}
            >
              {/* Ambient glow inside card */}
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)' }}
              />

              <div className="relative">
                {/* Agent badge */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
                  style={{
                    background: 'rgba(37,99,235,0.2)',
                    color: '#93c5fd',
                    border: '1px solid rgba(37,99,235,0.3)',
                  }}
                >
                  <Cpu size={13} strokeWidth={1.5} color="#93c5fd" />
                  AI Agent
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold mb-6" style={{ letterSpacing: '-0.02em' }}>
                  Our AI doesn't use Google.
                </h2>

                <div className="space-y-4 text-base sm:text-lg leading-relaxed" style={{ color: '#9ca3af' }}>
                  <p>
                    Ask ChatGPT to find you repos.
                    <br />
                    <span style={{ color: '#ef4444' }}>
                      It crawls a 2022 blog post and calls it a day.
                    </span>
                  </p>
                  <p>
                    Our Agent goes{' '}
                    <span className="text-white font-semibold">directly to GitHub.</span>
                    <br />
                    Live data. Fresh repos.{' '}
                    <span className="text-white font-semibold">Health scored on the spot.</span>
                  </p>
                  <p>
                    Like having a friend who actually knows GitHub — not one who just read
                    about it two years ago.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeSection>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 5 — DOOMSCROLLING
        ══════════════════════════════════════════════════════════════════ */}
        <FadeSection
          id="doom"
          visible={visible['doom']}
          setRef={setRef('doom')}
          className="py-20 sm:py-28 px-4 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-6">
              <Smartphone size={44} strokeWidth={1.5} color="#4b5563" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-5" style={{ letterSpacing: '-0.02em' }}>
              You're already scrolling anyway.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#6b7280' }}>
              Might as well swipe on something that won't ghost you at 2am.
              <br />
              <span className="text-white">Same energy.</span> Slightly better for your career.
            </p>
          </div>
        </FadeSection>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 6 — PRICING
        ══════════════════════════════════════════════════════════════════ */}
        <FadeSection
          id="pricing"
          visible={visible['pricing']}
          setRef={setRef('pricing')}
          className="py-20 sm:py-28 px-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
                No commitment issues.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <PricingCard
                label="Free"
                features={[
                  '5 swipes daily',
                  '2 Agent queries daily',
                  'Full trending page',
                  'No credit card needed',
                ]}
              />
              <PricingCard
                label="Pro"
                price="$4.99"
                isPro
                features={[
                  'Unlimited swipes',
                  'Unlimited Agent',
                  'Save collections',
                  'Advanced filters',
                ]}
                ctaText="Upgrade to Pro"
                ctaHref={APP_STORE_LINK}
              />
            </div>

            <p className="text-center text-sm mt-6" style={{ color: '#4b5563' }}>
              Cheaper than a coffee. More useful than that Medium article you bookmarked in 2023.
            </p>
          </div>
        </FadeSection>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 7 — FINAL CTA (animated gradient border)
        ══════════════════════════════════════════════════════════════════ */}
        <FadeSection
          id="cta"
          visible={visible['cta']}
          setRef={setRef('cta')}
          className="py-20 sm:py-28 px-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="max-w-2xl mx-auto text-center">
            {/* Animated gradient border wrapper */}
            <div className="lp-grad-border">
              <div className="lp-grad-border-inner p-10 sm:p-16 relative overflow-hidden">
                {/* Inner ambient glow */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)',
                    opacity: 0.5,
                  }}
                />

                <div className="relative">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
                    Ready to find repos worth
                    <br />
                    committing to?
                  </h2>
                  <p className="text-sm mb-10" style={{ color: '#6b7280' }}>
                    No broken dependencies. No ghosted issues. Promise.
                  </p>

                  <div className="flex justify-center">
                    <CTAButtons onStartSwiping={handleStartSwiping} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeSection>

        {/* ══ Footer ═══════════════════════════════════════════════════════ */}
        <footer className="py-10 px-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Repoverse" className="w-6 h-6 rounded-md" />
              <span className="text-sm" style={{ color: '#4b5563' }}>
                Repoverse © {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex items-center gap-5">
              <a href="/privacy" className="text-sm transition-colors hover:text-white" style={{ color: '#4b5563' }}>
                Privacy
              </a>
              <a href="/terms" className="text-sm transition-colors hover:text-white" style={{ color: '#4b5563' }}>
                Terms
              </a>
              <a href="/support" className="text-sm transition-colors hover:text-white" style={{ color: '#4b5563' }}>
                Support
              </a>
              <span className="text-sm flex items-center gap-1.5" style={{ color: '#374151' }}>
                Made with <Heart size={12} strokeWidth={1.5} color="#ef4444" fill="#ef4444" /> for devs
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

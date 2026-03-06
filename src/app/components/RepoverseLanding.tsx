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
const APP_STORE_LINK = 'https://apps.apple.com/us/app/repoverse/id6759513548';

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

/* ── Mobile performance: kill expensive animations on small screens ── */
@media (max-width: 767px) {
  .lp-badge-1, .lp-badge-2, .lp-badge-3 { animation: none !important; transform: none !important; }
  .lp-grad-border::before { animation: none !important; background: rgba(37,99,235,0.3) !important; }
  .lp-section-hidden  { opacity: 1 !important; transform: none !important; }
  .lp-section-visible { animation: none !important; opacity: 1 !important; }
  .lp-feature-card:hover { transform: none !important; }
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
// Disabled on mobile (< 768px) to avoid jank — not perceptible on touch anyway
function useParallax(factor = 0.04) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.innerWidth < 768) return; // skip on mobile
    const el = ref.current;
    if (!el) return;
    el.style.willChange = 'transform'; // promote to own GPU layer
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
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
      if (el) el.style.willChange = 'auto';
    };
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

// ─── Phone mockup frame ────────────────────────────────────────────────────────
function PhoneMockup({ children, glowColor = 'rgba(37,99,235,0.2)' }: {
  children: React.ReactNode;
  glowColor?: string;
}) {
  return (
    <div style={{ position: 'relative', margin: '0 auto', maxWidth: '300px' }}>
      {/* Ambient glow — no blur filter (CSS gradient is GPU-free) */}
      <div style={{
        position: 'absolute',
        inset: '-60px -40px',
        background: `radial-gradient(ellipse at 50% 45%, ${glowColor} 0%, transparent 65%)`,
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      {/* Gradient border frame */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        borderRadius: '48px',
        padding: '3px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.10) 100%)',
        boxShadow: '0 48px 96px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.12)',
      }}>
        {/* Phone body */}
        <div style={{ borderRadius: '46px', background: '#0a0a0a', overflow: 'hidden' }}>
          {/* Top bezel with Dynamic Island pill */}
          <div style={{
            height: '28px',
            background: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '10px',
              background: '#1a1a1a',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.06)',
            }} />
          </div>
          {/* Screen content with side padding */}
          <div style={{ padding: '0 6px', lineHeight: 0, borderRadius: '8px', overflow: 'hidden' }}>
            {children}
          </div>
          {/* Bottom bezel with home indicator */}
          <div style={{
            height: '28px',
            background: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '100px',
              height: '4px',
              background: 'rgba(255,255,255,0.25)',
              borderRadius: '999px',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

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

// ─── Handdrawn decoration components ─────────────────────────────────────────

/** Wobbly underline to accent a text span */
function ScribbleUnderline({ color = '#2563eb', className = '' }: { color?: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', height: '10px', pointerEvents: 'none' }}
      aria-hidden
    >
      <path
        d="M2 7 C22 2, 44 11, 66 6 C88 1, 110 10, 132 5 C154 0, 176 9, 198 4 C208 2, 215 7, 218 6"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
    </svg>
  );
}

/** Small ✦ sparkle / corner doodle */
function SparkDoodle({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={{ ...style, pointerEvents: 'none' }}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line x1="20" y1="3"  x2="20" y2="37" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <line x1="3"  y1="20" x2="37" y2="20" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <line x1="8"  y1="8"  x2="32" y2="32" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <line x1="32" y1="8"  x2="8"  y2="32" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <circle cx="20" cy="20" r="3.5" fill="#f472b6" opacity="0.4" />
    </svg>
  );
}

/** Wavy horizontal doodle line */
function WavyDoodle({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={{ ...style, display: 'block', pointerEvents: 'none' }}
      viewBox="0 0 300 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M0 8 C20 2, 40 14, 60 8 C80 2, 100 14, 120 8 C140 2, 160 14, 180 8 C200 2, 220 14, 240 8 C260 2, 280 14, 300 8"
        stroke="url(#wg)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Dashed open circle doodle */
function CircleDoodle({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={{ ...style, pointerEvents: 'none' }}
      viewBox="0 0 70 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="35" cy="35" rx="30" ry="28"
        stroke="#a78bfa"
        strokeWidth="1.5"
        strokeDasharray="5 3"
        opacity="0.35"
        fill="none"
      />
    </svg>
  );
}

/** Crosshatch dot-grid decoration */
function DotGrid({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const dots = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      dots.push(<circle key={`${r}-${c}`} cx={c * 12 + 6} cy={r * 12 + 6} r="1.5" fill="#6366f1" opacity="0.25" />);
    }
  }
  return (
    <svg
      className={className}
      style={{ ...style, pointerEvents: 'none' }}
      viewBox="0 0 54 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {dots}
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
      style={{
        padding: '96px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        background: 'radial-gradient(ellipse at 0% 55%, rgba(37,99,235,0.08) 0%, transparent 55%)',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '64px',
          alignItems: 'center',
        }}
      >
        {/* ── Text ── */}
        <div style={{ order: 2, position: 'relative' }}>
          {/* Corner doodles */}
          <SparkDoodle style={{ position: 'absolute', top: '-20px', right: '-10px', width: '28px', height: '28px', opacity: 0.8 }} />
          <DotGrid style={{ position: 'absolute', bottom: '-10px', right: '-20px', width: '44px', height: '44px' }} />
          <div style={SECTION_PILL_STYLE}>Discover</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.2, color: '#fff', marginBottom: '6px' }}>
            Find repos worth your time.
          </h2>
          <ScribbleUnderline color="#2563eb" />
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

        {/* ── Phone mockup with video ── */}
        <div style={{ order: 1, position: 'relative' }} ref={parallaxRef}>
          <PhoneMockup glowColor="rgba(37,99,235,0.28)">
            <video
              src="/discover-demo.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              style={{ width: '100%', display: 'block' }}
            />
          </PhoneMockup>
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
      style={{
        padding: '96px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        background: 'radial-gradient(ellipse at 100% 50%, rgba(167,139,250,0.07) 0%, transparent 55%)',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '64px',
          alignItems: 'center',
        }}
      >
        {/* ── Phone mockup (left on desktop, top on mobile) ── */}
        <div style={{ position: 'relative' }} ref={parallaxRef}>
          <PhoneMockup glowColor="rgba(167,139,250,0.25)">
            <img
              src="/trending-screenshot.jpg"
              alt="Repoverse Trending page"
              loading="lazy"
              decoding="async"
              style={{ width: '100%', display: 'block' }}
            />
          </PhoneMockup>
        </div>

        {/* ── Text (right on desktop) ── */}
        <div style={{ position: 'relative' }}>
          {/* Corner doodles */}
          <CircleDoodle style={{ position: 'absolute', top: '-30px', right: '-10px', width: '50px', height: '50px' }} />
          <div style={SECTION_PILL_STYLE}>Trending</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.2, color: '#fff', marginBottom: '6px' }}>
            Know before the world does.
          </h2>
          <ScribbleUnderline color="#a78bfa" />
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
      style={{
        padding: '96px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(34,211,238,0.06) 0%, transparent 55%)',
      }}
    >
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        {/* Scattered doodles */}
        <SparkDoodle style={{ position: 'absolute', top: '-24px', left: '0px', width: '28px', height: '28px', opacity: 0.6 }} />
        <DotGrid style={{ position: 'absolute', top: '-16px', right: '0px', width: '44px', height: '44px' }} />
        <div style={{ ...SECTION_PILL_STYLE, margin: '0 auto 20px' }}>AI Agent</div>
        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.2, color: '#fff', marginBottom: '6px' }}>
          An AI that actually knows GitHub.
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ width: '260px' }}>
            <ScribbleUnderline color="#22d3ee" />
          </div>
        </div>
        <p style={{ fontSize: '1.125rem', lineHeight: 1.7, color: '#8b949e', marginBottom: '44px', maxWidth: '480px', margin: '0 auto 44px' }}>
          Not Google. Not old blog posts.<br />
          Direct from GitHub. Right now.
        </p>

        {/* Phone mockup */}
        <div ref={parallaxRef} style={{ marginBottom: '48px', maxWidth: '300px', margin: '0 auto 48px' }}>
          <PhoneMockup glowColor="rgba(34,211,238,0.22)">
            <img
              src="/agent-screenshot.jpg"
              alt="Repoverse AI Agent"
              loading="lazy"
              decoding="async"
              style={{ width: '100%', display: 'block' }}
            />
          </PhoneMockup>
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
        <div style={{ textAlign: 'center', marginBottom: '64px', position: 'relative' }}>
          <CircleDoodle style={{ position: 'absolute', top: '-20px', left: '5%', width: '50px', height: '50px' }} />
          <SparkDoodle style={{ position: 'absolute', top: '-10px', right: '5%', width: '32px', height: '32px', opacity: 0.7 }} />
          <div style={{ ...SECTION_PILL_STYLE, margin: '0 auto 20px' }}>Personalisation</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.2, color: '#fff', marginBottom: '6px' }}>
            The more you use it,<br />the better it gets.
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <div style={{ width: '300px' }}>
              <ScribbleUnderline color="#f472b6" />
            </div>
          </div>
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

// ─── GitHub Octicon SVGs ──────────────────────────────────────────────────────
function OcticonStar({ size = 18, color = '#e3b341' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 11.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.873 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
    </svg>
  );
}
function OcticonRepo({ size = 18, color = '#8b949e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
    </svg>
  );
}
function OcticonZap({ size = 18, color = '#a78bfa' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <path d="M9.504.43a1.516 1.516 0 0 1 2.437 1.713L10.415 5.5h2.123c1.57 0 2.346 1.909 1.22 3.004l-7.34 7.142a1.249 1.249 0 0 1-.871.354h-.302a1.25 1.25 0 0 1-1.157-1.723L5.633 10.5H3.462c-1.57 0-2.346-1.909-1.22-3.004Z" />
    </svg>
  );
}
function OcticonSync({ size = 18, color = '#60a5fa' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
    </svg>
  );
}

// ─── GitHub Connect Section (landing page) ────────────────────────────────────
function GitHubConnectSection({ onStartSwiping }: { onStartSwiping: () => void }) {
  const BENEFITS = [
    {
      icon: <OcticonStar size={16} color="#e3b341" />,
      bg: 'rgba(227,179,65,0.12)',
      border: 'rgba(227,179,65,0.25)',
      title: 'Sync your starred repos',
      body: 'All your GitHub stars, browseable right inside Repoverse.',
    },
    {
      icon: <OcticonZap size={16} color="#a78bfa" />,
      bg: 'rgba(167,139,250,0.12)',
      border: 'rgba(167,139,250,0.25)',
      title: 'Smarter recommendations',
      body: 'Our AI uses your taste in repos to personalise every discover session.',
    },
    {
      icon: <OcticonRepo size={16} color="#34d399" />,
      bg: 'rgba(52,211,153,0.12)',
      border: 'rgba(52,211,153,0.25)',
      title: 'One place for everything',
      body: 'Trending repos, your stars, new discoveries — all together, no tab switching.',
    },
    {
      icon: <OcticonSync size={16} color="#60a5fa" />,
      bg: 'rgba(96,165,250,0.12)',
      border: 'rgba(96,165,250,0.25)',
      title: 'Always up to date',
      body: 'One tap re-sync keeps your library fresh as your GitHub activity grows.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Two-col layout on desktop */}
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(36,41,47,0.9) 0%, rgba(13,17,23,0.95) 100%)',
          border: '1px solid rgba(48,54,61,0.8)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Ambient glows */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-80px', right: '-80px', width: '320px', height: '320px',
            background: 'radial-gradient(circle, rgba(36,41,47,0.6) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-60px', left: '-60px', width: '280px', height: '280px',
            background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* LEFT SIDE — copy */}
          <div
            className="p-8 sm:p-10 flex flex-col justify-center"
            style={{ borderRight: '1px solid rgba(48,54,61,0.6)' }}
          >
            {/* GitHub logo + badge */}
            <div className="flex items-center gap-3 mb-6">
              <div
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {/* Official GitHub logo */}
                <svg viewBox="0 0 24 24" fill="#e6edf3" width="26" height="26">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#e6edf3' }}>GitHub Integration</p>
                <div
                  className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  Free feature
                </div>
              </div>
            </div>

            <h2
              className="text-2xl sm:text-3xl font-bold mb-3"
              style={{ letterSpacing: '-0.02em', lineHeight: 1.25 }}
            >
              Connect your
              <br />
              GitHub profile.
            </h2>

            {/* Scribble underline under "GitHub profile" */}
            <svg viewBox="0 0 160 10" fill="none" className="mb-4" style={{ width: 140 }}>
              <path d="M2 7 C30 2, 70 9, 110 5 S148 2, 158 6" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
            </svg>

            <p className="text-sm leading-relaxed mb-6" style={{ color: '#8b949e' }}>
              One OAuth tap. Your GitHub stars flow in, and every recommendation gets sharper.
            </p>

            {/* CTA */}
            <a
              href="/app/profile"
              onClick={(e) => { e.preventDefault(); onStartSwiping(); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: '#238636',
                color: '#fff',
                border: '1px solid #2ea043',
                textDecoration: 'none',
                alignSelf: 'flex-start',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2ea043'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#238636'; }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Connect in the app
            </a>

            {/* App store nudge */}
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs transition-colors"
              style={{ color: '#6b7280', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#9ca3af'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ opacity: 0.7 }}>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Also available on iOS — download free
            </a>
          </div>

          {/* RIGHT SIDE — benefit cards */}
          <div className="p-8 sm:p-10 flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#484f58' }}>
              What you get
            </p>
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex items-start gap-3"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: b.bg,
                  border: `1px solid ${b.border}`,
                }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'rgba(0,0,0,0.25)',
                    border: `1px solid ${b.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {b.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: '#e6edf3' }}>{b.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#8b949e' }}>{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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

          {/* Wavy doodle separator */}
          <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
            <WavyDoodle style={{ width: '320px' }} />
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
          <div className="max-w-2xl mx-auto" style={{ position: 'relative' }}>
            <DotGrid style={{ position: 'absolute', top: '-16px', right: '-24px', width: '48px', height: '48px', opacity: 0.7 }} />
            <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ letterSpacing: '-0.02em' }}>
              You know this feeling.
            </h2>
            <ScribbleUnderline color="#ef4444" className="mb-5" />

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
            <div className="text-center mb-12" style={{ position: 'relative' }}>
              <SparkDoodle style={{ position: 'absolute', top: '-20px', left: '-24px', width: '28px', height: '28px', opacity: 0.8 }} />
              <CircleDoodle style={{ position: 'absolute', top: '-10px', right: '-20px', width: '50px', height: '50px' }} />
              <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ letterSpacing: '-0.02em' }}>
                We check their history before
                <br />
                you catch feelings.
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <div style={{ width: '280px' }}>
                  <ScribbleUnderline color="#22c55e" />
                </div>
              </div>
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
            SECTION 6b — GITHUB CONNECTION
        ══════════════════════════════════════════════════════════════════ */}
        <FadeSection
          id="github"
          visible={visible['github']}
          setRef={setRef('github')}
          className="py-20 sm:py-28 px-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <GitHubConnectSection onStartSwiping={handleStartSwiping} />
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
                  <DotGrid style={{ position: 'absolute', top: '-24px', right: '10%', width: '44px', height: '44px', opacity: 0.5 }} />
                  <SparkDoodle style={{ position: 'absolute', top: '-20px', left: '8%', width: '28px', height: '28px', opacity: 0.6 }} />
                  <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ letterSpacing: '-0.02em' }}>
                    Ready to find repos worth
                    <br />
                    committing to?
                  </h2>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '220px' }}>
                      <ScribbleUnderline color="#2563eb" />
                    </div>
                  </div>
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

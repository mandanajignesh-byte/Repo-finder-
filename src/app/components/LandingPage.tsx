import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  TrendingUp,
  Bot,
  Bookmark,
  Sparkles,
  Shield,
  Zap,
  Star,
  GitFork,
  Users,
  ChevronDown,
  ArrowRight,
  Smartphone,
  Globe,
  Heart,
  Menu,
  X,
} from 'lucide-react';

// ✅ Correct App Store link
const APP_STORE_LINK = 'https://apps.apple.com/us/app/repoverse/id6759513548';

// ─── Handdrawn SVG Decorations ───────────────────────────────────────────────

const ScribbleUnderline = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 220 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <path
      d="M2 8 C18 3, 38 12, 58 7 C78 2, 98 11, 118 6 C138 1, 158 10, 178 5 C198 0, 212 9, 218 7"
      stroke="url(#underlineGrad)" strokeWidth="3.5" strokeLinecap="round" fill="none"
      style={{ filter: 'url(#roughen)' }}
    />
    <defs>
      <linearGradient id="underlineGrad" x1="0" y1="0" x2="220" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60a5fa" />
        <stop offset="0.5" stopColor="#a78bfa" />
        <stop offset="1" stopColor="#22d3ee" />
      </linearGradient>
      <filter id="roughen">
        <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="2" result="noise" seed="3" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
);

const ScribbleCircle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 80 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <ellipse cx="40" cy="20" rx="36" ry="16" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 2"
      style={{ filter: 'url(#roughen2)' }} fill="none" opacity="0.6"
    />
    <defs>
      <filter id="roughen2">
        <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
);

const HanddrawnArrow = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <path
      d="M8 30 C15 20, 30 15, 48 22 C58 26, 64 32, 68 38"
      stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7"
    />
    <path d="M58 30 L68 38 L56 44" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
  </svg>
);

const StarDoodle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <path d="M16 4 L18 13 L27 13 L20 18 L23 27 L16 22 L9 27 L12 18 L5 13 L14 13 Z"
      stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity="0.5"
    />
    <line x1="16" y1="1" x2="16" y2="4" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <line x1="16" y1="28" x2="16" y2="31" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <line x1="1" y1="16" x2="4" y2="16" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <line x1="28" y1="16" x2="31" y2="16" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const WavyLine = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 400 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <path
      d="M0 10 C25 4, 50 16, 75 10 C100 4, 125 16, 150 10 C175 4, 200 16, 225 10 C250 4, 275 16, 300 10 C325 4, 350 16, 375 10 C385 7, 393 12, 400 10"
      stroke="url(#waveGrad)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3"
    />
    <defs>
      <linearGradient id="waveGrad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="0.5" stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
  </svg>
);

const CrosshatchDoodle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    {[0, 10, 20, 30, 40, 50].map((y) => (
      <line key={`h${y}`} x1="0" y1={y} x2="60" y2={y + 10} stroke="#6366f1" strokeWidth="1" opacity="0.15" strokeLinecap="round" />
    ))}
    {[0, 10, 20, 30, 40, 50].map((x) => (
      <line key={`v${x}`} x1={x} y1="0" x2={x + 10} y2="60" stroke="#6366f1" strokeWidth="1" opacity="0.15" strokeLinecap="round" />
    ))}
  </svg>
);

const BracketDoodle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 30 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <path d="M20 5 C10 5, 5 10, 5 20 L5 40 C5 50, 10 55, 20 55"
      stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"
    />
  </svg>
);

const SparkDoodle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <line x1="20" y1="2" x2="20" y2="38" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <line x1="2" y1="20" x2="38" y2="20" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <line x1="6" y1="6" x2="34" y2="34" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    <line x1="34" y1="6" x2="6" y2="34" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    <circle cx="20" cy="20" r="4" fill="#f472b6" opacity="0.4" />
  </svg>
);

// ─── Apple Badge SVG ─────────────────────────────────────────────────────────
const AppleIcon = () => (
  <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
  </svg>
);

// ─── AppStoreButton ───────────────────────────────────────────────────────────
const AppStoreButton = ({ size = 'lg', className = '' }: { size?: 'sm' | 'lg'; className?: string }) => (
  <a
    href={APP_STORE_LINK}
    target="_blank"
    rel="noopener noreferrer"
    className={`group inline-flex items-center gap-3 rounded-2xl bg-white text-black font-semibold hover:scale-[1.02] transition-all duration-200 shadow-2xl shadow-white/10 ${
      size === 'lg' ? 'px-7 py-4 text-base' : 'px-5 py-3 text-sm'
    } ${className}`}
  >
    <AppleIcon />
    <div className="text-left">
      <div className="text-[9px] uppercase tracking-widest opacity-50 leading-none">Download on the</div>
      <div className={`font-bold leading-tight ${size === 'lg' ? 'text-base' : 'text-sm'}`}>App Store</div>
    </div>
    <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
  </a>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const observerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.12 }
    );
    Object.values(observerRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  // Auto-rotate screenshots
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveScreenshot((prev) => (prev + 1) % screenshots.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 640) setMobileMenuOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const screenshots = [
    { src: '/screenshots/filter-preferences.png', title: 'Filter By Your Preferences', subtitle: 'Choose project types that match your interests' },
    { src: '/screenshots/coding-level.png', title: 'Built For Every Developer', subtitle: 'Personalized for your coding level' },
    { src: '/screenshots/discover-feed.png', title: 'Your Personal GitHub Feed', subtitle: 'Swipe through repos curated just for you' },
    { src: '/screenshots/trending.png', title: 'Catch Trends Early', subtitle: 'Discover trending repos before everyone else' },
  ];

  const features = [
    { icon: <Compass className="w-7 h-7" />, title: 'Smart Discovery', description: 'Swipe through repos matched to your tech stack, goals, and experience level.', gradient: 'from-blue-500 to-cyan-400' },
    { icon: <TrendingUp className="w-7 h-7" />, title: 'Trending Feed', description: 'Stay ahead with daily & weekly trending repos scored for momentum and health.', gradient: 'from-purple-500 to-pink-400' },
    { icon: <Bot className="w-7 h-7" />, title: 'AI Agent', description: 'Ask in plain English. Get intelligent repo recommendations with health scores.', gradient: 'from-orange-500 to-amber-400', badge: 'Pro' },
    { icon: <Bookmark className="w-7 h-7" />, title: 'Save & Organize', description: 'Build your personal library of repos. Never lose that perfect tool again.', gradient: 'from-green-500 to-emerald-400' },
    { icon: <Sparkles className="w-7 h-7" />, title: 'Personalized Onboarding', description: 'Tell us your stack, goals, and level. We build a feed that evolves with you.', gradient: 'from-indigo-500 to-violet-400' },
    { icon: <Shield className="w-7 h-7" />, title: 'Quality Guaranteed', description: 'Every repo is scored for health, activity, and documentation quality.', gradient: 'from-rose-500 to-red-400' },
  ];

  const stats = [
    { value: '10,000+', label: 'Curated Repos', icon: <Star className="w-5 h-5" /> },
    { value: '8', label: 'Tech Categories', icon: <Globe className="w-5 h-5" /> },
    { value: '50+', label: 'Languages', icon: <GitFork className="w-5 h-5" /> },
    { value: '24/7', label: 'Auto-Updated', icon: <Zap className="w-5 h-5" /> },
  ];

  const appExclusives = [
    'Unlimited AI Agent queries',
    'Personalized push notifications for trending repos',
    'Offline saved repos access',
    'Advanced repo health scores & comparisons',
    'No daily limits on discovery',
    'Priority access to new features',
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ─── Navbar ───────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/logo.png" alt="RepoVerse" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">RepoVerse</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6">
            <button
              onClick={() => navigate('/trending')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Trending
            </button>
            <button
              onClick={() => navigate('/discover')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Try Web Version
            </button>
            <AppStoreButton size="sm" className="!rounded-full !shadow-none !py-2 !px-5" />
          </div>

          {/* Mobile right — App button + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-white text-black leading-none"
            >
              <AppleIcon />
              <span>Get App</span>
            </a>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/5 bg-black/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-1">
              <button
                onClick={() => { navigate('/trending'); setMobileMenuOpen(false); }}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Trending Repos
              </button>
              <button
                onClick={() => { navigate('/discover'); setMobileMenuOpen(false); }}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Globe className="w-4 h-4 text-blue-400" />
                Try Web Version
              </button>
              <div className="pt-2">
                <a
                  href={APP_STORE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold"
                >
                  <AppleIcon />
                  Download on the App Store
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-30 pointer-events-none">
          <div className="absolute top-10 left-0 w-72 h-72 bg-blue-600 rounded-full blur-[128px]" />
          <div className="absolute top-20 right-0 w-72 h-72 bg-purple-600 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500 rounded-full blur-[128px]" />
        </div>

        {/* Handdrawn decorations — scattered */}
        <StarDoodle className="absolute top-28 left-[8%] w-10 h-10 hidden lg:block" />
        <StarDoodle className="absolute top-44 right-[6%] w-8 h-8 hidden lg:block opacity-70" />
        <SparkDoodle className="absolute top-40 left-[14%] w-9 h-9 hidden xl:block" />
        <CrosshatchDoodle className="absolute bottom-24 right-[10%] w-16 h-16 hidden lg:block opacity-60" />
        <CrosshatchDoodle className="absolute top-32 right-[18%] w-12 h-12 hidden xl:block opacity-40" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">Now available on iOS — free to download</span>
          </div>

          {/* Heading with handdrawn underline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-3">
            Navigate the{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                GitHub Universe
              </span>
              <ScribbleUnderline className="absolute -bottom-3 left-0 w-full h-4 pointer-events-none" />
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mt-8 mb-10 leading-relaxed">
            Discover repositories matched to your tech stack, goals, and experience level.
            Swipe, save, and stay ahead of the curve — all from one beautiful app.
          </p>

          {/* Handdrawn arrow pointing to CTA */}
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {/* Arrow doodle */}
            <HanddrawnArrow className="absolute -left-16 -top-10 w-20 h-16 hidden xl:block -rotate-12 opacity-70" />

            <AppStoreButton size="lg" />

            <button
              onClick={() => navigate('/trending')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 text-white font-semibold text-base hover:bg-white/5 transition-all duration-200"
            >
              <TrendingUp className="w-5 h-5 text-purple-400" />
              View Trending
            </button>

            <button
              onClick={() => navigate('/discover')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <Globe className="w-4 h-4" />
              Web Version
            </button>
          </div>

          {/* Hero phone mockup */}
          <div className="relative mx-auto" style={{ maxWidth: '300px' }}>
            {/* Handdrawn bracket decoration */}
            <BracketDoodle className="absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-20 hidden lg:block" />
            <BracketDoodle className="absolute -right-8 top-1/2 -translate-y-1/2 w-8 h-20 hidden lg:block scale-x-[-1]" />

            <div className="relative rounded-[40px] border-2 border-gray-700/50 bg-gray-900 p-2 shadow-2xl shadow-blue-500/10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-10" />
              <div className="rounded-[32px] overflow-hidden bg-black aspect-[9/19.5]">
                <img
                  src={screenshots[activeScreenshot].src}
                  alt={screenshots[activeScreenshot].title}
                  className="w-full h-full object-cover transition-opacity duration-500"
                  loading="eager"
                />
              </div>
            </div>

            {/* Screenshot label */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400 font-medium">{screenshots[activeScreenshot].title}</p>
            </div>

            {/* Dots */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveScreenshot(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeScreenshot ? 'w-8 h-2 bg-blue-400' : 'w-2 h-2 bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-500" />
        </div>
      </section>

      {/* ─── Stats Bar ────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/[0.02] relative overflow-hidden">
        <WavyLine className="absolute top-0 left-0 w-full h-5 opacity-50" />
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-blue-400">{stat.icon}</span>
                <span className="text-2xl sm:text-3xl font-bold">{stat.value}</span>
              </div>
              <span className="text-sm text-gray-500">{stat.label}</span>
            </div>
          ))}
        </div>
        <WavyLine className="absolute bottom-0 left-0 w-full h-5 opacity-50 rotate-180" />
      </section>

      {/* ─── Features Section ─────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
        {/* Handdrawn deco */}
        <StarDoodle className="absolute top-12 right-[5%] w-12 h-12 hidden lg:block" />
        <SparkDoodle className="absolute bottom-16 left-[4%] w-12 h-12 hidden lg:block opacity-60" />

        <div
          id="features"
          ref={(el) => { observerRefs.current['features'] = el; }}
          className={`max-w-6xl mx-auto transition-all duration-700 ${
            isVisible['features'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Everything you need to{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  discover repos
                </span>
                <ScribbleUnderline className="absolute -bottom-2 left-0 w-full h-3 pointer-events-none opacity-80" />
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Personalized recommendations, trending feeds, and an AI agent — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
              >
                {feature.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="relative text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      {feature.badge}
                    </span>
                    <ScribbleCircle className="absolute -inset-2 w-20 h-8 pointer-events-none opacity-70" />
                  </div>
                )}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Screenshots Showcase ─────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent relative">
        <CrosshatchDoodle className="absolute top-16 left-[3%] w-20 h-20 hidden lg:block opacity-40" />
        <StarDoodle className="absolute bottom-20 right-[4%] w-14 h-14 hidden lg:block opacity-50" />

        <div
          id="screenshots"
          ref={(el) => { observerRefs.current['screenshots'] = el; }}
          className={`max-w-6xl mx-auto transition-all duration-700 ${
            isVisible['screenshots'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">See it in action</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              A beautiful, native experience built for developers who move fast.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {screenshots.map((screenshot, i) => (
              <div key={i} className="group text-center" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="relative rounded-[24px] sm:rounded-[32px] border border-gray-700/30 bg-gray-900/50 p-1 sm:p-1.5 shadow-xl hover:shadow-blue-500/10 hover:border-gray-600/50 transition-all duration-300 group-hover:-translate-y-2">
                  <div className="rounded-[20px] sm:rounded-[28px] overflow-hidden bg-black">
                    <img src={screenshot.src} alt={screenshot.title} className="w-full h-auto" loading="lazy" />
                  </div>
                </div>
                <h3 className="mt-4 text-sm sm:text-base font-semibold">{screenshot.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{screenshot.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── App Exclusive Section ────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 relative">
        <SparkDoodle className="absolute top-10 right-[8%] w-10 h-10 hidden lg:block opacity-50" />

        <div
          id="exclusive"
          ref={(el) => { observerRefs.current['exclusive'] = el; }}
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isVisible['exclusive'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="relative rounded-3xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent" />
            {/* Handdrawn corner deco */}
            <CrosshatchDoodle className="absolute top-4 right-4 w-16 h-16 opacity-30" />
            <CrosshatchDoodle className="absolute bottom-4 left-4 w-16 h-16 opacity-20" />

            <div className="relative p-8 sm:p-12 md:p-16">
              <div className="flex flex-col md:flex-row items-start gap-10 md:gap-16">
                {/* Left side */}
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-300 font-medium">App Exclusive</span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                    Unlock the full
                    <br />
                    <span className="relative inline-block">
                      <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        RepoVerse experience
                      </span>
                      <ScribbleUnderline className="absolute -bottom-2 left-0 w-full h-3 pointer-events-none opacity-70" />
                    </span>
                  </h2>

                  <p className="text-gray-400 mb-8 leading-relaxed">
                    The web gives you a taste. The app gives you everything — unlimited AI queries,
                    push notifications, offline access, and features we're adding every week.
                  </p>

                  <AppStoreButton size="lg" />
                </div>

                {/* Right side - feature list */}
                <div className="flex-1">
                  <ul className="space-y-4">
                    {appExclusives.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Web vs App Comparison ────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 border-t border-white/5">
        <div
          id="comparison"
          ref={(el) => { observerRefs.current['comparison'] = el; }}
          className={`max-w-3xl mx-auto transition-all duration-700 ${
            isVisible['comparison'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Web vs App</h2>
            <p className="text-gray-400">Free forever on the web. Unlimited in the app.</p>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-4 px-4 sm:px-6 text-left text-sm font-medium text-gray-400">Feature</th>
                  <th className="py-4 px-4 sm:px-6 text-center text-sm font-medium text-gray-400">
                    <div className="flex items-center justify-center gap-1.5">
                      <Globe className="w-4 h-4" /> Web
                    </div>
                  </th>
                  <th className="py-4 px-4 sm:px-6 text-center text-sm font-medium">
                    <div className="flex items-center justify-center gap-1.5 text-blue-400">
                      <Smartphone className="w-4 h-4" /> App
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { feature: 'Discover & Swipe Repos', web: true, app: true },
                  { feature: 'Trending Repos', web: true, app: true },
                  { feature: 'Save & Like Repos', web: true, app: true },
                  { feature: 'Shareable Repo Links', web: true, app: true },
                  { feature: 'AI Agent Queries', web: '3/day', app: 'Unlimited' },
                  { feature: 'Repo Health Scores', web: false, app: true },
                  { feature: 'Repo Comparisons', web: false, app: true },
                  { feature: 'Push Notifications', web: false, app: true },
                  { feature: 'Offline Access', web: false, app: true },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 sm:px-6 text-sm text-gray-300">{row.feature}</td>
                    <td className="py-3.5 px-4 sm:px-6 text-center">
                      {typeof row.web === 'string' ? (
                        <span className="text-sm text-gray-400">{row.web}</span>
                      ) : row.web ? (
                        <svg className="w-5 h-5 text-green-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-center">
                      {typeof row.app === 'string' ? (
                        <span className="text-sm text-blue-400 font-medium">{row.app}</span>
                      ) : row.app ? (
                        <svg className="w-5 h-5 text-blue-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 relative">
        <StarDoodle className="absolute top-8 left-[10%] w-12 h-12 hidden lg:block opacity-60" />
        <SparkDoodle className="absolute bottom-12 right-[8%] w-12 h-12 hidden lg:block opacity-50" />
        <StarDoodle className="absolute bottom-16 left-[6%] w-8 h-8 hidden lg:block opacity-40" />

        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl border border-white/10 overflow-hidden p-10 sm:p-16">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-cyan-600/10" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[128px] opacity-20" />
            {/* Handdrawn deco */}
            <CrosshatchDoodle className="absolute top-3 left-3 w-14 h-14 opacity-25" />
            <CrosshatchDoodle className="absolute bottom-3 right-3 w-14 h-14 opacity-25" />

            <div className="relative">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">
                Start discovering repos
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    that matter to you
                  </span>
                  <ScribbleUnderline className="absolute -bottom-2 left-0 w-full h-3 pointer-events-none opacity-70" />
                </span>
              </h2>
              <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
                Join developers who discover their next favorite tool, library, or project every day.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <AppStoreButton size="lg" />
                <div className="flex flex-col sm:flex-row items-center gap-3 text-sm">
                  <button
                    onClick={() => navigate('/trending')}
                    className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    View Trending
                  </button>
                  <span className="text-gray-700 hidden sm:inline">·</span>
                  <button
                    onClick={() => navigate('/discover')}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Try Web Version
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RepoVerse" className="w-6 h-6 rounded-md" />
            <span className="text-sm text-gray-400">RepoVerse © {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a href="/privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Terms of Use</a>
            <a href="/support" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Support</a>
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
            >
              <AppleIcon />
              App Store
            </a>
            <span className="text-sm text-gray-600 flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-red-500 mx-0.5" /> for devs
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

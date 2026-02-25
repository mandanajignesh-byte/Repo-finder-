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
} from 'lucide-react';

// App Store link - update with actual link when available
const APP_STORE_LINK = 'https://apps.apple.com/app/repoverse/id6746498585';

export function LandingPage() {
  const navigate = useNavigate();
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
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
      { threshold: 0.15 }
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

  const screenshots = [
    {
      src: '/screenshots/filter-preferences.png',
      title: 'Filter By Your Preferences',
      subtitle: 'Choose project types that match your interests',
    },
    {
      src: '/screenshots/coding-level.png',
      title: 'Built For Every Developer',
      subtitle: 'Personalized for your coding level',
    },
    {
      src: '/screenshots/discover-feed.png',
      title: 'Your Personal GitHub Feed',
      subtitle: 'Swipe through repos curated just for you',
    },
    {
      src: '/screenshots/trending.png',
      title: 'Catch Trends Early',
      subtitle: 'Discover trending repos before everyone else',
    },
  ];

  const features = [
    {
      icon: <Compass className="w-7 h-7" />,
      title: 'Smart Discovery',
      description: 'Swipe through repos matched to your tech stack, goals, and experience level.',
      gradient: 'from-blue-500 to-cyan-400',
    },
    {
      icon: <TrendingUp className="w-7 h-7" />,
      title: 'Trending Feed',
      description: 'Stay ahead with daily, weekly, and monthly trending repos across all languages.',
      gradient: 'from-purple-500 to-pink-400',
    },
    {
      icon: <Bot className="w-7 h-7" />,
      title: 'AI Agent',
      description: 'Ask in plain English. Get intelligent repo recommendations with health scores.',
      gradient: 'from-orange-500 to-amber-400',
      badge: 'Pro',
    },
    {
      icon: <Bookmark className="w-7 h-7" />,
      title: 'Save & Organize',
      description: 'Build your personal library of repos. Never lose that perfect tool again.',
      gradient: 'from-green-500 to-emerald-400',
    },
    {
      icon: <Sparkles className="w-7 h-7" />,
      title: 'Personalized Onboarding',
      description: 'Tell us your stack, goals, and level. We build a feed that evolves with you.',
      gradient: 'from-indigo-500 to-violet-400',
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Quality Guaranteed',
      description: 'Every repo is scored for health, activity, and documentation quality.',
      gradient: 'from-rose-500 to-red-400',
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Curated Repos', icon: <Star className="w-5 h-5" /> },
    { value: '8', label: 'Tech Clusters', icon: <Globe className="w-5 h-5" /> },
    { value: '50+', label: 'Languages', icon: <GitFork className="w-5 h-5" /> },
    { value: '24/7', label: 'Updated', icon: <Zap className="w-5 h-5" /> },
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
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="RepoVerse" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">RepoVerse</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <button
              onClick={() => navigate('/discover')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Try Web Version
            </button>
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 text-sm font-semibold rounded-full bg-white text-black hover:bg-gray-100 transition-all"
            >
              Download App
            </a>
          </div>
          <a
            href={APP_STORE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden px-4 py-1.5 text-sm font-semibold rounded-full bg-white text-black"
          >
            Get App
          </a>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 overflow-hidden">
        {/* Gradient background orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-30 pointer-events-none">
          <div className="absolute top-10 left-0 w-72 h-72 bg-blue-600 rounded-full blur-[128px]" />
          <div className="absolute top-20 right-0 w-72 h-72 bg-purple-600 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500 rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">Now available on iOS</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            Navigate the{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              GitHub Universe
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Discover repositories matched to your tech stack, goals, and experience level.
            Swipe, save, and stay ahead of the curve — all from one beautiful app.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href={APP_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-semibold text-lg hover:scale-[1.02] transition-all duration-200 shadow-2xl shadow-white/10"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
              </svg>
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider opacity-60 leading-none">Download on the</div>
                <div className="text-base font-bold leading-tight">App Store</div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
            </a>
            <button
              onClick={() => navigate('/discover')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 text-white font-semibold text-lg hover:bg-white/5 transition-all duration-200"
            >
              <Globe className="w-5 h-5" />
              Try Web Version
            </button>
          </div>

          {/* Hero phone mockup */}
          <div className="relative mx-auto" style={{ maxWidth: '320px' }}>
            {/* Phone frame */}
            <div className="relative rounded-[40px] border-2 border-gray-700/50 bg-gray-900 p-2 shadow-2xl shadow-blue-500/10">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-10" />
              {/* Screen */}
              <div className="rounded-[32px] overflow-hidden bg-black aspect-[9/19.5]">
                <img
                  src={screenshots[activeScreenshot].src}
                  alt={screenshots[activeScreenshot].title}
                  className="w-full h-full object-cover transition-opacity duration-500"
                  loading="eager"
                />
              </div>
            </div>

            {/* Screenshot dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveScreenshot(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === activeScreenshot
                      ? 'w-8 bg-blue-400'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-500" />
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="border-y border-white/5 bg-white/[0.02]">
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
      </section>

      {/* ─── Features Section ─── */}
      <section className="py-20 sm:py-28 px-4">
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
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                discover repos
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
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    {feature.badge}
                  </span>
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

      {/* ─── Screenshots Showcase ─── */}
      <section className="py-20 sm:py-28 px-4 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent">
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
              <div
                key={i}
                className="group text-center"
                style={{
                  transitionDelay: `${i * 100}ms`,
                }}
              >
                <div className="relative rounded-[24px] sm:rounded-[32px] border border-gray-700/30 bg-gray-900/50 p-1 sm:p-1.5 shadow-xl hover:shadow-blue-500/10 hover:border-gray-600/50 transition-all duration-300 group-hover:-translate-y-2">
                  <div className="rounded-[20px] sm:rounded-[28px] overflow-hidden bg-black">
                    <img
                      src={screenshot.src}
                      alt={screenshot.title}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                </div>
                <h3 className="mt-4 text-sm sm:text-base font-semibold">{screenshot.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{screenshot.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── App Exclusive Section ─── */}
      <section className="py-20 sm:py-28 px-4">
        <div
          id="exclusive"
          ref={(el) => { observerRefs.current['exclusive'] = el; }}
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isVisible['exclusive'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="relative rounded-3xl border border-white/10 overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent" />

            <div className="relative p-8 sm:p-12 md:p-16">
              <div className="flex flex-col md:flex-row items-start gap-10 md:gap-16">
                {/* Left side - text */}
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-300 font-medium">App Exclusive</span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                    Unlock the full
                    <br />
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      RepoVerse experience
                    </span>
                  </h2>

                  <p className="text-gray-400 mb-8 leading-relaxed">
                    The web gives you a taste. The app gives you everything — unlimited AI queries,
                    push notifications, offline access, and features we're adding every week.
                  </p>

                  <a
                    href={APP_STORE_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:scale-[1.02] transition-all duration-200"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                    Download on the App Store
                    <ArrowRight className="w-4 h-4" />
                  </a>
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
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Web vs App Comparison ─── */}
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
                        <svg className="w-5 h-5 text-green-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-center">
                      {typeof row.app === 'string' ? (
                        <span className="text-sm text-blue-400 font-medium">{row.app}</span>
                      ) : row.app ? (
                        <svg className="w-5 h-5 text-blue-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
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

      {/* ─── Final CTA ─── */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Gradient background */}
          <div className="relative rounded-3xl border border-white/10 overflow-hidden p-10 sm:p-16">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-cyan-600/10" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[128px] opacity-20" />

            <div className="relative">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">
                Start discovering repos
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  that matter to you
                </span>
              </h2>
              <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
                Join developers who discover their next favorite tool, library, or project every day.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={APP_STORE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-semibold text-lg hover:scale-[1.02] transition-all duration-200 shadow-2xl shadow-white/10"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                  Download on the App Store
                </a>
                <button
                  onClick={() => navigate('/discover')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  or try the web version <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RepoVerse" className="w-6 h-6 rounded-md" />
            <span className="text-sm text-gray-400">
              RepoVerse © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy.html" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Privacy
            </a>
            <a href="/terms.html" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Terms
            </a>
            <a href="/support" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Support
            </a>
            <span className="text-sm text-gray-600 flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-red-500" /> for devs
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

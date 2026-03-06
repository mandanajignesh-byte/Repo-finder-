import { useState, useEffect } from 'react';
import { Star, Loader2, ExternalLink, GitFork, Share2, TrendingUp, AlertCircle } from 'lucide-react';
import { TrendingRepo } from '@/lib/types';
import { githubService } from '@/services/github.service';
import { categoryService, RepoCategory } from '@/services/category.service';
import { shareService } from '@/services/share.service';

// ── Language colours (GitHub palette) ───────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', 'C#': '#178600', C: '#555555',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Scala: '#c22d40',
  Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883',
  Svelte: '#ff3e00', Elixir: '#6e4a7e', Haskell: '#5e5086',
  'Jupyter Notebook': '#DA5B0B',
};
const getLangColor = (l?: string) => (l ? LANG_COLORS[l] ?? '#6b7280' : '#6b7280');

// ── Category metadata ────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  'all':                     { emoji: '🌟', label: 'All' },
  'repos-all-should-know':   { emoji: '📌', label: 'Must-Know' },
  'ai-automation':           { emoji: '🤖', label: 'AI & ML' },
  'open-source-alternatives':{ emoji: '🔓', label: 'OSS Alts' },
  'frontend':                { emoji: '🎨', label: 'Frontend' },
  'backend':                 { emoji: '⚙️',  label: 'Backend' },
  'mobile':                  { emoji: '📱', label: 'Mobile' },
  'desktop':                 { emoji: '🖥️', label: 'Desktop' },
  'data-science':            { emoji: '📊', label: 'Data Science' },
  'devops':                  { emoji: '🚀', label: 'DevOps' },
  'ai':                      { emoji: '✨', label: 'AI' },
  'game-dev':                { emoji: '🎮', label: 'Game Dev' },
  'generic':                 { emoji: '📦', label: 'Other' },
};

// ── Health grade colour ──────────────────────────────────────────────────
function gradeStyle(g: string) {
  if (g === 'A+' || g === 'A')  return { bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(74,222,128,0.3)' };
  if (g === 'B+' || g === 'B')  return { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(96,165,250,0.3)' };
  if (g === 'C+' || g === 'C')  return { bg: 'rgba(234,179,8,0.12)',  text: '#facc15', border: 'rgba(250,204,21,0.3)' };
  return                               { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(248,113,113,0.3)' };
}

// ── Compact star count ───────────────────────────────────────────────────
function fmtStars(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function TrendingScreen() {
  const [timeRange, setTimeRange] = useState<'today' | 'week'>('today');
  const [selectedCategory, setSelectedCategory] = useState<RepoCategory | 'all'>('all');
  const [categorizedRepos, setCategorizedRepos] = useState<Map<RepoCategory, TrendingRepo[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadTrendingRepos(); }, [timeRange]);

  const loadTrendingRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const since = timeRange === 'today' ? 'daily' : 'weekly';
      const trending = await githubService.getTrendingRepos({ since, perPage: 50, usePagination: false });
      const categorized = categoryService.categorizeRepos(trending);
      const map = new Map<RepoCategory, TrendingRepo[]>();
      categorized.forEach((repos, cat) => map.set(cat, repos as TrendingRepo[]));
      setCategorizedRepos(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending repos');
    } finally {
      setLoading(false);
    }
  };

  const categoryOrder: RepoCategory[] = [
    'repos-all-should-know','ai-automation','open-source-alternatives',
    'frontend','backend','mobile','desktop','data-science','devops','ai','game-dev','generic',
  ];

  const getDisplayRepos = (): { category: RepoCategory; repos: TrendingRepo[] }[] => {
    if (selectedCategory === 'all') {
      return categoryOrder
        .map(cat => ({ category: cat, repos: categorizedRepos.get(cat) || [] }))
        .filter(i => i.repos.length > 0);
    }
    const repos = categorizedRepos.get(selectedCategory) || [];
    return repos.length > 0 ? [{ category: selectedCategory, repos }] : [];
  };

  return (
    <div className="h-full overflow-y-auto pb-24 md:pb-0" style={{ background: '#0d1117' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6">

        {/* ── PAGE HEADER ──────────────────────────────────────── */}
        <div className="pt-5 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)' }}
            >
              <TrendingUp className="w-4 h-4" style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight" style={{ color: '#e6edf3' }}>Trending</h1>
              <p className="text-[11px] leading-none mt-0.5" style={{ color: '#6b7280' }}>
                {timeRange === 'today' ? 'Fastest rising today' : 'Fastest rising this week'}
              </p>
            </div>
          </div>

          {/* Time range toggle */}
          <div
            className="flex items-center p-0.5 rounded-lg"
            style={{ background: '#161b22', border: '1px solid #21262d' }}
          >
            {(['today', 'week'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={timeRange === range
                  ? { background: '#2563eb', color: '#fff' }
                  : { background: 'transparent', color: '#6b7280' }
                }
              >
                {range === 'today' ? 'Today' : 'This Week'}
              </button>
            ))}
          </div>
        </div>

        {/* ── LOADING ───────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#2563eb' }} />
            <p className="text-sm" style={{ color: '#6b7280' }}>Fetching trending repos…</p>
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-10 h-10" style={{ color: '#f87171' }} />
            <p className="text-sm text-center max-w-xs" style={{ color: '#8b949e' }}>{error}</p>
            <button
              onClick={loadTrendingRepos}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: '#2563eb', color: '#fff' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── CATEGORY FILTER ──────────────────────────────────── */}
        {!loading && !error && (
          <div className="pb-4 -mx-4 md:-mx-6 px-4 md:px-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-2 w-max">
              {/* All */}
              <button
                onClick={() => setSelectedCategory('all')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                style={selectedCategory === 'all'
                  ? { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' }
                  : { background: '#161b22', color: '#8b949e', border: '1px solid #21262d' }
                }
              >
                <span>🌟</span> All
              </button>

              {categoryOrder.map((cat) => {
                const repos = categorizedRepos.get(cat) || [];
                if (repos.length === 0) return null;
                const isActive = selectedCategory === cat;
                const meta = CATEGORY_META[cat] ?? { emoji: '📦', label: cat };
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                    style={isActive
                      ? { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' }
                      : { background: '#161b22', color: '#8b949e', border: '1px solid #21262d' }
                    }
                  >
                    <span>{meta.emoji}</span>
                    {meta.label}
                    <span
                      className="text-[10px] rounded-full px-1"
                      style={{ background: isActive ? 'rgba(255,255,255,0.2)' : '#21262d', color: isActive ? '#fff' : '#6b7280' }}
                    >
                      {repos.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REPO LISTS ───────────────────────────────────────── */}
        {!loading && !error && (
          <div className="pb-8 space-y-10">
            {getDisplayRepos().map(({ category, repos }) => (
              <div key={category}>
                {/* Category heading (only when showing all) */}
                {selectedCategory === 'all' && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">{CATEGORY_META[category]?.emoji ?? '📦'}</span>
                    <h2 className="text-base font-bold" style={{ color: '#e6edf3' }}>
                      {categoryService.getCategoryName(category)}
                    </h2>
                    <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: '#21262d', color: '#6b7280' }}>
                      {repos.length}
                    </span>
                    <div className="flex-1 h-px" style={{ background: '#21262d' }} />
                  </div>
                )}

                {/* Cards */}
                <div className="space-y-2.5">
                  {repos.map((repo, index) => {
                    const gs = repo.healthGrade ? gradeStyle(repo.healthGrade) : null;
                    const langColor = getLangColor(repo.language);
                    return (
                      <div
                        key={repo.id}
                        className="group relative rounded-xl cursor-pointer transition-all duration-200"
                        style={{
                          background: '#0d1117',
                          border: '1px solid #21262d',
                        }}
                        onClick={() => window.open(repo.url, '_blank')}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#30363d';
                          (e.currentTarget as HTMLElement).style.background = '#161b22';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#21262d';
                          (e.currentTarget as HTMLElement).style.background = '#0d1117';
                        }}
                      >
                        {/* Health grade — top-right */}
                        {gs && (
                          <div
                            className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none"
                            style={{ background: gs.bg, color: gs.text, border: `1px solid ${gs.border}` }}
                          >
                            {repo.healthGrade}
                          </div>
                        )}

                        <div className="p-4 flex gap-3">
                          {/* Rank badge */}
                          <div
                            className="flex-shrink-0 flex items-center justify-center font-bold text-xs"
                            style={{
                              width: '32px', height: '32px', borderRadius: '8px',
                              background: index === 0 ? '#2563eb' : index === 1 ? '#1d2d44' : '#161b22',
                              color: index === 0 ? '#fff' : index < 3 ? '#93c5fd' : '#6b7280',
                              border: index === 0 ? 'none' : '1px solid #21262d',
                              boxShadow: index === 0 ? '0 0 12px rgba(37,99,235,0.4)' : undefined,
                              marginTop: '2px',
                            }}
                          >
                            {index + 1}
                          </div>

                          {/* Body */}
                          <div className="flex-1 min-w-0 pr-8">
                            {/* Owner avatar + repo name row */}
                            <div className="flex items-center gap-2 mb-1.5">
                              {repo.owner?.avatarUrl ? (
                                <img
                                  src={repo.owner.avatarUrl}
                                  alt={repo.owner.login}
                                  className="w-5 h-5 rounded-full flex-shrink-0"
                                  style={{ border: '1px solid #30363d' }}
                                />
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                                  style={{ background: '#21262d', color: '#8b949e' }}
                                >
                                  {(repo.owner?.login || repo.name || '?')[0].toUpperCase()}
                                </div>
                              )}
                              <h3
                                className="font-semibold text-sm leading-tight font-mono truncate"
                                style={{ color: '#e6edf3' }}
                              >
                                {repo.fullName}
                              </h3>
                            </div>

                            {/* Description */}
                            <p
                              className="text-xs leading-relaxed line-clamp-2 mb-2.5"
                              style={{ color: '#8b949e' }}
                            >
                              {repo.description}
                            </p>

                            {/* Bottom row: tags + stats */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {/* Language + tags */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {repo.language && (
                                  <div className="flex items-center gap-1">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ background: langColor }}
                                    />
                                    <span className="text-[11px]" style={{ color: '#8b949e' }}>{repo.language}</span>
                                  </div>
                                )}
                                {repo.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                    style={{ background: '#161b22', color: '#60a5fa', border: '1px solid #21262d' }}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>

                              {/* Stars + growth + share */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5" fill="#e3b341" style={{ color: '#e3b341' }} />
                                  <span className="text-xs font-medium tabular-nums" style={{ color: '#e6edf3' }}>
                                    {fmtStars(repo.stars)}
                                  </span>
                                </div>

                                {!!repo.starsToday && repo.starsToday > 0 && (
                                  <span
                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }}
                                  >
                                    +{repo.starsToday.toLocaleString()} today
                                  </span>
                                )}
                                {(!repo.starsToday || repo.starsToday === 0) && !!repo.starsThisWeek && repo.starsThisWeek > 0 && (
                                  <span
                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }}
                                  >
                                    +{repo.starsThisWeek.toLocaleString()} this week
                                  </span>
                                )}

                                <button
                                  onClick={async (e) => { e.stopPropagation(); await shareService.shareRepositoryWithPlatformLink(repo); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                                  style={{ color: '#6b7280' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#e6edf3')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                                  title="Share"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={repo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                                  style={{ color: '#6b7280' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#e6edf3')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                                  title="View on GitHub"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>

                            {/* Forks + health status sub-row */}
                            {(repo.forks > 0 || repo.healthStatus) && (
                              <div className="flex items-center gap-3 mt-1.5">
                                {repo.forks > 0 && (
                                  <div className="flex items-center gap-1" style={{ color: '#6b7280' }}>
                                    <GitFork className="w-3 h-3" />
                                    <span className="text-[11px] tabular-nums">{fmtStars(repo.forks)}</span>
                                  </div>
                                )}
                                {repo.healthStatus && (
                                  <span className="text-[11px]" style={{ color: '#6b7280' }}>
                                    · {repo.healthStatus}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {getDisplayRepos().length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <p className="text-sm" style={{ color: '#6b7280' }}>No repos found for this category.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

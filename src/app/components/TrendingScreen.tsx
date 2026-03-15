import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Plus, MessageCircle, ChevronUp } from 'lucide-react';
import { TrendingRepo } from '@/lib/types';
import { githubService } from '@/services/github.service';
import { categoryService, RepoCategory } from '@/services/category.service';
import { shareService } from '@/services/share.service';
import { trendingCommunityService, VoteCounts } from '@/services/trending-community.service';
import { CommentsPanel } from './CommentsPanel';
import { SubmitRepoModal } from './SubmitRepoModal';

// ── Language colours (GitHub palette) ────────────────────────────────────
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

// ── Category metadata ─────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { icon: JSX.Element; label: string }> = {
  'all':                      { icon: <IconAll />,        label: 'All' },
  'repos-all-should-know':    { icon: <IconPin />,        label: 'Must-Know' },
  'ai-automation':            { icon: <IconBrain />,      label: 'AI & ML' },
  'open-source-alternatives': { icon: <IconOpenSource />, label: 'OSS Alts' },
  'frontend':                 { icon: <IconFrontend />,   label: 'Frontend' },
  'backend':                  { icon: <IconBackend />,    label: 'Backend' },
  'mobile':                   { icon: <IconMobile />,     label: 'Mobile' },
  'desktop':                  { icon: <IconDesktop />,    label: 'Desktop' },
  'data-science':             { icon: <IconData />,       label: 'Data' },
  'devops':                   { icon: <IconDevOps />,     label: 'DevOps' },
  'ai':                       { icon: <IconAI />,         label: 'AI' },
  'game-dev':                 { icon: <IconGame />,       label: 'Games' },
  'generic':                  { icon: <IconOther />,      label: 'Other' },
};

// ── Apple-style minimal SVG icons ─────────────────────────────────────────

function IconAll() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>
      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
      <circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
function IconBrain() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 017 4.5v15A2.5 2.5 0 009.5 22h5a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0014.5 2h-5z"/>
      <path d="M7 8H4a2 2 0 000 4h3M7 14H5a2 2 0 000 4h2M17 8h3a2 2 0 010 4h-3M17 14h2a2 2 0 010 4h-2"/>
    </svg>
  );
}
function IconOpenSource() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 12l2.5 2.5L16 9"/>
    </svg>
  );
}
function IconFrontend() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      <path d="M8 10l3 3-3 3"/>
    </svg>
  );
}
function IconBackend() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
      <circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="18" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconMobile() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="3"/>
      <circle cx="12" cy="17" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconDesktop() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  );
}
function IconData() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/>
    </svg>
  );
}
function IconDevOps() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  );
}
function IconAI() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 014 4v1h1a3 3 0 010 6h-1v1a4 4 0 01-8 0v-1H7a3 3 0 010-6h1V6a4 4 0 014-4z"/>
    </svg>
  );
}
function IconGame() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="4"/>
      <path d="M6 12h4M8 10v4M15 11h2M15 13h2"/>
    </svg>
  );
}
function IconOther() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4M12 16h.01"/>
    </svg>
  );
}
function IconShare({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v13M8 6l4-4 4 4"/>
      <path d="M4 14v5a1 1 0 001 1h14a1 1 0 001-1v-5"/>
    </svg>
  );
}
function IconExternal({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}
function IconStar({ size = 13, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#e3b341' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconFork({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/>
      <path d="M6 8.5v2A5.5 5.5 0 0012 16v0a5.5 5.5 0 006-5.5V8.5"/>
    </svg>
  );
}
function IconTrendingUp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}

// ── Health grade colour ───────────────────────────────────────────────────
function gradeStyle(g: string) {
  if (g === 'A+' || g === 'A')  return { bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(74,222,128,0.3)' };
  if (g === 'B+' || g === 'B')  return { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(96,165,250,0.3)' };
  if (g === 'C+' || g === 'C')  return { bg: 'rgba(234,179,8,0.12)',  text: '#facc15', border: 'rgba(250,204,21,0.3)' };
  return                               { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(248,113,113,0.3)' };
}

function fmtNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Rank badge colours ────────────────────────────────────────────────────
function rankStyle(i: number) {
  if (i === 0) return { bg: '#2563eb', color: '#fff', border: 'none', shadow: '0 0 14px rgba(37,99,235,0.45)' };
  if (i === 1) return { bg: '#1a2744', color: '#93c5fd', border: '1px solid #1e2a3a', shadow: undefined };
  if (i === 2) return { bg: '#141d2e', color: '#6b93c4', border: '1px solid #1e2a3a', shadow: undefined };
  return { bg: '#111827', color: '#374151', border: '1px solid #1c2433', shadow: undefined };
}

// ─────────────────────────────────────────────────────────────────────────
export function TrendingScreen() {
  const [timeRange, setTimeRange]           = useState<'today' | 'week'>('today');
  const [selectedCategory, setSelectedCategory] = useState<RepoCategory | 'all'>('all');
  const [categorizedRepos, setCategorizedRepos] = useState<Map<RepoCategory, TrendingRepo[]>>(new Map());
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  // Community state
  const [voteCounts, setVoteCounts]         = useState<Map<string, VoteCounts>>(new Map());
  const [userVotes, setUserVotes]           = useState<Map<string, 1 | -1>>(new Map());
  const [commentCounts, setCommentCounts]   = useState<Map<string, number>>(new Map());
  const [currentUserId, setCurrentUserId]   = useState('');

  // Panel/modal state
  const [commentsRepo, setCommentsRepo]     = useState<TrendingRepo | null>(null);
  const [showSubmit, setShowSubmit]         = useState(false);

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

  useEffect(() => {
    if (categorizedRepos.size === 0) return;
    loadCommunityData();
  }, [categorizedRepos]);

  const loadCommunityData = async () => {
    const all: TrendingRepo[] = [];
    categorizedRepos.forEach(repos => all.push(...repos));
    const names = [...new Set(all.map(r => r.fullName))];
    if (names.length === 0) return;

    const { userId } = await trendingCommunityService.getCurrentUserInfo();
    setCurrentUserId(userId);

    const [vc, uv, cc] = await Promise.all([
      trendingCommunityService.getVoteCounts(names),
      trendingCommunityService.getUserVotes(userId, names),
      trendingCommunityService.getCommentCounts(names),
    ]);
    setVoteCounts(vc);
    setUserVotes(uv);
    setCommentCounts(cc);
  };

  const handleVote = async (repoFullName: string, vote: 1 | -1) => {
    if (!currentUserId) return;

    const prevUserVote  = userVotes.get(repoFullName);
    const prevCounts    = voteCounts.get(repoFullName) ?? { upvotes: 0, downvotes: 0, netScore: 0 };
    const newCounts     = { ...prevCounts };
    let   newUserVote: 1 | -1 | undefined;

    if (prevUserVote === vote) {
      // Toggle off
      newUserVote = undefined;
      if (vote === 1) newCounts.upvotes--; else newCounts.downvotes--;
    } else {
      // Flip or new
      if (prevUserVote !== undefined) {
        if (prevUserVote === 1) newCounts.upvotes--; else newCounts.downvotes--;
      }
      newUserVote = vote;
      if (vote === 1) newCounts.upvotes++; else newCounts.downvotes++;
    }
    newCounts.netScore = newCounts.upvotes - newCounts.downvotes;

    // Optimistic
    setUserVotes(p => { const n = new Map(p); if (newUserVote === undefined) n.delete(repoFullName); else n.set(repoFullName, newUserVote); return n; });
    setVoteCounts(p => { const n = new Map(p); n.set(repoFullName, newCounts); return n; });

    try {
      await trendingCommunityService.castVote(currentUserId, repoFullName, vote);
    } catch {
      // Rollback
      setUserVotes(p => { const n = new Map(p); if (prevUserVote === undefined) n.delete(repoFullName); else n.set(repoFullName, prevUserVote); return n; });
      setVoteCounts(p => { const n = new Map(p); n.set(repoFullName, prevCounts); return n; });
    }
  };

  const sortByVotes = (repos: TrendingRepo[]): TrendingRepo[] =>
    [...repos].sort((a, b) => (voteCounts.get(b.fullName)?.upvotes ?? 0) - (voteCounts.get(a.fullName)?.upvotes ?? 0));

  const categoryOrder: RepoCategory[] = [
    'repos-all-should-know', 'ai-automation', 'open-source-alternatives',
    'frontend', 'backend', 'mobile', 'desktop', 'data-science', 'devops', 'ai', 'game-dev', 'generic',
  ];

  const getDisplayRepos = (): { category: RepoCategory; repos: TrendingRepo[] }[] => {
    if (selectedCategory === 'all') {
      return categoryOrder
        .map(cat => ({ category: cat, repos: sortByVotes(categorizedRepos.get(cat) || []) }))
        .filter(i => i.repos.length > 0);
    }
    const repos = sortByVotes(categorizedRepos.get(selectedCategory) || []);
    return repos.length > 0 ? [{ category: selectedCategory, repos }] : [];
  };

  return (
    <div className="h-full overflow-y-auto pb-24 md:pb-0" style={{ background: '#0d1117' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6">

        {/* ── PAGE HEADER ───────────────────────────────────────────────── */}
        <div className="pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: icon + title */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', color: '#60a5fa' }}
              >
                <IconTrendingUp size={15} />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight" style={{ color: '#e6edf3' }}>Trending</h1>
                <p className="text-[11px] leading-none mt-0.5" style={{ color: '#6b7280' }}>
                  {timeRange === 'today' ? 'Ranked by community votes today' : 'Ranked by community votes this week'}
                </p>
              </div>
            </div>

            {/* Right: submit + time toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowSubmit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: '#161b22', border: '1px solid #21262d', color: '#8b949e' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#60a5fa'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.color = '#8b949e'; }}
              >
                <Plus size={12} strokeWidth={2.5} />
                Submit
              </button>
              <div
                className="flex items-center p-0.5 rounded-lg"
                style={{ background: '#161b22', border: '1px solid #21262d' }}
              >
                {(['today', 'week'] as const).map(range => (
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
          </div>
        </div>

        {/* ── LOADING ──────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#2563eb' }} />
            <p className="text-sm" style={{ color: '#6b7280' }}>Fetching trending repos…</p>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-10 h-10" strokeWidth={1.5} style={{ color: '#f87171' }} />
            <p className="text-sm text-center max-w-xs" style={{ color: '#8b949e' }}>{error}</p>
            <button
              onClick={loadTrendingRepos}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#2563eb', color: '#fff' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── CATEGORY FILTER ──────────────────────────────────────────── */}
        {!loading && !error && (
          <div className="pb-4 -mx-4 md:-mx-6 px-4 md:px-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-1.5 w-max">
              {/* All pill */}
              <button
                onClick={() => setSelectedCategory('all')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                style={selectedCategory === 'all'
                  ? { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' }
                  : { background: '#161b22', color: '#8b949e', border: '1px solid #21262d' }
                }
              >
                <span style={{ opacity: 0.85 }}><IconAll /></span>
                All
              </button>

              {categoryOrder.map(cat => {
                const repos = categorizedRepos.get(cat) || [];
                if (repos.length === 0) return null;
                const isActive = selectedCategory === cat;
                const meta = CATEGORY_META[cat];
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
                    <span style={{ opacity: 0.85 }}>{meta?.icon}</span>
                    {meta?.label ?? cat}
                    <span
                      className="text-[10px] rounded-full px-1.5 py-0.5 leading-none"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.2)' : '#21262d',
                        color: isActive ? '#fff' : '#6b7280',
                      }}
                    >
                      {repos.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REPO LISTS ───────────────────────────────────────────────── */}
        {!loading && !error && (
          <div className="pb-8 space-y-10">
            {getDisplayRepos().map(({ category, repos }) => (
              <div key={category}>

                {/* Category section header */}
                {selectedCategory === 'all' && (
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-lg"
                      style={{ background: 'rgba(37,99,235,0.1)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.15)' }}
                    >
                      {CATEGORY_META[category]?.icon}
                    </div>
                    <h2 className="text-sm font-bold" style={{ color: '#e6edf3' }}>
                      {categoryService.getCategoryName(category)}
                    </h2>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md"
                      style={{ background: '#161b22', color: '#4b5563', border: '1px solid #21262d' }}
                    >
                      {repos.length}
                    </span>
                    <div className="flex-1 h-px" style={{ background: '#161b22' }} />
                  </div>
                )}

                {/* Repo cards */}
                <div className="space-y-2">
                  {repos.map((repo, index) => {
                    const gs           = repo.healthGrade ? gradeStyle(repo.healthGrade) : null;
                    const langColor    = getLangColor(repo.language);
                    const growthCount  = (repo.starsToday  && repo.starsToday  > 0) ? repo.starsToday  : (repo.starsThisWeek ?? 0);
                    const growthLabel  = (repo.starsToday  && repo.starsToday  > 0) ? 'today' : 'this week';
                    const counts       = voteCounts.get(repo.fullName)    ?? { upvotes: 0, downvotes: 0, netScore: 0 };
                    const userVote     = userVotes.get(repo.fullName);
                    const commentCount = commentCounts.get(repo.fullName) ?? 0;
                    const rs           = rankStyle(index);

                    const isUpvoted = userVote === 1;

                    return (
                      <div
                        key={repo.id}
                        className="group rounded-xl transition-all duration-150"
                        style={{ background: '#0d1117', border: '1px solid #21262d' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = '#111827'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.background = '#0d1117'; }}
                      >
                        <div className="p-4 flex gap-3 items-start">

                          {/* ── Rank badge ── */}
                          <div
                            className="flex-shrink-0 flex items-center justify-center font-bold text-xs tabular-nums select-none mt-0.5"
                            style={{
                              width: '26px', height: '26px', borderRadius: '7px',
                              background: rs.bg, color: rs.color,
                              border: rs.border, boxShadow: rs.shadow,
                            }}
                          >
                            {index + 1}
                          </div>

                          {/* ── Owner avatar — PH-style large ── */}
                          <div
                            className="flex-shrink-0 cursor-pointer"
                            onClick={() => window.open(repo.url, '_blank')}
                          >
                            {repo.owner?.avatarUrl ? (
                              <img
                                src={repo.owner.avatarUrl}
                                alt={repo.owner.login}
                                className="rounded-xl"
                                style={{ width: '46px', height: '46px', border: '1px solid #21262d' }}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className="rounded-xl flex items-center justify-center font-bold text-base"
                                style={{ width: '46px', height: '46px', background: '#161b22', color: '#6b7280', border: '1px solid #21262d' }}
                              >
                                {(repo.owner?.login || repo.name || '?')[0].toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* ── Main content ── */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => window.open(repo.url, '_blank')}
                          >
                            {/* Repo name */}
                            <h3
                              className="font-semibold text-sm leading-tight font-mono truncate mb-1"
                              style={{ color: '#e6edf3' }}
                              title={repo.fullName}
                            >
                              {repo.fullName}
                            </h3>

                            {/* Description */}
                            <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: '#6b7280' }}>
                              {repo.description || 'No description provided.'}
                            </p>

                            {/* Language + tags */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                              {repo.language && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: langColor }} />
                                  <span className="text-[11px]" style={{ color: '#6b7280' }}>{repo.language}</span>
                                </div>
                              )}
                              {repo.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
                                  style={{
                                    background: 'rgba(37,99,235,0.07)',
                                    color: '#60a5fa',
                                    border: '1px solid rgba(37,99,235,0.12)',
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <IconStar size={12} filled />
                                <span className="text-[11px] font-semibold tabular-nums" style={{ color: '#e3b341' }}>
                                  {fmtNum(repo.stars)}
                                </span>
                              </div>
                              {repo.forks > 0 && (
                                <div className="flex items-center gap-1" style={{ color: '#4b5563' }}>
                                  <IconFork size={10} />
                                  <span className="text-[11px] tabular-nums">{fmtNum(repo.forks)}</span>
                                </div>
                              )}
                              {growthCount > 0 && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
                                  style={{ background: 'rgba(37,99,235,0.1)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.18)' }}
                                >
                                  +{growthCount.toLocaleString()} {growthLabel}
                                </span>
                              )}
                              {gs && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: gs.bg, color: gs.text, border: `1px solid ${gs.border}` }}
                                >
                                  {repo.healthGrade}
                                </span>
                              )}
                              {/* Hover action icons */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={async e => { e.stopPropagation(); await shareService.shareRepositoryWithPlatformLink(repo); }}
                                  className="p-1 rounded-lg"
                                  style={{ color: '#4b5563' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#e6edf3')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                                  title="Share"
                                >
                                  <IconShare size={12} />
                                </button>
                                <a
                                  href={repo.url} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 rounded-lg"
                                  style={{ color: '#4b5563' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#e6edf3')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                                  title="Open on GitHub"
                                >
                                  <IconExternal size={12} />
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* ── Community actions ── */}
                          <div className="flex-shrink-0 flex items-start gap-1.5 ml-1">

                            {/* Comment button */}
                            <button
                              onClick={e => { e.stopPropagation(); setCommentsRepo(repo); }}
                              className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all"
                              style={{
                                border: '1px solid #21262d',
                                background: 'transparent',
                                color: commentCount > 0 ? '#6b7280' : '#374151',
                                minWidth: '40px',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#30363d';
                                e.currentTarget.style.color = '#8b949e';
                                e.currentTarget.style.background = '#161b22';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#21262d';
                                e.currentTarget.style.color = commentCount > 0 ? '#6b7280' : '#374151';
                                e.currentTarget.style.background = 'transparent';
                              }}
                              title="Discussion"
                            >
                              <MessageCircle size={14} strokeWidth={1.4} />
                              <span className="text-[10px] font-semibold tabular-nums leading-none">{commentCount}</span>
                            </button>

                            {/* Upvote button — Product Hunt style */}
                            <button
                              onClick={e => { e.stopPropagation(); handleVote(repo.fullName, 1); }}
                              className="flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-xl transition-all"
                              style={{
                                border: `1px solid ${isUpvoted ? 'rgba(255,97,84,0.6)' : '#21262d'}`,
                                background: isUpvoted ? 'rgba(255,97,84,0.1)' : 'transparent',
                                color: isUpvoted ? '#FF6154' : '#4b5563',
                                minWidth: '48px',
              }}
                              onMouseEnter={e => {
                                if (!isUpvoted) {
                                  e.currentTarget.style.borderColor = '#FF6154';
                                  e.currentTarget.style.color = '#FF6154';
                                  e.currentTarget.style.background = 'rgba(255,97,84,0.06)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isUpvoted) {
                                  e.currentTarget.style.borderColor = '#21262d';
                                  e.currentTarget.style.color = '#4b5563';
                                  e.currentTarget.style.background = 'transparent';
                                }
                              }}
                              title="Upvote"
                            >
                              <ChevronUp size={15} strokeWidth={2.5} />
                              <span className="text-[11px] font-bold tabular-nums leading-none">
                                {counts.upvotes}
                              </span>
                            </button>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {getDisplayRepos().length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <p className="text-sm" style={{ color: '#6b7280' }}>No repos found for this category.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Comments panel ─────────────────────────────────────────────── */}
      {commentsRepo && (
        <CommentsPanel
          repoFullName={commentsRepo.fullName}
          onClose={() => setCommentsRepo(null)}
          onCountChange={count => {
            setCommentCounts(prev => {
              const n = new Map(prev);
              n.set(commentsRepo.fullName, count);
              return n;
            });
          }}
        />
      )}

      {/* ── Submit modal ───────────────────────────────────────────────── */}
      {showSubmit && <SubmitRepoModal onClose={() => setShowSubmit(false)} />}
    </div>
  );
}

/**
 * Profile Screen Component
 * Shows user preferences and allows editing
 * Changes sync to Supabase and optimize recommendations
 */

import { useState, useEffect, useCallback } from 'react';
import { Edit2, Save, ArrowLeft, RefreshCw, Star, ExternalLink, Search } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { UserPreferences } from '@/lib/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { repoPoolService } from '@/services/repo-pool.service';
import { useGitHubAuth } from '@/hooks/useGitHubAuth';
import { StarredRepo } from '@/services/github-auth.service';
import { formatTimeAgo } from '@/utils/date.utils';

interface ProfileScreenProps {
  onClose: () => void;
}

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'R', 'Scala', 'Elixir'
];

const FRAMEWORKS = [
  'React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte',
  'Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Laravel',
  'Flutter', 'React Native', 'Ionic', 'Electron',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy'
];

const USE_CASES = [
  { id: 'learning-new-tech',  label: 'Learning New Technology',     icon: '📚' },
  { id: 'building-project',   label: 'Building a Project',          icon: '🛠️' },
  { id: 'contributing',       label: 'Contributing to Open Source', icon: '🤝' },
  { id: 'finding-solutions',  label: 'Finding Solutions',           icon: '💡' },
  { id: 'exploring',          label: 'Exploring & Research',        icon: '🔍' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner',     label: 'Beginner',     icon: '🌱' },
  { id: 'intermediate', label: 'Intermediate', icon: '🚀' },
  { id: 'advanced',     label: 'Advanced',     icon: '⭐' },
];

const DOMAINS = [
  { id: 'web-frontend', label: 'Web Frontend',     icon: '🌐' },
  { id: 'web-backend',  label: 'Web Backend',      icon: '⚙️' },
  { id: 'mobile',       label: 'Mobile',           icon: '📱' },
  { id: 'desktop',      label: 'Desktop',          icon: '💻' },
  { id: 'data-science', label: 'Data Science',     icon: '📊' },
  { id: 'devops',       label: 'DevOps',           icon: '🔧' },
  { id: 'game-dev',     label: 'Game Development', icon: '🎮' },
  { id: 'ai-ml',        label: 'AI / ML',          icon: '🤖' },
];

const PROJECT_TYPES = [
  { id: 'tutorial',    label: 'Tutorials & Courses',    icon: '📖' },
  { id: 'boilerplate', label: 'Starter Templates',      icon: '⚡' },
  { id: 'library',     label: 'Libraries & Packages',   icon: '📦' },
  { id: 'framework',   label: 'Frameworks',             icon: '🏗️' },
  { id: 'full-app',    label: 'Complete Applications',  icon: '💻' },
  { id: 'tool',        label: 'Tools & Utilities',      icon: '🔧' },
];

// ─── Color palettes ──────────────────────────────────────────────────────────

type ChipColor = { bg: string; text: string; border: string };

const LANG_COLORS: Record<string, ChipColor> = {
  JavaScript:     { bg: 'rgba(234,179,8,0.15)',   text: '#eab308', border: 'rgba(234,179,8,0.3)'   },
  TypeScript:     { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  Python:         { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  Java:           { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
  Go:             { bg: 'rgba(6,214,160,0.15)',   text: '#34d399', border: 'rgba(6,214,160,0.3)'   },
  Rust:           { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
  'C++':          { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
  'C#':           { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
  PHP:            { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
  Ruby:           { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)'   },
  Swift:          { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
  Kotlin:         { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
  Dart:           { bg: 'rgba(6,182,212,0.15)',   text: '#22d3ee', border: 'rgba(6,182,212,0.3)'   },
  R:              { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  Scala:          { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)'   },
  Elixir:         { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
  React:          { bg: 'rgba(6,182,212,0.15)',   text: '#22d3ee', border: 'rgba(6,182,212,0.3)'   },
  'React Native': { bg: 'rgba(6,182,212,0.15)',   text: '#22d3ee', border: 'rgba(6,182,212,0.3)'   },
  'Next.js':      { bg: 'rgba(255,255,255,0.08)', text: '#e2e8f0', border: 'rgba(255,255,255,0.15)'},
  Vue:            { bg: 'rgba(52,211,153,0.15)',  text: '#34d399', border: 'rgba(52,211,153,0.3)'  },
  Angular:        { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)'   },
  Nuxt:           { bg: 'rgba(52,211,153,0.15)',  text: '#34d399', border: 'rgba(52,211,153,0.3)'  },
  Svelte:         { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
  Express:        { bg: 'rgba(255,255,255,0.08)', text: '#e2e8f0', border: 'rgba(255,255,255,0.15)'},
  FastAPI:        { bg: 'rgba(52,211,153,0.15)',  text: '#34d399', border: 'rgba(52,211,153,0.3)'  },
  Django:         { bg: 'rgba(52,211,153,0.15)',  text: '#34d399', border: 'rgba(52,211,153,0.3)'  },
  Flask:          { bg: 'rgba(255,255,255,0.08)', text: '#e2e8f0', border: 'rgba(255,255,255,0.15)'},
  Spring:         { bg: 'rgba(52,211,153,0.15)',  text: '#34d399', border: 'rgba(52,211,153,0.3)'  },
  Laravel:        { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
  Flutter:        { bg: 'rgba(6,182,212,0.15)',   text: '#22d3ee', border: 'rgba(6,182,212,0.3)'   },
  Ionic:          { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  Electron:       { bg: 'rgba(6,182,212,0.15)',   text: '#22d3ee', border: 'rgba(6,182,212,0.3)'   },
  TensorFlow:     { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
  PyTorch:        { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)'   },
  Pandas:         { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
  NumPy:          { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
};

const GOAL_COLORS: Record<string, ChipColor> = {
  'learning-new-tech': { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  'building-project':  { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
  'contributing':      { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80', border: 'rgba(34,197,94,0.3)'   },
  'finding-solutions': { bg: 'rgba(234,179,8,0.15)',   text: '#facc15', border: 'rgba(234,179,8,0.3)'   },
  'exploring':         { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
};

const DOMAIN_COLORS: Record<string, ChipColor> = {
  'web-frontend': { bg: 'rgba(6,182,212,0.15)',  text: '#22d3ee', border: 'rgba(6,182,212,0.3)'  },
  'web-backend':  { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  'mobile':       { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  'desktop':      { bg: 'rgba(99,102,241,0.15)', text: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  'data-science': { bg: 'rgba(52,211,153,0.15)', text: '#34d399', border: 'rgba(52,211,153,0.3)' },
  'devops':       { bg: 'rgba(249,115,22,0.15)', text: '#fb923c', border: 'rgba(249,115,22,0.3)' },
  'game-dev':     { bg: 'rgba(244,63,94,0.15)',  text: '#fb7185', border: 'rgba(244,63,94,0.3)'  },
  'ai-ml':        { bg: 'rgba(167,139,250,0.15)',text: '#c4b5fd', border: 'rgba(167,139,250,0.3)'},
};

const PROJ_COLORS: Record<string, ChipColor> = {
  'tutorial':    { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  'boilerplate': { bg: 'rgba(234,179,8,0.15)',   text: '#facc15', border: 'rgba(234,179,8,0.3)'   },
  'library':     { bg: 'rgba(52,211,153,0.15)',  text: '#34d399', border: 'rgba(52,211,153,0.3)'  },
  'framework':   { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
  'full-app':    { bg: 'rgba(6,182,212,0.15)',   text: '#22d3ee', border: 'rgba(6,182,212,0.3)'   },
  'tool':        { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
};

const EXP_COLORS: Record<string, ChipColor> = {
  beginner:     { bg: 'rgba(34,197,94,0.15)',  text: '#4ade80', border: 'rgba(34,197,94,0.3)'  },
  intermediate: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  advanced:     { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
};

const DEFAULT_CHIP: ChipColor = { bg: 'rgba(31,41,55,0.8)', text: '#9ca3af', border: 'rgba(75,85,99,0.4)' };

function chipColor(map: Record<string, ChipColor>, key: string): ChipColor {
  return map[key] ?? DEFAULT_CHIP;
}

// ─── Reusable colored chip ───────────────────────────────────────────────────
function ColorChip({ label, color }: { label: string; color: ChipColor }) {
  return (
    <span
      className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-default"
      style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}
    >
      {label}
    </span>
  );
}

// ─── Colored selectable button (edit mode) ───────────────────────────────────
function SelectChip({
  label,
  selected,
  color,
  onClick,
}: {
  label: string;
  selected: boolean;
  color: ChipColor;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
      style={
        selected
          ? { background: color.bg, color: color.text, border: `1.5px solid ${color.border}`, boxShadow: `0 0 0 1px ${color.border}` }
          : { background: '#161b22', color: '#8b949e', border: '1px solid #30363d' }
      }
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = color.bg;
          e.currentTarget.style.color = color.text;
          e.currentTarget.style.border = `1px solid ${color.border}`;
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = '#161b22';
          e.currentTarget.style.color = '#8b949e';
          e.currentTarget.style.border = '1px solid #30363d';
        }
      }}
    >
      {label}
    </button>
  );
}

// ─── Language colour dot ─────────────────────────────────────────────────────
const LANG_DOT: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', 'C++': '#f34b7d',
  'C#': '#178600', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', Dart: '#00B4AB', Scala: '#c22d40', Shell: '#89e051',
  CSS: '#563d7c', HTML: '#e34c26', Vue: '#41b883', Svelte: '#ff3e00',
};

// ─── GitHub Connection Card ───────────────────────────────────────────────────
function GitHubSection() {
  const { connection, loading, syncing, syncProgress, error, connect, disconnect, sync, getStarredRepos } = useGitHubAuth();
  const [starredRepos, setStarredRepos] = useState<StarredRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Load starred repos when connection is present
  const loadStarred = useCallback(async () => {
    if (!connection) return;
    setReposLoading(true);
    const repos = await getStarredRepos(30, 0);
    setStarredRepos(repos);
    setReposLoading(false);
  }, [connection, getStarredRepos]);

  useEffect(() => { loadStarred(); }, [loadStarred]);

  const filteredRepos = searchQuery.trim()
    ? starredRepos.filter(r =>
        r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.language ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : starredRepos;

  const fmtCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const dotColor = (lang: string | null) => lang ? (LANG_DOT[lang] ?? '#8b949e') : '#8b949e';

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!loading && !connection) {
    return (
      <div
        className="p-5 mb-4 rounded-2xl"
        style={{ background: '#161b22', border: '1px solid #30363d' }}
      >
        {/* Header row */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#0d1117', border: '1px solid #30363d' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" style={{ color: '#e6edf3' }}>
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#e6edf3' }}>Connect GitHub Account</p>
            <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>Sync your starred repos and improve recommendations</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-2 mb-4">
          {[
            {
              icon: (
                <svg viewBox="0 0 16 16" fill="#e3b341" width="14" height="14">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 11.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.873 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                </svg>
              ),
              bg: 'rgba(227,179,65,0.1)',
              text: 'Sync all your GitHub starred repos',
            },
            {
              icon: (
                <svg viewBox="0 0 16 16" fill="#60a5fa" width="14" height="14">
                  <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                </svg>
              ),
              bg: 'rgba(96,165,250,0.1)',
              text: 'Browse your stars right here in the app',
            },
            {
              icon: (
                <svg viewBox="0 0 16 16" fill="#a78bfa" width="14" height="14">
                  <path d="M9.504.43a1.516 1.516 0 0 1 2.437 1.713L10.415 5.5h2.123c1.57 0 2.346 1.909 1.22 3.004l-7.34 7.142a1.249 1.249 0 0 1-.871.354h-.302a1.25 1.25 0 0 1-1.157-1.723L5.633 10.5H3.462c-1.57 0-2.346-1.909-1.22-3.004Z" />
                </svg>
              ),
              bg: 'rgba(167,139,250,0.1)',
              text: 'AI uses your stars to improve discover recommendations',
            },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2.5">
              <div
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: item.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <span className="text-xs" style={{ color: '#8b949e' }}>{item.text}</span>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        <button
          onClick={connect}
          className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: '#238636', color: '#fff', border: '1px solid #2ea043' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2ea043'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#238636'; }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          Connect with GitHub
        </button>
      </div>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-5 mb-4 rounded-2xl animate-pulse" style={{ background: '#161b22', border: '1px solid #30363d', height: 80 }} />
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  if (!connection) return null;

  const syncPercent = syncProgress && syncProgress.total > 0
    ? Math.round((syncProgress.synced / syncProgress.total) * 100)
    : null;

  return (
    <div className="mb-4">
      {/* Connection card */}
      <div
        className="p-5 rounded-2xl mb-3"
        style={{ background: '#161b22', border: '1px solid #30363d' }}
      >
        {/* Profile row */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={connection.githubAvatarUrl}
            alt={connection.githubLogin}
            className="w-12 h-12 rounded-full flex-shrink-0"
            style={{ border: '2px solid #30363d' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate" style={{ color: '#e6edf3' }}>
                {connection.githubName ?? connection.githubLogin}
              </p>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                Connected
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>@{connection.githubLogin}</p>
          </div>
          {/* Disconnect */}
          <button
            onClick={() => setShowDisconnectConfirm(true)}
            className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-all"
            style={{ color: '#8b949e', background: '#0d1117', border: '1px solid #30363d' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8b949e'; }}
          >
            Disconnect
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" style={{ color: '#e3b341' }} />
            <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>{fmtCount(connection.starredReposCount)}</span>
            <span className="text-xs" style={{ color: '#8b949e' }}>starred repos</span>
          </div>
          {connection.lastSyncedAt && (
            <span className="text-xs" style={{ color: '#8b949e' }}>
              Synced {formatTimeAgo(connection.lastSyncedAt)}
            </span>
          )}
        </div>

        {/* Sync progress */}
        {syncing && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: '#8b949e' }}>
                Syncing {syncProgress?.synced ?? 0}{syncProgress?.total ? ` / ${syncProgress.total}` : ''} repos…
              </span>
              {syncPercent !== null && (
                <span className="text-xs" style={{ color: '#60a5fa' }}>{syncPercent}%</span>
              )}
            </div>
            <div style={{ height: 3, background: '#21262d', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 999,
                  background: '#2563eb',
                  width: syncPercent !== null ? `${syncPercent}%` : '40%',
                  transition: 'width 0.3s ease',
                  animation: syncPercent === null ? 'ghpulse 1.4s ease-in-out infinite' : undefined,
                }}
              />
            </div>
          </div>
        )}

        {/* Re-sync button */}
        {!syncing && (
          <button
            onClick={async () => { await sync(); await loadStarred(); }}
            className="w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={{ background: '#0d1117', color: '#8b949e', border: '1px solid #30363d' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#e6edf3'; el.style.borderColor = '#484f58'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#8b949e'; el.style.borderColor = '#30363d'; }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-sync starred repos
          </button>
        )}

        {error && (
          <p className="text-xs mt-2 px-3 py-1.5 rounded-lg" style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}
      </div>

      {/* Disconnect confirm modal */}
      {showDisconnectConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <p className="font-semibold mb-2" style={{ color: '#e6edf3' }}>Disconnect GitHub?</p>
            <p className="text-sm mb-5" style={{ color: '#8b949e' }}>
              This will remove your GitHub connection and delete all synced starred repos from our servers.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => { await disconnect(); setShowDisconnectConfirm(false); setStarredRepos([]); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Starred Repos ───────────────────────────────────────────── */}
      {connection.starredReposCount > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#161b22', border: '1px solid #30363d' }}
        >
          {/* Starred repos header */}
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid #21262d' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" style={{ color: '#e3b341' }} />
                <span className="font-semibold text-sm" style={{ color: '#e6edf3' }}>
                  Starred Repos
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: '#21262d', color: '#8b949e' }}
                >
                  {fmtCount(connection.starredReposCount)}
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#8b949e' }} />
              <input
                type="text"
                placeholder="Search your stars…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
                style={{
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  color: '#e6edf3',
                }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = '#30363d'; }}
              />
            </div>
          </div>

          {/* Repos list */}
          <div className="divide-y" style={{ borderColor: '#21262d' }}>
            {reposLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: '#21262d' }} />
                    <div className="flex-1">
                      <div className="h-3.5 rounded w-2/5 mb-2" style={{ background: '#21262d' }} />
                      <div className="h-3 rounded w-3/5" style={{ background: '#21262d' }} />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredRepos.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm" style={{ color: '#8b949e' }}>
                  {searchQuery ? 'No results for your search' : 'No starred repos yet'}
                </p>
              </div>
            ) : (
              filteredRepos.map(repo => (
                <a
                  key={repo.id}
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 px-5 py-4 group transition-colors"
                  style={{ textDecoration: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1c2128'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* Avatar */}
                  <img
                    src={repo.ownerAvatarUrl}
                    alt={repo.ownerLogin}
                    className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                    style={{ border: '1px solid #30363d' }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: '#58a6ff', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {repo.fullName}
                      </span>
                      <ExternalLink
                        className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#8b949e' }}
                      />
                    </div>
                    {repo.description && (
                      <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: '#8b949e' }}>
                        {repo.description}
                      </p>
                    )}
                    {/* Meta row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3" style={{ color: '#e3b341' }} />
                        <span className="text-xs" style={{ color: '#8b949e' }}>{fmtCount(repo.stars)}</span>
                      </div>
                      {repo.language && (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: dotColor(repo.language) }}
                          />
                          <span className="text-xs" style={{ color: '#8b949e' }}>{repo.language}</span>
                        </div>
                      )}
                      <span className="text-xs" style={{ color: '#8b949e' }}>
                        starred {formatTimeAgo(repo.starredAt)}
                      </span>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>

          {/* Show more hint */}
          {!searchQuery && connection.starredReposCount > 30 && (
            <div className="px-5 py-3" style={{ borderTop: '1px solid #21262d' }}>
              <p className="text-xs text-center" style={{ color: '#8b949e' }}>
                Showing 30 of {fmtCount(connection.starredReposCount)} — use search to find more
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes ghpulse {
          0%   { width: 10%; } 50%  { width: 70%; } 100% { width: 10%; }
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function ProfileScreen({ onClose }: ProfileScreenProps) {
  const { preferences, updatePreferences, loaded } = useUserPreferences();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrefs, setEditedPrefs] = useState<Partial<UserPreferences>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (loaded && preferences) {
      setEditedPrefs(preferences);
    }
  }, [loaded, preferences]);

  const toggleSelection = (array: string[], value: string) =>
    array.includes(value) ? array.filter(v => v !== value) : [...array, value];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences(editedPrefs);
      await repoPoolService.clearPool();
      await repoPoolService.buildPool(editedPrefs as UserPreferences);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedPrefs(preferences);
    setIsEditing(false);
  };

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div style={{ color: '#8b949e' }}>Loading...</div>
      </div>
    );
  }

  const initials = (preferences.name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="h-full p-4 md:p-6 overflow-y-auto pb-24 md:pb-0" style={{ background: '#0d1117' }}>
      <div className="max-w-4xl mx-auto">

        {/* ── Avatar ──────────────────────────────────────────────── */}
        <div className="flex flex-col items-center py-8 mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-xl"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: '#fff', border: '2px solid #2563eb' }}
          >
            {initials}
          </div>
          {preferences.name && (
            <p className="text-lg font-semibold" style={{ color: '#e6edf3' }}>{preferences.name}</p>
          )}
          <p className="text-sm mt-0.5" style={{ color: '#8b949e' }}>RepoVerse explorer</p>
        </div>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={onClose} style={{ color: '#8b949e' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e6edf3'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b949e'; }}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl" style={{ fontWeight: 700, color: '#e6edf3' }}>Your Profile</h1>
          </div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
              style={{ backgroundColor: '#1C1C1E', color: '#F5F5F7', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Edit2 className="w-4 h-4" />Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleCancel}
                className="px-4 py-2 rounded-full"
                style={{ backgroundColor: '#1C1C1E', color: '#F5F5F7', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {showSuccess && (
          <div className="mb-4 p-4 bg-gray-800 border border-gray-600 text-gray-200 rounded-lg">
            Preferences updated. Recommendations will be optimized.
          </div>
        )}

        {/* ── GitHub Connection ─────────────────────────────────── */}
        <GitHubSection />

        {/* ── Experience Level ──────────────────────────────────── */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <h2 className="text-xl text-white mb-4" style={{ fontWeight: 700 }}>Experience Level</h2>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map(level => (
                <SelectChip
                  key={level.id}
                  label={level.label}
                  selected={editedPrefs.experienceLevel === level.id}
                  color={chipColor(EXP_COLORS, level.id)}
                  onClick={() => setEditedPrefs({ ...editedPrefs, experienceLevel: level.id as any })}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.experienceLevel ? (
                <ColorChip
                  label={EXPERIENCE_LEVELS.find(l => l.id === preferences.experienceLevel)?.label ?? preferences.experienceLevel}
                  color={chipColor(EXP_COLORS, preferences.experienceLevel)}
                />
              ) : (
                <span className="text-sm" style={{ color: '#8b949e' }}>Not set</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* ── Programming Languages ─────────────────────────────── */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>Programming Languages</h2>
            {isEditing && (
              <button onClick={() => setEditedPrefs({ ...editedPrefs, techStack: (editedPrefs.techStack || []).filter(t => !LANGUAGES.includes(t)) })}
                className="text-xs" style={{ color: '#8b949e' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#e6edf3'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#8b949e'; }}
              >
                Clear all
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <SelectChip
                  key={lang}
                  label={lang}
                  selected={(editedPrefs.techStack || []).includes(lang)}
                  color={chipColor(LANG_COLORS, lang)}
                  onClick={() => setEditedPrefs({ ...editedPrefs, techStack: toggleSelection(editedPrefs.techStack || [], lang) })}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.techStack?.filter(l => LANGUAGES.includes(l)).map(lang => (
                <ColorChip key={lang} label={lang} color={chipColor(LANG_COLORS, lang)} />
              ))}
              {(!preferences.techStack || !preferences.techStack.some(l => LANGUAGES.includes(l))) && (
                <span className="text-sm" style={{ color: '#8b949e' }}>No languages selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* ── Frameworks & Libraries ────────────────────────────── */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <h2 className="text-xl text-white mb-4" style={{ fontWeight: 700 }}>Frameworks & Libraries</h2>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {FRAMEWORKS.map(fw => (
                <SelectChip
                  key={fw}
                  label={fw}
                  selected={(editedPrefs.techStack || []).includes(fw)}
                  color={chipColor(LANG_COLORS, fw)}
                  onClick={() => setEditedPrefs({ ...editedPrefs, techStack: toggleSelection(editedPrefs.techStack || [], fw) })}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.techStack?.filter(fw => FRAMEWORKS.includes(fw)).map(fw => (
                <ColorChip key={fw} label={fw} color={chipColor(LANG_COLORS, fw)} />
              ))}
              {(!preferences.techStack || !preferences.techStack.some(fw => FRAMEWORKS.includes(fw))) && (
                <span className="text-sm" style={{ color: '#8b949e' }}>No frameworks selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* ── Your Goals ────────────────────────────────────────── */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <h2 className="text-xl text-white mb-4" style={{ fontWeight: 700 }}>Your Goals</h2>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {USE_CASES.map(uc => (
                <SelectChip
                  key={uc.id}
                  label={uc.label}
                  selected={(editedPrefs.goals || []).includes(uc.id)}
                  color={chipColor(GOAL_COLORS, uc.id)}
                  onClick={() => setEditedPrefs({ ...editedPrefs, goals: toggleSelection(editedPrefs.goals || [], uc.id) })}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.goals?.map(goal => {
                const uc = USE_CASES.find(u => u.id === goal);
                return uc ? <ColorChip key={goal} label={uc.label} color={chipColor(GOAL_COLORS, goal)} /> : null;
              })}
              {(!preferences.goals || preferences.goals.length === 0) && (
                <span className="text-sm" style={{ color: '#8b949e' }}>No goals selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* ── Domains / Platforms ───────────────────────────────── */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <h2 className="text-xl text-white mb-4" style={{ fontWeight: 700 }}>Domains / Platforms</h2>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map(d => (
                <SelectChip
                  key={d.id}
                  label={d.label}
                  selected={(editedPrefs.interests || []).includes(d.id)}
                  color={chipColor(DOMAIN_COLORS, d.id)}
                  onClick={() => setEditedPrefs({ ...editedPrefs, interests: toggleSelection(editedPrefs.interests || [], d.id) })}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.interests?.map(interest => {
                const d = DOMAINS.find(x => x.id === interest);
                return d ? <ColorChip key={interest} label={d.label} color={chipColor(DOMAIN_COLORS, interest)} /> : null;
              })}
              {(!preferences.interests || preferences.interests.length === 0) && (
                <span className="text-sm" style={{ color: '#8b949e' }}>No domains selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* ── Project Types ─────────────────────────────────────── */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <h2 className="text-xl text-white mb-4" style={{ fontWeight: 700 }}>Project Types</h2>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {PROJECT_TYPES.map(pt => (
                <SelectChip
                  key={pt.id}
                  label={pt.label}
                  selected={(editedPrefs.projectTypes || []).includes(pt.id)}
                  color={chipColor(PROJ_COLORS, pt.id)}
                  onClick={() => setEditedPrefs({ ...editedPrefs, projectTypes: toggleSelection(editedPrefs.projectTypes || [], pt.id) })}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.projectTypes?.map(type => {
                const pt = PROJECT_TYPES.find(p => p.id === type);
                return pt ? <ColorChip key={type} label={pt.label} color={chipColor(PROJ_COLORS, type)} /> : null;
              })}
              {(!preferences.projectTypes || preferences.projectTypes.length === 0) && (
                <span className="text-sm" style={{ color: '#8b949e' }}>No project types selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* ── Preferences ───────────────────────────────────────── */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <h2 className="text-xl text-white mb-4" style={{ fontWeight: 700 }}>Preferences</h2>
          <div className="space-y-5">

            {/* Repository Activity */}
            <div>
              <label className="block text-sm font-medium mb-2.5" style={{ color: '#8b949e' }}>Repository Activity</label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {(['active', 'stable', 'trending', 'any'] as const).map(opt => (
                    <SelectChip
                      key={opt}
                      label={opt.charAt(0).toUpperCase() + opt.slice(1)}
                      selected={editedPrefs.activityPreference === opt}
                      color={
                        opt === 'active'   ? { bg: 'rgba(34,197,94,0.15)',  text: '#4ade80', border: 'rgba(34,197,94,0.3)'  } :
                        opt === 'trending' ? { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' } :
                        opt === 'stable'   ? { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' } :
                                            { bg: 'rgba(156,163,175,0.15)',text: '#9ca3af', border: 'rgba(156,163,175,0.3)' }
                      }
                      onClick={() => setEditedPrefs({ ...editedPrefs, activityPreference: opt })}
                    />
                  ))}
                </div>
              ) : (
                <ColorChip
                  label={(preferences.activityPreference || 'any').charAt(0).toUpperCase() + (preferences.activityPreference || 'any').slice(1)}
                  color={
                    preferences.activityPreference === 'active'   ? { bg: 'rgba(34,197,94,0.15)',  text: '#4ade80', border: 'rgba(34,197,94,0.3)'  } :
                    preferences.activityPreference === 'trending' ? { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' } :
                    preferences.activityPreference === 'stable'   ? { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' } :
                                                                    { bg: 'rgba(156,163,175,0.15)',text: '#9ca3af', border: 'rgba(156,163,175,0.3)'}
                  }
                />
              )}
            </div>

            {/* Popularity Weight */}
            <div>
              <label className="block text-sm font-medium mb-2.5" style={{ color: '#8b949e' }}>Stars / Forks Importance</label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {(['low', 'medium', 'high'] as const).map(opt => (
                    <SelectChip
                      key={opt}
                      label={opt.charAt(0).toUpperCase() + opt.slice(1)}
                      selected={editedPrefs.popularityWeight === opt}
                      color={
                        opt === 'high'   ? { bg: 'rgba(34,197,94,0.15)',  text: '#4ade80', border: 'rgba(34,197,94,0.3)'  } :
                        opt === 'medium' ? { bg: 'rgba(234,179,8,0.15)',  text: '#facc15', border: 'rgba(234,179,8,0.3)'  } :
                                          { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)'  }
                      }
                      onClick={() => setEditedPrefs({ ...editedPrefs, popularityWeight: opt })}
                    />
                  ))}
                </div>
              ) : (
                <ColorChip
                  label={(preferences.popularityWeight || 'medium').charAt(0).toUpperCase() + (preferences.popularityWeight || 'medium').slice(1)}
                  color={
                    preferences.popularityWeight === 'high' ? { bg: 'rgba(34,197,94,0.15)',  text: '#4ade80', border: 'rgba(34,197,94,0.3)'  } :
                    preferences.popularityWeight === 'low'  ? { bg: 'rgba(239,68,68,0.15)',  text: '#f87171', border: 'rgba(239,68,68,0.3)'  } :
                                                              { bg: 'rgba(234,179,8,0.15)',   text: '#facc15', border: 'rgba(234,179,8,0.3)'  }
                  }
                />
              )}
            </div>

            {/* Documentation Importance */}
            <div>
              <label className="block text-sm font-medium mb-2.5" style={{ color: '#8b949e' }}>Documentation Importance</label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {(['nice-to-have', 'important', 'critical'] as const).map(opt => (
                    <SelectChip
                      key={opt}
                      label={opt.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      selected={editedPrefs.documentationImportance === opt}
                      color={
                        opt === 'critical'     ? { bg: 'rgba(239,68,68,0.15)',  text: '#f87171', border: 'rgba(239,68,68,0.3)'  } :
                        opt === 'important'    ? { bg: 'rgba(234,179,8,0.15)',  text: '#facc15', border: 'rgba(234,179,8,0.3)'  } :
                                                { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80', border: 'rgba(34,197,94,0.3)'  }
                      }
                      onClick={() => setEditedPrefs({ ...editedPrefs, documentationImportance: opt })}
                    />
                  ))}
                </div>
              ) : (
                <ColorChip
                  label={(preferences.documentationImportance || 'important').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  color={
                    preferences.documentationImportance === 'critical'  ? { bg: 'rgba(239,68,68,0.15)',  text: '#f87171', border: 'rgba(239,68,68,0.3)'  } :
                    preferences.documentationImportance === 'important' ? { bg: 'rgba(234,179,8,0.15)',  text: '#facc15', border: 'rgba(234,179,8,0.3)'  } :
                                                                          { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80', border: 'rgba(34,197,94,0.3)'  }
                  }
                />
              )}
            </div>

          </div>
        </SignatureCard>

        {/* ── Upgrade to Pro — ALWAYS LAST ──────────────────────── */}
        <div
          className="p-6 mb-6 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #0f1f3d 0%, #1a2f4a 60%, #0d1117 100%)',
            border: '1px solid rgba(37,99,235,0.25)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)' }}
            >
              ⚡
            </div>
            <div className="flex-1">
              <p className="font-bold text-base mb-1" style={{ color: '#e6edf3' }}>Upgrade to Pro</p>
              <p className="text-sm mb-4" style={{ color: '#8b949e' }}>
                Unlock the full Repoverse experience.
              </p>
              <div className="space-y-2 mb-5">
                {['Unlimited swipes daily', 'Unlimited AI Agent queries', 'Save & organise collections', 'Advanced filters'].map(b => (
                  <div key={b} className="flex items-center gap-2 text-sm" style={{ color: '#c9d1d9' }}>
                    <span style={{ color: '#22c55e' }}>✓</span> {b}
                  </div>
                ))}
              </div>
              <button
                className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={{ background: '#2563eb', color: '#fff' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1d4ed8'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#2563eb'; }}
              >
                Upgrade to Pro — $4.99/month
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

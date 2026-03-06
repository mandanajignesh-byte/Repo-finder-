import { Star, Clock, GitFork, Scale, ExternalLink, Bookmark, Share2, BookOpen } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { Repository } from '@/lib/types';
import { useRef, useState, memo } from 'react';
import { shareService } from '@/services/share.service';
import { githubService } from '@/services/github.service';
import { ReadmeModal } from './ReadmeModal';
import { showToast } from '@/utils/toast';
import { trackShare } from '@/utils/analytics';

// Language → colour mapping (GitHub palette)
const LANG_COLORS: Record<string, string> = {
  JavaScript:   '#f1e05a',
  TypeScript:   '#3178c6',
  Python:       '#3572A5',
  Java:         '#b07219',
  'C++':        '#f34b7d',
  'C#':         '#178600',
  C:            '#555555',
  Go:           '#00ADD8',
  Rust:         '#dea584',
  Ruby:         '#701516',
  PHP:          '#4F5D95',
  Swift:        '#F05138',
  Kotlin:       '#A97BFF',
  Dart:         '#00B4AB',
  Scala:        '#c22d40',
  Shell:        '#89e051',
  HTML:         '#e34c26',
  CSS:          '#563d7c',
  Vue:          '#41b883',
  Svelte:       '#ff3e00',
  Elixir:       '#6e4a7e',
  Haskell:      '#5e5086',
  Clojure:      '#db5855',
  'Jupyter Notebook': '#DA5B0B',
};

function getLangColor(lang: string | undefined): string {
  if (!lang) return '#6b7280';
  return LANG_COLORS[lang] || '#6b7280';
}

interface RepoCardProps {
  repo: Repository;
  style?: React.CSSProperties;
  onSave?: () => void;
  isFirstCard?: boolean;
}

export const RepoCard = memo(function RepoCard({ repo, style, onSave, isFirstCard = false }: RepoCardProps) {
  const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isReadmeOpen, setIsReadmeOpen] = useState(false);
  const [readme, setReadme] = useState<string | null>(null);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState<string | null>(null);

  const langColor = getLangColor(repo.language);

  const openReadme = async (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    setIsReadmeOpen(true);
    if (!readme && !readmeLoading && !readmeError) {
      setReadmeLoading(true);
      setReadmeError(null);
      try {
        const fullName = repo.fullName || repo.name;
        const content = await githubService.getRepoReadme(fullName);
        setReadme(content ?? null);
      } catch (err) {
        console.error('Failed to load README:', err);
        setReadmeError('Unable to load README from GitHub.');
      } finally {
        setReadmeLoading(false);
      }
    }
  };

  return (
    <div className="h-full w-full" style={{ ...style, maxHeight: '100%', height: '100%', overflow: 'visible' }}>
      <SignatureCard
        className="h-full max-h-full flex flex-col relative overflow-hidden"
        style={{ padding: 0 }}
        showLayers={false}
        showParticles={false}
      >
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {repo.owner?.avatarUrl ? (
              <img
                src={repo.owner.avatarUrl}
                alt={repo.owner.login}
                className="w-8 h-8 rounded-full flex-shrink-0 border"
                style={{ borderColor: '#30363d' }}
                width="32"
                height="32"
                loading={isFirstCard ? 'eager' : 'lazy'}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: '#21262d', color: '#8b949e' }}
              >
                {(repo.owner?.login || repo.name || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-mono truncate" style={{ color: '#8b949e' }}>
                {repo.owner?.login || ''}
              </p>
              <h2
                className="text-base md:text-lg font-semibold font-mono leading-tight truncate"
                style={{ color: '#e6edf3' }}
              >
                {repo.fullName?.split('/')[1] || repo.name}
              </h2>
            </div>
          </div>

          {/* Fit score badge */}
          {repo.fitScore && (
            <div
              className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.25)' }}
            >
              {repo.fitScore}% fit
            </div>
          )}
        </div>

        {/* ── DESCRIPTION ────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 pb-3">
          <p
            className="text-sm md:text-base leading-relaxed line-clamp-3"
            style={{ color: '#8b949e' }}
          >
            {repo.description || 'No description provided.'}
          </p>
        </div>

        {/* ── PREVIEW README BUTTON ──────────────────────────────── */}
        <div className="flex-shrink-0 px-5 pb-3">
          <button
            type="button"
            onClick={openReadme}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-1.5 transition-all"
            style={{
              background: 'rgba(139,148,158,0.08)',
              border: '1px solid #30363d',
              color: '#8b949e',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139,148,158,0.15)';
              e.currentTarget.style.color = '#e6edf3';
              e.currentTarget.style.borderColor = '#484f58';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(139,148,158,0.08)';
              e.currentTarget.style.color = '#8b949e';
              e.currentTarget.style.borderColor = '#30363d';
            }}
          >
            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
            Preview README
          </button>
        </div>

        {/* ── TAGS (scrollable) ──────────────────────────────────── */}
        {(repo.tags?.length > 0 || repo.topics?.length > 0) && (() => {
          const existingTags = new Set((repo.tags || []).map((t: string) => t.toLowerCase()));
          const additionalTopics = (repo.topics || []).filter(
            (topic: string) => !existingTags.has(topic.toLowerCase())
          );
          const allTags = [...(repo.tags || []), ...additionalTopics];

          return (
            <div
              className="flex-shrink-0 px-5 pb-3"
              onWheel={(e) => {
                const parent = e.currentTarget.closest('[data-swipeable-card]');
                if (parent) {
                  parent.dispatchEvent(new CustomEvent('disableDrag'));
                  if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
                  scrollEndTimerRef.current = setTimeout(() => {
                    parent?.dispatchEvent(new CustomEvent('enableDrag'));
                    scrollEndTimerRef.current = null;
                  }, 150);
                }
              }}
            >
              <div className="flex flex-wrap gap-1.5">
                {allTags.slice(0, 8).map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-xs font-medium cursor-default transition-colors"
                    style={{ background: '#161b22', color: '#60a5fa', border: '1px solid #21262d' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#1f2937';
                      (e.currentTarget as HTMLElement).style.borderColor = '#2d3f55';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#161b22';
                      (e.currentTarget as HTMLElement).style.borderColor = '#21262d';
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── SPACER ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0" />

        {/* ── FOOTER ─────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-5 pt-3 pb-4 space-y-3"
          style={{ borderTop: '1px solid #21262d' }}
        >
          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5" style={{ color: '#8b949e' }}>
              <Star className="w-4 h-4" style={{ color: '#e3b341' }} fill="#e3b341" />
              <span className="text-sm font-medium tabular-nums">{repo.stars.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: '#8b949e' }}>
              <GitFork className="w-4 h-4" />
              <span className="text-sm tabular-nums">{repo.forks.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: '#8b949e' }}>
              <Clock className="w-4 h-4" />
              <span className="text-sm">{repo.lastUpdated}</span>
            </div>
          </div>

          {/* Meta: license + language */}
          <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: '#6b7280' }}>
            {repo.license && (
              <div className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>{repo.license}</span>
              </div>
            )}
            {repo.language && (
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: langColor }}
                />
                <span style={{ color: '#8b949e' }}>{repo.language}</span>
              </div>
            )}
          </div>

          {/* Action links */}
          <div className="flex items-center gap-4">
            {repo.url && (
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: '#2563eb' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#60a5fa')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#2563eb')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on GitHub
              </a>
            )}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const shared = await shareService.shareRepositoryWithPlatformLink(repo);
                if (shared) {
                  trackShare('native', 'repo', repo.id);
                  showToast('Link copied!');
                } else {
                  trackShare('copy', 'repo', repo.id);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: '#6b7280' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#8b949e')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>

          {/* Save button */}
          {onSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: '#21262d',
                border: '1px solid #30363d',
                color: '#e6edf3',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2d333b';
                e.currentTarget.style.borderColor = '#484f58';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#21262d';
                e.currentTarget.style.borderColor = '#30363d';
              }}
            >
              <Bookmark className="w-4 h-4" />
              Save
            </button>
          )}
        </div>
      </SignatureCard>

      {/* ── README bottom-sheet modal (portal to body) ── */}
      <ReadmeModal
        isOpen={isReadmeOpen}
        onClose={() => setIsReadmeOpen(false)}
        repoFullName={repo.fullName || repo.name}
        repoUrl={repo.url}
        ownerAvatarUrl={repo.owner?.avatarUrl}
        onSave={onSave}
        readme={readme}
        loading={readmeLoading}
        error={readmeError}
      />
    </div>
  );
});

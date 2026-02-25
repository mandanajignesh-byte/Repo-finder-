import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  AlertCircle,
  ExternalLink,
  Star,
  GitFork,
  Users,
  Activity,
  Shield,
  BookOpen,
  Trophy,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { useTypedPlaceholder } from './TypedPlaceholder';
import { smartAgentService, SmartAgentResponse } from '@/services/smart-agent.service';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import {
  AgentMessage,
  ScoredRepository,
  RepoComparison,
  RepoHealthScore,
} from '@/lib/types';

// ── Initial message ──────────────────────────────────────────

const initialMessages: AgentMessage[] = [
  {
    id: '1',
    type: 'text',
    sender: 'agent',
    text: "Hey! I'm your RepoVerse agent — rebuilt from scratch. I can search repos, score their health, compare them side-by-side, and find alternatives. Try asking me anything.",
    actions: [
      'Trending repos today',
      'Compare react vs vue',
      'Health of vercel/next.js',
      'Alternatives to expressjs/express',
    ],
  },
];

// ── Main component ───────────────────────────────────────────

export function AgentScreen() {
  const { preferences } = useUserPreferences();
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useTypedPlaceholder({
    strings: [
      'Search for a React state manager...',
      'Compare prisma/prisma vs drizzle-team/drizzle-orm',
      'Health of tailwindlabs/tailwindcss',
      'Alternatives to expressjs/express',
      'Trending Python repos this week',
      'Best repos for building a SaaS',
      "I'm building a chat app, what should I use?",
    ],
    typeSpeed: 40,
    backSpeed: 25,
    loop: true,
    showCursor: true,
    inputRef,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;

    // Add user message
    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      type: 'text',
      sender: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);

    // Add loading message
    const loadingMsg: AgentMessage = {
      id: `loading-${Date.now()}`,
      type: 'text',
      sender: 'agent',
      text: 'Searching GitHub, calculating health scores...',
      loading: true,
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      const response: SmartAgentResponse = await smartAgentService.processMessage(
        trimmed,
        preferences
      );

      const agentMsg: AgentMessage = {
        id: `agent-${Date.now()}`,
        type: response.type === 'alternatives' ? 'recommendations' : response.type,
        sender: 'agent',
        text: response.text,
        recommendations: response.recommendations,
        comparison: response.comparison,
        healthReport: response.healthReport,
        actions: response.actions,
      };

      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.loading);
        return [...withoutLoading, agentMsg];
      });
    } catch {
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.loading);
        return [
          ...withoutLoading,
          {
            id: `err-${Date.now()}`,
            type: 'text',
            sender: 'agent',
            text: 'Something went wrong. Please try again.',
            error: true,
            actions: ['Try again'],
          },
        ];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = (action: string) => {
    handleSend(action);
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="h-full bg-black flex flex-col pb-24 md:pb-0">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-700">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <Zap className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl text-white" style={{ fontWeight: 700 }}>
                Agent
              </h1>
              <p className="text-xs text-gray-500">Search · Score · Compare · Discover</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <div key={message.id}>
            {/* Loading state */}
            {message.loading ? (
              <div className="flex justify-start">
                <div
                  className="rounded-[20px] px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: '#1C1C1E', color: '#F5F5F7' }}
                >
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ) : message.error ? (
              <div className="flex justify-start">
                <div
                  className="rounded-[20px] px-4 py-3 flex items-center gap-2"
                  style={{
                    backgroundColor: '#1C1C1E',
                    color: '#F5F5F7',
                    border: '1px solid rgba(255,59,48,0.3)',
                  }}
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ) : (
              /* Text bubble */
              <div
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] md:max-w-[80%] rounded-[16px] md:rounded-[20px] px-3 md:px-4 py-2 md:py-3 ${
                    message.sender === 'user'
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-800/80 text-gray-200'
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                    {renderMarkdownBold(message.text)}
                  </p>
                </div>
              </div>
            )}

            {/* Recommendations / Alternatives */}
            {message.recommendations && message.recommendations.length > 0 && (
              <div className="mt-4 space-y-3">
                {message.recommendations.map((repo, index) => (
                  <RepoScoreCard key={repo.id || index} repo={repo} rank={index + 1} />
                ))}
              </div>
            )}

            {/* Comparison */}
            {message.comparison && <ComparisonTable comparison={message.comparison} />}

            {/* Health report */}
            {message.healthReport && <HealthReportCard report={message.healthReport} />}

            {/* Action buttons */}
            {message.actions && message.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {message.actions.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-full text-xs md:text-sm font-medium transition-colors border border-gray-700/50 disabled:opacity-50"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 md:p-6 border-t border-gray-700 pb-safe">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
            placeholder="Ask me anything..."
            disabled={isProcessing}
            className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-gray-800/50 text-white placeholder-gray-500 rounded-full border border-gray-700 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 text-sm md:text-base disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim() || isProcessing}
            className="w-10 h-10 md:w-12 md:h-12 bg-white text-gray-900 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </button>
        </div>
        <p className="text-center text-gray-600 text-[10px] md:text-xs mt-1.5 max-w-4xl mx-auto">
          Powered by real-time GitHub data · Health scores · Comparisons
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

/** Render **bold** markdown in text */
function renderMarkdownBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// ── Repo Score Card ──────────────────────────────────────────

function RepoScoreCard({ repo, rank }: { repo: ScoredRepository; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const hs = repo.healthScore;
  const gradeColor = getGradeColor(hs.grade);

  return (
    <SignatureCard className="p-4" showLayers={false}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs shadow-md">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base md:text-lg text-white font-mono truncate" style={{ fontWeight: 700 }}>
              {repo.fullName}
            </h3>
            <span
              className="px-2 py-0.5 rounded-md text-xs font-bold"
              style={{ backgroundColor: gradeColor.bg, color: gradeColor.text }}
            >
              {hs.grade}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{repo.description}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5" /> {repo.stars.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="w-3.5 h-3.5" /> {repo.forks.toLocaleString()}
        </span>
        {repo.starVelocity > 0 && (
          <span className="flex items-center gap-1 text-green-400">
            <TrendingUp className="w-3.5 h-3.5" /> {repo.starVelocity}/mo
          </span>
        )}
        {repo.language && (
          <span className="px-2 py-0.5 bg-gray-700/50 rounded-full">{repo.language}</span>
        )}
      </div>

      {/* Health bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Health Score</span>
          <span className="text-xs font-bold" style={{ color: gradeColor.text }}>
            {hs.overall}/100
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${hs.overall}%`,
              backgroundColor: gradeColor.text,
            }}
          />
        </div>
      </div>

      {/* Expandable breakdown */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide details' : 'Show health breakdown'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          <BreakdownBar label="Popularity" value={hs.breakdown.popularity} icon={<Star className="w-3 h-3" />} />
          <BreakdownBar label="Activity" value={hs.breakdown.activity} icon={<Activity className="w-3 h-3" />} />
          <BreakdownBar label="Maintenance" value={hs.breakdown.maintenance} icon={<Shield className="w-3 h-3" />} />
          <BreakdownBar label="Community" value={hs.breakdown.community} icon={<Users className="w-3 h-3" />} />
          <BreakdownBar label="Documentation" value={hs.breakdown.documentation} icon={<BookOpen className="w-3 h-3" />} />
          <BreakdownBar label="Maturity" value={hs.breakdown.maturity} icon={<Trophy className="w-3 h-3" />} />
        </div>
      )}

      {/* Links */}
      <div className="flex items-center gap-3 mt-3">
        {repo.url && (
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> View on GitHub
          </a>
        )}
      </div>
    </SignatureCard>
  );
}

// ── Breakdown bar ────────────────────────────────────────────

function BreakdownBar({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  const color =
    value >= 75 ? '#34C759' : value >= 50 ? '#FFD60A' : value >= 30 ? '#FF9F0A' : '#FF453A';

  return (
    <div className="flex items-center gap-2">
      <div className="text-gray-500 w-4">{icon}</div>
      <span className="text-xs text-gray-400 w-24">{label}</span>
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ── Comparison Table ─────────────────────────────────────────

function ComparisonTable({ comparison }: { comparison: RepoComparison }) {
  const categories = [
    { key: 'popularity', label: 'Popularity', icon: <Star className="w-3 h-3" /> },
    { key: 'activity', label: 'Activity', icon: <Activity className="w-3 h-3" /> },
    { key: 'maintenance', label: 'Maintenance', icon: <Shield className="w-3 h-3" /> },
    { key: 'community', label: 'Community', icon: <Users className="w-3 h-3" /> },
    { key: 'documentation', label: 'Docs', icon: <BookOpen className="w-3 h-3" /> },
    { key: 'maturity', label: 'Maturity', icon: <Trophy className="w-3 h-3" /> },
  ] as const;

  const repos = comparison.repos;

  return (
    <div className="mt-4">
      <SignatureCard className="p-4" showLayers={false}>
        {/* Header row */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-500 text-xs py-2 pr-3">Category</th>
                {repos.map((repo) => (
                  <th key={repo.id} className="text-center text-white text-xs py-2 px-2 font-mono">
                    <div className="flex flex-col items-center gap-1">
                      <span className="truncate max-w-[120px]">{repo.name}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: getGradeColor(repo.healthScore.grade).bg,
                          color: getGradeColor(repo.healthScore.grade).text,
                        }}
                      >
                        {repo.healthScore.grade}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Overall */}
              <tr className="border-b border-gray-800">
                <td className="text-gray-300 py-2 pr-3 font-bold text-xs">Overall</td>
                {repos.map((repo) => {
                  const isWinner =
                    repo.healthScore.overall ===
                    Math.max(...repos.map((r) => r.healthScore.overall));
                  return (
                    <td
                      key={repo.id}
                      className={`text-center py-2 px-2 font-mono text-sm ${
                        isWinner ? 'text-green-400 font-bold' : 'text-gray-400'
                      }`}
                    >
                      {repo.healthScore.overall}
                      {isWinner && ' 👑'}
                    </td>
                  );
                })}
              </tr>

              {/* Category rows */}
              {categories.map(({ key, label, icon }) => (
                <tr key={key} className="border-b border-gray-800/50">
                  <td className="text-gray-400 py-1.5 pr-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      {icon} {label}
                    </span>
                  </td>
                  {repos.map((repo) => {
                    const val = repo.healthScore.breakdown[key];
                    const isWinner = comparison.categoryWinners[key] === repo.fullName;
                    const color =
                      val >= 75
                        ? '#34C759'
                        : val >= 50
                        ? '#FFD60A'
                        : val >= 30
                        ? '#FF9F0A'
                        : '#FF453A';
                    return (
                      <td
                        key={repo.id}
                        className={`text-center py-1.5 px-2 font-mono text-xs ${
                          isWinner ? 'font-bold' : ''
                        }`}
                        style={{ color }}
                      >
                        {val}
                        {isWinner && ' ✓'}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Stars row */}
              <tr className="border-b border-gray-800/50">
                <td className="text-gray-400 py-1.5 pr-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3 h-3" /> Stars
                  </span>
                </td>
                {repos.map((repo) => (
                  <td key={repo.id} className="text-center py-1.5 px-2 font-mono text-xs text-gray-300">
                    {repo.stars.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Star velocity row */}
              <tr>
                <td className="text-gray-400 py-1.5 pr-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> Stars/mo
                  </span>
                </td>
                {repos.map((repo) => (
                  <td key={repo.id} className="text-center py-1.5 px-2 font-mono text-xs text-gray-300">
                    {repo.starVelocity.toLocaleString()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verdict */}
        <div className="mt-4 p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
          <p className="text-sm text-gray-200 leading-relaxed">
            {renderMarkdownBold(comparison.verdict)}
          </p>
        </div>
      </SignatureCard>
    </div>
  );
}

// ── Health Report Card ───────────────────────────────────────

function HealthReportCard({
  report,
}: {
  report: RepoHealthScore & { repoName: string };
}) {
  const gradeColor = getGradeColor(report.grade);

  const categories = [
    { key: 'popularity' as const, label: 'Popularity', icon: <Star className="w-3.5 h-3.5" /> },
    { key: 'activity' as const, label: 'Activity', icon: <Activity className="w-3.5 h-3.5" /> },
    { key: 'maintenance' as const, label: 'Maintenance', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'community' as const, label: 'Community', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'documentation' as const, label: 'Documentation', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { key: 'maturity' as const, label: 'Maturity', icon: <Trophy className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="mt-4">
      <SignatureCard className="p-5" showLayers={false}>
        {/* Header with big grade */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
            style={{ backgroundColor: gradeColor.bg, color: gradeColor.text }}
          >
            {report.grade}
          </div>
          <div>
            <h3 className="text-lg text-white font-mono" style={{ fontWeight: 700 }}>
              {report.repoName}
            </h3>
            <p className="text-gray-400 text-sm mt-0.5">
              Overall: <span className="font-bold" style={{ color: gradeColor.text }}>{report.overall}</span>/100
            </p>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="mt-5 space-y-3">
          {categories.map(({ key, label, icon }) => {
            const value = report.breakdown[key];
            const color =
              value >= 75 ? '#34C759' : value >= 50 ? '#FFD60A' : value >= 30 ? '#FF9F0A' : '#FF453A';
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="text-gray-500 w-5">{icon}</div>
                <span className="text-sm text-gray-300 w-28">{label}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${value}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-sm font-mono w-10 text-right font-bold" style={{ color }}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
          <p className="text-sm text-gray-300 leading-relaxed">{report.summary}</p>
        </div>

        {/* Key signals */}
        {report.signals && (
          <div className="mt-3 flex flex-wrap gap-2">
            {report.signals.stars > 0 && (
              <SignalBadge label={`${report.signals.stars.toLocaleString()} stars`} />
            )}
            {report.signals.contributorCount > 0 && (
              <SignalBadge label={`${report.signals.contributorCount} contributors`} />
            )}
            {report.signals.releaseCount > 0 && (
              <SignalBadge label={`${report.signals.releaseCount} releases`} />
            )}
            {report.signals.license && (
              <SignalBadge label={report.signals.license} />
            )}
            {report.signals.commitActivity52w > 0 && (
              <SignalBadge
                label={`${Math.round(report.signals.commitActivity52w / 52)} commits/week`}
              />
            )}
            {report.signals.issueCloseRate !== null && (
              <SignalBadge
                label={`${Math.round(report.signals.issueCloseRate * 100)}% issues closed`}
              />
            )}
          </div>
        )}
      </SignatureCard>
    </div>
  );
}

function SignalBadge({ label }: { label: string }) {
  return (
    <span className="px-2 py-1 bg-gray-800/80 text-gray-400 rounded-lg text-[11px] border border-gray-700/50">
      {label}
    </span>
  );
}

// ── Utilities ────────────────────────────────────────────────

function getGradeColor(grade: string): { bg: string; text: string } {
  switch (grade) {
    case 'A+':
      return { bg: 'rgba(52,199,89,0.15)', text: '#34C759' };
    case 'A':
      return { bg: 'rgba(52,199,89,0.12)', text: '#34C759' };
    case 'B+':
      return { bg: 'rgba(50,173,230,0.12)', text: '#32ADE6' };
    case 'B':
      return { bg: 'rgba(50,173,230,0.10)', text: '#32ADE6' };
    case 'C+':
      return { bg: 'rgba(255,214,10,0.12)', text: '#FFD60A' };
    case 'C':
      return { bg: 'rgba(255,159,10,0.12)', text: '#FF9F0A' };
    case 'D':
      return { bg: 'rgba(255,69,58,0.12)', text: '#FF453A' };
    case 'F':
      return { bg: 'rgba(255,69,58,0.15)', text: '#FF453A' };
    default:
      return { bg: 'rgba(142,142,147,0.12)', text: '#8E8E93' };
  }
}

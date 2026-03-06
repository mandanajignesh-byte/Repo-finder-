/**
 * Profile Screen Component
 * Shows user preferences and allows editing
 * Changes sync to Supabase and optimize recommendations
 */

import { useState, useEffect } from 'react';
import { Edit2, Save, ArrowLeft } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { UserPreferences } from '@/lib/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { repoPoolService } from '@/services/repo-pool.service';

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

/**
 * Profile Screen Component
 * Shows user preferences and allows editing
 * Changes sync to Supabase and optimize recommendations
 */

import { useState, useEffect } from 'react';
import { X, Edit2, Save, ArrowLeft, Trash2 } from 'lucide-react';
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
  { id: 'learning-new-tech', label: 'Learning New Technology', icon: '📚' },
  { id: 'building-project', label: 'Building a Project', icon: '🛠️' },
  { id: 'contributing', label: 'Contributing to Open Source', icon: '🤝' },
  { id: 'finding-solutions', label: 'Finding Solutions', icon: '💡' },
  { id: 'exploring', label: 'Exploring & Research', icon: '🔍' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', icon: '🌱' },
  { id: 'intermediate', label: 'Intermediate', icon: '🚀' },
  { id: 'advanced', label: 'Advanced', icon: '⭐' },
];

const DOMAINS = [
  { id: 'web-frontend', label: 'Web Frontend', icon: '🌐' },
  { id: 'web-backend', label: 'Web Backend', icon: '⚙️' },
  { id: 'mobile', label: 'Mobile', icon: '📱' },
  { id: 'desktop', label: 'Desktop', icon: '💻' },
  { id: 'data-science', label: 'Data Science', icon: '📊' },
  { id: 'devops', label: 'DevOps', icon: '🔧' },
  { id: 'game-dev', label: 'Game Development', icon: '🎮' },
  { id: 'ai-ml', label: 'AI/ML', icon: '🤖' },
];

const PROJECT_TYPES = [
  { id: 'tutorial', label: 'Tutorials & Courses', icon: '📖' },
  { id: 'boilerplate', label: 'Starter Templates', icon: '⚡' },
  { id: 'library', label: 'Libraries & Packages', icon: '📦' },
  { id: 'framework', label: 'Frameworks', icon: '🏗️' },
  { id: 'full-app', label: 'Complete Applications', icon: '💻' },
  { id: 'tool', label: 'Tools & Utilities', icon: '🔧' },
];

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

  const toggleSelection = (array: string[], value: string) => {
    if (array.includes(value)) {
      return array.filter(v => v !== value);
    }
    return [...array, value];
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update preferences (this will trigger DiscoveryScreen to reload repos)
      await updatePreferences(editedPrefs);
      
      // Clear and rebuild repo pool with new preferences
      // This ensures the pool matches the new preferences immediately
      await repoPoolService.clearPool();
      await repoPoolService.buildPool(editedPrefs as UserPreferences);
      
      console.log('✅ Preferences saved and repo pool rebuilt with new preferences');
      
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

  // Language → color mapping
  const langColor = (lang: string): { bg: string; text: string } => {
    const map: Record<string, { bg: string; text: string }> = {
      JavaScript: { bg: 'rgba(234,179,8,0.15)',  text: '#eab308' },
      TypeScript: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
      Python:     { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
      Java:       { bg: 'rgba(249,115,22,0.15)', text: '#fb923c' },
      React:      { bg: 'rgba(6,182,212,0.15)',  text: '#22d3ee' },
      'React Native': { bg: 'rgba(6,182,212,0.15)', text: '#22d3ee' },
      'Next.js':  { bg: 'rgba(6,182,212,0.15)',  text: '#22d3ee' },
      Go:         { bg: 'rgba(6,214,160,0.15)',  text: '#34d399' },
      Rust:       { bg: 'rgba(249,115,22,0.15)', text: '#fb923c' },
      'C++':      { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
      'C#':       { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
      Swift:      { bg: 'rgba(249,115,22,0.15)', text: '#fb923c' },
      Kotlin:     { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
      Ruby:       { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },
    };
    return map[lang] || { bg: '#1f2937', text: '#60a5fa' };
  };

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div style={{ color: '#8b949e' }}>Loading...</div>
      </div>
    );
  }

  // User initials for avatar
  const initials = (preferences.name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div 
      className="h-full p-4 md:p-6 overflow-y-auto pb-24 md:pb-0"
      style={{ background: '#0d1117' }}
    >
      <div className="max-w-4xl mx-auto">

        {/* ── Profile avatar area ───────────────────────────────── */}
        <div className="flex flex-col items-center py-8 mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
              color: '#ffffff',
              border: '2px solid #2563eb',
            }}
          >
            {initials}
          </div>
          {preferences.name && (
            <p className="text-lg font-semibold" style={{ color: '#e6edf3' }}>{preferences.name}</p>
          )}
          <p className="text-sm mt-0.5" style={{ color: '#8b949e' }}>RepoVerse explorer</p>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="transition-colors"
              style={{ color: '#8b949e' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e6edf3'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b949e'; }}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl" style={{ fontWeight: 700, color: '#e6edf3' }}>Your Profile</h1>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor: '#1C1C1E',
                color: '#F5F5F7',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-full transition-all"
                style={{
                  backgroundColor: '#1C1C1E',
                  color: '#F5F5F7',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {showSuccess && (
          <div className="mb-4 p-4 bg-gray-800 border border-gray-600 text-gray-200 rounded-lg">
            Preferences updated. Recommendations will be optimized.
          </div>
        )}

        {/* Experience Level */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>Experience Level</h2>
          </div>
          {isEditing ? (
            <div className="grid grid-cols-3 gap-3">
              {EXPERIENCE_LEVELS.map(level => (
                <button
                  key={level.id}
                  onClick={() => setEditedPrefs({ ...editedPrefs, experienceLevel: level.id as any })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    editedPrefs.experienceLevel === level.id
                      ? 'border-white bg-white/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">{level.label}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-white text-lg">
                {EXPERIENCE_LEVELS.find(l => l.id === preferences.experienceLevel)?.label}
              </span>
            </div>
          )}
        </SignatureCard>

        {/* Programming Languages */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>Programming Languages</h2>
            {isEditing && (
              <button
                onClick={() => setEditedPrefs({ ...editedPrefs, techStack: [] })}
                className="text-xs text-gray-400 hover:text-gray-200"
              >
                Clear all
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  onClick={() => setEditedPrefs({
                    ...editedPrefs,
                    techStack: toggleSelection(editedPrefs.techStack || [], lang)
                  })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    editedPrefs.techStack?.includes(lang)
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.techStack?.filter(lang => LANGUAGES.includes(lang)).map(lang => {
                const c = langColor(lang);
                return (
                  <span
                    key={lang}
                    className="px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-default"
                    style={{ background: c.bg, color: c.text, border: `1px solid ${c.text}30` }}
                  >
                    {lang}
                  </span>
                );
              })}
              {(!preferences.techStack || preferences.techStack.length === 0) && (
                <span className="text-sm" style={{ color: '#8b949e' }}>No languages selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* Frameworks */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>Frameworks & Libraries</h2>
          </div>
          {isEditing ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {FRAMEWORKS.map(framework => (
                <button
                  key={framework}
                  onClick={() => setEditedPrefs({
                    ...editedPrefs,
                    techStack: toggleSelection(editedPrefs.techStack || [], framework)
                  })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    editedPrefs.techStack?.includes(framework)
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {framework}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.techStack?.filter(fw => FRAMEWORKS.includes(fw)).map(fw => {
                const c = langColor(fw);
                return (
                  <span
                    key={fw}
                    className="px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-default"
                    style={{ background: c.bg, color: c.text, border: `1px solid ${c.text}30` }}
                  >
                    {fw}
                  </span>
                );
              })}
              {(!preferences.techStack || !preferences.techStack.some(fw => FRAMEWORKS.includes(fw))) && (
                <span className="text-sm" style={{ color: '#8b949e' }}>No frameworks selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* Use Cases / Goals */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>Your Goals</h2>
          </div>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {USE_CASES.map(useCase => (
                <button
                  key={useCase.id}
                  onClick={() => setEditedPrefs({
                    ...editedPrefs,
                    goals: toggleSelection(editedPrefs.goals || [], useCase.id)
                  })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    editedPrefs.goals?.includes(useCase.id)
                      ? 'border-white bg-white/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium text-sm">{useCase.label}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {preferences.goals?.map(goal => {
                const useCase = USE_CASES.find(uc => uc.id === goal);
                return useCase ? (
                  <div key={goal} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg">
                    <span className="text-white text-sm">{useCase.label}</span>
                  </div>
                ) : null;
              })}
              {(!preferences.goals || preferences.goals.length === 0) && (
                <span className="text-gray-400 text-sm">No goals selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* Domains */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>Domains / Platforms</h2>
          </div>
          {isEditing ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DOMAINS.map(domain => (
                <button
                  key={domain.id}
                  onClick={() => setEditedPrefs({
                    ...editedPrefs,
                    interests: toggleSelection(editedPrefs.interests || [], domain.id)
                  })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    editedPrefs.interests?.includes(domain.id)
                      ? 'border-white bg-white/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <div className="text-xs font-medium">{domain.label}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {preferences.interests?.map(interest => {
                const domain = DOMAINS.find(d => d.id === interest);
                return domain ? (
                  <div key={interest} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg">
                    <span className="text-white text-xs">{domain.label}</span>
                  </div>
                ) : null;
              })}
              {(!preferences.interests || preferences.interests.length === 0) && (
                <span className="text-gray-400 text-sm">No domains selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* ── Upgrade to Pro banner ───────────────────────────────── */}
        <div
          className="p-6 mb-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #0f1f3d 0%, #1a2f4a 60%, #0d1117 100%)',
            border: '1px solid #2563eb40',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'rgba(37,99,235,0.2)', border: '1px solid #2563eb50' }}
            >
              ⚡
            </div>
            <div className="flex-1">
              <p className="font-bold text-base mb-1" style={{ color: '#e6edf3' }}>Upgrade to Pro</p>
              <p className="text-sm mb-3" style={{ color: '#8b949e' }}>
                Unlock the full Repoverse experience.
              </p>
              <div className="space-y-1.5 mb-4">
                {['Unlimited swipes daily', 'Unlimited AI Agent queries', 'Save & organise collections', 'Advanced filters'].map(b => (
                  <div key={b} className="flex items-center gap-2 text-sm" style={{ color: '#c9d1d9' }}>
                    <span style={{ color: '#22c55e' }}>✓</span> {b}
                  </div>
                ))}
              </div>
              <button
                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={{ background: '#2563eb', color: '#fff' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1d4ed8'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#2563eb'; }}
              >
                Upgrade to Pro — $4.99/month
              </button>
            </div>
          </div>
        </div>

        {/* Project Types */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>Project Types</h2>
          </div>
          {isEditing ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PROJECT_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setEditedPrefs({
                    ...editedPrefs,
                    projectTypes: toggleSelection(editedPrefs.projectTypes || [], type.id)
                  })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    editedPrefs.projectTypes?.includes(type.id)
                      ? 'border-white bg-white/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium text-xs">{type.label}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {preferences.projectTypes?.map(type => {
                const projectType = PROJECT_TYPES.find(pt => pt.id === type);
                return projectType ? (
                  <div key={type} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg">
                    <span className="text-white text-sm">{projectType.label}</span>
                  </div>
                ) : null;
              })}
              {(!preferences.projectTypes || preferences.projectTypes.length === 0) && (
                <span className="text-gray-400 text-sm">No project types selected</span>
              )}
            </div>
          )}
        </SignatureCard>

        {/* Preferences */}
        <SignatureCard className="p-6 mb-4" showLayers={false}>
          <h2 className="text-xl text-white mb-4" style={{ fontWeight: 700 }}>Preferences</h2>
          
          <div className="space-y-4">
            {/* Activity Preference */}
            <div>
              <label className="block text-white font-medium mb-2">Repository Activity</label>
              {isEditing ? (
                <div className="grid grid-cols-4 gap-2">
                  {(['active', 'stable', 'trending', 'any'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => setEditedPrefs({ ...editedPrefs, activityPreference: option })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                        editedPrefs.activityPreference === option
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-gray-300 capitalize">{preferences.activityPreference || 'any'}</span>
              )}
            </div>

            {/* Popularity Weight */}
            <div>
              <label className="block text-white font-medium mb-2">Stars/Forks Importance</label>
              {isEditing ? (
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => setEditedPrefs({ ...editedPrefs, popularityWeight: option })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                        editedPrefs.popularityWeight === option
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-gray-300 capitalize">{preferences.popularityWeight || 'medium'}</span>
              )}
            </div>

            {/* Documentation Importance */}
            <div>
              <label className="block text-white font-medium mb-2">Documentation Importance</label>
              {isEditing ? (
                <div className="grid grid-cols-3 gap-2">
                  {(['nice-to-have', 'important', 'critical'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => setEditedPrefs({ ...editedPrefs, documentationImportance: option })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editedPrefs.documentationImportance === option
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-gray-300 capitalize">
                  {(preferences.documentationImportance || 'important').replace('-', ' ')}
                </span>
              )}
            </div>
          </div>
        </SignatureCard>
      </div>
    </div>
  );
}

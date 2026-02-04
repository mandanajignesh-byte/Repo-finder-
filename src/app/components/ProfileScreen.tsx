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
      // Update preferences
      await updatePreferences(editedPrefs);
      
      // Clear and rebuild repo pool with new preferences
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
      <div className="h-full bg-black flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="h-full bg-black p-4 md:p-6 overflow-y-auto pb-24 md:pb-0"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>Your Profile</h1>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
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
              {preferences.techStack?.filter(lang => LANGUAGES.includes(lang)).map(lang => (
                <span key={lang} className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">
                  {lang}
                </span>
              ))}
              {(!preferences.techStack || preferences.techStack.length === 0) && (
                <span className="text-gray-400 text-sm">No languages selected</span>
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
              {preferences.techStack?.filter(fw => FRAMEWORKS.includes(fw)).map(fw => (
                <span key={fw} className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">
                  {fw}
                </span>
              ))}
              {(!preferences.techStack || !preferences.techStack.some(fw => FRAMEWORKS.includes(fw))) && (
                <span className="text-gray-400 text-sm">No frameworks selected</span>
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

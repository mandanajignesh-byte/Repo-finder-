/**
 * Apple-Style Onboarding - 3 Simple Questions
 * Minimal, beautiful, and matches database exactly
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPreferences } from '@/lib/types';

interface AppleOnboardingProps {
  onComplete: (preferences: Partial<UserPreferences>) => void;
  onSkip?: () => void;
}

// STEP 1: What interests you? (Primary Cluster - EXACT database names)
const INTERESTS = [
  { id: 'ai-ml', label: 'AI & Machine Learning', emoji: '🤖', repos: 2115 },
  { id: 'frontend', label: 'Web Frontend', emoji: '🎨', repos: 2007 },
  { id: 'devops', label: 'DevOps & Infrastructure', emoji: '🔧', repos: 1981 },
  { id: 'mobile', label: 'Mobile Apps', emoji: '📱', repos: 1950 },
  { id: 'game-dev', label: 'Game Development', emoji: '🎮', repos: 1934 },
  { id: 'backend', label: 'Backend & APIs', emoji: '⚙️', repos: 1902 },
  { id: 'data-science', label: 'Data Science', emoji: '📊', repos: 1872 },
  { id: 'desktop', label: 'Desktop Apps', emoji: '💻', repos: 1826 },
  { id: 'ai-automation', label: 'AI Automation', emoji: '🤖', repos: 300 },
  { id: 'open-source-alternatives', label: 'Open Source Tools', emoji: '🔓', repos: 300 },
];

// STEP 2: What tech do you work with? (Based on actual tags in database)
const TECH_STACK = [
  // Languages
  { id: 'typescript', label: 'TypeScript', category: 'language' },
  { id: 'javascript', label: 'JavaScript', category: 'language' },
  { id: 'python', label: 'Python', category: 'language' },
  { id: 'go', label: 'Go', category: 'language' },
  { id: 'rust', label: 'Rust', category: 'language' },
  { id: 'java', label: 'Java', category: 'language' },
  { id: 'php', label: 'PHP', category: 'language' },
  { id: 'swift', label: 'Swift', category: 'language' },
  { id: 'dart', label: 'Dart', category: 'language' },
  
  // Frontend Frameworks
  { id: 'react', label: 'React', category: 'framework' },
  { id: 'vue', label: 'Vue', category: 'framework' },
  { id: 'angular', label: 'Angular', category: 'framework' },
  { id: 'svelte', label: 'Svelte', category: 'framework' },
  { id: 'nextjs', label: 'Next.js', category: 'framework' },
  
  // Backend & Tools
  { id: 'nodejs', label: 'Node.js', category: 'backend' },
  { id: 'django', label: 'Django', category: 'backend' },
  { id: 'flask', label: 'Flask', category: 'backend' },
  { id: 'flutter', label: 'Flutter', category: 'mobile' },
  { id: 'docker', label: 'Docker', category: 'devops' },
  { id: 'kubernetes', label: 'Kubernetes', category: 'devops' },
  { id: 'databases', label: 'Databases', category: 'backend' },
  { id: 'ai', label: 'AI', category: 'ai' },
];

// STEP 3: What's your goal?
const GOALS = [
  { id: 'learning', label: 'Learning & Exploring', emoji: '📚' },
  { id: 'building', label: 'Building Projects', emoji: '🛠️' },
  { id: 'contributing', label: 'Contributing to Open Source', emoji: '🤝' },
  { id: 'research', label: 'Research & Discovery', emoji: '🔍' },
];

export function AppleOnboarding({ onComplete, onSkip }: AppleOnboardingProps) {
  const [step, setStep] = useState(1);
  const [selectedInterest, setSelectedInterest] = useState<string>('');
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>('');

  const handleComplete = () => {
    // Map the onboarding data to match user_preferences table structure
    const preferences: Partial<UserPreferences> = {
      // Primary cluster (STEP 1: What interests you?)
      primaryCluster: selectedInterest,
      
      // Secondary clusters (empty for now, user selected only one)
      secondaryClusters: [],
      
      // Tech stack (STEP 2: What do you use?)
      techStack: selectedTech,
      
      // Goals (STEP 3: What's your goal?)
      goals: [selectedGoal],
      
      // Interests (same as primaryCluster for compatibility)
      interests: [selectedInterest],
      
      // Default values for other required fields
      projectTypes: [],
      experienceLevel: 'intermediate', // Default
      activityPreference: 'any',
      popularityWeight: 'medium',
      documentationImportance: 'important',
      licensePreference: ['any'],
      repoSize: ['any'],
      onboardingCompleted: true,
    };
    
    onComplete(preferences);
  };

  const canContinue = () => {
    if (step === 1) return selectedInterest !== '';
    if (step === 2) return selectedTech.length > 0;
    if (step === 3) return selectedGoal !== '';
    return false;
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl w-full"
        >
          {/* Progress indicator */}
          <div className="flex gap-2 mb-12 justify-center">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s === step
                    ? 'w-12 bg-gradient-to-r from-purple-500 to-pink-500'
                    : s < step
                    ? 'w-8 bg-white/30'
                    : 'w-8 bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Interests */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h1 className="text-5xl font-bold text-white tracking-tight">
                  What interests you?
                </h1>
                <p className="text-xl text-white/60">
                  Choose your primary area to get started
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest.id}
                    onClick={() => setSelectedInterest(interest.id)}
                    className={`group relative p-6 rounded-3xl transition-all duration-300 ${
                      selectedInterest === interest.id
                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 shadow-lg shadow-purple-500/20'
                        : 'bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{interest.emoji}</span>
                      <div className="flex-1 text-left">
                        <div className="text-lg font-semibold text-white">
                          {interest.label}
                        </div>
                        <div className="text-sm text-white/50">
                          {interest.repos.toLocaleString()} repos
                        </div>
                      </div>
                      {selectedInterest === interest.id && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Tech Stack */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h1 className="text-5xl font-bold text-white tracking-tight">
                  What do you use?
                </h1>
                <p className="text-xl text-white/60">
                  Select the technologies you work with
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {TECH_STACK.map((tech) => (
                  <button
                    key={tech.id}
                    onClick={() => {
                      if (selectedTech.includes(tech.id)) {
                        setSelectedTech(selectedTech.filter(t => t !== tech.id));
                      } else {
                        setSelectedTech([...selectedTech, tech.id]);
                      }
                    }}
                    className={`relative px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                      selectedTech.includes(tech.id)
                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 text-white shadow-lg shadow-purple-500/20'
                        : 'bg-white/5 border-2 border-white/10 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {tech.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h1 className="text-5xl font-bold text-white tracking-tight">
                  What's your goal?
                </h1>
                <p className="text-xl text-white/60">
                  How can we help you today?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`group relative p-6 rounded-3xl transition-all duration-300 ${
                      selectedGoal === goal.id
                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 shadow-lg shadow-purple-500/20'
                        : 'bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{goal.emoji}</span>
                      <div className="flex-1 text-left text-lg font-semibold text-white">
                        {goal.label}
                      </div>
                      {selectedGoal === goal.id && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 rounded-2xl text-white/70 hover:text-white transition-colors"
              >
                ← Back
              </button>
            ) : (
              <button
                onClick={onSkip}
                className="px-6 py-3 rounded-2xl text-white/50 hover:text-white/70 transition-colors"
              >
                Skip for now
              </button>
            )}

            <button
              onClick={() => {
                if (step < 3) {
                  setStep(step + 1);
                } else {
                  handleComplete();
                }
              }}
              disabled={!canContinue()}
              className={`px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-300 ${
                canContinue()
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50 hover:scale-105'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {step === 3 ? 'Get Started →' : 'Continue →'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

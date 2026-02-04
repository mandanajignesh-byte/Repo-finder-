/**
 * Enhanced Onboarding Questionnaire Component
 * Redesigned with animations and no icons
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SignatureCard } from './SignatureCard';
import { UserPreferences } from '@/lib/types';

interface OnboardingQuestionnaireProps {
  onComplete: (preferences: Partial<UserPreferences>) => void;
  onSkip?: () => void;
}

// Primary Clusters (no icons)
const PRIMARY_CLUSTERS = [
  { id: 'frontend', label: 'Web Frontend', description: 'React, Vue, Angular, Next.js, and frontend frameworks' },
  { id: 'backend', label: 'Web Backend', description: 'Express, Django, Flask, Spring, and server-side technologies' },
  { id: 'mobile', label: 'Mobile', description: 'React Native, Flutter, Ionic, and mobile app development' },
  { id: 'desktop', label: 'Desktop', description: 'Electron, desktop applications, and native desktop apps' },
  { id: 'data-science', label: 'Data Science', description: 'Pandas, NumPy, data analysis, and visualization' },
  { id: 'devops', label: 'DevOps', description: 'Docker, Kubernetes, CI/CD, and infrastructure tools' },
  { id: 'game-dev', label: 'Game Development', description: 'Game engines, graphics, and game development tools' },
  { id: 'ai-ml', label: 'AI/ML', description: 'TensorFlow, PyTorch, machine learning, and AI frameworks' },
];

// Languages
const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'R', 'Scala', 'Elixir'
];

// Frameworks/Libraries
const FRAMEWORKS = {
  frontend: ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte'],
  backend: ['Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Laravel'],
  mobile: ['Flutter', 'React Native', 'Ionic', 'Electron'],
  'ai-ml': ['TensorFlow', 'PyTorch', 'Pandas', 'NumPy'],
  'data-science': ['Pandas', 'NumPy', 'TensorFlow', 'PyTorch'],
  'game-dev': ['Unity', 'Unreal', 'Godot', 'Phaser'],
  devops: ['Docker', 'Kubernetes', 'Terraform', 'Ansible'],
  desktop: ['Electron', 'Tauri', 'Qt', 'GTK'],
};

const ALL_FRAMEWORKS = [
  'React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte',
  'Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Laravel',
  'Flutter', 'React Native', 'Ionic', 'Electron',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
  'Docker', 'Kubernetes', 'Unity', 'Unreal',
];

// Primary Use Cases (no icons)
const USE_CASES = [
  { id: 'learning-new-tech', label: 'Learning New Technology', description: 'I want to learn a new language or framework' },
  { id: 'building-project', label: 'Building a Project', description: 'I need code to build something' },
  { id: 'contributing', label: 'Contributing to Open Source', description: 'I want to contribute to projects' },
  { id: 'finding-solutions', label: 'Finding Solutions', description: 'I need libraries/tools for specific missions' },
  { id: 'exploring', label: 'Exploring & Research', description: 'I\'m exploring what\'s out there' },
];

// Experience Levels (no icons)
const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'New to programming or this tech' },
  { id: 'intermediate', label: 'Intermediate', description: 'Some experience, still learning' },
  { id: 'advanced', label: 'Advanced', description: 'Experienced developer' },
];

export function OnboardingQuestionnaire({ onComplete, onSkip }: OnboardingQuestionnaireProps) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
    name: '',
    primaryCluster: undefined,
    secondaryClusters: [],
    techStack: [],
    goals: [],
    projectTypes: [],
    experienceLevel: 'intermediate',
    activityPreference: 'any',
    popularityWeight: 'medium',
    documentationImportance: 'important',
  });

  const totalSteps = 7; // Increased from 6 to 7 for name step

  const handleNext = () => {
    if (step === 1 && (!preferences.name || preferences.name.trim().length === 0)) {
      alert('Please enter your name');
      return;
    }
    if (step === 2 && !preferences.primaryCluster) {
      alert('Please select your primary area of interest');
      return;
    }
    if (step === 4 && !preferences.experienceLevel) {
      alert('Please select your experience level');
      return;
    }
    if (step === 5 && (!preferences.goals || preferences.goals.length === 0)) {
      alert('Please select at least one goal');
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      const interests: string[] = [];
      if (preferences.primaryCluster) {
        const clusterToInterest: Record<string, string> = {
          'frontend': 'web-frontend',
          'backend': 'web-backend',
          'mobile': 'mobile',
          'desktop': 'desktop',
          'data-science': 'data-science',
          'devops': 'devops',
          'game-dev': 'game-dev',
          'ai-ml': 'ai-ml',
        };
        interests.push(clusterToInterest[preferences.primaryCluster] || preferences.primaryCluster);
      }
      if (preferences.secondaryClusters) {
        preferences.secondaryClusters.forEach(cluster => {
          const clusterToInterest: Record<string, string> = {
            'frontend': 'web-frontend',
            'backend': 'web-backend',
            'mobile': 'mobile',
            'desktop': 'desktop',
            'data-science': 'data-science',
            'devops': 'devops',
            'game-dev': 'game-dev',
            'ai-ml': 'ai-ml',
          };
          const interestId = clusterToInterest[cluster] || cluster;
          if (!interests.includes(interestId)) {
            interests.push(interestId);
          }
        });
      }
      
      onComplete({
        ...preferences,
        interests,
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleSelection = (array: string[], value: string) => {
    if (array.includes(value)) {
      return array.filter(v => v !== value);
    }
    return [...array, value];
  };

  const getRelevantFrameworks = (): string[] => {
    if (!preferences.primaryCluster) return ALL_FRAMEWORKS;
    const clusterFrameworks = FRAMEWORKS[preferences.primaryCluster as keyof typeof FRAMEWORKS];
    if (clusterFrameworks) {
      return [...new Set([...clusterFrameworks, ...ALL_FRAMEWORKS])];
    }
    return ALL_FRAMEWORKS;
  };

  const stepVariants = {
    initial: { opacity: 0, x: 20, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -20, scale: 0.95 },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 10 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl"
      >
        <SignatureCard className="w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h2 className="text-2xl text-white mb-1" style={{ fontWeight: 700 }}>Let's chart your course through the universe</h2>
              <p className="text-gray-400 text-sm">Step {step} of {totalSteps}</p>
            </div>
            {onSkip && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onSkip}
                className="text-gray-400 hover:text-white transition-colors text-2xl font-bold w-8 h-8 flex items-center justify-center"
              >
                ×
              </motion.button>
            )}
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          {/* Step Content with AnimatePresence */}
          <AnimatePresence mode="wait">
            {/* Step 1: Name Input */}
            {step === 1 && (
              <motion.div
                key="step1-name"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-white mb-2" style={{ fontWeight: 600 }}>What's your name?</h3>
                  <p className="text-gray-400 text-sm mb-4">This helps us personalize your experience.</p>
                </motion.div>
                <input
                  type="text"
                  value={preferences.name || ''}
                  onChange={(e) => setPreferences({ ...preferences, name: e.target.value })}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                  autoFocus
                />
              </motion.div>
            )}

            {/* Step 2: Primary Cluster Selection */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-white mb-2" style={{ fontWeight: 600 }}>Which galaxy interests you most?</h3>
                  <p className="text-gray-400 text-sm mb-4">Select your primary sector. This helps us chart your course through the repository universe.</p>
                </motion.div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {PRIMARY_CLUSTERS.map((cluster, i) => (
                    <motion.button
                      key={cluster.id}
                      custom={i}
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPreferences({ ...preferences, primaryCluster: cluster.id })}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      preferences.primaryCluster === cluster.id
                        ? 'border-white bg-white/10 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                    }`}
                    >
                      <div className="font-bold text-sm mb-1">{cluster.label}</div>
                      <div className="text-xs text-gray-400">{cluster.description}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Secondary Clusters */}
            {step === 3 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-white mb-2" style={{ fontWeight: 600 }}>What other galaxies catch your eye?</h3>
                  <p className="text-gray-400 text-sm mb-4">Select additional sectors (optional). This helps us explore cross-galactic repositories.</p>
                </motion.div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {PRIMARY_CLUSTERS
                    .filter(cluster => cluster.id !== preferences.primaryCluster)
                    .map((cluster, i) => (
                      <motion.button
                        key={cluster.id}
                        custom={i}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPreferences({
                          ...preferences,
                          secondaryClusters: toggleSelection(preferences.secondaryClusters || [], cluster.id)
                        })}
                        className={`p-4 rounded-lg border-2 transition-all text-center ${
                          preferences.secondaryClusters?.includes(cluster.id)
                            ? 'border-white bg-white/10 text-white'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-bold text-sm mb-1">{cluster.label}</div>
                        <div className="text-xs text-gray-400">{cluster.description}</div>
                      </motion.button>
                    ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Experience Level */}
            {step === 4 && (
              <motion.div
                key="step4"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-white mb-2" style={{ fontWeight: 600 }}>What's your experience level?</h3>
                  <p className="text-gray-400 text-sm mb-4">This helps us recommend repos at the right difficulty level.</p>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {EXPERIENCE_LEVELS.map((level, i) => (
                    <motion.button
                      key={level.id}
                      custom={i}
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPreferences({ ...preferences, experienceLevel: level.id as any })}
                      className={`p-6 rounded-lg border-2 transition-all text-left ${
                        preferences.experienceLevel === level.id
                          ? 'border-white bg-white/10 text-white'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-bold text-lg mb-1">{level.label}</div>
                      <div className="text-sm text-gray-400">{level.description}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 5: Goals/Use Cases */}
            {step === 5 && (
              <motion.div
                key="step5"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-white mb-2" style={{ fontWeight: 600 }}>What's your mission in this universe?</h3>
                  <p className="text-gray-400 text-sm mb-4">Select all that apply. This helps us navigate you to the right stellar repositories.</p>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {USE_CASES.map((useCase, i) => (
                    <motion.button
                      key={useCase.id}
                      custom={i}
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPreferences({
                        ...preferences,
                        goals: toggleSelection(preferences.goals || [], useCase.id) as any
                      })}
                      className={`p-5 rounded-lg border-2 transition-all text-left ${
                        preferences.goals?.includes(useCase.id as any)
                          ? 'border-white bg-white/10 text-white'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-bold mb-1">{useCase.label}</div>
                      <div className="text-sm text-gray-400">{useCase.description}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 6: Tech Stack */}
            {step === 6 && (
              <motion.div
                key="step5"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-white mb-2" style={{ fontWeight: 600 }}>Languages & Frameworks</h3>
                  <p className="text-gray-400 text-sm mb-4">Select languages and frameworks you use or want to learn (optional but recommended).</p>
                </motion.div>
                
                <div className="space-y-3">
                  <label className="block text-white font-medium">Programming Languages</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {LANGUAGES.map((lang, i) => (
                      <motion.button
                        key={lang}
                        custom={i}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPreferences({
                          ...preferences,
                          techStack: toggleSelection(preferences.techStack || [], lang)
                        })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          preferences.techStack?.includes(lang)
                            ? 'bg-white text-gray-900 shadow-md'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {lang}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-white font-medium">Frameworks & Libraries</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {getRelevantFrameworks().map((framework, i) => (
                      <motion.button
                        key={framework}
                        custom={i}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPreferences({
                          ...preferences,
                          techStack: toggleSelection(preferences.techStack || [], framework)
                        })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          preferences.techStack?.includes(framework)
                            ? 'bg-white text-gray-900 shadow-md'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {framework}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 7: Fine-tuning */}
            {step === 7 && (
              <motion.div
                key="step7"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-white mb-2" style={{ fontWeight: 600 }}>Fine-tune your preferences</h3>
                  <p className="text-gray-400 text-sm mb-4">Help us understand what matters most to you (optional).</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  <label className="block text-white font-medium">Repository Activity</label>
                  <p className="text-gray-400 text-xs mb-2">How recently updated should repos be?</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['active', 'stable', 'trending', 'any'] as const).map((option, i) => (
                      <motion.button
                        key={option}
                        custom={i}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPreferences({ ...preferences, activityPreference: option })}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                          preferences.activityPreference === option
                            ? 'bg-white text-gray-900 shadow-md'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {option}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <label className="block text-white font-medium">How important are stars/forks?</label>
                  <p className="text-gray-400 text-xs mb-2">Do you prefer popular repos or hidden gems?</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(['low', 'medium', 'high'] as const).map((option, i) => (
                      <motion.button
                        key={option}
                        custom={i}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPreferences({ ...preferences, popularityWeight: option })}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                          preferences.popularityWeight === option
                            ? 'bg-white text-gray-900 shadow-md'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {option}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <label className="block text-white font-medium">Documentation Importance</label>
                  <p className="text-gray-400 text-xs mb-2">How important is good documentation?</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(['nice-to-have', 'important', 'critical'] as const).map((option, i) => (
                      <motion.button
                        key={option}
                        custom={i}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPreferences({ ...preferences, documentationImportance: option })}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          preferences.documentationImportance === option
                            ? 'bg-white text-gray-900 shadow-md'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {option.replace('-', ' ')}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700"
          >
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                step === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              ← Back
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors shadow-sm"
            >
              {step === totalSteps ? 'Complete' : 'Next →'}
            </motion.button>
          </motion.div>
        </SignatureCard>
      </motion.div>
    </motion.div>
  );
}

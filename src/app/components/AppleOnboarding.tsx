/**
 * Apple-Style Onboarding - 3 Simple Questions
 * Beautiful, scrollable, with premium icons and smooth animations
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
  { 
    id: 'ai-ml', 
    label: 'AI & Machine Learning', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    gradient: 'from-purple-500 to-pink-500',
    repos: 2115 
  },
  { 
    id: 'frontend', 
    label: 'Web Frontend', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M16 3H19C20.1046 3 21 3.89543 21 5V8M16 21H19C20.1046 21 21 20.1046 21 19V16M8 21H5C3.89543 21 3 20.1046 3 19V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    gradient: 'from-blue-500 to-cyan-500',
    repos: 2007 
  },
  { 
    id: 'devops', 
    label: 'DevOps & Infrastructure', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    gradient: 'from-orange-500 to-red-500',
    repos: 1981 
  },
  { 
    id: 'mobile', 
    label: 'Mobile Apps', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 18H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    gradient: 'from-green-500 to-emerald-500',
    repos: 1950 
  },
  { 
    id: 'game-dev', 
    label: 'Game Development', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V13C21 15.8284 21 17.2426 20.1213 18.1213C19.2426 19 17.8284 19 15 19H12C9.17157 19 7.75736 19 6.87868 18.1213C6 17.2426 6 15.8284 6 13V11Z" stroke="currentColor" strokeWidth="2"/>
        <circle cx="9" cy="12" r="1" fill="currentColor"/>
        <circle cx="15" cy="12" r="1" fill="currentColor"/>
        <path d="M3 10L3 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    gradient: 'from-violet-500 to-purple-500',
    repos: 1934 
  },
  { 
    id: 'backend', 
    label: 'Backend & APIs', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M6 10H6.01M10 10H10.01M6 14H6.01M10 14H10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 10L18 14M18 10L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    gradient: 'from-indigo-500 to-blue-500',
    repos: 1902 
  },
  { 
    id: 'data-science', 
    label: 'Data Science', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M7 16L11 12L15 16L21 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="7" cy="16" r="1.5" fill="currentColor"/>
        <circle cx="11" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="16" r="1.5" fill="currentColor"/>
        <circle cx="21" cy="10" r="1.5" fill="currentColor"/>
      </svg>
    ),
    gradient: 'from-teal-500 to-cyan-500',
    repos: 1872 
  },
  { 
    id: 'desktop', 
    label: 'Desktop Apps', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    gradient: 'from-slate-500 to-gray-500',
    repos: 1826 
  },
  { 
    id: 'ai-automation', 
    label: 'AI Automation', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    gradient: 'from-fuchsia-500 to-pink-500',
    repos: 300 
  },
  { 
    id: 'open-source-alternatives', 
    label: 'Open Source Tools', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 2V6M12 18V22M22 12H18M6 12H2M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    gradient: 'from-amber-500 to-orange-500',
    repos: 300 
  },
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
  { 
    id: 'learning', 
    label: 'Learning & Exploring',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    gradient: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'building', 
    label: 'Building Projects',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.7 6.3C15.1 5.9 15.1 5.3 14.7 4.9L13.1 3.3C12.7 2.9 12.1 2.9 11.7 3.3L10.3 4.7L13.3 7.7L14.7 6.3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 6L3 12V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19H10L16 13L9 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14.5 10.5L17.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M21 15L15 21L12 18L18 12L21 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    gradient: 'from-orange-500 to-red-500'
  },
  { 
    id: 'contributing', 
    label: 'Contributing to Open Source',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    gradient: 'from-purple-500 to-pink-500'
  },
  { 
    id: 'research', 
    label: 'Research & Discovery',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 8C10.606 8 10.2159 8.0776 9.85195 8.22836C9.48797 8.37913 9.15726 8.6001 8.87868 8.87868C8.6001 9.15726 8.37913 9.48797 8.22836 9.85195C8.0776 10.2159 8 10.606 8 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    gradient: 'from-teal-500 to-emerald-500'
  },
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
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl w-full py-8"
        >
          {/* Progress indicator */}
          <div className="flex gap-2 mb-8 sm:mb-12 justify-center">
            {[1, 2, 3].map((s) => (
              <motion.div
                key={s}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: s * 0.1 }}
                className={`h-2 rounded-full transition-all duration-700 ${
                  s === step
                    ? 'w-16 bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50'
                    : s < step
                    ? 'w-10 bg-gradient-to-r from-purple-500/50 to-pink-500/50'
                    : 'w-10 bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Interests */}
          {step === 1 && (
            <div className="space-y-6 sm:space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-2 sm:space-y-3"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
                  What interests you?
                </h1>
                <p className="text-base sm:text-lg text-white/60">
                  Choose your primary area to get started
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {INTERESTS.map((interest, index) => (
                  <motion.button
                    key={interest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedInterest(interest.id)}
                    className={`group relative p-4 sm:p-5 rounded-2xl transition-all duration-500 backdrop-blur-xl ${
                      selectedInterest === interest.id
                        ? `bg-gradient-to-br ${interest.gradient} bg-opacity-20 border-2 border-white/30 shadow-2xl shadow-purple-500/30`
                        : 'bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-xl'
                    }`}
                  >
                    {/* Animated gradient background */}
                    {selectedInterest === interest.id && (
                      <motion.div
                        layoutId="selected-interest"
                        className={`absolute inset-0 bg-gradient-to-br ${interest.gradient} opacity-10 rounded-2xl`}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    <div className="relative flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${interest.gradient} text-white shadow-lg`}>
                        {interest.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm sm:text-base font-semibold text-white mb-0.5">
                          {interest.label}
                        </div>
                        <div className="text-xs text-white/50">
                          {interest.repos.toLocaleString()} repos
                        </div>
                      </div>
                      {selectedInterest === interest.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`w-6 h-6 rounded-full bg-gradient-to-br ${interest.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Tech Stack */}
          {step === 2 && (
            <div className="space-y-6 sm:space-y-8">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-2 sm:space-y-3"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
                  What do you use?
                </h1>
                <p className="text-base sm:text-lg text-white/60">
                  Select the technologies you work with
                </p>
              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {TECH_STACK.map((tech, index) => (
                  <motion.button
                    key={tech.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.03 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (selectedTech.includes(tech.id)) {
                        setSelectedTech(selectedTech.filter(t => t !== tech.id));
                      } else {
                        setSelectedTech([...selectedTech, tech.id]);
                      }
                    }}
                    className={`relative px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-500 backdrop-blur-xl ${
                      selectedTech.includes(tech.id)
                        ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500/60 text-white shadow-xl shadow-purple-500/30'
                        : 'bg-white/5 border-2 border-white/10 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white hover:shadow-lg'
                    }`}
                  >
                    {selectedTech.includes(tech.id) && (
                      <motion.div
                        layoutId={`tech-${tech.id}`}
                        className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative">{tech.label}</span>
                  </motion.button>
                ))}
              </div>
              
              {selectedTech.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-white/50 text-sm"
                >
                  {selectedTech.length} selected
                </motion.div>
              )}
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="space-y-6 sm:space-y-8">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-2 sm:space-y-3"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
                  What's your goal?
                </h1>
                <p className="text-base sm:text-lg text-white/60">
                  How can we help you today?
                </p>
              </motion.div>

              <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto">
                {GOALS.map((goal, index) => (
                  <motion.button
                    key={goal.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`group relative p-5 rounded-2xl transition-all duration-500 backdrop-blur-xl ${
                      selectedGoal === goal.id
                        ? `bg-gradient-to-br ${goal.gradient} bg-opacity-20 border-2 border-white/30 shadow-2xl shadow-purple-500/30`
                        : 'bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-xl'
                    }`}
                  >
                    {selectedGoal === goal.id && (
                      <motion.div
                        layoutId="selected-goal"
                        className={`absolute inset-0 bg-gradient-to-br ${goal.gradient} opacity-10 rounded-2xl`}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    <div className="relative flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${goal.gradient} text-white shadow-lg`}>
                        {goal.icon}
                      </div>
                      <div className="flex-1 text-left text-base sm:text-lg font-semibold text-white">
                        {goal.label}
                      </div>
                      {selectedGoal === goal.id && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className={`w-6 h-6 rounded-full bg-gradient-to-br ${goal.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between mt-8 sm:mt-12 pt-6 border-t border-white/10"
          >
            {step > 1 ? (
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white/70 hover:text-white transition-all duration-300 hover:bg-white/5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSkip}
                className="px-6 py-3 rounded-2xl text-white/50 hover:text-white/70 transition-all duration-300 hover:bg-white/5"
              >
                Skip for now
              </motion.button>
            )}

            <motion.button
              whileHover={canContinue() ? { scale: 1.05, x: 4 } : {}}
              whileTap={canContinue() ? { scale: 0.95 } : {}}
              onClick={() => {
                if (step < 3) {
                  setStep(step + 1);
                } else {
                  handleComplete();
                }
              }}
              disabled={!canContinue()}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-500 ${
                canContinue()
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-2xl hover:shadow-purple-500/50 shadow-lg'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {step === 3 ? 'Get Started' : 'Continue'}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

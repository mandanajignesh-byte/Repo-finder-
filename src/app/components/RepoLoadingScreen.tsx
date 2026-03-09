/**
 * Apple-style Loading Screen
 * Shows while fetching personalized recommendations after onboarding
 */

import { useEffect, useState } from 'react';

interface RepoLoadingScreenProps {
  onComplete?: () => void;
  minDisplayTime?: number; // Minimum time to show loading (ms)
}

export function RepoLoadingScreen({ onComplete, minDisplayTime = 2000 }: RepoLoadingScreenProps) {
  const [message, setMessage] = useState("Finding perfect repos for you...");
  const [dots, setDots] = useState("");

  // Rotate through messages
  useEffect(() => {
    const messages = [
      "Finding perfect repos for you...",
      "Analyzing your interests...",
      "Curating the best repositories...",
      "Almost ready..."
    ];
    
    let index = 0;
    const messageInterval = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index]);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, []);

  // Animate dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Animated background blur circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Animated logo/icon */}
        <div className="relative">
          {/* Outer ring */}
          <div className="absolute inset-0 animate-spin-slow">
            <svg className="w-24 h-24" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="70 200"
                className="text-blue-500 dark:text-blue-400"
              />
            </svg>
          </div>
          
          {/* Inner circle with icon */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: '#2563eb' }}>
              <svg 
                className="w-10 h-10 text-white animate-pulse" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {message}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
            {dots}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="w-64 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full animate-progress" style={{ background: '#2563eb' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}

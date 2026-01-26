import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { X, Bookmark, Heart, XCircle, Loader2, Trash2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { RepoCard } from './RepoCard';
import { Repository } from '@/lib/types';
import { SignatureCard } from './SignatureCard';
import { ParticlesBackground } from './ParticlesBackground';
import { OnboardingQuestionnaire } from './OnboardingQuestionnaire';
import { useRepositories } from '@/hooks/useRepositories';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { enhancedRecommendationService } from '@/services/enhanced-recommendation.service';
import { interactionService } from '@/services/interaction.service';
import { repoPoolService } from '@/services/repo-pool.service';
import { clusterService } from '@/services/cluster.service';
import { supabase } from '@/lib/supabase';

export function DiscoveryScreen() {
  const { preferences, updatePreferences, loaded } = useUserPreferences();
  const { repos, loading, error, refresh } = useRepositories();
  const [cards, setCards] = useState<Repository[]>([]);
  const [savedRepos, setSavedRepos] = useState<Repository[]>([]);
  const [likedRepos, setLikedRepos] = useState<Repository[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showLiked, setShowLiked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Check if onboarding is needed
  useEffect(() => {
    if (loaded && !preferences.onboardingCompleted) {
      // Check if user has any preferences set
      const hasBasicPrefs = preferences.techStack && preferences.techStack.length > 0;
      if (!hasBasicPrefs) {
        setShowOnboarding(true);
      } else {
        // Mark as completed if they have basic prefs
        updatePreferences({ onboardingCompleted: true });
      }
    }
  }, [loaded, preferences, updatePreferences]);

  const loadPersonalizedRepos = useCallback(async (append = false) => {
    try {
      setIsLoadingMore(true);
      const sessionHistory = interactionService.getSessionInteractions();

      // Get user ID first (needed for multiple operations)
      const { supabaseService } = await import('@/services/supabase.service');
      const actualUserId = await supabaseService.getOrCreateUserId();

      // OPTIMIZATION: Run ALL operations in parallel to minimize wait time
      // 1. Build repo pool (this is the slowest operation)
      // 2. Load saved/liked repos (can happen in parallel)
      // 3. Get seen repo IDs (needed for filtering) - NOW IN PARALLEL!
      const [, allSeenRepoIds, savedAndLiked] = await Promise.all([
        // Build or get repo pool (pre-fetched 100+ repos)
        repoPoolService.buildPool(preferences),
        
        // Get seen repo IDs in parallel (was sequential before - this was a bottleneck!)
        supabaseService.getAllSeenRepoIds(actualUserId),
        
        // Load saved and liked repos in parallel
        Promise.all([
          supabaseService.getSavedRepositories(actualUserId),
          supabaseService.getLikedRepositories(actualUserId),
        ]),
      ]);

      // Update saved/liked repos state
      const [saved, liked] = savedAndLiked;
      if (saved.length > 0) setSavedRepos(saved);
      if (liked.length > 0) setLikedRepos(liked);
      
      // Refine pool based on interactions (this is fast, synchronous)
      if (sessionHistory.length > 0) {
        repoPoolService.refinePoolBasedOnInteractions(
          sessionHistory.map(i => ({ repoId: i.repoId, action: i.action }))
        );
      }
      
      // Also exclude currently shown repos in this session
      const shownIds = new Set(cards.map(card => card?.id).filter(Boolean));
      const excludeIds = [...new Set([...allSeenRepoIds, ...Array.from(shownIds)])];

      // Get repos from pool (already excludes seen repos and applies user-specific shuffling)
      // Pass currently shown IDs to ensure they're excluded
      let recommended = await repoPoolService.getRecommendations(
        actualUserId, 
        preferences, 
        20,
        Array.from(shownIds) // Pass currently shown repo IDs
      );
      
      // Final filter to ensure no duplicates (defensive check)
      recommended = recommended.filter(repo => repo && repo.id && !shownIds.has(repo.id));

      // If pool doesn't have enough, try cluster repos first (not generic trending)
      if (recommended.length < 10) {
        console.log('Pool has fewer than 10 repos, trying cluster repos...');
        
        // Try to get repos from primary cluster as fallback
        const primaryCluster = clusterService.detectPrimaryCluster(preferences);
        const clusterFallback = await clusterService.getBestOfCluster(
          primaryCluster,
          20,
          excludeIds,
          actualUserId
        );
        
        if (clusterFallback.length > 0) {
          // Filter out undefined repos first
          const validRecommended = recommended.filter(r => r && r.id);
          const validClusterFallback = clusterFallback.filter(r => r && r.id);
          
          const existingIds = new Set([...excludeIds, ...validRecommended.map(r => r.id)]);
          const additional = validClusterFallback.filter(r => !existingIds.has(r.id));
          recommended = [...validRecommended, ...additional].slice(0, 20);
          console.log(`Added ${additional.length} repos from ${primaryCluster} cluster`);
        } else {
          // Last resort: hybrid recommendations
          const hybrid = await enhancedRecommendationService.getHybridRecommendations(
            actualUserId,
            preferences,
            sessionHistory,
            20
          );
          
          // Filter out undefined repos and exclude already seen repos
          const validRecommended = recommended.filter(r => r && r.id);
          const validHybrid = hybrid.filter(r => r && r.id);
          
          const existingIds = new Set([...excludeIds, ...validRecommended.map(r => r.id)]);
          const additional = validHybrid.filter(r => !existingIds.has(r.id));
          recommended = [...validRecommended, ...additional].slice(0, 20);
        }
      }

      if (recommended.length > 0) {
        // OPTIMIZATION: Show repos immediately, track views in background (non-blocking)
        // Update UI first for instant feedback
        if (append) {
          // Deduplicate when appending
          setCards(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newRepos = recommended.filter(r => r && r.id && !existingIds.has(r.id));
            return [...prev, ...newRepos];
          });
        } else {
          setCards(recommended);
        }
        
        // Track all displayed repos as "viewed" in background (non-blocking)
        // IMPORTANT: This tracking is USER-SPECIFIC - the same repo can still
        // be recommended to other users. Only this user won't see it again.
        // OPTIMIZATION: Batch track all views at once instead of sequentially
        Promise.all(
          recommended
            .filter(repo => repo && repo.id)
            .map((repo, index) =>
              interactionService.trackInteraction(repo, 'view', {
                position: cards.length + index,
                source: 'discover',
              }).catch(err => {
                console.error(`Error tracking view for repo ${repo.id}:`, err);
              })
            )
        ).catch(err => console.error('Error in batch view tracking:', err));
      } else {
        // Last resort: try any cluster (not generic trending)
        console.log('No recommendations found, trying any available cluster...');
        const { data: clusters } = await supabase.from('cluster_metadata').select('cluster_name').limit(1);
        if (clusters && clusters.length > 0) {
          const fallbackCluster = clusters[0].cluster_name;
          const fallbackRepos = await clusterService.getBestOfCluster(
            fallbackCluster,
            20,
            excludeIds,
            actualUserId
          );
          if (fallbackRepos.length > 0) {
            // OPTIMIZATION: Show repos immediately, track in background
            if (append) {
              // Deduplicate when appending
              setCards(prev => {
                const existingIds = new Set(prev.map(c => c.id));
                const newRepos = fallbackRepos.filter(r => r && r.id && !existingIds.has(r.id));
                return [...prev, ...newRepos];
              });
            } else {
              setCards(fallbackRepos);
            }
            
            // Track views in background (non-blocking)
            Promise.all(
              fallbackRepos
                .filter(repo => repo && repo.id)
                .map((repo, index) =>
                  interactionService.trackInteraction(repo, 'view', {
                    position: cards.length + index,
                    source: 'discover',
                  }).catch(err => console.error(`Error tracking view:`, err))
                )
            ).catch(err => console.error('Error in batch view tracking:', err));
            
            return;
          }
        }
        
        // Only use generic trending as absolute last resort
        console.warn('Using generic trending as last resort - this should not happen!');
        const { githubService } = await import('@/services/github.service');
        const trending = await githubService.getTrendingRepos({
          since: 'daily',
          perPage: 20,
          usePagination: false,
        });
        const reposWithScores = trending.map(repo => ({
          ...repo,
          fitScore: 85,
        }));
        if (append) {
          setCards(prev => [...prev, ...reposWithScores]);
        } else {
          setCards(reposWithScores);
        }
      }
    } catch (error) {
      console.error('Error loading personalized repos:', error);
      // Final fallback
      try {
        const { githubService } = await import('@/services/github.service');
        const trending = await githubService.getTrendingRepos({
          since: 'daily',
          perPage: 20,
          usePagination: false,
        });
        const reposWithScores = trending.map(repo => ({
          ...repo,
          fitScore: 85,
        }));
        if (append) {
          setCards(prev => [...prev, ...reposWithScores]);
        } else {
          setCards(reposWithScores);
        }
      } catch (fallbackError) {
        console.error('Failed to load repos as fallback:', fallbackError);
        if (!append) {
          setCards([]);
        }
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [preferences]);

  // Load saved and liked repos from Supabase on mount
  useEffect(() => {
    const loadRepos = async () => {
      try {
        const { supabaseService } = await import('@/services/supabase.service');
        const userId = await supabaseService.getOrCreateUserId();
        
        // Load saved repos
        const saved = await supabaseService.getSavedRepositories(userId);
        if (saved.length > 0) {
          setSavedRepos(saved);
        }
        
        // Load liked repos
        const liked = await supabaseService.getLikedRepositories(userId);
        if (liked.length > 0) {
          setLikedRepos(liked);
        }
      } catch (error) {
        console.error('Error loading repos from Supabase:', error);
        // Fallback to localStorage
        interactionService.getSavedRepos();
        interactionService.getLikedRepos();
      }
    };
    
    loadRepos();
  }, []);

  // Track previous preferences to detect changes
  const prevPreferencesRef = useRef<string>('');

  // Load repos when preferences are loaded and onboarding is complete
  useEffect(() => {
    if (loaded && preferences.onboardingCompleted && cards.length === 0 && !loading) {
      loadPersonalizedRepos();
    }
  }, [loaded, preferences.onboardingCompleted, cards.length, loading, loadPersonalizedRepos]);

  // Reload repos when preferences change significantly (e.g., from profile screen)
  useEffect(() => {
    if (!loaded || !preferences.onboardingCompleted) return;
    
    // Create a hash of key preferences
    const prefHash = JSON.stringify({
      techStack: preferences.techStack?.sort().join(','),
      goals: preferences.goals?.sort().join(','),
      projectTypes: preferences.projectTypes?.sort().join(','),
      popularityWeight: preferences.popularityWeight,
      experienceLevel: preferences.experienceLevel,
    });

    // Only reload if preferences actually changed and we have cards loaded
    if (prefHash !== prevPreferencesRef.current && cards.length > 0 && !loading && !isLoadingMore) {
      prevPreferencesRef.current = prefHash;
      // Debounce to avoid too many reloads
      const timer = setTimeout(() => {
        loadPersonalizedRepos(false); // Reload from scratch with new preferences
      }, 1000);
      return () => clearTimeout(timer);
    } else if (prefHash !== prevPreferencesRef.current) {
      prevPreferencesRef.current = prefHash;
    }
  }, [
    loaded,
    preferences.onboardingCompleted,
    preferences.techStack?.join(','),
    preferences.goals?.join(','),
    preferences.projectTypes?.join(','),
    preferences.popularityWeight,
    preferences.experienceLevel,
    cards.length,
    loading,
    isLoadingMore,
    loadPersonalizedRepos,
  ]);

  // Load more cards when running low
  useEffect(() => {
    if (cards.length < 5 && !isLoadingMore && !loading && preferences.onboardingCompleted) {
      loadPersonalizedRepos(true);
    }
  }, [cards.length, isLoadingMore, loading, preferences.onboardingCompleted, loadPersonalizedRepos]);

  const handleSkip = useCallback(async (repo?: Repository) => {
    const repoToSkip = repo || cards[0];
    if (repoToSkip) {
      // Track interaction (async, but don't wait)
      interactionService.trackInteraction(repoToSkip, 'skip', {
        position: 0,
        source: 'discover',
      }).catch(err => console.error('Error tracking skip:', err));
    }
    // Remove the card
    setCards((prev) => {
      const newCards = prev.slice(1);
      // If we're running low on cards, trigger loading more
      if (newCards.length < 3 && !isLoadingMore && !loading) {
        setTimeout(() => loadPersonalizedRepos(true), 100);
      }
      return newCards;
    });
  }, [cards, isLoadingMore, loading, loadPersonalizedRepos]);

  const handleLike = useCallback(async (repo?: Repository) => {
    const repoToLike = repo || cards[0];
    if (repoToLike) {
      // Track interaction as 'like' (async, but don't wait)
      interactionService.trackInteraction(repoToLike, 'like', {
        position: 0,
        source: 'discover',
      }).catch(err => console.error('Error tracking like:', err));
      setLikedRepos((liked) => [...liked, repoToLike]);
    }
    // Remove the card
    setCards((prev) => {
      const newCards = prev.slice(1);
      // If we're running low on cards, trigger loading more
      if (newCards.length < 3 && !isLoadingMore && !loading) {
        setTimeout(() => loadPersonalizedRepos(true), 100);
      }
      return newCards;
    });
  }, [cards, isLoadingMore, loading, loadPersonalizedRepos]);

  const handleSave = useCallback(async (repo?: Repository) => {
    const repoToSave = repo || cards[0];
    if (repoToSave) {
      // Track interaction as 'save' (async, but don't wait)
      interactionService.trackInteraction(repoToSave, 'save', {
        position: 0,
        source: 'discover',
      }).catch(err => console.error('Error tracking save:', err));
      setSavedRepos((saved) => [...saved, repoToSave]);
      // Navigate to saved section
      setShowSaved(true);
    }
    setCards((prev) => prev.slice(1));
  }, [cards]);

  const handleRemoveSaved = useCallback(async (repoId: string) => {
    try {
      const { supabaseService } = await import('@/services/supabase.service');
      const userId = await supabaseService.getOrCreateUserId();
      
      // Remove from Supabase
      await supabaseService.removeSavedRepository(userId, repoId);
      
      // Remove from local state
      setSavedRepos((prev) => prev.filter(repo => repo.id !== repoId));
      
      console.log(`✅ Removed repo ${repoId} from saved repos`);
    } catch (error) {
      console.error('Error removing saved repo:', error);
      // Still remove from UI even if database operation fails
      setSavedRepos((prev) => prev.filter(repo => repo.id !== repoId));
    }
  }, []);

  const handleSwipe = (direction: 'left' | 'right') => {
    // Swipe left = skip, swipe right = like
    if (direction === 'left') {
      handleSkip();
    } else if (direction === 'right') {
      handleLike();
    }
  };

  const handleOnboardingComplete = (newPreferences: Partial<typeof preferences>) => {
    updatePreferences({
      ...newPreferences,
      onboardingCompleted: true,
    });
    setShowOnboarding(false);
    // Load repos after onboarding
    setTimeout(() => {
      loadPersonalizedRepos();
    }, 100);
  };

  // Keyboard navigation support
  useEffect(() => {
    if (showSaved || showLiked || cards.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleLike();
          break;
        case 'Enter':
          e.preventDefault();
          handleSave();
          break;
        case 'Escape':
          e.preventDefault();
          setShowSaved(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cards.length, showSaved, handleSkip, handleSave]);

  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <OnboardingQuestionnaire
        onComplete={handleOnboardingComplete}
        onSkip={() => {
          updatePreferences({ onboardingCompleted: true });
          setShowOnboarding(false);
        }}
      />
    );
  }

  if (showSaved) {
    return (
      <div className="h-full bg-black p-4 md:p-6 overflow-y-auto pb-24 md:pb-0">
        <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
          <h2 className="text-2xl text-white" style={{ fontWeight: 700 }}>Saved Repos</h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSaved(false)}
            className="text-gray-400 hover:bg-gray-700 p-2 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </motion.button>
        </div>
        
        {savedRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <SignatureCard className="p-8 text-center">
              <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-300">No saved repos yet.</p>
              <p className="text-gray-400 text-sm mt-2">Click the Save button to save repositories!</p>
            </SignatureCard>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {savedRepos.map((repo) => (
              <SignatureCard key={repo.id} className="p-4 relative group" showLayers={false}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleRemoveSaved(repo.id)}
                  className="absolute top-2 right-2 opacity-70 hover:opacity-100 active:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 active:bg-red-500/60 text-red-400 hover:text-red-300 z-10"
                  title="Remove from saved"
                  aria-label="Remove from saved"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-700 to-pink-700 text-white font-bold flex items-center justify-center text-xs shadow-md">
                    {repo.fitScore || 'N/A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-1 text-white font-mono">{repo.name}</h3>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{repo.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {repo.tags && repo.tags.length > 0 ? (
                        repo.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">No tags</span>
                      )}
                    </div>
                    {repo.url && (
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                      >
                        View on GitHub →
                      </a>
                    )}
                  </div>
                </div>
              </SignatureCard>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (showLiked) {
    return (
      <div className="h-full bg-black p-4 md:p-6 overflow-y-auto pb-24 md:pb-0">
        <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
          <h2 className="text-2xl text-white" style={{ fontWeight: 700 }}>Liked Repos</h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowLiked(false)}
            className="text-gray-400 hover:bg-gray-700 p-2 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </motion.button>
        </div>
        
        {likedRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <SignatureCard className="p-8 text-center">
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-300">No liked repos yet.</p>
              <p className="text-gray-400 text-sm mt-2">Swipe right to like repositories!</p>
            </SignatureCard>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {likedRepos.map((repo) => (
              <SignatureCard key={repo.id} className="p-4" showLayers={false}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-700 to-pink-700 text-white font-bold flex items-center justify-center text-xs shadow-md">
                    {repo.fitScore}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-1 text-white font-mono">{repo.name}</h3>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{repo.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {repo.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {repo.url && (
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                      >
                        View on GitHub →
                      </a>
                    )}
                  </div>
                </div>
              </SignatureCard>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (loading && cards.length === 0 && repos.length === 0) {
    return (
      <div className="h-full bg-black flex items-center justify-center pb-24 md:pb-0">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-gray-400">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && cards.length === 0 && repos.length === 0) {
    return (
      <div className="h-full bg-black flex items-center justify-center pb-24 md:pb-0">
        <div className="flex flex-col items-center gap-4 p-4 max-w-md text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-gray-400 text-sm mb-4">
            Make sure you have a GitHub token in your .env file or check your internet connection.
          </p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-black text-white rounded-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Optimized particles for discovery screen - reduced count for better performance
  const discoveryParticlesConfig = {
    particles: {
      number: { 
        value: 50, // Reduced from 150 to 50 for better performance
        density: { enable: true, value_area: 800 }
      },
      color: { value: ['#22d3ee', '#ec4899'] },
      shape: { type: 'circle' },
      opacity: { 
        value: 0.4, // Reduced opacity
        random: true 
      },
      size: { 
        value: 2, // Smaller particles
        random: true 
      },
      line_linked: {
        enable: true,
        distance: 200, // Increased distance to reduce connections
        color: '#22d3ee',
        opacity: 0.15, // Reduced opacity
        width: 1
      },
      move: {
        enable: true,
        speed: 0.8, // Slower movement
        direction: 'none',
        random: false,
        out_mode: 'out'
      }
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: false, mode: 'repulse' }, // Disabled for performance
        onclick: { enable: false, mode: 'push' }, // Disabled for performance
        resize: true
      },
      modes: {
        repulse: { distance: 120 },
        push: { particles_nb: 4 }
      }
    },
    retina_detect: false // Disabled for better performance
  };

  return (
    <div className="h-full bg-black flex flex-col pb-48 md:pb-16 relative overflow-hidden">
      {/* Subtle particles background */}
      <ParticlesBackground id="discovery-particles" config={discoveryParticlesConfig} />
      
      {/* Header with bookmark and heart */}
      <div className="flex-shrink-0 p-4 md:p-6 flex justify-between items-center relative z-10">
        <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>Discover</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLiked(true)}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors relative text-gray-300"
          >
            <Heart className="w-6 h-6" />
            {likedRepos.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-br from-cyan-600 to-pink-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md">
                {likedRepos.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSaved(true)}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors relative text-gray-300"
          >
            <Bookmark className="w-6 h-6" />
            {savedRepos.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-br from-cyan-600 to-pink-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md">
                {savedRepos.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Card stack - centered both horizontally and vertically */}
      <div className="flex-1 relative flex items-center justify-center max-w-2xl mx-auto w-full px-4 pt-8 md:pt-12 pb-32 md:pb-24 z-10 min-h-0">
        {cards.length === 0 ? (
          isLoadingMore || loading ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <div className="space-y-2">
                <p className="text-white text-lg font-medium">Finding repos that fit for you...</p>
                <p className="text-gray-400 text-sm">This may take a moment</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-gray-400 text-lg">No more repos to discover</p>
              <p className="text-gray-500 text-sm">Try adjusting your preferences to see more</p>
            </div>
          )
        ) : (
          <>
            <div className="relative w-full max-w-md">
              {/* Active swipeable card - with integrated Save button */}
              <SwipeableCard
                repo={cards[0]}
                onSwipe={handleSwipe}
                onSave={() => handleSave(cards[0])}
              />
            </div>
            
            {/* Loading indicator when loading more repos */}
            {isLoadingMore && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Finding more repos for you...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface SwipeableCardProps {
  repo: Repository;
  onSwipe: (direction: 'left' | 'right') => void;
  onSave?: () => void;
}

const SwipeableCard = memo(function SwipeableCard({ repo, onSwipe, onSave }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragEnabled, setDragEnabled] = useState(true);
  const scrollStartY = useRef<number | null>(null);
  const isScrollingRef = useRef(false);
  
  // Calculate swipe threshold based on screen width (30% of screen) - memoized
  const swipeThreshold = useMemo(() => {
    if (typeof window === 'undefined') return 100;
    return window.innerWidth * 0.3; // 30% of screen width
  }, []);
  
  // More subtle rotation (2-5 degrees)
  const rotate = useTransform(x, [-swipeThreshold * 2, swipeThreshold * 2], [-5, 5]);
  
  // Opacity for swipe indicators
  const skipOpacity = useTransform(x, [-swipeThreshold, 0], [1, 0]);
  const saveOpacity = useTransform(x, [0, swipeThreshold], [0, 1]);
  
  // Glow effects
  const cyanGlow = useTransform(x, [0, swipeThreshold], [0, 1]);
  const pinkGlow = useTransform(x, [-swipeThreshold, 0], [1, 0]);

  const handleDragEnd = () => {
    if (!dragEnabled) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
      return;
    }

    const xValue = x.get();
    
    // Swipe left = skip, swipe right = like
    if (xValue < -swipeThreshold) {
      // Animate card off screen to the left (skip)
      animate(x, -window.innerWidth, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
      
      // Trigger skip callback after a short delay
      setTimeout(() => {
        onSwipe('left');
      }, 150);
    } else if (xValue > swipeThreshold) {
      // Animate card off screen to the right (like)
      animate(x, window.innerWidth, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
      
      // Trigger like callback after a short delay
      setTimeout(() => {
        onSwipe('right');
      }, 150);
    } else {
      // Snap back to center with spring animation
      animate(x, 0, {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      });
      animate(y, 0, {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      });
    }
  };

  useEffect(() => {
    if (!cardRef.current) return;
    
    const handleDisableDrag = () => {
      setDragEnabled(false);
      isScrollingRef.current = true;
    };
    const handleEnableDrag = () => {
      // Only re-enable after a delay to ensure scrolling has stopped
      setTimeout(() => {
        isScrollingRef.current = false;
        setDragEnabled(true);
      }, 500);
    };
    
    cardRef.current.addEventListener('disableDrag', handleDisableDrag);
    cardRef.current.addEventListener('enableDrag', handleEnableDrag);
    
    return () => {
      if (cardRef.current) {
        cardRef.current.removeEventListener('disableDrag', handleDisableDrag);
        cardRef.current.removeEventListener('enableDrag', handleEnableDrag);
      }
    };
  }, []);

  // Calculate max drag distance - memoized
  const maxDrag = useMemo(() => {
    return typeof window !== 'undefined' ? window.innerWidth * 1.5 : 500;
  }, []);
  
  return (
    <motion.div
      ref={cardRef}
      data-swipeable-card
      drag={dragEnabled ? "x" : false}
      dragConstraints={{ left: -maxDrag, right: maxDrag }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ 
        x, 
        y, 
        rotate,
        cursor: dragEnabled ? 'grab' : 'default',
        willChange: 'transform', // GPU acceleration hint
      }}
      className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-full max-w-md h-[500px] md:h-[600px] max-h-[80vh] z-20"
      dragDirectionLock={true}
      dragPropagation={false}
      onDragStart={(event) => {
        // Check if drag started on scrollable content or its children
        const target = event.target as HTMLElement;
        const scrollable = target.closest('.scrollable-content');
        
        if (scrollable) {
          // Cancel drag immediately - user is trying to scroll
          setDragEnabled(false);
          isScrollingRef.current = true;
          x.set(0);
          y.set(0);
          return false;
        }
        
        // Store initial Y position for scroll detection
        const clientY = (event as any).clientY ?? (event as any).touches?.[0]?.clientY;
        if (clientY !== undefined) {
          scrollStartY.current = clientY;
        }
        isScrollingRef.current = false;
        
        // Ensure drag is enabled for touch events
        if ((event as any).touches || (event as any).pointerType === 'touch') {
          setDragEnabled(true);
        }
      }}
      onDrag={(_event, info) => {
        // If drag is disabled, don't process
        if (!dragEnabled) {
          return;
        }
        
        // If we're scrolling, reset position
        if (isScrollingRef.current) {
          x.set(0);
          y.set(0);
          return;
        }
        
        // Check if user is scrolling vertically
        const deltaY = Math.abs(info.delta.y);
        const deltaX = Math.abs(info.delta.x);
        
        // Only check for vertical scroll if there's significant vertical movement
        // Use a more lenient ratio for mobile (2.5:1) to allow easier horizontal swipes
        if (deltaY > deltaX * 2.5 && deltaY > 20) {
          isScrollingRef.current = true;
          setDragEnabled(false);
          x.set(0);
          y.set(0);
          return;
        }
        
        // If horizontal movement is significant, ensure drag is enabled
        if (deltaX > 5 && isScrollingRef.current === false) {
          // Clear any scroll state if we're clearly swiping horizontally
          if (deltaX > deltaY * 1.5) {
            isScrollingRef.current = false;
          }
        }
      }}
    >
      {/* Cyan glow for right swipe */}
      <motion.div
        className="absolute -inset-2 rounded-[28px] pointer-events-none"
        style={{
          opacity: cyanGlow,
          background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.3), transparent 70%)',
          filter: 'blur(20px)',
          zIndex: -1,
        }}
      />
      
      {/* Pink glow for left swipe */}
      <motion.div
        className="absolute -inset-2 rounded-[28px] pointer-events-none"
        style={{
          opacity: pinkGlow,
          background: 'radial-gradient(circle at center, rgba(236, 72, 153, 0.3), transparent 70%)',
          filter: 'blur(20px)',
          zIndex: -1,
        }}
      />
      
      <div className="relative h-full w-full rounded-[24px]" style={{ height: '100%', maxHeight: '100%', overflow: 'visible', padding: '0 16px 0 0' }}>
        <RepoCard repo={repo} style={{ height: '100%', maxHeight: '100%' }} onSave={onSave} />
        
        {/* Skip indicator (left swipe) */}
        <motion.div
          className="absolute top-12 left-8 flex items-center gap-2 pointer-events-none z-30"
          style={{ opacity: skipOpacity }}
        >
          <div className="bg-gray-800/95 backdrop-blur-sm border-2 border-gray-500 rounded-full p-3 shadow-lg">
            <XCircle className="w-8 h-8 text-gray-300" strokeWidth={2.5} />
          </div>
          <span className="text-gray-300 font-bold text-lg">SKIP</span>
        </motion.div>
        
        {/* Like indicator (right swipe) */}
        <motion.div
          className="absolute top-12 right-8 flex items-center gap-2 pointer-events-none z-30"
          style={{ opacity: saveOpacity }}
        >
          <span className="text-cyan-400 font-bold text-lg">LIKE</span>
          <div className="bg-gray-800/95 backdrop-blur-sm border-2 border-cyan-400 rounded-full p-3 shadow-lg">
            <Heart className="w-8 h-8 text-cyan-400" fill="currentColor" strokeWidth={2.5} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
});
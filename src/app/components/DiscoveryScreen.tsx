import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { X, Bookmark, Heart, XCircle, Loader2, Trash2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'motion/react';
import { RepoCard } from './RepoCard';
import { Repository } from '@/lib/types';
import { SignatureCard } from './SignatureCard';
import { OnboardingQuestionnaire } from './OnboardingQuestionnaire';
import { useRepositories } from '@/hooks/useRepositories';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { enhancedRecommendationService } from '@/services/enhanced-recommendation.service';
import { interactionService } from '@/services/interaction.service';
import { repoPoolService } from '@/services/repo-pool.service';
import { clusterService } from '@/services/cluster.service';
import { supabase } from '@/lib/supabase';
import { trackRepoInteraction, trackOnboarding, trackNavigation } from '@/utils/analytics';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { isPWAInstalled } from '@/utils/pwa';

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
  const [isSwiping, setIsSwiping] = useState(false);
  const [triggerSwipe, setTriggerSwipe] = useState<'left' | 'right' | null>(null);
  const [swipeCount, setSwipeCount] = useState(0); // Track swipe count for delayed onboarding
  const [showPWAInstallPrompt, setShowPWAInstallPrompt] = useState(false);
  const [isPWAInstalledState, setIsPWAInstalledState] = useState(false);

  // Short one-line tips about using GitHub repos, shown during loading states
  const loadingTips = [
    'Star repos you actually use so your stars become a curated toolbox.',
    'Always scan the README first to see if a repo really fits your needs.',
    'Glance at open issues to spot real bugs and maintainer responsiveness.',
    'Watch releases to see how mature projects ship changes safely.',
    'Inspect popular forks to discover improved or alternative implementations.',
    'Study the tests – they are living examples of how to use the library.',
    'Browse commit history to understand how the project evolved over time.',
    'Use GitHub code search to jump straight to real implementations.',
    'Check top contributors – their profiles often hide more great repos.',
    'Clone a repo and rebuild one feature to turn browsing into real learning.',
  ];

  const loadingTip = useMemo(
    () => loadingTips[Math.floor(Math.random() * loadingTips.length)],
    // We deliberately only pick once per mount so the tip stays stable while loading
    []
  );

  // Don't show onboarding immediately - let users try the site first
  // Onboarding will be triggered after 4-5 swipes if not completed

  // Load random repos from database when no preferences exist
  // OPTIMIZATION: Start loading immediately, show first batch fast
  const loadRandomRepos = useCallback(async (append = false) => {
    try {
      setIsLoadingMore(true);
      
      // OPTIMIZATION: Get user ID and cluster data in parallel for faster loading
      const { supabaseService } = await import('@/services/supabase.service');
      
      // Start all async operations in parallel
      const [actualUserId, clustersResult] = await Promise.all([
        supabaseService.getOrCreateUserId(),
        supabase.from('cluster_metadata').select('cluster_name').eq('is_active', true)
      ]);
      
      // Get seen repo IDs (can happen in parallel with cluster selection)
      const allSeenRepoIdsPromise = supabaseService.getAllSeenRepoIds(actualUserId);
      
      const { data: clusters } = clustersResult;
      
      if (!clusters || clusters.length === 0) {
        console.error('No active clusters found');
        setIsLoadingMore(false);
        return;
      }
      
      // Pick a random cluster
      const randomCluster = clusters[Math.floor(Math.random() * clusters.length)].cluster_name;
      
      // Get seen repo IDs (now we have it)
      const allSeenRepoIds = await allSeenRepoIdsPromise;
      
      // OPTIMIZATION: Get smaller initial batch for faster display
      const initialBatchSize = append ? 20 : 10;
      const randomRepos = await clusterService.getBestOfCluster(
        randomCluster,
        initialBatchSize,
        allSeenRepoIds,
        actualUserId
      );
      
      if (randomRepos.length > 0) {
        // Filter out overly popular repos (>30k stars) for better variety
        const MAX_STARS = 30000;
        const filteredRepos = randomRepos.filter(r => r && r.id && r.stars <= MAX_STARS);
        
        // OPTIMIZATION: Show first batch immediately, load more in background if needed
        if (append) {
          setCards(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newRepos = filteredRepos.filter(r => r && r.id && !existingIds.has(r.id));
            return [...prev, ...newRepos];
          });
        } else {
          // Show first batch immediately
          setCards(filteredRepos);
          setIsLoadingMore(false); // Allow user to start interacting immediately
          
          // Load more repos in background if we got fewer than 10
          if (filteredRepos.length < 10) {
            clusterService.getBestOfCluster(
              randomCluster,
              20,
              [...allSeenRepoIds, ...filteredRepos.map(r => r.id)],
              actualUserId
            ).then(additionalRepos => {
              const validAdditional = additionalRepos
                .filter(r => r && r.id && r.stars <= MAX_STARS)
                .filter(r => !filteredRepos.some(existing => existing.id === r.id));
              
              if (validAdditional.length > 0) {
                setCards(prev => [...prev, ...validAdditional]);
              }
            }).catch(err => console.error('Error loading additional repos:', err));
          }
        }
        
        // Track views in background (non-blocking)
        Promise.all(
          filteredRepos
            .filter(repo => repo && repo.id)
            .map((repo, index) =>
              interactionService.trackInteraction(repo, 'view', {
                position: cards.length + index,
                source: 'discover',
              }).catch(err => console.error(`Error tracking view:`, err))
            )
        ).catch(err => console.error('Error in batch view tracking:', err));
      } else {
        setIsLoadingMore(false);
      }
    } catch (error) {
      console.error('Error loading random repos:', error);
      setIsLoadingMore(false);
    }
  }, [cards.length]);

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

      // OPTIMIZATION: Pass pre-fetched seenRepoIds to avoid duplicate getAllSeenRepoIds call
      // Get repos from pool (already excludes seen repos and applies user-specific shuffling)
      // OPTIMIZATION: Get first batch immediately for fast initial display
      let recommended = await repoPoolService.getRecommendations(
        actualUserId, 
        preferences, 
        append ? 20 : 10, // Get 10 for initial load (faster), 20 for append
        Array.from(shownIds), // Pass currently shown repo IDs
        allSeenRepoIds // OPTIMIZATION: Pass pre-fetched seen repo IDs to avoid duplicate call
      );
      
      // Final filter to ensure no duplicates (defensive check)
      recommended = recommended.filter(repo => repo && repo.id && !shownIds.has(repo.id));

      // OPTIMIZATION: Show first batch immediately for initial load, then load more in background
      if (recommended.length >= 10 && !append) {
        // Initial load with enough repos: show immediately, load more in background
        setCards(recommended);
        setIsLoadingMore(false); // Allow user to start interacting immediately
        
        // Load additional repos in background (non-blocking)
        repoPoolService.getRecommendations(
          actualUserId,
          preferences,
          20, // Get 20 more repos
          [...Array.from(shownIds), ...recommended.map(r => r.id)], // Exclude already shown
          allSeenRepoIds
        ).then(additionalRepos => {
          const validAdditional = additionalRepos
            .filter(repo => repo && repo.id && !shownIds.has(repo.id))
            .filter(repo => !recommended.some(r => r.id === repo.id)); // No duplicates
          
          if (validAdditional.length > 0) {
            setCards(prev => [...prev, ...validAdditional]);
          }
        }).catch(err => console.error('Error loading additional repos:', err));
        
        return; // Exit early - we've shown the first batch and loading more in background
      }

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
          
          // Filter out overly popular repos (>30k stars) unless user wants high popularity
          const MAX_STARS = 30000;
          const filteredClusterFallback = preferences.popularityWeight === 'high' 
            ? validClusterFallback 
            : validClusterFallback.filter(r => r.stars <= MAX_STARS);
          
          const existingIds = new Set([...excludeIds, ...validRecommended.map(r => r.id)]);
          const additional = filteredClusterFallback.filter(r => !existingIds.has(r.id));
          recommended = [...validRecommended, ...additional].slice(0, 20);
          console.log(`Added ${additional.length} repos from ${primaryCluster} cluster (filtered ${validClusterFallback.length - filteredClusterFallback.length} overly popular)`);
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
          
          // Filter out overly popular repos (>30k stars) unless user wants high popularity
          const MAX_STARS = 30000;
          const filteredHybrid = preferences.popularityWeight === 'high'
            ? validHybrid
            : validHybrid.filter(r => r.stars <= MAX_STARS);
          
          const existingIds = new Set([...excludeIds, ...validRecommended.map(r => r.id)]);
          const additional = filteredHybrid.filter(r => !existingIds.has(r.id));
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
            // Filter out overly popular repos (>30k stars) unless user wants high popularity
            const MAX_STARS = 30000;
            const filteredFallbackRepos = preferences.popularityWeight === 'high'
              ? fallbackRepos
              : fallbackRepos.filter(r => r && r.id && r.stars <= MAX_STARS);
            
            // OPTIMIZATION: Show repos immediately, track in background
            if (append) {
              // Deduplicate when appending
              setCards(prev => {
                const existingIds = new Set(prev.map(c => c.id));
                const newRepos = filteredFallbackRepos.filter(r => r && r.id && !existingIds.has(r.id));
                return [...prev, ...newRepos];
              });
            } else {
              setCards(filteredFallbackRepos);
            }
            
            // Track views in background (non-blocking)
            Promise.all(
              filteredFallbackRepos
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
        
        // Filter out overly popular repos (>30k stars) unless user wants high popularity
        const MAX_STARS = 30000;
        const filteredTrending = preferences.popularityWeight === 'high'
          ? trending
          : trending.filter(r => r.stars <= MAX_STARS);
        
        const reposWithScores = filteredTrending.map(repo => ({
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
        
        // Filter out overly popular repos (>30k stars) unless user wants high popularity
        const MAX_STARS = 30000;
        const filteredTrending = preferences.popularityWeight === 'high'
          ? trending
          : trending.filter(r => r.stars <= MAX_STARS);
        
        const reposWithScores = filteredTrending.map(repo => ({
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

  // Check if PWA is installed on mount and periodically
  useEffect(() => {
    const checkPWAStatus = () => {
      const installed = isPWAInstalled();
      setIsPWAInstalledState(installed);
      // If PWA is installed, hide the prompt
      if (installed) {
        setShowPWAInstallPrompt(false);
      }
    };
    
    // Check immediately
    checkPWAStatus();
    
    // Check periodically (in case user installs while using the app)
    const interval = setInterval(checkPWAStatus, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Load saved and liked repos from Supabase on mount (deferred for performance)
  useEffect(() => {
    const loadRepos = async () => {
      // Defer loading to avoid blocking initial render
      if (window.requestIdleCallback) {
        window.requestIdleCallback(async () => {
          try {
            const { supabaseService } = await import('@/services/supabase.service');
            const userId = await supabaseService.getOrCreateUserId();
            
            // Load saved and liked repos in parallel
            const [saved, liked] = await Promise.all([
              supabaseService.getSavedRepositories(userId),
              supabaseService.getLikedRepositories(userId),
            ]);
            
            if (saved.length > 0) {
              setSavedRepos(saved);
            }
            if (liked.length > 0) {
              setLikedRepos(liked);
            }
          } catch (error) {
            console.error('Error loading repos from Supabase:', error);
            // Fallback to localStorage
            interactionService.getSavedRepos();
            interactionService.getLikedRepos();
          }
        }, { timeout: 3000 });
      } else {
        setTimeout(async () => {
          try {
            const { supabaseService } = await import('@/services/supabase.service');
            const userId = await supabaseService.getOrCreateUserId();
            
            // Load saved and liked repos in parallel
            const [saved, liked] = await Promise.all([
              supabaseService.getSavedRepositories(userId),
              supabaseService.getLikedRepositories(userId),
            ]);
            
            if (saved.length > 0) {
              setSavedRepos(saved);
            }
            if (liked.length > 0) {
              setLikedRepos(liked);
            }
          } catch (error) {
            console.error('Error loading repos from Supabase:', error);
            // Fallback to localStorage
            interactionService.getSavedRepos();
            interactionService.getLikedRepos();
          }
        }, 500);
      }
    };
    
    loadRepos();
  }, []);

  // Track previous preferences to detect changes
  const prevPreferencesRef = useRef<string>('');

  // OPTIMIZATION: Start loading repos immediately without waiting for preferences
  // This ensures content appears as fast as possible
  // CRITICAL: Load repos IMMEDIATELY on page load, BEFORE onboarding
  // This ensures users see repos right away, then onboarding shows after swipes
  useEffect(() => {
    // Start loading immediately if we don't have cards yet
    if (cards.length === 0 && !loading && !isLoadingMore && loaded) {
      // Check localStorage for onboarding status immediately (don't wait for Supabase sync)
      const localPrefs = (() => {
        try {
          const stored = localStorage.getItem('github_repo_app_preferences');
          return stored ? JSON.parse(stored) : null;
        } catch {
          return null;
        }
      })();
      
      const hasCompletedOnboarding = localPrefs?.onboardingCompleted || preferences.onboardingCompleted;
      
      if (hasCompletedOnboarding) {
        // Load personalized repos if onboarding completed
        loadPersonalizedRepos();
      } else {
        // ALWAYS load random repos immediately for first-time visitors
        // This ensures repos show BEFORE onboarding appears (onboarding shows after 4-5 swipes)
        loadRandomRepos();
      }
    }
  }, [cards.length, loading, isLoadingMore, preferences.onboardingCompleted, loaded, loadPersonalizedRepos, loadRandomRepos]);

  // Reload repos when preferences change significantly (e.g., from profile screen)
  // IMPORTANT: Only reload if onboarding is completed AND user has cards (not during initial load)
  // Skip reload if user skipped onboarding (no preferences set) - they should see random repos
  useEffect(() => {
    if (!loaded || !preferences.onboardingCompleted || cards.length === 0) return;
    
    // Skip reload if user skipped onboarding (no preferences means they want random repos)
    const hasNoPreferences = !preferences.primaryCluster && 
                             (!preferences.techStack || preferences.techStack.length === 0) &&
                             (!preferences.goals || preferences.goals.length === 0);
    if (hasNoPreferences) {
      // User skipped onboarding - don't reload, let them continue with random repos
      return;
    }
    
    // Create a hash of ALL key preferences including clusters
    const prefHash = JSON.stringify({
      primaryCluster: preferences.primaryCluster,
      secondaryClusters: preferences.secondaryClusters?.sort().join(','),
      techStack: preferences.techStack?.sort().join(','),
      goals: preferences.goals?.sort().join(','),
      projectTypes: preferences.projectTypes?.sort().join(','),
      popularityWeight: preferences.popularityWeight,
      experienceLevel: preferences.experienceLevel,
      activityPreference: preferences.activityPreference,
      documentationImportance: preferences.documentationImportance,
      licensePreference: preferences.licensePreference?.sort().join(','),
      repoSize: preferences.repoSize?.sort().join(','),
    });

    // Only reload if preferences actually changed
    if (prefHash !== prevPreferencesRef.current) {
      prevPreferencesRef.current = prefHash;
      
      // Clear the repo pool to force rebuild with new preferences
      const clearAndReload = async () => {
        try {
          await repoPoolService.clearPool();
          // Clear current cards to show loading state
          setCards([]);
          // Reload repos with new preferences
          await loadPersonalizedRepos(false);
        } catch (error) {
          console.error('Error reloading repos after preference change:', error);
          // Fallback: just reload without clearing pool
          loadPersonalizedRepos(false);
        }
      };
      
      // Debounce to avoid too many reloads (but shorter delay for better UX)
      const timer = setTimeout(clearAndReload, 300);
      return () => clearTimeout(timer);
    }
  }, [
    loaded,
    preferences.onboardingCompleted,
    preferences.primaryCluster,
    preferences.secondaryClusters?.join(','),
    preferences.techStack?.join(','),
    preferences.goals?.join(','),
    preferences.projectTypes?.join(','),
    preferences.popularityWeight,
    preferences.experienceLevel,
    preferences.activityPreference,
    preferences.documentationImportance,
    preferences.licensePreference?.join(','),
    preferences.repoSize?.join(','),
    loadPersonalizedRepos,
  ]);

  // Load more cards when running low
  useEffect(() => {
    if (cards.length < 5 && !isLoadingMore && !loading && loaded) {
      if (preferences.onboardingCompleted) {
        loadPersonalizedRepos(true);
      } else {
        loadRandomRepos(true);
      }
    }
  }, [cards.length, isLoadingMore, loading, preferences.onboardingCompleted, loaded, loadPersonalizedRepos, loadRandomRepos]);

  // Reset trigger when card changes
  useEffect(() => {
    if (cards[0]) {
      setTriggerSwipe(null);
      setIsSwiping(false);
    }
  }, [cards[0]?.id]);

  // Update browser URL to /r/owner/repo when current card changes (YouTube-style)
  // Use window.history.replaceState to update URL without triggering route change
  useEffect(() => {
    if (cards[0] && cards[0].fullName) {
      // Extract owner and repo from fullName (format: "owner/repo")
      const [owner, repo] = cards[0].fullName.split('/');
      if (owner && repo) {
        const newPath = `/r/${owner}/${repo}`;
        // Update URL without triggering React Router route change (like YouTube)
        // This keeps DiscoveryScreen rendered while URL updates
        window.history.replaceState(null, '', newPath);
        // Update document title for better UX
        document.title = `${cards[0].fullName} - RepoVerse`;
      }
    } else if (cards.length === 0 && !isLoadingMore && !loading) {
      // If no cards and not loading, reset URL to /discover
      window.history.replaceState(null, '', '/discover');
      document.title = 'RepoVerse - Discover';
    }
  }, [cards[0]?.id, cards[0]?.fullName, cards.length, isLoadingMore, loading]);

  const handleSkip = useCallback(async (repo?: Repository) => {
    const repoToSkip = repo || cards[0];
    if (repoToSkip) {
      // Track interaction (async, but don't wait)
      interactionService.trackInteraction(repoToSkip, 'skip', {
        position: 0,
        source: 'discover',
      }).catch(err => console.error('Error tracking skip:', err));
      
      // Track in Google Analytics
      trackRepoInteraction('skip', repoToSkip.id, repoToSkip.fullName || repoToSkip.name);
    }
    
    // Increment swipe count and check if onboarding should be shown
    setSwipeCount(prev => {
      const newCount = prev + 1;
      // Show PWA install prompt after 2-3 swipes if not installed
      if (newCount >= 2 && newCount <= 3) {
        // Double-check PWA status before showing prompt
        const installed = isPWAInstalled();
        setIsPWAInstalledState(installed);
        
        if (!installed) {
          import('@/utils/pwa').then(({ isInstallPromptAvailable, shouldShowIOSInstructions, isIOS }) => {
            const iosDevice = isIOS();
            const iosInstructions = shouldShowIOSInstructions();
            
            if (iosDevice && iosInstructions) {
              // iOS: Show instructions if not dismissed
              const dismissed = localStorage.getItem('pwa-install-dismissed-ios');
              if (!dismissed) {
                setShowPWAInstallPrompt(true);
              }
            } else {
              // Android: Show install prompt if available
              const dismissed = localStorage.getItem('pwa-install-dismissed');
              const promptAvailable = isInstallPromptAvailable();
              if (!dismissed && promptAvailable) {
                setShowPWAInstallPrompt(true);
              }
            }
          });
        }
      }
      // Show onboarding after 4-5 swipes if not completed
      if (newCount >= 4 && !preferences.onboardingCompleted && loaded) {
        setShowOnboarding(true);
        trackOnboarding('started');
      }
      return newCount;
    });
    
    // Remove the card
    setCards((prev) => {
      const newCards = prev.slice(1);
      // If we're running low on cards, trigger loading more
      if (newCards.length < 3 && !isLoadingMore && !loading) {
        // Use personalized repos if onboarding completed, otherwise random
        if (preferences.onboardingCompleted) {
          setTimeout(() => loadPersonalizedRepos(true), 100);
        } else {
          setTimeout(() => loadRandomRepos(true), 100);
        }
      }
      return newCards;
    });
  }, [cards, isLoadingMore, loading, loadPersonalizedRepos, loadRandomRepos, preferences.onboardingCompleted, loaded]);

  const handleLike = useCallback(async (repo?: Repository) => {
    const repoToLike = repo || cards[0];
    if (repoToLike) {
      // Track interaction as 'like' (async, but don't wait)
      interactionService.trackInteraction(repoToLike, 'like', {
        position: 0,
        source: 'discover',
      }).catch(err => console.error('Error tracking like:', err));
      
      // Track in Google Analytics
      trackRepoInteraction('like', repoToLike.id, repoToLike.fullName || repoToLike.name);
      
      setLikedRepos((liked) => [...liked, repoToLike]);
    }
    
    // Increment swipe count and check if onboarding should be shown
    setSwipeCount(prev => {
      const newCount = prev + 1;
      // Show PWA install prompt after 2-3 swipes if not installed
      if (newCount >= 2 && newCount <= 3) {
        // Double-check PWA status before showing prompt
        const installed = isPWAInstalled();
        setIsPWAInstalledState(installed);
        
        if (!installed) {
          import('@/utils/pwa').then(({ isInstallPromptAvailable, shouldShowIOSInstructions, isIOS }) => {
            const iosDevice = isIOS();
            const iosInstructions = shouldShowIOSInstructions();
            
            if (iosDevice && iosInstructions) {
              // iOS: Show instructions if not dismissed
              const dismissed = localStorage.getItem('pwa-install-dismissed-ios');
              if (!dismissed) {
                setShowPWAInstallPrompt(true);
              }
            } else {
              // Android: Show install prompt if available
              const dismissed = localStorage.getItem('pwa-install-dismissed');
              const promptAvailable = isInstallPromptAvailable();
              if (!dismissed && promptAvailable) {
                setShowPWAInstallPrompt(true);
              }
            }
          });
        }
      }
      // Show onboarding after 4-5 swipes if not completed
      if (newCount >= 4 && !preferences.onboardingCompleted && loaded) {
        setShowOnboarding(true);
        trackOnboarding('started');
      }
      return newCount;
    });
    
    // Remove the card
    setCards((prev) => {
      const newCards = prev.slice(1);
      // If we're running low on cards, trigger loading more
      if (newCards.length < 3 && !isLoadingMore && !loading) {
        // Use personalized repos if onboarding completed, otherwise random
        if (preferences.onboardingCompleted) {
          setTimeout(() => loadPersonalizedRepos(true), 100);
        } else {
          setTimeout(() => loadRandomRepos(true), 100);
        }
      }
      return newCards;
    });
  }, [cards, isLoadingMore, loading, loadPersonalizedRepos, loadRandomRepos, preferences.onboardingCompleted, loaded]);

  const handleSave = useCallback(async (repo?: Repository) => {
    const repoToSave = repo || cards[0];
    if (repoToSave) {
      // Track interaction as 'save' (async, but don't wait)
      interactionService.trackInteraction(repoToSave, 'save', {
        position: 0,
        source: 'discover',
      }).catch(err => console.error('Error tracking save:', err));
      
      // Track in Google Analytics
      trackRepoInteraction('save', repoToSave.id, repoToSave.fullName || repoToSave.name);
      
      setSavedRepos((saved) => [...saved, repoToSave]);
      // Navigate to saved section
      setShowSaved(true);
      trackNavigation('saved', 'discover');
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

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (isSwiping || cards.length === 0 || triggerSwipe) return;
    
    setIsSwiping(true);
    // Trigger the animation in SwipeableCard
    setTriggerSwipe(direction);
  }, [isSwiping, cards.length, triggerSwipe]);

  // Handle the actual swipe action after animation completes
  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    // Swipe left = skip, swipe right = like
    if (direction === 'left') {
      handleSkip();
    } else if (direction === 'right') {
      handleLike();
    }
    setIsSwiping(false);
    setTriggerSwipe(null); // Reset trigger
  }, [handleSkip, handleLike]);

  const handleOnboardingComplete = async (newPreferences: Partial<typeof preferences>) => {
    // Save name to user record if provided
    if (newPreferences.name) {
      try {
        const { supabaseService } = await import('@/services/supabase.service');
        await supabaseService.getOrCreateUserId(newPreferences.name);
        console.log('✅ User name saved:', newPreferences.name);
      } catch (error) {
        console.error('Error saving user name:', error);
      }
    }
    
    // Track onboarding completion
    trackOnboarding('completed', undefined, 7);
    
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
          handleSwipe('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSwipe('right');
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
  }, [cards.length, showSaved, handleSwipe, handleSave]);

  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <OnboardingQuestionnaire
        onComplete={handleOnboardingComplete}
        onSkip={async () => {
          // Track onboarding skipped
          trackOnboarding('skipped');
          
          // Mark onboarding as completed but don't set preferences
          // User will continue seeing random repos
          await updatePreferences({ onboardingCompleted: true });
          setShowOnboarding(false);
          
          // CRITICAL: Always ensure repos continue loading after skipping onboarding
          // If no cards, load fresh. If some cards, load more to keep the flow going
          if (cards.length === 0) {
            // No cards: load fresh batch
            loadRandomRepos(false);
          } else if (cards.length < 5) {
            // Few cards: load more to keep swiping
            loadRandomRepos(true);
          }
          // If we have enough cards (5+), just continue - repos will auto-load when low
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
                  className="absolute top-2 right-2 opacity-70 hover:opacity-100 active:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 z-10"
                  title="Remove from saved"
                  aria-label="Remove from saved"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs shadow-md">
                    {repo.fitScore || 'N/A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-1 text-white font-mono">{repo.fullName || repo.name}</h3>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{repo.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {repo.tags && repo.tags.length > 0 ? (
                        repo.tags.map((tag: string) => (
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
                        className="mt-3 inline-block text-gray-100 hover:text-white text-sm font-medium"
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
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs shadow-md">
                    {repo.fitScore || 'N/A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-1 text-white font-mono">{repo.fullName || repo.name}</h3>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{repo.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {repo.tags && repo.tags.length > 0 ? (
                        repo.tags.map((tag: string) => (
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
                        className="mt-3 inline-block text-gray-100 hover:text-white text-sm font-medium"
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
          <p className="text-gray-500 text-sm text-center max-w-md px-4">
            {loadingTip}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && cards.length === 0 && repos.length === 0) {
    return (
      <div className="h-full bg-black flex items-center justify-center pb-24 md:pb-0">
        <div className="flex flex-col items-center gap-4 p-4 max-w-md text-center">
          <p className="text-gray-300 mb-2">{error}</p>
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

  return (
    <div className="h-full bg-black flex flex-col pb-20 md:pb-16 relative overflow-hidden">
      {/* Header with bookmark and heart */}
      <div className="flex-shrink-0 p-4 md:p-6 flex justify-between items-center relative z-10 mb-1 md:mb-0">
        <h1 className="text-xl md:text-2xl text-white" style={{ fontWeight: 700 }}>Explore</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowLiked(true);
              trackNavigation('liked', 'discover');
            }}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors relative text-gray-300"
          >
            <Heart className="w-6 h-6" />
            {likedRepos.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md">
                {likedRepos.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setShowSaved(true);
              trackNavigation('saved', 'discover');
            }}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors relative text-gray-300"
          >
            <Bookmark className="w-6 h-6" />
            {savedRepos.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md">
                {savedRepos.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Card stack - centered both horizontally and vertically */}
      <div className="flex-1 relative flex items-center justify-center max-w-2xl mx-auto w-full px-3 md:px-4 pt-2 md:pt-12 pb-20 md:pb-24 z-10 min-h-0">
        {cards.length === 0 ? (
          isLoadingMore || loading ? (
            // Skeleton loading state for faster perceived performance with animated scale effect
            <div className="relative w-full max-w-md" style={{ minHeight: '400px' }}>
              <motion.div 
                className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-full max-w-md h-[400px] md:h-[600px] max-h-[70vh] md:max-h-[80vh]"
                animate={{
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <SignatureCard className="h-full p-6 md:p-8 flex flex-col" showLayers={false} showParticles={false}>
                  <div className="flex flex-col gap-4 animate-pulse">
                    {/* Avatar and name skeleton */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-700"></div>
                      <div className="h-4 w-24 bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-8 w-3/4 bg-gray-700 rounded"></div>
                    {/* Description skeleton */}
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-700 rounded"></div>
                      <div className="h-4 w-5/6 bg-gray-700 rounded"></div>
                    </div>
                    {/* Tags skeleton */}
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-gray-700 rounded-full"></div>
                      <div className="h-6 w-20 bg-gray-700 rounded-full"></div>
                    </div>
                  </div>
                </SignatureCard>
              </motion.div>
              {/* Loading indicator overlay */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading recommendations…</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 md:gap-4 text-center px-4">
              <p className="text-gray-400 text-base md:text-lg">No more recommendations right now.</p>
              <p className="text-gray-500 text-xs md:text-sm">Adjust your preferences or try again later.</p>
            </div>
          )
        ) : (
          <>
            <div className="relative w-full max-w-md" style={{ minHeight: '400px', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <AnimatePresence mode="wait">
                {cards[0] && (
                  <SwipeableCard
                    key={cards[0].id}
                    repo={cards[0]}
                    onSwipe={handleSwipeComplete}
                    onSave={() => handleSave(cards[0])}
                    triggerSwipe={triggerSwipe}
                    isFirstCard={true}
                  />
                )}
              </AnimatePresence>
            </div>
            
            {/* Loading indicator when loading more repos */}
            {isLoadingMore && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exploring deeper into the galaxy...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* PWA Install Prompt - Shows after 2-3 swipes if not installed */}
      <PWAInstallPrompt 
        show={showPWAInstallPrompt} 
        onDismiss={() => setShowPWAInstallPrompt(false)} 
      />
    </div>
  );
}

interface SwipeableCardProps {
  repo: Repository;
  onSwipe: (direction: 'left' | 'right') => void;
  onSave?: () => void;
  triggerSwipe?: 'left' | 'right' | null;
  isFirstCard?: boolean; // Mark first card for LCP optimization
}

const SwipeableCard = memo(function SwipeableCard({ repo, onSwipe, onSave, triggerSwipe, isFirstCard = false }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragEnabled, setDragEnabled] = useState(true);
  const scrollStartY = useRef<number | null>(null);
  const isScrollingRef = useRef(false);
  const [isExiting, setIsExiting] = useState(false);
  const prevTriggerSwipeRef = useRef<'left' | 'right' | null>(null);
  
  // Detect if device supports touch
  const isTouchDevice = useMemo(() => {
    return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);
  
  // Calculate swipe threshold based on screen width - more lenient on mobile
  const swipeThreshold = useMemo(() => {
    if (typeof window === 'undefined') return 100;
    const isMobile = window.innerWidth < 768;
    // Mobile: 25% threshold (easier to swipe), Desktop: 30%
    return window.innerWidth * (isMobile ? 0.25 : 0.3);
  }, []);
  
  // More subtle rotation (2-5 degrees)
  const rotate = useTransform(x, [-swipeThreshold * 2, swipeThreshold * 2], [-5, 5]);
  
  // Scale effect during drag for better feedback
  const scale = useTransform(x, [-swipeThreshold, 0, swipeThreshold], [0.95, 1, 0.95]);
  
  // Opacity fade when swiping off screen
  const screenWidth = useMemo(() => typeof window !== 'undefined' ? window.innerWidth : 1000, []);
  const opacityTransform = useTransform(
    x,
    [-screenWidth, -swipeThreshold, 0, swipeThreshold, screenWidth],
    [0, 1, 1, 1, 0]
  );
  
  // Opacity for swipe indicators
  const skipOpacity = useTransform(x, [-swipeThreshold, 0], [1, 0]);
  const saveOpacity = useTransform(x, [0, swipeThreshold], [0, 1]);

  const handleDragEnd = () => {
    if (!dragEnabled || isExiting) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
      return;
    }

    const xValue = x.get();
    
    // Swipe left = skip, swipe right = like
    if (xValue < -swipeThreshold) {
      setIsExiting(true);
      // Animate card off screen to the left (skip) - slower and smoother
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
      animate(x, -screenWidth * 2, {
        type: 'spring',
        stiffness: 100,
        damping: 25,
      });
      animate(y, -100, {
        type: 'spring',
        stiffness: 100,
        damping: 25,
      });
      animate(opacity, 0, {
        duration: 0.8,
        ease: 'easeOut',
      });
      
      // Trigger skip callback after animation completes
      setTimeout(() => {
        onSwipe('left');
      }, 900);
    } else if (xValue > swipeThreshold) {
      setIsExiting(true);
      // Animate card off screen to the right (like) - slower and smoother
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
      animate(x, screenWidth * 2, {
        type: 'spring',
        stiffness: 100,
        damping: 25,
      });
      animate(y, -100, {
        type: 'spring',
        stiffness: 100,
        damping: 25,
      });
      animate(opacity, 0, {
        duration: 0.8,
        ease: 'easeOut',
      });
      
      // Trigger like callback after animation completes
      setTimeout(() => {
        onSwipe('right');
      }, 900);
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
      // Re-enable drag immediately since we now properly detect scroll end
      isScrollingRef.current = false;
      setDragEnabled(true);
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
  
  // Reset drag state when component mounts or repo changes
  useEffect(() => {
    setDragEnabled(true);
    isScrollingRef.current = false;
    setIsExiting(false);
    x.set(0);
    y.set(0);
    opacity.set(1);
    prevTriggerSwipeRef.current = null;
  }, [repo.id, x, y, opacity]);

  // Reset trigger when repo changes
  useEffect(() => {
    prevTriggerSwipeRef.current = null;
  }, [repo.id]);

  // Handle programmatic swipe trigger (from keyboard/buttons)
  useEffect(() => {
    if (triggerSwipe && triggerSwipe !== prevTriggerSwipeRef.current && !isExiting) {
      prevTriggerSwipeRef.current = triggerSwipe;
      setIsExiting(true);
      setDragEnabled(false);
      
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
      
      if (triggerSwipe === 'left') {
        // Animate card off screen to the left (skip) - slower and smoother
        animate(x, -screenWidth * 2, {
          type: 'spring',
          stiffness: 100,
          damping: 25,
        });
        animate(y, -100, {
          type: 'spring',
          stiffness: 100,
          damping: 25,
        });
        animate(opacity, 0, {
          duration: 0.8,
          ease: 'easeOut',
        });
      } else if (triggerSwipe === 'right') {
        // Animate card off screen to the right (like) - slower and smoother
        animate(x, screenWidth * 2, {
          type: 'spring',
          stiffness: 100,
          damping: 25,
        });
        animate(y, -100, {
          type: 'spring',
          stiffness: 100,
          damping: 25,
        });
        animate(opacity, 0, {
          duration: 0.8,
          ease: 'easeOut',
        });
      }
      
      // Trigger callback after animation completes
      setTimeout(() => {
        onSwipe(triggerSwipe);
      }, 900); // Slower duration to see the full animation
    }
  }, [triggerSwipe, isExiting, x, y, opacity, onSwipe, screenWidth]);

  // Calculate max drag distance - memoized
  const maxDrag = useMemo(() => {
    return typeof window !== 'undefined' ? window.innerWidth * 2 : 1000;
  }, []);
  
  return (
    <motion.div
      ref={cardRef}
      data-swipeable-card
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={isExiting ? { 
        opacity: 0,
        transition: { duration: 0 }
      } : { 
        opacity: 0, 
        scale: 0.8, 
        y: -50,
        transition: {
          duration: 0.4,
          ease: 'easeInOut'
        }
      }}
      transition={{ 
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }}
      drag={dragEnabled && !isExiting ? "x" : false}
      dragConstraints={{ left: -maxDrag, right: maxDrag }}
      dragElastic={0.2}
      dragMomentum={false}
      dragPropagation={false}
      whileDrag={{ 
        cursor: 'grabbing',
        zIndex: 30,
      }}
      onDragEnd={handleDragEnd}
      style={{ 
        x, 
        y, 
        rotate,
        scale,
        opacity: isExiting ? opacity : opacityTransform, // Use animated opacity when exiting, transform when dragging
        cursor: dragEnabled && !isExiting ? 'grab' : 'default',
        willChange: 'transform, opacity', // GPU acceleration hint
        touchAction: 'pan-x', // Allow horizontal panning (swipe) on touch devices
      }}
      className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-full max-w-md h-[400px] md:h-[600px] max-h-[70vh] md:max-h-[80vh] z-20 select-none"
      dragDirectionLock={false} // Allow more freedom for touch gestures
      onDragStart={(event) => {
        // On touch devices, be more lenient - allow drag even if starting on scrollable content
        // Only prevent if user is clearly trying to scroll (we'll detect this in onDrag)
        if (!isTouchDevice) {
          // Desktop: check if drag started on scrollable content
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
        }
        
        // Reset scroll state and ensure drag is enabled
        isScrollingRef.current = false;
        setDragEnabled(true);
        
        // Store initial Y position for scroll detection (works for both mouse and touch)
        const pointerEvent = event as any;
        const clientY = pointerEvent.clientY ?? pointerEvent.touches?.[0]?.clientY ?? pointerEvent.changedTouches?.[0]?.clientY;
        if (clientY !== undefined) {
          scrollStartY.current = clientY;
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
        
        // More lenient detection for touch screens - prioritize horizontal movement
        if (isTouchDevice) {
          // On touch devices, be very lenient - only disable if clearly vertical scrolling
          // Require much more vertical movement (8:1 ratio) and higher threshold
          if (deltaY > deltaX * 8 && deltaY > 80) {
            // User is clearly scrolling vertically
            isScrollingRef.current = true;
            setDragEnabled(false);
            x.set(0);
            y.set(0);
            return;
          }
          
          // On touch, any horizontal movement should enable swipe
          if (deltaX > 3) {
            isScrollingRef.current = false;
            setDragEnabled(true);
          }
        } else {
          // Desktop: more strict detection
          if (deltaY > deltaX * 5 && deltaY > 50) {
            isScrollingRef.current = true;
            setDragEnabled(false);
            x.set(0);
            y.set(0);
            return;
          }
          
          if (deltaX > 5 && deltaX >= deltaY * 0.8) {
            isScrollingRef.current = false;
            setDragEnabled(true);
          }
        }
      }}
    >
      <div 
        className="relative h-full w-full rounded-[24px]" 
        style={{ 
          height: '100%', 
          maxHeight: '100%', 
          overflow: 'visible', 
          padding: '0 16px 0 0',
        }}
      >
        <RepoCard repo={repo} style={{ height: '100%', maxHeight: '100%' }} onSave={onSave} isFirstCard={isFirstCard} />
        
        {/* Skip indicator (left swipe) */}
            <motion.div
          className="absolute top-12 left-8 flex items-center gap-2 pointer-events-none z-30"
          style={{ opacity: skipOpacity }}
        >
          <div className="bg-gray-900 border-2 border-gray-500 rounded-full p-3 shadow-lg">
            <XCircle className="w-8 h-8 text-gray-300" strokeWidth={2.5} />
          </div>
          <span className="text-gray-300 font-bold text-lg">SKIP</span>
        </motion.div>
        
        {/* Like indicator (right swipe) */}
        <motion.div
          className="absolute top-12 right-8 flex items-center gap-2 pointer-events-none z-30"
          style={{ opacity: saveOpacity }}
        >
          <span className="text-white font-bold text-lg">LIKE</span>
          <div className="bg-gray-900 border-2 border-gray-300 rounded-full p-3 shadow-lg">
            <Heart className="w-8 h-8 text-white" fill="currentColor" strokeWidth={2.5} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
});
import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Bookmark, Heart, XCircle, Loader2, Trash2, CornerUpLeft } from 'lucide-react';
import { PaywallModal, PaywallType } from './PaywallModal';
import { getSwipesUsedToday, incrementSwipesUsed, getSwipesLeft, FREE_SWIPES } from '@/utils/usageLimit';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'motion/react';
import { RepoCard } from './RepoCard';
import { Repository } from '@/lib/types';
import { SignatureCard } from './SignatureCard';
import { OnboardingQuestionnaire } from './OnboardingQuestionnaire';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { enhancedRecommendationService } from '@/services/enhanced-recommendation.service';
import { interactionService } from '@/services/interaction.service';
import { repoPoolService } from '@/services/repo-pool.service';
import { clusterService } from '@/services/cluster.service';
import { supabase } from '@/lib/supabase';
import { trackRepoInteraction, trackOnboarding, trackNavigation } from '@/utils/analytics';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { isPWAInstalled } from '@/utils/pwa';
import { githubService } from '@/services/github.service';
import { trackPWAOpenOnce } from '@/utils/pwa-analytics';

export function DiscoveryScreen() {
  const { owner, repo } = useParams<{ owner?: string; repo?: string }>();
  const navigate = useNavigate();
  const { preferences, updatePreferences, loaded } = useUserPreferences();
  const [cards, setCards] = useState<Repository[]>([]);
  const [savedRepos, setSavedRepos] = useState<Repository[]>([]);
  const [likedRepos, setLikedRepos] = useState<Repository[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showLiked, setShowLiked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingSharedRepo, setIsLoadingSharedRepo] = useState(false);
  const [sharedRepoError, setSharedRepoError] = useState<string | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [triggerSwipe, setTriggerSwipe] = useState<'left' | 'right' | null>(null);
  const [swipeCount, setSwipeCount] = useState(0); // Track swipe count for delayed onboarding
  const [showPWAInstallPrompt, setShowPWAInstallPrompt] = useState(false);
  const [isPWAInstalledState, setIsPWAInstalledState] = useState(false);

  // ── Undo (persisted via Supabase, max 10 in-session stack) ──────────────
  const [skippedRepos, setSkippedRepos] = useState<Repository[]>([]);
  const [undoEntry, setUndoEntry] = useState(false);

  // ── Daily usage limit (free tier) ────────────────────────────────────────────
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallType, setPaywallType] = useState<PaywallType>('swipes');
  const [dailySwipesUsed, setDailySwipesUsed] = useState(() => getSwipesUsedToday());

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
          setIsLoadingMore(false); // CRITICAL: Reset loading state when appending
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

      // OPTIMIZATION: Fetch seen IDs + saved/liked in parallel FIRST, then pass
      // seen IDs into buildPool so it doesn't make a second redundant DB call.
      const [allSeenRepoIds, savedAndLiked] = await Promise.all([
        supabaseService.getAllSeenRepoIds(actualUserId),
        Promise.all([
          supabaseService.getSavedRepositories(actualUserId),
          supabaseService.getLikedRepositories(actualUserId),
        ]),
      ]);

      // Build (or get from cache) the repo pool, passing the already-fetched seen IDs
      // so buildPool skips its own getAllSeenRepoIds DB call entirely.
      await repoPoolService.buildPool(preferences, allSeenRepoIds);

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
          setIsLoadingMore(false); // IMPORTANT: Reset loading state when appending
        } else {
          setCards(recommended);
          setIsLoadingMore(false);
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
              setIsLoadingMore(false); // IMPORTANT: Reset loading state when appending
            } else {
              setCards(filteredFallbackRepos);
              setIsLoadingMore(false);
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
          setIsLoadingMore(false); // IMPORTANT: Reset loading state when appending
        } else {
          setCards(reposWithScores);
          setIsLoadingMore(false);
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
          setIsLoadingMore(false); // IMPORTANT: Reset loading state when appending
        } else {
          setCards(reposWithScores);
          setIsLoadingMore(false);
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
  // Also track PWA installs/opens
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
    
    // Track PWA install/open (only if running as standalone PWA)
    trackPWAOpenOnce();
    
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
  // Also handles /r/owner/repo routes - loads that specific repo in explore page
  useEffect(() => {
    // If URL has /r/owner/repo, load that specific repo FIRST before anything else
    if (owner && repo && cards.length === 0 && !isLoadingMore && !isLoadingSharedRepo) {
      const loadSharedRepo = async () => {
        setIsLoadingSharedRepo(true);
        setSharedRepoError(null);
        
        try {
          const fullName = `${owner}/${repo}`;
          let repoData: Repository | null = null;
          
          // STEP 1: Try to fetch from database first (faster, no rate limits)
          // Query repo_clusters table and filter by fullName in the repo_data JSONB field
          try {
            const { data, error } = await supabase
              .from('repo_clusters')
              .select('repo_data')
              .limit(100); // Get a batch to search through
            
            if (!error && data && data.length > 0) {
              // Find repo by fullName in the repo_data JSONB
              const foundRepo = data.find((row: any) => {
                const repo = row.repo_data;
                return repo?.fullName === fullName || repo?.full_name === fullName;
              });
              
              if (foundRepo?.repo_data) {
                repoData = foundRepo.repo_data as Repository;
                // Ensure fullName is set correctly
                if (!repoData.fullName && (repoData as any).full_name) {
                  repoData.fullName = (repoData as any).full_name;
                }
                // Recalculate lastUpdated from pushed_at if available
                if (repoData.pushed_at) {
                  const { formatTimeAgo } = await import('@/utils/date.utils');
                  repoData.lastUpdated = formatTimeAgo(repoData.pushed_at);
                }
                console.log(`✅ Found repo ${fullName} in database`);
              }
            }
          } catch (dbError) {
            console.log(`Database lookup failed (will try GitHub API):`, dbError);
          }
          
          // STEP 2: Fall back to GitHub API if not in database
          if (!repoData) {
            try {
              repoData = await githubService.getRepo(fullName);
              console.log(`✅ Fetched repo ${fullName} from GitHub API`);
            } catch (apiError: any) {
              // Check if it's a 404 (repo doesn't exist) vs other errors
              if (apiError?.message?.includes('404') || apiError?.message?.includes('Not Found')) {
                setSharedRepoError(`Repository "${fullName}" not found`);
              } else {
                setSharedRepoError(`Failed to load repository. ${apiError?.message || 'Please try again later.'}`);
              }
              setIsLoadingSharedRepo(false);
              return;
            }
          }
          
          if (repoData) {
            // Load the shared repo as the first card immediately
            setCards([repoData]);
            setIsLoadingSharedRepo(false);
            
            // Keep the URL as /r/owner/repo (don't navigate to /discover)
            // This allows users to share and bookmark specific repos
            
            // Load more repos in the background for swiping (after a small delay)
            const localPrefs = (() => {
              try {
                const stored = localStorage.getItem('github_repo_app_preferences');
                return stored ? JSON.parse(stored) : null;
              } catch {
                return null;
              }
            })();
            const hasCompletedOnboarding = localPrefs?.onboardingCompleted || preferences.onboardingCompleted;
            
            // Small delay to ensure cards state is updated before loading more
            setTimeout(() => {
              if (hasCompletedOnboarding) {
                loadPersonalizedRepos(true); // Append more repos
              } else {
                loadRandomRepos(true); // Append more repos
              }
            }, 300);
          } else {
            setSharedRepoError(`Repository "${fullName}" not found`);
            setIsLoadingSharedRepo(false);
          }
        } catch (error: any) {
          console.error('Error loading shared repo:', error);
          setSharedRepoError(`Failed to load repository. ${error?.message || 'Please try again later.'}`);
          setIsLoadingSharedRepo(false);
        }
      };
      
      loadSharedRepo();
      return;
    }
    
    // Normal flow: Start loading immediately if we don't have cards yet
    // BUT: Don't load if we're currently loading a shared repo
    if (cards.length === 0 && !isLoadingMore && !isLoadingSharedRepo && loaded && !owner && !repo) {
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
  }, [cards.length, isLoadingMore, isLoadingSharedRepo, preferences.onboardingCompleted, loaded, owner, repo, navigate, loadPersonalizedRepos, loadRandomRepos]);

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
    if (cards.length < 5 && !isLoadingMore && loaded) {
      if (preferences.onboardingCompleted) {
      loadPersonalizedRepos(true);
      } else {
        loadRandomRepos(true);
      }
    }
  }, [cards.length, isLoadingMore, preferences.onboardingCompleted, loaded, loadPersonalizedRepos, loadRandomRepos]);

  // Reset trigger when card changes
  useEffect(() => {
    if (cards[0]) {
      setTriggerSwipe(null);
      setIsSwiping(false);
    }
  }, [cards[0]?.id]);

  // Update URL to reflect current repo (YouTube-like behavior)
  // All in-app repo URLs use /app/r/owner/repo to stay inside the app shell
  useEffect(() => {
    if (cards[0] && cards[0].fullName) {
      const [ownerName, repoName] = cards[0].fullName.split('/');
      if (ownerName && repoName) {
        const newPath = `/app/r/${ownerName}/${repoName}`;
        const currentPath = window.location.pathname;
        if (currentPath !== newPath) {
          navigate(newPath, { replace: true });
        }
        document.title = `${cards[0].fullName} - RepoVerse`;
      }
    } else if (cards.length === 0) {
      // No cards - only navigate to /app/discover if we're not loading a shared repo
      const currentPath = window.location.pathname;
      if (
        (currentPath.startsWith('/app/r/') || currentPath.startsWith('/r/')) &&
        (owner || repo)
      ) {
        // Keep the shared repo URL while loading
        document.title = 'RepoVerse - Loading...';
        return;
      }
      // Navigate to /app/discover only if we're not already there
      if (currentPath !== '/app/discover') {
        navigate('/app/discover', { replace: true });
      }
      document.title = 'RepoVerse - Discover';
    }
  }, [cards[0]?.fullName, cards.length, navigate, owner, repo]);

  const handleSkip = useCallback(async (repo?: Repository) => {
    const repoToSkip = repo || cards[0];
    if (repoToSkip) {
      // Push to undo stack (session-only, max 10)
      setSkippedRepos(prev => [repoToSkip, ...prev].slice(0, 10));

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
      // Show PWA install prompt after 1-2 swipes (BEFORE onboarding)
      // This ensures users see install prompt first, then onboarding later
      // Show PWA install prompt after 5-10 swipes (BEFORE onboarding)
      // Show to ALL users (old and new) - no user check
      if (newCount >= 5 && newCount <= 10) {
        // Double-check PWA status before showing prompt
        const installed = isPWAInstalled();
        setIsPWAInstalledState(installed);
        
        if (!installed) {
          // Non-blocking PWA check - wrap in try-catch to prevent errors from blocking UI
          import('@/utils/pwa').then(({ isInstallPromptAvailable, shouldShowIOSInstructions, isIOS }) => {
            try {
              const iosDevice = isIOS();
              const iosInstructions = shouldShowIOSInstructions();
              
              if (iosDevice && iosInstructions) {
                // iOS: Show instructions if not dismissed (show to all users)
                const dismissed = localStorage.getItem('pwa-install-dismissed-ios');
                if (!dismissed) {
                  console.log('[PWA] Showing iOS install instructions');
                  setShowPWAInstallPrompt(true);
                }
              } else {
                // Android: Show install prompt if available (show to all users)
                const dismissed = localStorage.getItem('pwa-install-dismissed');
                const promptAvailable = isInstallPromptAvailable();
                if (!dismissed && promptAvailable) {
                  console.log('[PWA] Showing Android install prompt');
                  setShowPWAInstallPrompt(true);
                }
              }
            } catch (error) {
              console.error('[PWA] Error checking install prompt:', error);
              // Don't block UI if PWA check fails
            }
          }).catch((error) => {
            console.error('[PWA] Error importing PWA utils:', error);
            // Don't block UI if import fails
          });
        }
      }
      // Show onboarding after 5-6 swipes (AFTER PWA prompt)
      // This ensures PWA install prompt shows first, then onboarding appears later
      if (newCount >= 5 && !preferences.onboardingCompleted && loaded) {
        setShowOnboarding(true);
        trackOnboarding('started');
      }
      return newCount;
    });
    
    // Remove the card
    setCards((prev) => {
      const newCards = prev.slice(1);
      // If we're running low on cards, trigger loading more
      if (newCards.length < 3 && !isLoadingMore) {
        // Use personalized repos if onboarding completed, otherwise random
        if (preferences.onboardingCompleted) {
          setTimeout(() => loadPersonalizedRepos(true), 100);
        } else {
          setTimeout(() => loadRandomRepos(true), 100);
        }
      }
      return newCards;
    });
  }, [cards, isLoadingMore, loadPersonalizedRepos, loadRandomRepos, preferences.onboardingCompleted, loaded]);

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
      // Show PWA install prompt after 1-2 swipes (BEFORE onboarding)
      // This ensures users see install prompt first, then onboarding later
      // Show PWA install prompt after 5-10 swipes (BEFORE onboarding)
      // Show to ALL users (old and new) - no user check
      if (newCount >= 5 && newCount <= 10) {
        // Double-check PWA status before showing prompt
        const installed = isPWAInstalled();
        setIsPWAInstalledState(installed);
        
        if (!installed) {
          // Non-blocking PWA check - wrap in try-catch to prevent errors from blocking UI
          import('@/utils/pwa').then(({ isInstallPromptAvailable, shouldShowIOSInstructions, isIOS }) => {
            try {
              const iosDevice = isIOS();
              const iosInstructions = shouldShowIOSInstructions();
              
              if (iosDevice && iosInstructions) {
                // iOS: Show instructions if not dismissed (show to all users)
                const dismissed = localStorage.getItem('pwa-install-dismissed-ios');
                if (!dismissed) {
                  console.log('[PWA] Showing iOS install instructions');
                  setShowPWAInstallPrompt(true);
                }
              } else {
                // Android: Show install prompt if available (show to all users)
                const dismissed = localStorage.getItem('pwa-install-dismissed');
                const promptAvailable = isInstallPromptAvailable();
                if (!dismissed && promptAvailable) {
                  console.log('[PWA] Showing Android install prompt');
                  setShowPWAInstallPrompt(true);
                }
              }
            } catch (error) {
              console.error('[PWA] Error checking install prompt:', error);
              // Don't block UI if PWA check fails
            }
          }).catch((error) => {
            console.error('[PWA] Error importing PWA utils:', error);
            // Don't block UI if import fails
          });
        }
      }
      // Show onboarding after 5-6 swipes (AFTER PWA prompt)
      // This ensures PWA install prompt shows first, then onboarding appears later
      if (newCount >= 5 && !preferences.onboardingCompleted && loaded) {
        setShowOnboarding(true);
        trackOnboarding('started');
      }
      return newCount;
    });
    
    // Remove the card
    setCards((prev) => {
      const newCards = prev.slice(1);
      // If we're running low on cards, trigger loading more
      if (newCards.length < 3 && !isLoadingMore) {
        // Use personalized repos if onboarding completed, otherwise random
        if (preferences.onboardingCompleted) {
          setTimeout(() => loadPersonalizedRepos(true), 100);
        } else {
          setTimeout(() => loadRandomRepos(true), 100);
        }
      }
      return newCards;
    });
  }, [cards, isLoadingMore, loadPersonalizedRepos, loadRandomRepos, preferences.onboardingCompleted, loaded]);

  const handleSave = useCallback(async (repo?: Repository) => {
    // ── Paywall: saving is a Pro feature ────────────────────────────────────
    void repo; // pro feature gate - suppress unused warning
    setPaywallType('save');
    setShowPaywall(true);
  }, []);

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

  const handleUndo = useCallback(() => {
    if (skippedRepos.length === 0) return;
    const [toRestore, ...remaining] = skippedRepos;
    setSkippedRepos(remaining);
    setUndoEntry(true);
    setCards(prev => [toRestore, ...prev]);
    // Reset undoEntry flag after the entry animation finishes
    setTimeout(() => setUndoEntry(false), 450);
    // Remove skip interaction from localStorage + Supabase so it stays undone next session
    interactionService.undoSkip(toRestore.id);
  }, [skippedRepos]);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (isSwiping || cards.length === 0 || triggerSwipe) return;

    // ── Daily swipe limit check (keyboard / button swipes) ──────────────────
    if (getSwipesLeft() <= 0) {
      setPaywallType('swipes');
      setShowPaywall(true);
      return;
    }
    
    setIsSwiping(true);
    // Trigger the animation in SwipeableCard
    setTriggerSwipe(direction);
  }, [isSwiping, cards.length, triggerSwipe]);

  // Handle the actual swipe action after animation completes
  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    // ── Daily swipe limit check (drag-triggered swipes) ─────────────────────
    if (getSwipesLeft() <= 0) {
      setPaywallType('swipes');
      setShowPaywall(true);
      setIsSwiping(false);
      setTriggerSwipe(null);
      return;
    }

    // Increment daily counter
    const newCount = incrementSwipesUsed();
    setDailySwipesUsed(newCount);

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
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Escape always closes panels
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSaved(false);
        setShowLiked(false);
        return;
      }

      // Z / Ctrl+Z / Cmd+Z = undo last skip (works anywhere in discover)
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Arrow keys and Enter only when panels are closed and cards exist
      if (showSaved || showLiked || cards.length === 0) return;

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
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cards.length, showSaved, showLiked, handleSwipe, handleSave, handleUndo]);

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
    return <HistoryPanel
      title="Saved Repos"
      icon={<Bookmark className="w-5 h-5" style={{ color: '#60a5fa' }} />}
      repos={savedRepos}
      emptyIcon={<Bookmark className="w-10 h-10" style={{ color: '#30363d' }} />}
      emptyText="No saved repos yet"
      emptySubtext="Tap the bookmark button on any card to save it here."
      accentColor="#2563eb"
      actionLabel="Remove"
      onAction={handleRemoveSaved}
      onClose={() => setShowSaved(false)}
    />;
  }

  if (showLiked) {
    return <HistoryPanel
      title="Liked Repos"
      icon={<Heart className="w-5 h-5" style={{ color: '#f43f5e' }} />}
      repos={likedRepos}
      emptyIcon={<Heart className="w-10 h-10" style={{ color: '#30363d' }} />}
      emptyText="No liked repos yet"
      emptySubtext="Swipe right or tap ♥ to like a repo."
      accentColor="#f43f5e"
      onClose={() => setShowLiked(false)}
    />;
  }

  // Loading state for shared repo
  if (isLoadingSharedRepo && cards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center pb-24 md:pb-0" style={{ background: '#0d1117' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-gray-400">Loading repository...</p>
          <p className="text-gray-500 text-sm text-center max-w-md px-4">
            {owner && repo ? `Fetching ${owner}/${repo}...` : loadingTip}
          </p>
        </div>
      </div>
    );
  }

  // Error state for shared repo
  if (sharedRepoError && cards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center pb-24 md:pb-0" style={{ background: '#0d1117' }}>
        <div className="flex flex-col items-center gap-4 p-4 max-w-md text-center">
          <XCircle className="w-12 h-12 text-red-400" />
          <p className="text-gray-300 mb-2">{sharedRepoError}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSharedRepoError(null);
                setIsLoadingSharedRepo(false);
                navigate('/app/discover', { replace: true });
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
            >
              Go to Discover
            </button>
            {owner && repo && (
              <button
                onClick={() => {
                  setSharedRepoError(null);
                  setIsLoadingSharedRepo(false);
                  setCards([]);
                  // Trigger reload by clearing state
                  window.location.reload();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state (only show if we have zero cards and something is actively loading)
  if (isLoadingMore && cards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center pb-24 md:pb-0" style={{ background: '#0d1117' }}>
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

  return (
    <div className="h-full flex flex-col pb-20 md:pb-16 relative overflow-hidden" style={{ background: '#0d1117' }}>
      {/* Header with bookmark, heart, and install button */}
      <div className="flex-shrink-0 p-4 md:p-6 flex justify-between items-center relative z-10 mb-1 md:mb-0">
        <h1 className="text-xl md:text-2xl" style={{ fontWeight: 700, color: '#e6edf3' }}>Explore</h1>
        <div className="flex items-center gap-3">
          {/* Daily swipe counter + undo shortcut */}
          <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums">
            <span style={{ color: dailySwipesUsed >= FREE_SWIPES ? '#ef4444' : '#6b7280' }}>
              {Math.max(0, FREE_SWIPES - dailySwipesUsed)} swipes left
            </span>
            {skippedRepos.length > 0 && (
              <>
                <span style={{ color: '#374151' }}>·</span>
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-0.5 transition-colors"
                  style={{ color: '#8b949e' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#e6edf3')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#8b949e')}
                  title="Undo last skip"
                >
                  ↩ {skippedRepos.length}
                </button>
              </>
            )}
          </span>
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
      <div className="flex-1 relative flex items-center justify-center max-w-2xl mx-auto w-full px-3 md:px-4 z-10 min-h-0" style={{ minHeight: 0 }}>
        {cards.length === 0 ? (
          isLoadingMore ? (
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
                    enterFromLeft={undoEntry}
            />
                )}
              </AnimatePresence>
            </div>
            
            {/* Loading indicator when loading more repos */}
            {isLoadingMore && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ opacity: 0.5 }}>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exploring deeper into the galaxy...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Skip / Undo / Like circular action buttons */}
      {cards.length > 0 && !showSaved && !showLiked && (
        <div className="flex-shrink-0 flex items-center justify-center gap-5 md:gap-8 pb-4 md:pb-6 z-10">
          {/* Skip */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.08 }}
            onClick={() => handleSwipe('left')}
            className="rounded-full flex items-center justify-center shadow-xl"
            style={{
              width: '56px', height: '56px',
              background: 'rgba(239,68,68,0.12)',
              border: '2px solid #ef4444',
            }}
            title="Skip (←)"
          >
            <XCircle className="w-7 h-7" style={{ color: '#ef4444' }} strokeWidth={2} />
          </motion.button>

          {/* Undo — slightly smaller, between skip and like */}
          <div style={{ position: 'relative' }}>
            {/* Blue dot when there are repos to undo */}
            {skippedRepos.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              />
            )}
            <motion.button
              whileTap={skippedRepos.length > 0 ? { scale: 0.88 } : {}}
              whileHover={skippedRepos.length > 0 ? { scale: 1.05 } : {}}
              onClick={handleUndo}
              className="rounded-full flex items-center justify-center"
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#8b949e',
                opacity: skippedRepos.length === 0 ? 0.3 : 1,
                cursor: skippedRepos.length === 0 ? 'not-allowed' : 'pointer',
                pointerEvents: skippedRepos.length === 0 ? 'none' : 'auto',
                transition: 'background 0.15s, border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (skippedRepos.length > 0) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
                  (e.currentTarget as HTMLElement).style.color = '#e6edf3';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                (e.currentTarget as HTMLElement).style.color = '#8b949e';
              }}
              title="Undo last skip"
            >
              <CornerUpLeft size={18} strokeWidth={1.5} />
            </motion.button>
          </div>

          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.08 }}
            onClick={() => handleSwipe('right')}
            className="rounded-full flex items-center justify-center shadow-xl"
            style={{
              width: '56px', height: '56px',
              background: 'rgba(34,197,94,0.12)',
              border: '2px solid #22c55e',
            }}
            title="Like (→)"
          >
            <Heart className="w-7 h-7" style={{ color: '#22c55e' }} fill="currentColor" strokeWidth={2} />
          </motion.button>
        </div>
      )}

      {/* PWA Install Prompt - Shows after 2-3 swipes if not installed */}
      <PWAInstallPrompt 
        show={showPWAInstallPrompt} 
        onDismiss={() => setShowPWAInstallPrompt(false)} 
      />

      {/* Paywall modal — free tier limits */}
      {showPaywall && (
        <PaywallModal
          type={paywallType}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  );
}

// ─── Language colour map (matches GitHub colours) ────────────────────────────
const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', 'C++': '#f34b7d',
  'C#': '#178600', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', Dart: '#00B4AB', Scala: '#c22d40', Shell: '#89e051',
  CSS: '#563d7c', HTML: '#e34c26', Vue: '#41b883', Svelte: '#ff3e00',
  Elixir: '#6e4a7e', Haskell: '#5e5086', Lua: '#000080', R: '#198CE7',
};

// ─── History panel repo card ──────────────────────────────────────────────────
function HistoryRepoCard({
  repo,
  accentColor,
  actionLabel,
  onAction,
}: {
  repo: Repository;
  accentColor: string;
  actionLabel?: string;
  onAction?: (id: string) => void;
}) {
  const ownerLogin = repo.owner?.login || repo.fullName?.split('/')[0] || '';
  const avatarUrl  = repo.owner?.avatarUrl;
  const tags = (repo.topics?.length ? repo.topics : repo.tags || []).slice(0, 2);
  const langColor  = repo.language ? (LANG_COLORS[repo.language] ?? '#8b949e') : null;
  const fmtStars = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div
      className="group relative flex flex-col gap-3 p-4 rounded-2xl transition-colors"
      style={{ background: '#161b22', border: '1px solid #21262d' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#30363d'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#21262d'; }}
    >
      {/* Remove button */}
      {actionLabel && onAction && (
        <button
          onClick={() => onAction(repo.id)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity p-1.5 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
          title={actionLabel}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Header: avatar + full name */}
      <div className="flex items-center gap-2 pr-8">
        {avatarUrl ? (
          <img src={avatarUrl} alt={ownerLogin} className="w-5 h-5 rounded-full flex-shrink-0" />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
            style={{ background: accentColor + '22', color: accentColor }}
          >
            {ownerLogin.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-xs truncate" style={{ color: '#8b949e', fontFamily: 'JetBrains Mono, monospace' }}>
          {repo.fullName || repo.name}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed line-clamp-2" style={{ color: '#c9d1d9' }}>
        {repo.description || <span style={{ color: '#484f58' }}>No description</span>}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#8b949e', border: '1px solid #30363d' }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer: language + stars + link */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-3">
          {langColor && repo.language && (
            <div className="flex items-center gap-1.5">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: langColor, flexShrink: 0 }} />
              <span className="text-xs" style={{ color: '#8b949e' }}>{repo.language}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <svg viewBox="0 0 16 16" fill="#e3b341" width="12" height="12">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 11.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.873 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
            </svg>
            <span className="text-xs" style={{ color: '#8b949e' }}>{fmtStars(repo.stars || 0)}</span>
          </div>
        </div>
        {repo.url && (
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: '#8b949e', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8b949e'; }}
          >
            GitHub
            <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
              <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

// ─── History full-screen panel ────────────────────────────────────────────────
function HistoryPanel({
  title, icon, repos, emptyIcon, emptyText, emptySubtext,
  accentColor, actionLabel, onAction, onClose,
}: {
  title: string;
  icon: React.ReactNode;
  repos: Repository[];
  emptyIcon: React.ReactNode;
  emptyText: string;
  emptySubtext: string;
  accentColor: string;
  actionLabel?: string;
  onAction?: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: '#0d1117' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-4"
        style={{ borderBottom: '1px solid #21262d' }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold" style={{ color: '#e6edf3' }}>{title}</h2>
          {repos.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: accentColor + '22', color: accentColor }}
            >
              {repos.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl transition-colors"
          style={{ color: '#8b949e', background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#161b22'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: '#161b22', border: '1px solid #21262d' }}
            >
              {emptyIcon}
            </div>
            <div>
              <p className="font-semibold mb-1" style={{ color: '#e6edf3' }}>{emptyText}</p>
              <p className="text-sm" style={{ color: '#8b949e' }}>{emptySubtext}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
            {repos.map(repo => (
              <HistoryRepoCard
                key={repo.id}
                repo={repo}
                accentColor={accentColor}
                actionLabel={actionLabel}
                onAction={onAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
interface SwipeableCardProps {
  repo: Repository;
  onSwipe: (direction: 'left' | 'right') => void;
  onSave?: () => void;
  triggerSwipe?: 'left' | 'right' | null;
  isFirstCard?: boolean; // Mark first card for LCP optimization
  enterFromLeft?: boolean; // Undo animation: card slides in from the left
}

const SwipeableCard = memo(function SwipeableCard({ repo, onSwipe, onSave, triggerSwipe, isFirstCard = false, enterFromLeft = false }: SwipeableCardProps) {
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
      initial={enterFromLeft ? { opacity: 0, x: -100, scale: 1 } : { opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
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
        touchAction: 'pan-x pan-y', // Allow both horizontal (swipe) and vertical (scroll) gestures
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
        
        {/* Skip indicator (left swipe) — red tint circle, no label */}
        <motion.div
          className="absolute top-12 left-6 flex items-center pointer-events-none z-30"
          style={{ opacity: skipOpacity }}
        >
          <div className="rounded-full p-3 shadow-xl" style={{ background: 'rgba(239,68,68,0.18)', border: '2.5px solid #ef4444' }}>
            <XCircle className="w-9 h-9" style={{ color: '#ef4444' }} strokeWidth={2.5} />
          </div>
        </motion.div>
        
        {/* Like indicator (right swipe) — green tint circle, no label */}
        <motion.div
          className="absolute top-12 right-6 flex items-center pointer-events-none z-30"
          style={{ opacity: saveOpacity }}
        >
          <div className="rounded-full p-3 shadow-xl" style={{ background: 'rgba(34,197,94,0.18)', border: '2.5px solid #22c55e' }}>
            <Heart className="w-9 h-9" style={{ color: '#22c55e' }} fill="currentColor" strokeWidth={2.5} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
});
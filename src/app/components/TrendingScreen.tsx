import { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { TrendingRepo } from '@/lib/types';
import { githubService } from '@/services/github.service';
import { categoryService, RepoCategory } from '@/services/category.service';

export function TrendingScreen() {
  const [timeRange, setTimeRange] = useState<'today' | 'week'>('today');
  const [selectedCategory, setSelectedCategory] = useState<RepoCategory | 'all'>('all');
  const [showUnknownGems, setShowUnknownGems] = useState(true); // Filter out well-known repos by default
  const [categorizedRepos, setCategorizedRepos] = useState<Map<RepoCategory, TrendingRepo[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrendingRepos();
  }, [timeRange, showUnknownGems]);

  const loadTrendingRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const since = timeRange === 'today' ? 'daily' : 'weekly';
      
      // Fetch trending repos (no language filter to get more variety)
      // Filter out well-known repos to surface unknown gems by default
      const trending = await githubService.getTrendingRepos({
        since,
        // PERFORMANCE: 40 is a good balance between variety and speed.
        perPage: 40,
        usePagination: false,
        excludeWellKnown: showUnknownGems, // Filter based on toggle
      });
      
      // Categorize repos
      const categorized = categoryService.categorizeRepos(trending);
      // Cast to TrendingRepo[] since TrendingRepo extends Repository
      const categorizedTrending = new Map<RepoCategory, TrendingRepo[]>();
      categorized.forEach((repos, category) => {
        categorizedTrending.set(category, repos as TrendingRepo[]);
      });
      setCategorizedRepos(categorizedTrending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending repos');
    } finally {
      setLoading(false);
    }
  };

  // Category display order
  const categoryOrder: RepoCategory[] = [
    'repos-all-should-know',
    'ai-automation',
    'open-source-alternatives',
    'frontend',
    'backend',
    'mobile',
    'desktop',
    'data-science',
    'devops',
    'ai',
    'game-dev',
    'generic',
  ];

  // Get repos for selected category
  const getDisplayRepos = (): { category: RepoCategory; repos: TrendingRepo[] }[] => {
    if (selectedCategory === 'all') {
      // Show all categories
      return categoryOrder
        .map(category => ({
          category,
          repos: categorizedRepos.get(category) || [],
        }))
        .filter(item => item.repos.length > 0);
    } else {
      // Show only selected category
      const repos = categorizedRepos.get(selectedCategory) || [];
      return repos.length > 0 ? [{ category: selectedCategory, repos }] : [];
    }
  };

  return (
    <div 
      className="h-full bg-black overflow-y-auto pb-24 md:pb-0"
    >
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>Trending Repositories</h1>
            
            {/* Time range toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('today')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  timeRange === 'today'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeRange('week')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  timeRange === 'week'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                This Week
              </button>
            </div>
          </div>
          
          {/* Unknown Gems toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUnknownGems(!showUnknownGems)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                showUnknownGems
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <span>{showUnknownGems ? 'Unknown Gems' : 'All Trending'}</span>
            </button>
            <span className="text-xs text-gray-400">
              {showUnknownGems 
                ? 'Showing lesser-known trending repos' 
                : 'Showing all trending repos including well-known ones'}
            </span>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={loadTrendingRepos}
              className="px-4 py-2 bg-white text-gray-900 rounded-full"
            >
              Retry
            </button>
          </div>
        )}

        {/* Category selection buttons */}
        {!loading && !error && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-3">
              {/* All categories button */}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                All
              </button>
              
              {/* Category buttons */}
              {categoryOrder.map((category) => {
                const repos = categorizedRepos.get(category) || [];
                if (repos.length === 0) return null;
                
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedCategory === category
                        ? 'bg-white text-gray-900 shadow-lg'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                    }`}
                  >
                    <span>{categoryService.getCategoryName(category)}</span>
                    <span className={`text-xs ${
                      selectedCategory === category ? 'text-white/80' : 'text-gray-400'
                    }`}>
                      ({repos.length})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categorized repos - Vertical list */}
        {!loading && !error && (
          <div className="space-y-8">
            {getDisplayRepos().map(({ category, repos }) => (
              <div key={category} className="space-y-4">
                {/* Category header (only show if showing all categories) */}
                {selectedCategory === 'all' && (
                  <>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>
                        {categoryService.getCategoryName(category)}
                      </h2>
                      <span className="text-sm text-gray-400">
                        ({repos.length})
                      </span>
                    </div>
                    
                    {/* Category description */}
                    <p className="text-sm text-gray-400 mb-4">
                      {categoryService.getCategoryDescription(category)}
                    </p>
                  </>
                )}

                {/* Repos vertical list */}
                <div className="space-y-3">
                  {repos.map((repo, index) => (
                    <SignatureCard
                      key={repo.id}
                      className="p-4 hover:bg-gray-800 transition-colors cursor-pointer rounded-xl"
                      showLayers={false}
                      onClick={() => window.open(repo.url, '_blank')}
                    >
                      <div className="flex items-start gap-4">
                        {/* Rank badge */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white text-gray-900 font-bold flex items-center justify-center text-sm shadow-md">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Repo name and trending badge */}
                          <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-bold text-lg text-white hover:text-gray-200 transition-colors font-mono">
                              {repo.fullName}
                            </h3>
                            <span className="flex-shrink-0 text-xs text-gray-300 font-medium bg-gray-800 px-2 py-0.5 rounded">
                              {repo.trending}
                            </span>
                          </div>
                          
                          {/* Description */}
                          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                            {repo.description}
                          </p>
                          
                          {/* Tags and stats */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex flex-wrap gap-1.5">
                              {repo.tags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2.5 py-1 bg-gray-700 text-gray-200 rounded-full text-xs font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-1 text-gray-300">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">
                                {(repo.stars / 1000).toFixed(1)}k
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SignatureCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
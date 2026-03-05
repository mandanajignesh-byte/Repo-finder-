import { useState, useEffect } from 'react';
import { Star, Loader2, Share2 } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { TrendingRepo } from '@/lib/types';
import { githubService } from '@/services/github.service';
import { categoryService, RepoCategory } from '@/services/category.service';
import { shareService } from '@/services/share.service';

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
      className="h-full overflow-y-auto pb-24 md:pb-0"
      style={{ background: '#0d1117' }}
    >
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h1 className="text-xl md:text-2xl" style={{ fontWeight: 700, color: '#e6edf3' }}>Trending Repositories</h1>
            
            {/* Time range toggle */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setTimeRange('today')}
                className="flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all"
                style={{
                  backgroundColor: timeRange === 'today' ? '#2563eb' : '#161b22',
                  color: timeRange === 'today' ? '#ffffff' : '#8b949e',
                  borderRadius: '999px',
                  border: timeRange === 'today' ? '1px solid #2563eb' : '1px solid #21262d',
                }}
              >
                Today
              </button>
              <button
                onClick={() => setTimeRange('week')}
                className="flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all"
                style={{
                  backgroundColor: timeRange === 'week' ? '#2563eb' : '#161b22',
                  color: timeRange === 'week' ? '#ffffff' : '#8b949e',
                  borderRadius: '999px',
                  border: timeRange === 'week' ? '1px solid #2563eb' : '1px solid #21262d',
                }}
              >
                This Week
              </button>
            </div>
          </div>
          
          {/* Unknown Gems toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowUnknownGems(!showUnknownGems)}
              className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-2"
              style={{
                backgroundColor: showUnknownGems ? '#2563eb' : '#161b22',
                color: showUnknownGems ? '#ffffff' : '#8b949e',
                borderRadius: '999px',
                border: showUnknownGems ? '1px solid #2563eb' : '1px solid #21262d',
              }}
            >
              <span>{showUnknownGems ? 'Unknown Gems' : 'All Trending'}</span>
            </button>
            <span className="text-[10px] md:text-xs text-gray-400">
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
          <div className="mb-4 md:mb-6">
            <div className="flex flex-wrap gap-2 md:gap-3">
              {/* All categories button */}
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-3 md:px-4 py-1.5 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all"
                style={{
                  backgroundColor: selectedCategory === 'all' ? '#2563eb' : '#161b22',
                  color: selectedCategory === 'all' ? '#ffffff' : '#8b949e',
                  borderRadius: '999px',
                  border: selectedCategory === 'all' ? '1px solid #2563eb' : '1px solid #21262d',
                }}
                onMouseEnter={(e) => { if (selectedCategory !== 'all') (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; }}
                onMouseLeave={(e) => { if (selectedCategory !== 'all') (e.currentTarget as HTMLElement).style.borderColor = '#21262d'; }}
              >
                All
              </button>
              
              {/* Category buttons */}
              {categoryOrder.map((category) => {
                const repos = categorizedRepos.get(category) || [];
                if (repos.length === 0) return null;
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="px-3 md:px-4 py-1.5 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-1.5 md:gap-2"
                    style={{
                      backgroundColor: isActive ? '#2563eb' : '#161b22',
                      color: isActive ? '#ffffff' : '#8b949e',
                      borderRadius: '999px',
                      border: isActive ? '1px solid #2563eb' : '1px solid #21262d',
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#21262d'; }}
                  >
                    <span>{categoryService.getCategoryName(category)}</span>
                    <span className="text-[10px] md:text-xs" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : '#8b949e' }}>
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
                    <div className="flex items-center gap-3" style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                      <h2 className="text-xl md:text-2xl" style={{ fontWeight: 700, color: '#e6edf3' }}>
                        {categoryService.getCategoryName(category)}
                      </h2>
                      <span className="text-sm" style={{ color: '#8b949e' }}>
                        ({repos.length})
                      </span>
                    </div>
                    
                    {/* Category description */}
                    <p className="text-sm mb-4" style={{ color: '#8b949e' }}>
                      {categoryService.getCategoryDescription(category)}
                    </p>
                  </>
                )}

                {/* Repos vertical list */}
                <div className="space-y-3">
                  {repos.map((repo, index) => (
                    <SignatureCard
                      key={repo.id}
                      className="p-3 md:p-4 cursor-pointer rounded-xl"
                      showLayers={false}
                      onClick={() => window.open(repo.url, '_blank')}
                      style={{
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(-2px)';
                        el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(0)';
                        el.style.boxShadow = 'none';
                      }}
                    >
                      <div className="flex items-start gap-3 md:gap-4">
                        {/* Rank badge */}
                        <div
                          className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg font-bold flex items-center justify-center text-xs md:text-sm shadow-md"
                          style={{
                            background: index === 0 ? '#2563eb' : '#1f2937',
                            color: index === 0 ? '#fff' : '#8b949e',
                            boxShadow: index === 0 ? '0 0 10px rgba(37,99,235,0.4)' : undefined,
                          }}
                        >
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Repo name and trending badge */}
                          <div className="flex items-start sm:items-center gap-1.5 md:gap-2 mb-1 md:mb-1.5 flex-wrap">
                          <h3 className="font-bold text-base md:text-lg text-white hover:text-gray-200 transition-colors font-mono break-words">
                              {repo.fullName}
                            </h3>
                            <span className="flex-shrink-0 text-[10px] md:text-xs text-gray-300 font-medium bg-gray-800 px-1.5 md:px-2 py-0.5 rounded">
                              {repo.trending}
                            </span>
                          </div>
                          
                          {/* Description */}
                          <p className="text-gray-300 text-xs md:text-sm mb-2 md:mb-3 line-clamp-2">
                            {repo.description}
                          </p>
                          
                          {/* Tags and stats */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex flex-wrap gap-1 md:gap-1.5">
                              {repo.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium"
                                  style={{ background: '#1f2937', color: '#60a5fa' }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="flex items-center gap-1 text-gray-300">
                                <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs md:text-sm font-medium">
                                  {(repo.stars / 1000).toFixed(1)}k
                                </span>
                              </div>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await shareService.shareRepositoryWithPlatformLink(repo);
                                }}
                                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                                style={{ color: '#8E8E93' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#8E8E93')}
                              >
                                <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-xs">Share</span>
                              </button>
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
import { Star, Clock, GitFork, Scale, ExternalLink, Bookmark, Share2, Copy, Check } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { Repository } from '@/lib/types';
import { useRef, useEffect, useState, memo } from 'react';
import { shareService } from '@/services/share.service';
import { githubService } from '@/services/github.service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { showToast } from '@/utils/toast';
import { trackShare, trackRepoInteraction } from '@/utils/analytics';

interface RepoCardProps {
  repo: Repository;
  style?: React.CSSProperties;
  onSave?: () => void;
  isFirstCard?: boolean; // Mark first card for LCP optimization
}

export const RepoCard = memo(function RepoCard({ repo, style, onSave, isFirstCard = false }: RepoCardProps) {
  const scrollableRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [scrollableHeight, setScrollableHeight] = useState<number | undefined>(undefined);
  const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isReadmeOpen, setIsReadmeOpen] = useState(false);
  const [readme, setReadme] = useState<string | null>(null);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await shareService.copyPlatformLink(repo);
    if (success) {
      setLinkCopied(true);
      showToast('Link copied to clipboard!');
      trackShare('copy', 'repo', repo.id);
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      showToast('Failed to copy link');
    }
  };
  
  useEffect(() => {
    const calculateHeight = () => {
      if (!cardRef.current || !footerRef.current) return;
      
      // Get the actual computed heights
      const cardRect = cardRef.current.getBoundingClientRect();
      const cardHeight = cardRect.height;
      const footerRect = footerRef.current.getBoundingClientRect();
      const footerHeight = footerRect.height;
      
      // Account for padding (p-6 = 24px top + 24px bottom = 48px total)
      const padding = 48;
      // Account for margin (mt-4 = 16px)
      const margin = 16;
      // Extra safety buffer
      const buffer = 20;
      
      // Calculate available height for scrollable content
      const availableHeight = cardHeight - footerHeight - padding - margin - buffer;
      
      if (availableHeight > 100) { // Only set if we have reasonable space
        setScrollableHeight(availableHeight);
      } else {
        // Fallback: use a calculated percentage-based height
        const fallbackHeight = cardHeight * 0.65; // Use 65% of card height
        setScrollableHeight(fallbackHeight);
      }
    };
    
    // Debounced calculation function
    let debounceTimer: NodeJS.Timeout;
    const debouncedCalculate = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(calculateHeight, 100);
    };
    
    // Calculate immediately
    calculateHeight();
    
    // Also calculate after a delay to ensure DOM is fully rendered
    const timeoutId1 = setTimeout(calculateHeight, 100);
    
    const resizeObserver = new ResizeObserver(debouncedCalculate);
    
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }
    if (footerRef.current) {
      resizeObserver.observe(footerRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(debounceTimer);
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);
  
  return (
    <div ref={cardRef} className="h-full w-full" style={{ ...style, maxHeight: '100%', height: '100%', overflow: 'visible' }}>
      <SignatureCard 
        className="h-full max-h-full p-6 md:p-8 flex flex-col relative overflow-hidden" 
        showLayers={false}
        showParticles={false}
      >
        {/* Fit Score Badge */}
        {repo.fitScore && (
          <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-gray-100 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg z-20">
            {repo.fitScore}% fit
          </div>
        )}
        
        {/* Scrollable content area */}
        <div 
          ref={scrollableRef}
          className="overflow-y-auto overflow-x-hidden pr-2 scrollable-content flex-1 min-h-0"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#4B5563 #1F2937',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            maxHeight: scrollableHeight ? `${scrollableHeight}px` : 'calc(100% - 200px)', // Fallback: reserve space for footer
            height: scrollableHeight ? `${scrollableHeight}px` : 'auto',
          }}
          onWheel={(e) => {
            // Allow native wheel scrolling - don't stop propagation to allow scrolling
            const parent = e.currentTarget.closest('[data-swipeable-card]');
            if (parent) {
              parent.dispatchEvent(new CustomEvent('disableDrag'));
              
              // Clear existing timer
              if (scrollEndTimerRef.current) {
                clearTimeout(scrollEndTimerRef.current);
              }
              
              // Set a timer to re-enable drag after scrolling stops
              scrollEndTimerRef.current = setTimeout(() => {
                if (parent) {
                  parent.dispatchEvent(new CustomEvent('enableDrag'));
                }
                scrollEndTimerRef.current = null;
              }, 150); // Re-enable after 150ms of no scrolling
            }
            // Let the scroll happen naturally
          }}
          onScroll={() => {
            // Keep drag disabled while scrolling
            const parent = document.querySelector('[data-swipeable-card]');
            if (parent) {
              parent.dispatchEvent(new CustomEvent('disableDrag'));
              
              // Clear existing timer
              if (scrollEndTimerRef.current) {
                clearTimeout(scrollEndTimerRef.current);
              }
              
              // Set a timer to re-enable drag after scrolling stops
              scrollEndTimerRef.current = setTimeout(() => {
                if (parent) {
                  parent.dispatchEvent(new CustomEvent('enableDrag'));
                }
                scrollEndTimerRef.current = null;
              }, 150); // Re-enable after 150ms of no scrolling
            }
          }}
          onTouchMove={(e) => {
            // Allow touch scrolling
            const parent = e.currentTarget.closest('[data-swipeable-card]');
            if (parent) {
              parent.dispatchEvent(new CustomEvent('disableDrag'));
              
              // Clear existing timer
              if (scrollEndTimerRef.current) {
                clearTimeout(scrollEndTimerRef.current);
              }
              
              // Set a timer to re-enable drag after scrolling stops
              scrollEndTimerRef.current = setTimeout(() => {
                if (parent) {
                  parent.dispatchEvent(new CustomEvent('enableDrag'));
                }
                scrollEndTimerRef.current = null;
              }, 150); // Re-enable after 150ms of no scrolling
            }
          }}
          onTouchEnd={() => {
            // Re-enable drag when touch ends
            const parent = document.querySelector('[data-swipeable-card]');
            if (parent) {
              // Clear existing timer
              if (scrollEndTimerRef.current) {
                clearTimeout(scrollEndTimerRef.current);
              }
              // Re-enable immediately when touch ends
              setTimeout(() => {
                if (parent) {
                  parent.dispatchEvent(new CustomEvent('enableDrag'));
                }
              }, 100);
            }
          }}
        >
          <div className="flex flex-col gap-3 md:gap-5 pt-2 md:pt-0 pr-12 md:pr-24 pb-4 md:pb-6">
            {/* Owner and Repo name */}
            <div className="pr-8 md:pr-20">
              <div className="flex items-center gap-2 mb-1">
                {repo.owner?.avatarUrl && (
                  <img 
                    src={repo.owner.avatarUrl} 
                    alt={repo.owner.login}
                    className="w-6 h-6 rounded-full"
                    width="24"
                    height="24"
                    loading={isFirstCard ? "eager" : "lazy"}
                    fetchpriority={isFirstCard ? "high" : "auto"}
                    decoding="async"
                  />
                )}
                <span className="text-sm font-mono" style={{ color: '#8E8E93' }}>{repo.owner?.login || ''}</span>
              </div>
              <h2
                className="text-xl md:text-3xl leading-tight break-words font-mono"
                style={{ color: '#FFFFFF', fontWeight: 600 }}
              >
                {repo.fullName || repo.name}
              </h2>
            </div>
            
            {/* Description */}
            <p
              className="text-sm md:text-lg leading-relaxed line-clamp-3"
              style={{ color: '#B3B3B8' }}
            >
              {repo.description}
            </p>

            {/* README preview toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const nextOpen = !isReadmeOpen;
                  setIsReadmeOpen(nextOpen);

                  // Lazy-load README the first time the user opens it
                  if (nextOpen && !readme && !readmeLoading && !readmeError) {
                    setReadmeLoading(true);
                    setReadmeError(null);
                    try {
                      const fullName = repo.fullName || repo.name;
                      const content = await githubService.getRepoReadme(fullName);
                      if (!content) {
                        setReadme('No README found for this repository.');
                      } else {
                        setReadme(content);
                      }
                    } catch (err) {
                      console.error('Failed to load README preview:', err);
                      setReadmeError('Unable to load README preview from GitHub.');
                    } finally {
                      setReadmeLoading(false);
                    }
                  }
                }}
                className="text-xs md:text-sm font-medium underline underline-offset-4"
                style={{ color: '#E5E5EA' }}
              >
                {isReadmeOpen ? 'Hide README preview' : 'Preview README'}
              </button>
            </div>

            {isReadmeOpen && (
              <div className="mt-3 rounded-xl border border-gray-700 bg-black/40 p-3 md:p-4">
                {readmeLoading && (
                  <p className="text-xs md:text-sm" style={{ color: '#8E8E93' }}>
                    Loading README from GitHub…
                  </p>
                )}
                {!readmeLoading && readmeError && (
                  <p className="text-xs md:text-sm" style={{ color: '#8E8E93' }}>
                    {readmeError}
                  </p>
                )}
                {!readmeLoading && !readmeError && readme && (
                  <div className="text-xs md:text-sm leading-relaxed space-y-2 readme-markdown">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-sm md:text-base font-semibold text-white mt-2 mb-1" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-xs md:text-sm font-semibold text-white mt-2 mb-1" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-xs md:text-sm font-semibold text-gray-100 mt-2 mb-1" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="text-[11px] md:text-sm text-gray-200 mb-1" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            className="underline underline-offset-2 text-blue-400 hover:text-blue-300 break-words"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="ml-4 list-disc text-[11px] md:text-sm text-gray-200" {...props} />
                        ),
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              className="px-1 py-0.5 rounded bg-black/60 border border-gray-700 text-[10px] md:text-xs"
                              {...props}
                            />
                          ) : (
                            <code
                              className="block p-2 rounded bg-black/70 border border-gray-700 text-[10px] md:text-xs overflow-x-auto"
                              {...props}
                            />
                          ),
                        img: ({ node, ...props }) => (
                          <img
                            className="max-h-32 md:max-h-40 w-auto rounded border border-gray-700 object-contain"
                            loading="lazy"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {readme}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
            
            {/* Tech stack tags and topics */}
            {(repo.tags.length > 0 || repo.topics) && (() => {
              // Create a set of existing tags (case-insensitive) to avoid duplicates
              const existingTags = new Set(repo.tags.map(t => t.toLowerCase()));
              
              // Get additional topics that aren't already in tags
              const additionalTopics = repo.topics 
                ? repo.topics.filter(topic => !existingTags.has(topic.toLowerCase()))
                : [];
              
              return (
                <div className="flex flex-wrap gap-2">
                  {/* Show tags (language + first few topics) */}
                  {repo.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-700 text-gray-200 rounded-full text-xs md:text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                  {/* Show additional topics that aren't duplicates */}
                  {additionalTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-800 text-gray-200 border border-gray-600 rounded-full text-xs md:text-sm font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
        
        {/* Fixed stats and metadata row at bottom */}
        <div ref={footerRef} className="footer-section flex-shrink-0 pt-3 md:pt-6 mt-3 md:mt-4 mb-2 md:mb-4 border-t-2 border-gray-700 space-y-2 md:space-y-3 overflow-hidden">
          {/* Primary stats */}
            <div className="flex items-center flex-wrap gap-3 md:gap-6">
              <div className="flex items-center gap-2" style={{ color: '#8E8E93' }}>
                <Star
                  className="w-4 h-4 md:w-5 md:h-5"
                  style={{ color: '#0A84FF' }}
                  fill="currentColor"
                />
                <span className="font-medium text-sm md:text-base">{repo.stars.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: '#8E8E93' }}>
                <GitFork className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-medium text-sm md:text-base">{repo.forks.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: '#8E8E93' }}>
                <Clock className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-medium text-sm md:text-base">{repo.lastUpdated}</span>
              </div>
            </div>
          
          {/* License and language */}
          <div className="flex items-center flex-wrap gap-3 md:gap-4 text-xs md:text-sm" style={{ color: '#8E8E93' }}>
            {repo.license && (
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4" />
                <span>{repo.license}</span>
              </div>
            )}
            {repo.language && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-100"></div>
                <span>{repo.language}</span>
              </div>
            )}
          </div>
          
          {/* Platform Share Link - Visible and Copyable */}
          <div className="pt-2 md:pt-3 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700">
                <p className="text-[10px] md:text-xs text-gray-400 mb-0.5">Shareable Link</p>
                <div className="flex items-center gap-2 min-w-0">
                  <span 
                    className="text-xs md:text-sm text-gray-200 font-mono truncate flex-1"
                    title={shareService.generatePlatformShareLink(repo)}
                  >
                    {shareService.generatePlatformShareLink(repo)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCopyLink}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-shrink-0 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors flex items-center justify-center"
                title="Copy link"
              >
                {linkCopied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-300" />
                )}
              </button>
            </div>
          </div>
          
          {/* GitHub link and Share button */}
          <div className="flex items-center gap-3 md:gap-4 flex-wrap pt-2">
            {repo.url && (
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium transition-colors"
                style={{ color: '#0A84FF' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#4DA3FF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#0A84FF')}
              >
                <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">View on GitHub</span>
                <span className="sm:hidden">GitHub</span>
              </a>
            )}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const shared = await shareService.shareRepositoryWithPlatformLink(repo);
                if (shared) {
                  trackShare('native', 'repo', repo.id);
                } else {
                  // Fallback to copy
                  trackShare('copy', 'repo', repo.id);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium transition-colors"
              style={{ color: '#0A84FF' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#4DA3FF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#0A84FF')}
            >
              <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Share</span>
            </button>
          </div>
          
          {/* Save button - integrated in card */}
          {onSave && (
            <div className="pt-3 md:pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full px-4 md:px-6 py-2.5 md:py-3 font-semibold rounded-full text-xs md:text-sm flex items-center justify-center gap-2 transition-all duration-200"
                style={{
                  backgroundColor: '#2C2C2E',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#FFFFFF',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0A84FF';
                  e.currentTarget.style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.transform = 'scale(1.0)';
                }}
              >
                <Bookmark className="w-5 h-5" />
                Save
              </button>
            </div>
          )}
        </div>
      </SignatureCard>
    </div>
  );
});
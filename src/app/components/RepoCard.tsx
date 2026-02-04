import { Star, Clock, GitFork, Scale, ExternalLink, Bookmark } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { Repository } from '@/lib/types';
import { useRef, useEffect, useState, memo } from 'react';

interface RepoCardProps {
  repo: Repository;
  style?: React.CSSProperties;
  onSave?: () => void;
}

export const RepoCard = memo(function RepoCard({ repo, style, onSave }: RepoCardProps) {
  const scrollableRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [scrollableHeight, setScrollableHeight] = useState<number | undefined>(undefined);
  
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
          onPointerDown={(e) => {
            // Prevent drag from starting on scrollable content
            e.stopPropagation();
            const parent = e.currentTarget.closest('[data-swipeable-card]');
            if (parent) {
              parent.dispatchEvent(new CustomEvent('disableDrag'));
            }
          }}
          onWheel={(e) => {
            // Allow native wheel scrolling - don't stop propagation to allow scrolling
            const parent = e.currentTarget.closest('[data-swipeable-card]');
            if (parent) {
              parent.dispatchEvent(new CustomEvent('disableDrag'));
            }
            // Let the scroll happen naturally
          }}
          onScroll={() => {
            // Keep drag disabled while scrolling
            const parent = document.querySelector('[data-swipeable-card]');
            if (parent) {
              parent.dispatchEvent(new CustomEvent('disableDrag'));
            }
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            const parent = e.currentTarget.closest('[data-swipeable-card]');
            if (parent) {
              parent.dispatchEvent(new CustomEvent('disableDrag'));
            }
          }}
          onTouchMove={(e) => {
            // Allow touch scrolling
            const parent = e.currentTarget.closest('[data-swipeable-card]');
            if (parent) {
              parent.dispatchEvent(new CustomEvent('disableDrag'));
            }
          }}
        >
          <div className="flex flex-col gap-4 md:gap-5 pt-2 md:pt-0 pr-20 md:pr-24 pb-6">
            {/* Owner and Repo name */}
            <div className="pr-16 md:pr-20">
              <div className="flex items-center gap-2 mb-1">
                {repo.owner?.avatarUrl && (
                  <img 
                    src={repo.owner.avatarUrl} 
                    alt={repo.owner.login}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="text-sm font-mono" style={{ color: '#8E8E93' }}>{repo.owner?.login || ''}</span>
              </div>
              <h2
                className="text-2xl md:text-3xl leading-tight break-words font-mono"
                style={{ color: '#FFFFFF', fontWeight: 600 }}
              >
                {repo.fullName || repo.name}
              </h2>
            </div>
            
            {/* Description */}
            <p
              className="text-base md:text-lg leading-relaxed line-clamp-3"
              style={{ color: '#B3B3B8' }}
            >
              {repo.description}
            </p>
            
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
        <div ref={footerRef} className="footer-section flex-shrink-0 pt-4 md:pt-6 mt-4 mb-4 border-t-2 border-gray-700 space-y-3 overflow-hidden">
          {/* Primary stats */}
            <div className="flex items-center flex-wrap gap-4 md:gap-6">
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
          <div className="flex items-center flex-wrap gap-4 text-sm" style={{ color: '#8E8E93' }}>
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
          
          {/* GitHub link */}
          {repo.url && (
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: '#0A84FF' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#4DA3FF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#0A84FF')}
            >
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </a>
          )}
          
          {/* Save button - integrated in card */}
          {onSave && (
            <div className="pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full px-6 py-3 font-semibold rounded-full text-sm flex items-center justify-center gap-2 transition-all duration-200"
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
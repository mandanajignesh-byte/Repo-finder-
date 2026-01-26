import { Star, Clock, GitFork, Scale, ExternalLink, Bookmark } from 'lucide-react';
import { motion } from 'motion/react';
import { SignatureCard } from './SignatureCard';
import { Repository } from '@/lib/types';
import { useRef, useEffect, useState } from 'react';

interface RepoCardProps {
  repo: Repository;
  style?: React.CSSProperties;
  onSave?: () => void;
}

export function RepoCard({ repo, style, onSave }: RepoCardProps) {
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
    
    // Calculate immediately
    calculateHeight();
    
    // Also calculate after delays to ensure DOM is fully rendered
    const timeoutId1 = setTimeout(calculateHeight, 50);
    const timeoutId2 = setTimeout(calculateHeight, 200);
    
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize calculations
      setTimeout(calculateHeight, 50);
    });
    
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }
    if (footerRef.current) {
      resizeObserver.observe(footerRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      resizeObserver.disconnect();
    };
  }, []);
  
  return (
    <div ref={cardRef} className="h-full w-full" style={{ ...style, maxHeight: '100%', height: '100%', overflow: 'visible' }}>
      <SignatureCard 
        className="h-full max-h-full p-6 md:p-8 flex flex-col relative overflow-hidden" 
        showLayers={true}
        showParticles={true}
      >
        {/* Fit Score Badge */}
        {repo.fitScore && (
          <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-gradient-to-br from-cyan-700 to-pink-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg z-20">
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
                <span className="text-sm text-gray-400 font-mono">{repo.owner?.login || ''}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight text-white break-words font-mono">{repo.fullName || repo.name}</h2>
            </div>
            
            {/* Description */}
            <p className="text-base md:text-lg text-gray-300 leading-relaxed">
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
                      className="px-3 md:px-4 py-1.5 md:py-2 bg-cyan-900/30 text-cyan-300 border border-cyan-700 rounded-full text-xs md:text-sm font-medium"
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
            <div className="flex items-center gap-2 text-gray-300">
              <Star className="w-4 h-4 md:w-5 md:h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-sm md:text-base">{repo.stars.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <GitFork className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-medium text-sm md:text-base">{repo.forks.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-medium text-sm md:text-base">{repo.lastUpdated}</span>
            </div>
          </div>
          
          {/* License and language */}
          <div className="flex items-center flex-wrap gap-4 text-sm text-gray-400">
            {repo.license && (
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4" />
                <span>{repo.license}</span>
              </div>
            )}
            {repo.language && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
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
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </a>
          )}
          
          {/* Save button - integrated in card */}
          {onSave && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="pt-4"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full px-6 py-3 font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #0891b2 0%, #be185d 100%)',
                  color: '#ffffff',
                  fontWeight: '700',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)'
                }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Bookmark className="w-5 h-5" />
                </motion.div>
                Save
              </motion.button>
            </motion.div>
          )}
        </div>
      </SignatureCard>
    </div>
  );
}
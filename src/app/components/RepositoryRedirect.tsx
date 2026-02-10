import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { githubService } from '@/services/github.service';
import { Repository } from '@/lib/types';
import { Loader2, Heart, Bookmark, X, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { RepoCard } from './RepoCard';
import { SignatureCard } from './SignatureCard';
import { trackNavigation } from '@/utils/analytics';

export function RepositoryRedirect() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [savedRepos, setSavedRepos] = useState<Repository[]>([]);
  const [likedRepos, setLikedRepos] = useState<Repository[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showLiked, setShowLiked] = useState(false);

  useEffect(() => {
    const loadRepo = async () => {
      if (!owner || !repo) {
        setError('Invalid repository URL');
        setLoading(false);
        return;
      }

      try {
        const fullName = `${owner}/${repo}`;

        // Fetch repo details from GitHub
        const repoData = await githubService.getRepo(fullName);

        if (repoData) {
          setRepository(repoData);
        } else {
          setError('Repository not found');
        }
      } catch (err) {
        console.error('Error loading repository:', err);
        setError('Failed to load repository');
      } finally {
        setLoading(false);
      }
    };

    loadRepo();
  }, [owner, repo]);

  // Load saved and liked repos from Supabase
  useEffect(() => {
    const loadRepos = async () => {
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
      }
    };
    
    loadRepos();
  }, []);

  const handleRemoveSaved = async (repoId: string) => {
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
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center pb-24 md:pb-0">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading repository...</p>
        </div>
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div className="h-screen bg-black flex items-center justify-center pb-24 md:pb-0">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <p className="text-gray-300 text-sm">{error || 'Repository not found'}</p>
          <p className="text-gray-500 text-xs">
            The link may be incorrect or the repository might be private.
          </p>
          <Link
            to="/discover"
            className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-900"
          >
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  // Show saved repos section
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

  // Show liked repos section
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

  return (
    <div className="h-full bg-black flex flex-col pb-20 md:pb-16 relative overflow-hidden">
      {/* Header with bookmark and heart (same as Explore) */}
      <div className="flex-shrink-0 p-4 md:p-6 flex justify-between items-center relative z-10 mb-1 md:mb-0">
        <h1 className="text-xl md:text-2xl text-white" style={{ fontWeight: 700 }}>Explore</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowLiked(true);
              trackNavigation('liked', 'repo-view');
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
              trackNavigation('saved', 'repo-view');
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

      {/* Centered repo card with fixed height (same proportions as Explore swipe card) */}
      <div className="flex-1 relative flex items-center justify-center max-w-2xl mx-auto w-full px-3 md:px-4 pt-2 md:pt-12 pb-20 md:pb-24 z-10 min-h-0">
        <div className="relative w-full max-w-md h-[400px] md:h-[600px] max-h-[70vh] md:max-h-[80vh]">
          <RepoCard
            repo={repository}
            isFirstCard={true}
            style={{ height: '100%', maxHeight: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}

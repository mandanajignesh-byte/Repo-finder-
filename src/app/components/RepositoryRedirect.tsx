import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { githubService } from '@/services/github.service';
import { Repository } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { RepoCard } from './RepoCard';

export function RepositoryRedirect() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);

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

  return (
    <div className="h-full bg-black flex flex-col pb-20 md:pb-16 relative overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 md:p-6 flex justify-between items-center relative z-10 mb-1 md:mb-0">
        <div>
          <h1 className="text-xl md:text-2xl text-white" style={{ fontWeight: 700 }}>
            Repository
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1">
            Direct link view for this repo. You can share this URL like a YouTube video link.
          </p>
        </div>
        <Link
          to="/discover"
          className="text-xs md:text-sm text-gray-300 hover:text-white transition-colors"
        >
          ← Back to Explore
        </Link>
      </div>

      {/* Centered repo card */}
      <div className="flex-1 relative flex items-center justify-center max-w-2xl mx-auto w-full px-3 md:px-4 pt-2 md:pt-4 pb-20 md:pb-24 z-10 min-h-0">
        <div
          className="relative w-full max-w-md"
          style={{ minHeight: '400px', marginTop: '0.5rem', marginBottom: '0.5rem' }}
        >
          <RepoCard repo={repository} isFirstCard={true} />
        </div>
      </div>
    </div>
  );
}

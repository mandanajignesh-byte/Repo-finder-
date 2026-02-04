import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { githubService } from '@/services/github.service';
import { Repository } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export function RepositoryRedirect() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAndRedirect = async () => {
      if (!owner || !repo) {
        navigate('/discover');
        return;
      }

      try {
        const fullName = `${owner}/${repo}`;
        
        // Fetch repo details from GitHub
        const repoData = await githubService.getRepo(fullName);
        
        if (repoData) {
          // Store repo in sessionStorage to show in DiscoveryScreen
          sessionStorage.setItem('sharedRepo', JSON.stringify(repoData));
          
          // Redirect to discover page
          navigate('/discover', { 
            state: { sharedRepo: repoData },
            replace: true 
          });
        } else {
          setError('Repository not found');
          setTimeout(() => navigate('/discover'), 2000);
        }
      } catch (err) {
        console.error('Error loading repository:', err);
        setError('Failed to load repository');
        setTimeout(() => navigate('/discover'), 2000);
      } finally {
        setLoading(false);
      }
    };

    loadAndRedirect();
  }, [owner, repo, navigate]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading repository...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400">{error}</p>
          <p className="text-gray-500 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
}

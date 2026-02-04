/**
 * Share Service
 * Handles sharing of GitHub repositories using Web Share API or clipboard fallback
 */

import { Repository } from '@/lib/types';

class ShareService {
  /**
   * Share a repository using Web Share API or clipboard fallback
   */
  async shareRepository(repo: Repository): Promise<boolean> {
    const shareText = this.buildShareText(repo);
    const shareUrl = repo.url || `https://github.com/${repo.fullName || repo.name}`;

    // Try Web Share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${repo.fullName || repo.name} - ${repo.description || 'GitHub Repository'}`,
          text: shareText,
          url: shareUrl,
        });
        return true;
      } catch (error) {
        // User cancelled or error occurred, fall back to clipboard
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      const shareContent = `${shareText}\n\n${shareUrl}`;
      await navigator.clipboard.writeText(shareContent);
      
      // Show toast notification (if available)
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success('Repository link copied to clipboard!');
      }
      
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  /**
   * Build share text for repository
   */
  private buildShareText(repo: Repository): string {
    const name = repo.fullName || repo.name;
    const description = repo.description ? `\n${repo.description}` : '';
    const stars = repo.stars ? `\n⭐ ${repo.stars.toLocaleString()} stars` : '';
    const language = repo.language ? `\n💻 ${repo.language}` : '';
    
    return `Check out this awesome GitHub repository: ${name}${description}${stars}${language}`;
  }

  /**
   * Copy repository URL to clipboard
   */
  async copyRepositoryUrl(repo: Repository): Promise<boolean> {
    const url = repo.url || `https://github.com/${repo.fullName || repo.name}`;
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Error copying URL:', error);
      return false;
    }
  }

  /**
   * Generate a shareable link that redirects to our platform
   */
  generatePlatformShareLink(repo: Repository): string {
    const repoPath = repo.fullName || repo.name;
    const baseUrl = window.location.origin;
    return `${baseUrl}/r/${repoPath}`;
  }

  /**
   * Share a repository with platform link (redirects to our platform)
   */
  async shareRepositoryWithPlatformLink(repo: Repository): Promise<boolean> {
    const platformLink = this.generatePlatformShareLink(repo);
    const shareText = `Check out ${repo.fullName || repo.name} on RepoVerse!`;
    
    // Try Web Share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${repo.fullName || repo.name} - ${repo.description || 'GitHub Repository'}`,
          text: shareText,
          url: platformLink,
        });
        return true;
      } catch (error) {
        // User cancelled or error occurred, fall back to clipboard
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
    
    // Fallback: Copy platform link to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${platformLink}`);
      
      // Show toast notification (if available)
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success('Repository link copied to clipboard!');
      }
      
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }
}

export const shareService = new ShareService();

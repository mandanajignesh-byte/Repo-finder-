/**
 * Utility functions for date formatting
 */

/**
 * Format date to "time ago" format
 */
export function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Normalize repository lastUpdated field from pushed_at or updated_at
 * This ensures we use pushed_at (last commit) instead of updated_at (can change for non-commit reasons)
 */
export function normalizeRepoLastUpdated(repo: any): string {
  // Prefer pushed_at (last commit) over updated_at (can be updated for non-commit reasons)
  const dateToUse = repo.pushed_at || repo.updated_at;
  return formatTimeAgo(dateToUse);
}

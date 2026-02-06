/**
 * SEO Utility Functions
 * Provides dynamic meta tag management for different routes
 */

interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

/**
 * Update page meta tags dynamically
 */
export const updateSEO = (data: SEOData): void => {
  const {
    title,
    description,
    keywords,
    image = 'https://repoverse.space/og-image.png',
    url = window.location.href,
    type = 'website',
  } = data;

  // Update title
  if (title) {
    document.title = title;
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('name', 'twitter:title', title);
  }

  // Update description
  if (description) {
    updateMetaTag('name', 'description', description);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('name', 'twitter:description', description);
  }

  // Update keywords
  if (keywords) {
    updateMetaTag('name', 'keywords', keywords);
  }

  // Update image
  updateMetaTag('property', 'og:image', image);
  updateMetaTag('name', 'twitter:image', image);

  // Update URL
  updateMetaTag('property', 'og:url', url);
  updateMetaTag('property', 'twitter:url', url);
  updateCanonical(url);

  // Update type
  updateMetaTag('property', 'og:type', type);
};

/**
 * Update or create a meta tag
 */
const updateMetaTag = (
  attribute: 'name' | 'property',
  attributeValue: string,
  content: string
): void => {
  let meta = document.querySelector(
    `meta[${attribute}="${attributeValue}"]`
  ) as HTMLMetaElement;

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, attributeValue);
    document.head.appendChild(meta);
  }

  meta.content = content;
};

/**
 * Update canonical URL
 */
const updateCanonical = (url: string): void => {
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }

  canonical.href = url;
};

/**
 * SEO data for different routes
 */
export const routeSEO: Record<string, SEOData> = {
  '/': {
    title: 'RepoVerse - Navigate the GitHub Universe | Discover Trending Repositories',
    description: 'Discover and explore the best GitHub repositories. Swipe through trending repos, get AI-powered recommendations, and find your next project.',
    keywords: 'GitHub, repositories, trending repos, open source, developer tools, programming, code discovery',
  },
  '/discover': {
    title: 'Discover GitHub Repositories | RepoVerse',
    description: 'Explore and discover amazing GitHub repositories. Swipe through personalized recommendations based on your interests.',
    keywords: 'GitHub discovery, repository explorer, code discovery, open source projects',
  },
  '/trending': {
    title: 'Trending GitHub Repositories | RepoVerse',
    description: 'Browse the most trending GitHub repositories today. Discover what\'s hot in the open source community.',
    keywords: 'trending GitHub repos, popular repositories, trending projects, GitHub trending',
  },
  '/agent': {
    title: 'AI-Powered Repository Recommendations | RepoVerse',
    description: 'Get intelligent, AI-powered recommendations for GitHub repositories tailored to your needs and preferences.',
    keywords: 'AI recommendations, GitHub AI, repository suggestions, intelligent code discovery',
  },
  '/profile': {
    title: 'Your Profile | RepoVerse',
    description: 'Manage your preferences, saved repositories, and liked projects on RepoVerse.',
    keywords: 'user profile, saved repos, GitHub favorites',
  },
  '/support': {
    title: 'Support & Feedback | RepoVerse',
    description: 'Get help, provide feedback, or support RepoVerse. We\'d love to hear from you!',
    keywords: 'support, feedback, help, contact',
  },
};

/**
 * Get SEO data for a specific route
 */
export const getSEOForRoute = (pathname: string): SEOData => {
  // Handle shared repo routes
  if (pathname.startsWith('/r/')) {
    const parts = pathname.split('/');
    const owner = parts[2];
    const repo = parts[3];
    return {
      title: `${owner}/${repo} | RepoVerse`,
      description: `View ${owner}/${repo} on RepoVerse. Discover this GitHub repository and explore similar projects.`,
      keywords: `GitHub, ${owner}, ${repo}, repository, open source`,
      type: 'article',
    };
  }

  return routeSEO[pathname] || routeSEO['/'];
};

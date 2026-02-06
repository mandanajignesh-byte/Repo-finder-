/**
 * Google Analytics 4 (GA4) Integration
 * Provides tracking functions for page views and custom events
 */

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Initialize Google Analytics
 * Call this once when the app loads
 */
export const initGA = (): void => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics: VITE_GA_MEASUREMENT_ID not configured');
    return;
  }

  // Load Google Analytics script dynamically
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll track page views manually for SPA
  });
};

/**
 * Track a page view
 */
export const trackPageView = (path: string, title?: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title || document.title,
  });
};

/**
 * Track a custom event
 */
export const trackEvent = (
  eventName: string,
  eventParams?: {
    category?: string;
    label?: string;
    value?: number;
    [key: string]: any;
  }
): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', eventName, {
    ...eventParams,
  });
};

/**
 * Track repository interactions
 */
export const trackRepoInteraction = (
  action: 'like' | 'skip' | 'save' | 'view' | 'share',
  repoId: string,
  repoName?: string,
  additionalParams?: Record<string, any>
): void => {
  trackEvent('repo_interaction', {
    action,
    repo_id: repoId,
    repo_name: repoName,
    ...additionalParams,
  });
};

/**
 * Track onboarding events
 */
export const trackOnboarding = (
  action: 'started' | 'completed' | 'skipped',
  step?: number,
  totalSteps?: number
): void => {
  trackEvent('onboarding', {
    action,
    step,
    total_steps: totalSteps,
  });
};

/**
 * Track navigation events
 */
export const trackNavigation = (destination: string, source?: string): void => {
  trackEvent('navigation', {
    destination,
    source,
  });
};

/**
 * Track search events
 */
export const trackSearch = (query: string, resultCount?: number): void => {
  trackEvent('search', {
    search_term: query,
    result_count: resultCount,
  });
};

/**
 * Track share events
 */
export const trackShare = (
  method: 'link' | 'native' | 'copy',
  contentType: 'repo',
  contentId: string
): void => {
  trackEvent('share', {
    method,
    content_type: contentType,
    content_id: contentId,
  });
};

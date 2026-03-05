import { RepoverseLanding } from './RepoverseLanding';

/**
 * "/" route — public landing page only.
 * No sidebar. No splash screen. No inline trending.
 * Trending lives at its own route: /trending
 */
export function LandingRoute() {
  return <RepoverseLanding />;
}

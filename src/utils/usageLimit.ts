/**
 * Daily usage limit tracking for free tier
 * Stored in localStorage, resets every day
 */

const SWIPES_KEY = 'rv_swipes_used';
const AGENT_QUERIES_KEY = 'rv_agent_queries_used';
const DATE_KEY = 'rv_usage_date';

export const FREE_SWIPES = 5;
export const FREE_AGENT_QUERIES = 2;

/** Returns true if the user has an active Pro subscription */
export function isProUser(): boolean {
  return localStorage.getItem('subscription_status') === 'active';
}

function getTodayString(): string {
  return new Date().toDateString();
}

/** Reset counters if the stored date is not today */
function checkAndReset(): void {
  const stored = localStorage.getItem(DATE_KEY);
  const today = getTodayString();
  if (stored !== today) {
    localStorage.setItem(DATE_KEY, today);
    localStorage.setItem(SWIPES_KEY, '0');
    localStorage.setItem(AGENT_QUERIES_KEY, '0');
  }
}

// ─── Swipes ──────────────────────────────────────────────────────────────────

export function getSwipesUsedToday(): number {
  checkAndReset();
  return parseInt(localStorage.getItem(SWIPES_KEY) || '0', 10);
}

export function incrementSwipesUsed(): number {
  checkAndReset();
  const next = getSwipesUsedToday() + 1;
  localStorage.setItem(SWIPES_KEY, String(next));
  return next;
}

export function getSwipesLeft(): number {
  if (isProUser()) return Infinity;
  return Math.max(0, FREE_SWIPES - getSwipesUsedToday());
}

// ─── Agent queries ────────────────────────────────────────────────────────────

export function getAgentQueriesUsedToday(): number {
  checkAndReset();
  return parseInt(localStorage.getItem(AGENT_QUERIES_KEY) || '0', 10);
}

export function incrementAgentQueriesUsed(): number {
  checkAndReset();
  const next = getAgentQueriesUsedToday() + 1;
  localStorage.setItem(AGENT_QUERIES_KEY, String(next));
  return next;
}

export function getAgentQueriesLeft(): number {
  if (isProUser()) return Infinity;
  return Math.max(0, FREE_AGENT_QUERIES - getAgentQueriesUsedToday());
}

//turns a diagnosed cause into a copy-paste prompt the user pastes into their vibe-coding tool

import { CAUSES } from "./signatures.js";

/**
 * Static table of fix prompts, keyed by cause. Each prompt is written to be
 * pasted directly into a vibe-coding tool (Cursor, Claude Code, Lovable) and
 * describes the fix in terms of intent, not exact code — so it works regardless
 * of the user's specific framework or file layout. This is the second layer an
 * LLM could later generate per-repo without touching the diagnosis logic.
 */
const FIX_PROMPTS = {
  [CAUSES.CONNECTION_POOL_EXHAUSTION]:
    "My app opens a new database connection on every request, which exhausts the database's connection limit under load. Refactor it to create a single shared connection pool once at startup and reuse that pool for every query. Make sure connections are released back to the pool after each query.",

  [CAUSES.UNINDEXED_QUERY]:
    "One of my database queries filters on a column that has no index, causing a full table scan on every request. Identify the column being filtered in the hot query and add a database index on it via a migration. Confirm the query uses the index afterward.",

  [CAUSES.NO_CACHING]:
    "My app recomputes the same expensive result on every request. Add a caching layer (in-memory or Redis) that stores the result and serves it from cache on subsequent requests, with a sensible expiry. Only recompute when the cache is empty or expired.",

  [CAUSES.UNKNOWN]:
    "My app fails under load but the cause isn't obvious. Profile the slow endpoint under concurrent requests, check for blocking operations, unindexed queries, and unpooled external connections, and report what's consuming the most time per request."
};

/**
 * Returns the copy-paste fix prompt for a diagnosed cause, or null when there's
 * nothing to fix (a healthy app). Pure lookup — it renders the action for a
 * cause that was already decided upstream.
 * @param {{cause:string}} diagnosis - the output of diagnose()
 * @returns {string|null} a prompt to paste into a vibe-coding tool, or null if healthy
 */
export function buildFixPrompt(diagnosis) {
  if (diagnosis.cause === CAUSES.NONE) {
    return null;
  }
  return FIX_PROMPTS[diagnosis.cause] || FIX_PROMPTS[CAUSES.UNKNOWN];
}
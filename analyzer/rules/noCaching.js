//detects hot read endpoints that recompute expensive work with no cache layer

/**
 * Determines whether the file shows any sign of a caching layer — a cache
 * client (Redis/memcached), an in-memory cache map, or common cache method
 * calls. Presence of any of these suppresses the flag.
 * @param {string} content - full source text of the file
 * @returns {boolean} true if some caching mechanism appears present
 */
function hasCaching(content) {
  return (
    /redis|memcached|node-cache|lru-cache/i.test(content) ||
    /cache\.(get|set|has)\s*\(/i.test(content) ||
    /\bnew\s+Map\s*\(\)/.test(content)
  );
}

/**
 * Determines whether the file contains a read endpoint doing work that is
 * typically worth caching — a GET handler that runs a DB query or an expensive
 * computation inline on every request.
 * @param {string} content - full source text of the file
 * @returns {boolean} true if a cacheable hot read path appears present
 */
function hasUncachedReadPath(content) {
  const hasGetRoute = /\b(app|router)\.get\s*\(/i.test(content);
  if (!hasGetRoute) return false;

  const doesDbWork =
    /\.(query|find|findAll|findOne|aggregate|select)\s*\(/i.test(content) ||
    /select\s+.+\s+from/i.test(content);

  return doesDbWork;
}

/**
 * Heuristic check for a missing cache on a hot read path. Flags when the file
 * has a GET endpoint backed by database work but shows no caching mechanism.
 * Recomputing the same result on every request wastes load that a cache would absorb.
 * @param {string} content - full source text of the file
 * @param {string} filePath - repo-relative path, used for context
 * @returns {{severity:string, message:string}|null} a flag, or null if none found
 */
function check(content, filePath) {
  if (hasCaching(content)) return null;
  if (!hasUncachedReadPath(content)) return null;

  return {
    severity: "low",
    message:
      "A read endpoint queries the database on every request with no caching. Frequently-requested data could be cached to cut repeated load."
  };
}

export const noCaching = {
  name: "noCaching",
  check
};
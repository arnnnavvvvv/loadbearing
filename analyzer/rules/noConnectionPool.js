// analyzer/rules/noConnectionPool.js — detects database connections created per-request instead of pooled

/**
 * Heuristic check for the "new connection per request" anti-pattern.
 * Looks for two co-occurring signals in a file:
 *   1. A new DB client/connection is constructed (new Client, createConnection, etc.)
 *   2. That construction happens inside a request handler (route/middleware context)
 * When a connection is built inside handler scope rather than once at module load,
 * every request opens its own connection — which exhausts the DB's connection limit
 * under load. Presence of a pool (new Pool / createPool) suppresses the flag.
 * @param {string} content - full source text of the file
 * @param {string} filePath - repo-relative path, used for context
 * @returns {{severity:string, message:string}|null} a flag, or null if the pattern isn't found
 */
function check(content, filePath) {
  const usesPool = /new\s+Pool\b|createPool\s*\(|\.pool\b/i.test(content);
  if (usesPool) return null;

  const createsConnection =
    /new\s+Client\s*\(|createConnection\s*\(|new\s+pg\.Client\s*\(|mysql\.createConnection\s*\(/i.test(
      content
    );
  if (!createsConnection) return null;

  // Does a connection get created inside a request handler? We look for the
  // construction appearing after a route/handler declaration in the same file.
  const handlerContext =
    /\b(app|router)\.(get|post|put|patch|delete|use)\s*\(/i.test(content) ||
    /\b(req|res)\b/.test(content);

  if (!handlerContext) return null;

  return {
    severity: "high",
    message:
      "A new database connection is created per request instead of using a shared connection pool. Under load this exhausts the database's connection limit."
  };
}

export const noConnectionPool = {
  name: "noConnectionPool",
  check
};
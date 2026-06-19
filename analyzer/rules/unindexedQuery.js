//detects queries filtering on a column that has no matching index

/**
 * Collects column names that appear to have an index defined, drawn from both
 * SQL schema files (CREATE INDEX ... ON table(col)) and inline index hints.
 * @param {string} content - full source text of the file
 * @returns {Set<string>} lowercased column names that have an index
 */
function indexedColumns(content) {
  const cols = new Set();
  const re = /create\s+(?:unique\s+)?index[^(]*\(\s*([a-z0-9_]+)/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    cols.add(m[1].toLowerCase());
  }
  return cols;
}

/**
 * Collects column names used in WHERE filters across the file's queries.
 * Catches both raw SQL (WHERE col = ...) and is intentionally conservative —
 * it only looks at simple equality/comparison filters, which are the common
 * hot-path case.
 * @param {string} content - full source text of the file
 * @returns {string[]} lowercased column names filtered on
 */
function filteredColumns(content) {
  const cols = [];
  const re = /where\s+([a-z0-9_]+)\s*(?:=|>|<|>=|<=|like)/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    cols.push(m[1].toLowerCase());
  }
  return cols;
}

/**
 * Heuristic check for filtering on an unindexed column. Flags when a column is
 * used in a WHERE filter but no CREATE INDEX for that column is visible in the
 * same file. Under load these queries force full table scans that pile up.
 * Note: cross-file index definitions aren't resolved — this is file-local.
 * @param {string} content - full source text of the file
 * @param {string} filePath - repo-relative path, used for context
 * @returns {{severity:string, message:string}|null} a flag, or null if none found
 */
function check(content, filePath) {
  const filtered = filteredColumns(content);
  if (filtered.length === 0) return null;

  const indexed = indexedColumns(content);

  const unindexed = filtered.filter(
    (col) => !indexed.has(col) && col !== "id"
  );
  if (unindexed.length === 0) return null;

  return {
    severity: "medium",
    message: `A query filters on "${unindexed[0]}", but no index for that column is defined. Under load this forces a full table scan on every request.`
  };
}

export const unindexedQuery = {
  name: "unindexedQuery",
  check
};
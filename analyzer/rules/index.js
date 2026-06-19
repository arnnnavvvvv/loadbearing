//registry of all static-analysis rules the scanner iterates over

import { noConnectionPool } from "./noConnectionPool.js";
import { unindexedQuery } from "./unindexedQuery.js";
import { noCaching } from "./noCaching.js";

/**
 * The ordered list of rules the scanner applies to every source file.
 * Adding a new bottleneck detector means writing a rule module and registering
 * it here — the scanner needs no changes.
 */
export const rules = [noConnectionPool, unindexedQuery, noCaching];
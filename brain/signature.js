export const CAUSES = {
  CONNECTION_POOL_EXHAUSTION: "connection_pool_exhaustion",
  UNINDEXED_QUERY: "unindexed_query",
  NO_CACHING: "no_caching",
  UNKNOWN: "unknown",
  NONE: "none"
};

/**
 * Finds the load level at which the app first crosses into failure.
 * Failure is defined two ways: the error rate exceeds a threshold, or p95
 * latency crosses a ceiling — whichever happens first as load ramps.
 * @param {Array<{vu:number,p95:number,errorRate:number}>} curve - load test points, ascending by vu
 * @param {number} [latencyCeilingMs=1000] - p95 latency considered "broken" from the user's side
 * @param {number} [errorThreshold=0.05] - error rate considered "broken"
 * @returns {number|null} the vu count where failure begins, or null if the app never breaks
 */
function findBreakingPoint(curve, latencyCeilingMs = 1000, errorThreshold = 0.05) {
  for (const point of curve) {
    if (point.errorRate >= errorThreshold || point.p95 >= latencyCeilingMs) {
      return point.vu;
    }
  }
  return null;
}

/**
 * Tests whether failure arrives as a sudden error "cliff" — errors near zero
 * one step before the breaking point, then jumping sharply at it. This shape
 * indicates a hard resource limit being hit (e.g. a connection pool emptying).
 * @param {Array<{vu:number,p95:number,errorRate:number}>} curve - load test points
 * @param {number} breakingPoint - vu count where failure begins
 * @returns {boolean} true if the failure matches a sudden-error-cliff shape
 */
function errorClimbsAsCliff(curve, breakingPoint) {
  const atBreak = curve.find((p) => p.vu === breakingPoint);
  const justBefore = curve.find((p) => p.vu === breakingPoint - 5);
  if (!atBreak || !justBefore) return false;
  return justBefore.errorRate < 0.02 && atBreak.errorRate >= 0.05;
}

/**
 * Tests whether failure arrives as a steep latency spike while errors stay low.
 * This shape indicates contention on a slow operation (e.g. an unindexed query
 * getting progressively slower under load) rather than a hard resource limit.
 * @param {Array<{vu:number,p95:number,errorRate:number}>} curve - load test points
 * @param {number} breakingPoint - vu count where failure begins
 * @returns {boolean} true if the failure matches a latency-spike-without-errors shape
 */
function latencyClimbsQuadratically(curve, breakingPoint) {
  const atBreak = curve.find((p) => p.vu === breakingPoint);
  const justBefore = curve.find((p) => p.vu === breakingPoint - 5);
  if (!atBreak || !justBefore) return false;
  const jump = atBreak.p95 - justBefore.p95;
  return jump > 150 && atBreak.errorRate < 0.05;
}

/**
 * Classifies a load curve into a likely root cause by reading the SHAPE of the
 * failure, not just where it occurs. Returns the cause along with a confidence
 * level — "medium" at best here, because this uses only the load signal; the
 * static analysis signal corroborates it later in reconcile.
 * @param {Array<{vu:number,p95:number,errorRate:number}>} curve - load test points, ascending by vu
 * @returns {{cause:string, breakingPoint:number|null, confidence:string}}
 */
export function detectSignature(curve) {
  const breakingPoint = findBreakingPoint(curve);

  if (breakingPoint === null) {
    return { cause: CAUSES.NONE, breakingPoint: null, confidence: "high" };
  }

  if (errorClimbsAsCliff(curve, breakingPoint)) {
    return { cause: CAUSES.CONNECTION_POOL_EXHAUSTION, breakingPoint, confidence: "medium" };
  }

  if (latencyClimbsQuadratically(curve, breakingPoint)) {
    return { cause: CAUSES.UNINDEXED_QUERY, breakingPoint, confidence: "medium" };
  }

  return { cause: CAUSES.UNKNOWN, breakingPoint, confidence: "low" };
}
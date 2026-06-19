//combines the load-curve signature with static-analysis flags into one confident root cause

import { CAUSES } from "./signatures.js";

/**
 * Maps a static-analysis rule name to the runtime cause it predicts.
 * This is the bridge between what we see in the CODE and what we expect to see
 * FAIL under load — e.g. a missing connection pool in the code predicts pool
 * exhaustion at runtime.
 * @param {string} rule - the static rule identifier (e.g. "noConnectionPool")
 * @returns {string|null} the cause this rule predicts, or null if it maps to none
 */
function ruleToCause(rule) {
  switch (rule) {
    case "noConnectionPool":
      return CAUSES.CONNECTION_POOL_EXHAUSTION;
    case "unindexedQuery":
      return CAUSES.UNINDEXED_QUERY;
    case "noCaching":
      return CAUSES.NO_CACHING;
    default:
      return null;
  }
}

/**
 * Reconciles two independent signals — the load-test signature and the static
 * flags — into a single root cause with a calibrated confidence level.
 * The core idea: when both signals point to the same cause, confidence is HIGH
 * because two independent methods agree. When only one fires, confidence is
 * lower and we fall back to whichever signal is present.
 * @param {{cause:string, breakingPoint:number|null, confidence:string}} signature - from detectSignature()
 * @param {Array<{rule:string, file:string, severity:string, message:string}>} staticFlags - from the analyzer
 * @returns {{cause:string, breakingPoint:number|null, confidence:string, evidence:object}}
 */
export function reconcile(signature, staticFlags) {
  const predictedCauses = staticFlags.map((flag) => ruleToCause(flag.rule));

  // Healthy app: load test found no breaking point. Static flags (if any) are
  // advisory only — the app demonstrably holds, so we trust the runtime result.
  if (signature.cause === CAUSES.NONE) {
    return {
      cause: CAUSES.NONE,
      breakingPoint: null,
      confidence: "high",
      evidence: { load: "no breaking point reached", static: predictedCauses }
    };
  }

  const staticAgrees = predictedCauses.includes(signature.cause);

  // Both signals agree: the strongest possible diagnosis.
  if (staticAgrees) {
    const supportingFlag = staticFlags.find(
      (flag) => ruleToCause(flag.rule) === signature.cause
    );
    return {
      cause: signature.cause,
      breakingPoint: signature.breakingPoint,
      confidence: "high",
      evidence: {
        load: `failure shape indicates ${signature.cause}`,
        static: `code analysis flagged ${supportingFlag.rule} in ${supportingFlag.file}`
      }
    };
  }

  // Load test saw a clear failure shape but static analysis didn't predict it.
  // Trust the runtime signal — it's empirical — but at medium confidence.
  if (signature.cause !== CAUSES.UNKNOWN) {
    return {
      cause: signature.cause,
      breakingPoint: signature.breakingPoint,
      confidence: "medium",
      evidence: {
        load: `failure shape indicates ${signature.cause}`,
        static: "no corroborating code flag"
      }
    };
  }

  // Load test broke but the shape is unrecognized. If static analysis flagged
  // something, use its prediction as the best available guess.
  if (predictedCauses.length > 0) {
    const flag = staticFlags.find((f) => ruleToCause(f.rule) !== null);
    return {
      cause: ruleToCause(flag.rule),
      breakingPoint: signature.breakingPoint,
      confidence: "low",
      evidence: {
        load: "app broke but failure shape was unrecognized",
        static: `falling back to code flag: ${flag.rule}`
      }
    };
  }

  // Broke, but neither signal explains why. Honest "unknown."
  return {
    cause: CAUSES.UNKNOWN,
    breakingPoint: signature.breakingPoint,
    confidence: "low",
    evidence: {
      load: "app broke but failure shape was unrecognized",
      static: "no code flags raised"
    }
  };
}
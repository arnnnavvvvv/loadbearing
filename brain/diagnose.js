//turns a reconciled cause into a plain-English explanation for a non-technical user

import { CAUSES } from "./signatures.js";

/**
 * Static table of human-readable explanations, keyed by cause. Each entry is
 * written in Blore's voice: plain language, no jargon, aimed at a non-technical
 * founder. This is the layer an LLM could later replace or enrich without
 * touching the (deterministic) diagnosis logic upstream.
 */
const EXPLANATIONS = {
  [CAUSES.CONNECTION_POOL_EXHAUSTION]: {
    headline: (bp) => `Breaks at ~${bp} concurrent users`,
    explanation:
      "Your app opens a brand-new database connection for every request instead of reusing a shared set. Databases only allow a limited number of connections at once, so under load those slots run out and new requests start failing."
  },
  [CAUSES.UNINDEXED_QUERY]: {
    headline: (bp) => `Slows sharply around ~${bp} concurrent users`,
    explanation:
      "One of your database queries searches the whole table because the column it filters on isn't indexed. With a few users this is fine; under load these slow searches stack up and the whole app crawls."
  },
  [CAUSES.NO_CACHING]: {
    headline: (bp) => `Degrades around ~${bp} concurrent users`,
    explanation:
      "Your app redoes the same expensive work on every request instead of remembering the result. Caching the result once and reusing it would remove most of this load."
  },
  [CAUSES.NONE]: {
    headline: () => "Holds steady under load",
    explanation:
      "No significant bottlenecks found. The app stayed responsive across the full load range, so it's in good shape to launch."
  },
  [CAUSES.UNKNOWN]: {
    headline: (bp) => `Breaks around ~${bp} concurrent users`,
    explanation:
      "Your app started failing under load, but the failure pattern didn't match a known cause. This one needs a closer manual look — the load test confirms there's a real limit here."
  }
};

/**
 * Produces a plain-English diagnosis object from a reconciled result.
 * Pure formatting/translation — it makes no decisions, it only renders the
 * cause that reconcile() already decided into language a non-technical user
 * can act on.
 * @param {{cause:string, breakingPoint:number|null, confidence:string, evidence:object}} reconciled
 * @returns {{cause:string, headline:string, explanation:string, confidence:string}}
 */
export function diagnose(reconciled) {
  const entry = EXPLANATIONS[reconciled.cause] || EXPLANATIONS[CAUSES.UNKNOWN];
  return {
    cause: reconciled.cause,
    headline: entry.headline(reconciled.breakingPoint),
    explanation: entry.explanation,
    confidence: reconciled.confidence
  };
}
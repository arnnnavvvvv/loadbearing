//chains the brain stages into one call: curve + static flags → full diagnosis

import { detectSignature } from "./signatures.js";
import { reconcile } from "./reconcile.js";
import { diagnose } from "./diagnose.js";
import { buildFixPrompt } from "./fixPrompt.js";

/**
 * Runs the full diagnosis pipeline over a load curve and the static-analysis flags.
 * @param {Array<{vu:number,p95:number,errorRate:number}>} curve - load test points
 * @param {Array<{rule:string,file:string,severity:string,message:string}>} staticFlags - analyzer output
 * @returns {{cause:string, headline:string, explanation:string, confidence:string, breakingPoint:number|null, fixPrompt:string|null, evidence:object}}
 */
export function runBrain(curve, staticFlags) {
  const signature = detectSignature(curve);
  const reconciled = reconcile(signature, staticFlags);
  const diagnosis = diagnose(reconciled);
  const fixPrompt = buildFixPrompt(diagnosis);

  return {
    cause: diagnosis.cause,
    headline: diagnosis.headline,
    explanation: diagnosis.explanation,
    confidence: diagnosis.confidence,
    breakingPoint: reconciled.breakingPoint,
    fixPrompt,
    evidence: reconciled.evidence
  };
}
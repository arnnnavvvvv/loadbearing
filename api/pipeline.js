import { mockResult } from "../engine/mockMetrics.js";

export async function runPipeline(repoUrl) {
  return mockResult(repoUrl);
}
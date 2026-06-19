//walks a repo directory, runs every rule against its source files, collects flags

import fs from "node:fs/promises";
import path from "node:path";
import { rules } from "./rules/index.js";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage"]);
const SCAN_EXTENSIONS = new Set([".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx", ".sql"]);

/**
 * Recursively collects the paths of all scannable source files under a directory,
 * skipping dependency and build folders that would create noise.
 * @param {string} dir - absolute path to search from
 * @returns {Promise<string[]>} absolute paths of source files to scan
 */
async function collectSourceFiles(dir) {
  const found = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      found.push(...(await collectSourceFiles(full)));
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Scans a cloned repo for known scaling bottlenecks by running every registered
 * rule against every source file. Each rule inspects file content and returns
 * zero or more flags; all flags are aggregated into a single list.
 * @param {string} repoDir - absolute path to the cloned repo's root
 * @returns {Promise<Array<{rule:string,file:string,severity:string,message:string}>>}
 */
export async function scanRepo(repoDir) {
  const files = await collectSourceFiles(repoDir);
  const flags = [];

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    const relativePath = path.relative(repoDir, file);

    for (const rule of rules) {
      const result = rule.check(content, relativePath);
      if (result) {
        flags.push({ rule: rule.name, file: relativePath, ...result });
      }
    }
  }

  return dedupe(flags);
}

/**
 * Removes duplicate flags so the same rule firing on the same file is reported once.
 * @param {Array<{rule:string,file:string,severity:string,message:string}>} flags
 * @returns {Array<{rule:string,file:string,severity:string,message:string}>}
 */
function dedupe(flags) {
  const seen = new Set();
  return flags.filter((flag) => {
    const key = `${flag.rule}:${flag.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
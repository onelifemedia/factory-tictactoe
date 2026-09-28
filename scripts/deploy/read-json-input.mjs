// F-013 (R-014): shared CLI plumbing for the deploy decision scripts.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * True when `moduleUrl` is the script Node was asked to run.
 * @param {string} moduleUrl
 * @returns {boolean}
 */
export function isRunAsCommandLine(moduleUrl) {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(moduleUrl)
  );
}

/**
 * Reads the JSON input named by the only argument; exits 2 with a message on
 * a missing, unreadable or malformed file (that is not a decision).
 * @returns {unknown}
 */
export function readJsonInput() {
  const inputPath = process.argv[2];
  if (inputPath === undefined) {
    console.error("Usage: node <script> <input.json>");
    process.exit(2);
  }
  try {
    return JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (error) {
    console.error(`Cannot read JSON input ${inputPath}: ${String(error)}`);
    process.exit(2);
  }
}

// F-012 (R-011): fails when the gzipped JavaScript in the build reaches the
// 50 KB budget. Used by CI after `npm run build`: node scripts/check-bundle-size.mjs dist
import { readFileSync } from "node:fs";
import path from "node:path";
import { isRunAsCommandLine, listFilesRecursively } from "./command-line.mjs";
import { gzipSync } from "node:zlib";

export const DEFAULT_LIMIT_BYTES = 51_200;

/**
 * Gzip size (level 9) of every .js file under `directory`, and their total.
 * @param {string} directory
 * @returns {{ files: { path: string; gzippedBytes: number }[]; totalBytes: number }}
 */
export function measureGzippedJavaScript(directory) {
  const files = listFilesRecursively(directory)
    .filter((filePath) => filePath.endsWith(".js"))
    .sort()
    .map((filePath) => ({
      path: path.relative(directory, filePath),
      gzippedBytes: gzipSync(readFileSync(filePath), { level: 9 }).length,
    }));
  const totalBytes = files.reduce((sum, file) => sum + file.gzippedBytes, 0);
  return { files, totalBytes };
}

/**
 * @param {string[]} commandArguments
 * @returns {number} exit code
 */
function runCommandLine(commandArguments) {
  const limitFlagIndex = commandArguments.indexOf("--limit");
  let limitBytes = DEFAULT_LIMIT_BYTES;
  if (limitFlagIndex !== -1) {
    // A malformed limit must never disable the check (Codex F-012 review C3).
    const limitText = commandArguments[limitFlagIndex + 1] ?? "";
    limitBytes = Number(limitText);
    if (
      !/^\d+$/.test(limitText) ||
      !Number.isSafeInteger(limitBytes) ||
      limitBytes <= 0
    ) {
      console.error(
        `--limit needs a positive whole number of bytes, got "${limitText}".`,
      );
      return 2;
    }
  }
  const isLimitValue = (/** @type {number} */ index) =>
    limitFlagIndex !== -1 && index === limitFlagIndex + 1;
  const directory =
    commandArguments.find(
      (argument, index) => !argument.startsWith("--") && !isLimitValue(index),
    ) ?? "dist";
  let measurement;
  try {
    measurement = measureGzippedJavaScript(directory);
  } catch (error) {
    console.error(`Cannot read ${directory}: ${String(error)}`);
    return 2;
  }
  for (const file of measurement.files) {
    console.log(`${file.path}: ${String(file.gzippedBytes)} bytes gzipped`);
  }
  console.log(
    `Total: ${String(measurement.totalBytes)} bytes gzipped (limit: under ${String(limitBytes)})`,
  );
  if (measurement.files.length === 0) {
    console.error(`No JavaScript files found in ${directory}.`);
    return 1;
  }
  if (measurement.totalBytes >= limitBytes) {
    console.error("The JavaScript bundle is over budget (R-011).");
    return 1;
  }
  return 0;
}

if (isRunAsCommandLine(import.meta.url)) {
  process.exitCode = runCommandLine(process.argv.slice(2));
}

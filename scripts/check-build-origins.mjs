// F-012 (R-012): fails when the build references another origin (third-party
// scripts, stylesheets, fonts, frames or imports). Used by CI after the build:
// node scripts/check-build-origins.mjs dist
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {{ file: string; kind: string; url: string }} ExternalReference */

const HTML_PATTERNS = [
  { kind: "script", pattern: /<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi },
  { kind: "link", pattern: /<link\b[^>]*\shref\s*=\s*["']([^"']+)["']/gi },
  { kind: "iframe", pattern: /<iframe\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi },
];
const CSS_URL_PATTERN = /url\(\s*["']?([^"')\s]+)["']?\s*\)/gi;
const JAVASCRIPT_IMPORT_PATTERN =
  /(?:\bfrom\s*|\bimport\s*\(\s*)["']([^"']+)["']/g;
const OTHER_ORIGIN_PATTERN = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

/**
 * @param {string} directory
 * @returns {string[]}
 */
function listFilesRecursively(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFilesRecursively(entryPath) : [entryPath];
  });
}

/**
 * @param {string} url
 * @param {string} kind
 * @returns {boolean}
 */
function isExternal(url, kind) {
  if (OTHER_ORIGIN_PATTERN.test(url)) {
    return true;
  }
  // An inline data: script runs code that did not come from the site's files.
  return kind === "script" && url.toLowerCase().startsWith("data:");
}

/**
 * @param {string} text
 * @param {RegExp} pattern
 * @returns {string[]}
 */
function matchAll(text, pattern) {
  return [...text.matchAll(pattern)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

/**
 * Every reference in the build that points to another origin.
 * @param {string} directory
 * @returns {ExternalReference[]}
 */
export function findExternalReferences(directory) {
  /** @type {ExternalReference[]} */
  const references = [];
  for (const filePath of listFilesRecursively(directory).sort()) {
    const file = path.relative(directory, filePath);
    const text = readFileSync(filePath, "utf8");
    /** @type {{ kind: string; urls: string[] }[]} */
    let candidates = [];
    if (filePath.endsWith(".html")) {
      candidates = HTML_PATTERNS.map(({ kind, pattern }) => ({
        kind,
        urls: matchAll(text, pattern),
      }));
    } else if (filePath.endsWith(".css")) {
      candidates = [{ kind: "css-url", urls: matchAll(text, CSS_URL_PATTERN) }];
    } else if (filePath.endsWith(".js")) {
      candidates = [
        { kind: "import", urls: matchAll(text, JAVASCRIPT_IMPORT_PATTERN) },
      ];
    }
    for (const { kind, urls } of candidates) {
      for (const url of urls) {
        if (isExternal(url, kind)) {
          references.push({ file, kind, url });
        }
      }
    }
  }
  return references;
}

/**
 * @param {string[]} commandArguments
 * @returns {number} exit code
 */
function runCommandLine(commandArguments) {
  const directory = commandArguments[0] ?? "dist";
  let references;
  try {
    references = findExternalReferences(directory);
  } catch (error) {
    console.error(`Cannot read ${directory}: ${String(error)}`);
    return 2;
  }
  for (const reference of references) {
    console.error(
      `${reference.file}: ${reference.kind} points to another origin: ${reference.url}`,
    );
  }
  if (references.length > 0) {
    console.error("The build references other origins (R-012).");
    return 1;
  }
  console.log(`No references to other origins in ${directory}.`);
  return 0;
}

const isCommandLine =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  process.exitCode = runCommandLine(process.argv.slice(2));
}

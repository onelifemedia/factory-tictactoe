// F-012 (R-012): fails when the build references another origin (third-party
// scripts, stylesheets, fonts, frames or imports). Used by CI after the build:
// node scripts/check-build-origins.mjs dist
//
// Every URL is decoded (HTML entities, JavaScript escapes) and resolved against
// the document's <base> and a stand-in site origin; anything that resolves to a
// different origin, or an inline data: script, is reported.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {{ file: string; kind: string; url: string }} ExternalReference */

const SITE_ORIGIN = "https://site.invalid";
const REFERENCING_ATTRIBUTES = new Map([
  ["script", "src"],
  ["link", "href"],
  ["iframe", "src"],
  ["img", "src"],
  ["source", "src"],
  ["embed", "src"],
  ["object", "data"],
  ["base", "href"],
]);
// Quote-aware: a ">" inside a quoted attribute value does not end the tag.
const TAG_PATTERN = /<([a-z][a-z0-9-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
const ATTRIBUTE_PATTERN =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const INLINE_SCRIPT_PATTERN = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
const INLINE_STYLE_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
const JAVASCRIPT_SPECIFIER_PATTERN =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
// Quoted and unquoted url(...) are matched separately (Vite's minified CSS
// drops the quotes).
const CSS_URL_PATTERN =
  /url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\\.|[^\s"'()\\])+))\s*\)/gi;
const CSS_IMPORT_PATTERN = /@import\s+(["'])((?:\\.|(?!\1)[^\\])*)\1/gi;
const NAMED_ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["sol", "/"],
  ["colon", ":"],
  ["period", "."],
  ["tab", "\t"],
  ["newline", "\n"],
]);

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
 * @param {string} text
 * @returns {string}
 */
function decodeHtmlEntities(text) {
  return text.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));?/gi,
    (
      /** @type {string} */ entity,
      /** @type {string | undefined} */ decimal,
      /** @type {string | undefined} */ hexadecimal,
      /** @type {string | undefined} */ name,
    ) => {
      if (decimal !== undefined) {
        return String.fromCodePoint(Number(decimal));
      }
      if (hexadecimal !== undefined) {
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      }
      return NAMED_ENTITIES.get(String(name).toLowerCase()) ?? entity;
    },
  );
}

/**
 * @param {string} text
 * @returns {string}
 */
function decodeStringEscapes(text) {
  return text.replace(
    /\\(?:x([0-9a-f]{2})|u\{([0-9a-f]+)\}|u([0-9a-f]{4})|([0-9a-f]{1,6})\s?|(.))/gi,
    (
      /** @type {string} */ escape,
      /** @type {string | undefined} */ hexByte,
      /** @type {string | undefined} */ codePoint,
      /** @type {string | undefined} */ unicodeUnit,
      /** @type {string | undefined} */ cssHexadecimal,
      /** @type {string | undefined} */ character,
    ) => {
      const hexadecimal = hexByte ?? codePoint ?? unicodeUnit ?? cssHexadecimal;
      if (hexadecimal !== undefined) {
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      }
      return character ?? escape;
    },
  );
}

/**
 * @param {string} attributeText
 * @returns {Map<string, string>}
 */
function parseAttributes(attributeText) {
  /** @type {Map<string, string>} */
  const attributes = new Map();
  for (const match of attributeText.matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1]?.toLowerCase();
    if (name !== undefined && !attributes.has(name)) {
      attributes.set(
        name,
        decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? ""),
      );
    }
  }
  return attributes;
}

/**
 * @param {string} rawUrl
 * @param {string} baseUrl
 * @returns {URL | null}
 */
function resolveUrl(rawUrl, baseUrl) {
  // Browsers strip leading/trailing ASCII whitespace and control characters
  // (code points up to U+0020).
  let start = 0;
  let end = rawUrl.length;
  while (start < end && (rawUrl.codePointAt(start) ?? 0) <= 0x20) {
    start += 1;
  }
  while (end > start && (rawUrl.codePointAt(end - 1) ?? 0) <= 0x20) {
    end -= 1;
  }
  const trimmed = rawUrl.slice(start, end);
  try {
    return new URL(trimmed, baseUrl);
  } catch {
    return null;
  }
}

/**
 * @param {string} rawUrl
 * @param {string} baseUrl
 * @param {string} kind
 * @returns {boolean}
 */
function isExternal(rawUrl, baseUrl, kind) {
  if (rawUrl.trim() === "" || rawUrl.trim().startsWith("#")) {
    return false;
  }
  const resolved = resolveUrl(rawUrl, baseUrl);
  if (resolved === null) {
    return false;
  }
  if (resolved.protocol === "data:") {
    // An inline data: script runs code that did not come from the site's files.
    return kind === "script" || kind === "import";
  }
  if (resolved.protocol === "http:" || resolved.protocol === "https:") {
    return resolved.origin !== SITE_ORIGIN;
  }
  return false;
}

/**
 * @param {string} text
 * @param {RegExp} pattern
 * @param {number} group
 * @returns {string[]}
 */
function capture(text, pattern, group) {
  return [...text.matchAll(pattern)].flatMap((match) => {
    const value = match[group];
    return value === undefined ? [] : [value];
  });
}

/**
 * @param {string} source
 * @returns {string[]}
 */
function javaScriptSpecifiers(source) {
  return capture(source, JAVASCRIPT_SPECIFIER_PATTERN, 2).map(
    decodeStringEscapes,
  );
}

/**
 * @param {string} source
 * @returns {{ kind: string; url: string }[]}
 */
function cssReferences(source) {
  return [
    ...[...source.matchAll(CSS_URL_PATTERN)].flatMap((match) => {
      const url = match[1] ?? match[2] ?? match[3];
      return url === undefined ? [] : [{ kind: "css-url", url }];
    }),
    ...capture(source, CSS_IMPORT_PATTERN, 2).map((url) => ({
      kind: "css-import",
      url,
    })),
  ].map(({ kind, url }) => ({ kind, url: decodeStringEscapes(url) }));
}

/**
 * @param {string} html
 * @returns {{ kind: string; url: string }[]}
 */
function htmlReferences(html) {
  const references = [];
  for (const match of html.matchAll(TAG_PATTERN)) {
    const tag = match[1]?.toLowerCase() ?? "";
    const attributeName = REFERENCING_ATTRIBUTES.get(tag);
    const url =
      attributeName === undefined
        ? undefined
        : parseAttributes(match[2] ?? "").get(attributeName);
    if (url !== undefined) {
      references.push({ kind: tag, url });
    }
  }
  for (const inlineScript of capture(html, INLINE_SCRIPT_PATTERN, 1)) {
    for (const url of javaScriptSpecifiers(inlineScript)) {
      references.push({ kind: "import", url });
    }
  }
  for (const inlineStyle of capture(html, INLINE_STYLE_PATTERN, 1)) {
    references.push(...cssReferences(inlineStyle));
  }
  return references;
}

/**
 * The document base: the first <base href>, resolved against the site origin.
 * @param {string} html
 * @returns {string}
 */
function documentBase(html) {
  for (const match of html.matchAll(TAG_PATTERN)) {
    if (match[1]?.toLowerCase() === "base") {
      const href = parseAttributes(match[2] ?? "").get("href");
      const resolved =
        href === undefined ? null : resolveUrl(href, `${SITE_ORIGIN}/`);
      if (resolved !== null) {
        return resolved.href;
      }
    }
  }
  return `${SITE_ORIGIN}/`;
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
    let baseUrl = `${SITE_ORIGIN}/${file.split(path.sep).join("/")}`;
    /** @type {{ kind: string; url: string }[]} */
    let candidates = [];
    if (filePath.endsWith(".html")) {
      baseUrl = documentBase(text);
      candidates = htmlReferences(text);
    } else if (filePath.endsWith(".css")) {
      candidates = cssReferences(text);
    } else if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
      candidates = javaScriptSpecifiers(text).map((url) => ({
        kind: "import",
        url,
      }));
    }
    for (const { kind, url } of candidates) {
      if (kind !== "base" && isExternal(url, baseUrl, kind)) {
        references.push({ file, kind, url });
      }
    }
    if (
      filePath.endsWith(".html") &&
      baseUrl !== `${SITE_ORIGIN}/` &&
      !baseUrl.startsWith(`${SITE_ORIGIN}/`)
    ) {
      references.push({ file, kind: "base", url: baseUrl });
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

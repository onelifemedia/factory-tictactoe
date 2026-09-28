// F-014 (R-013): fails when the build uses a visual file: an @font-face rule,
// an <img> element or a CSS url() that references a file (same-document
// url(#fragment) is allowed). Used by CI after the build:
// node scripts/check-local-visuals.mjs dist
//
// Every visual is CSS or same-document inline SVG, so none of these should
// ever appear. Scripts are not scanned: they build <use href="#mark-x">.
import { readFileSync } from "node:fs";
import path from "node:path";
import { isRunAsCommandLine, listFilesRecursively } from "./command-line.mjs";

/** @typedef {{ file: string; kind: "font-face" | "img" | "url"; text: string }} VisualFileReference */

const FONT_FACE_PATTERN = /@font-face\b/gi;
// Quoted and unquoted url(...) are matched separately (Vite's minified CSS
// drops the quotes).
const CSS_URL_PATTERN =
  /url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\\.|[^\s"'()\\])+))\s*\)/gi;
const IMG_TAG_PATTERN = /<img\b[^>]*>/gi;
const INLINE_SCRIPT_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;

/**
 * Font faces and file url()s in a piece of CSS.
 * @param {string} css
 * @returns {{ kind: "font-face" | "url"; text: string }[]}
 */
function findCssVisualFiles(css) {
  /** @type {{ kind: "font-face" | "url"; text: string }[]} */
  const findings = [];
  for (const match of css.matchAll(FONT_FACE_PATTERN)) {
    findings.push({ kind: "font-face", text: match[0] });
  }
  for (const match of css.matchAll(CSS_URL_PATTERN)) {
    const reference = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (!reference.startsWith("#")) {
      findings.push({ kind: "url", text: reference });
    }
  }
  return findings;
}

/**
 * Image elements, and font faces and file url()s anywhere in the markup:
 * style blocks, quoted or unquoted style attributes and SVG presentation
 * attributes such as fill="url(paint.svg#gradient)" (Codex F-014 C1).
 * Inline scripts are skipped.
 * @param {string} html
 * @returns {{ kind: "font-face" | "img" | "url"; text: string }[]}
 */
function findHtmlVisualFiles(html) {
  /** @type {{ kind: "font-face" | "img" | "url"; text: string }[]} */
  const findings = [];
  for (const match of html.matchAll(IMG_TAG_PATTERN)) {
    findings.push({ kind: "img", text: match[0] });
  }
  findings.push(
    ...findCssVisualFiles(html.replaceAll(INLINE_SCRIPT_PATTERN, "")),
  );
  return findings;
}

/**
 * Every font face, image element and file url() in the build.
 * @param {string} directory
 * @returns {VisualFileReference[]}
 */
export function findVisualFileReferences(directory) {
  /** @type {VisualFileReference[]} */
  const references = [];
  for (const filePath of listFilesRecursively(directory).sort()) {
    const file = path.relative(directory, filePath);
    if (filePath.endsWith(".html")) {
      const text = readFileSync(filePath, "utf8");
      references.push(
        ...findHtmlVisualFiles(text).map((finding) => ({ file, ...finding })),
      );
    } else if (filePath.endsWith(".css")) {
      const text = readFileSync(filePath, "utf8");
      references.push(
        ...findCssVisualFiles(text).map((finding) => ({ file, ...finding })),
      );
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
    references = findVisualFileReferences(directory);
  } catch (error) {
    console.error(`Cannot read ${directory}: ${String(error)}`);
    return 2;
  }
  for (const reference of references) {
    console.error(
      `${reference.file}: ${reference.kind} uses a visual file: ${reference.text}`,
    );
  }
  if (references.length > 0) {
    console.error(
      "The build uses font or image files; every visual must be CSS or inline SVG (R-013).",
    );
    return 1;
  }
  console.log(`No font or image files in ${directory}.`);
  return 0;
}

if (isRunAsCommandLine(import.meta.url)) {
  process.exitCode = runCommandLine(process.argv.slice(2));
}

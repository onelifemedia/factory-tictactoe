// F-014 (R-013), QA: fails when the build uses a visual file. Every visual is
// CSS or same-document inline SVG, so the build must contain no @font-face,
// @import, image function (image-set, cross-fade), file url(), and no element
// or attribute that loads an image: <img>, SVG <image>/<feImage>, <source>,
// <object>, <embed>, <input type=image>, icon or preload links, srcset,
// poster, background, or a <use> that points outside the document. CSS
// escapes and HTML character references are decoded first, so `\75 rl(` and
// `url&#40;` are caught (QA security review). Used by CI after the build:
// node scripts/check-local-visuals.mjs dist
//
// Scripts are not scanned: they build <use href="#mark-x">. The Playwright
// privacy test (tests/e2e/privacy.spec.ts) checks at run time that no image
// or font is requested; this scan is the static line of defence.
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  decodeHtmlEntities,
  parseAttributes,
  TAG_PATTERN,
} from "./check-build-origins.mjs";
import { isRunAsCommandLine, listFilesRecursively } from "./command-line.mjs";

/** @typedef {"font-face" | "import" | "image-function" | "url" | "img" | "element" | "attribute" | "link" | "use"} VisualFileKind */
/** @typedef {{ file: string; kind: VisualFileKind; text: string }} VisualFileReference */
/** @typedef {{ kind: VisualFileKind; text: string }} VisualFile */

const FONT_FACE_PATTERN = /@font-face\b/gi;
const CSS_IMPORT_PATTERN = /@import\b[^;]*/gi;
const IMAGE_FUNCTION_PATTERN = /(?:-webkit-)?(?:image-set|cross-fade)\(/gi;
// Quoted and unquoted url(...), closing parenthesis optional (browsers accept
// an unterminated url( at the end of a style sheet).
const CSS_URL_PATTERN =
  /url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\\.|[^\s"'()\\])*))/gi;
const CSS_ESCAPE_PATTERN = /\\(?:([0-9a-f]{1,6})\s?|(.))/gis;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const INLINE_SCRIPT_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const LARGEST_CODE_POINT = 0x10_ff_ff;
const REPLACEMENT_CHARACTER = "\uFFFD";
// preload/prefetch load a visual file only as an image or font (or with no
// destination given); script and style preloads are Vite's own (Codex QA C3).
const VISUAL_PRELOAD_DESTINATIONS = new Set(["", "image", "font"]);
const IMAGE_ELEMENTS = new Set([
  "image",
  "feimage",
  "source",
  "object",
  "embed",
]);
const IMAGE_ATTRIBUTES = ["srcset", "poster", "background"];
const LOADING_LINK_RELATIONS = new Set([
  "icon",
  "apple-touch-icon",
  "mask-icon",
  "preload",
  "prefetch",
  "image_src",
]);
// An empty data: icon stops browsers requesting /favicon.ico; it is no file.
const EMPTY_ICON_HREF = "data:,";

/**
 * A CSS hexadecimal escape's character; zero, surrogates and code points past
 * U+10FFFF become U+FFFD, as CSS specifies, instead of throwing (Codex QA C5).
 * @param {number} codePoint
 * @returns {string}
 */
function decodeCssCodePoint(codePoint) {
  const isSurrogate = codePoint >= 0xd8_00 && codePoint <= 0xdf_ff;
  return codePoint === 0 || isSurrogate || codePoint > LARGEST_CODE_POINT
    ? REPLACEMENT_CHARACTER
    : String.fromCodePoint(codePoint);
}

/**
 * @param {string} css
 * @returns {string}
 */
function decodeCssEscapes(css) {
  return css.replace(
    CSS_ESCAPE_PATTERN,
    (
      /** @type {string} */ escape,
      /** @type {string | undefined} */ hexadecimal,
      /** @type {string | undefined} */ character,
    ) =>
      hexadecimal === undefined
        ? (character ?? escape)
        : decodeCssCodePoint(Number.parseInt(hexadecimal, 16)),
  );
}

/**
 * Font faces, imports, image functions and file url()s in a piece of CSS.
 * @param {string} rawCss
 * @returns {VisualFile[]}
 */
function findCssVisualFiles(rawCss) {
  const css = decodeCssEscapes(rawCss);
  /** @type {VisualFile[]} */
  const findings = [];
  for (const match of css.matchAll(FONT_FACE_PATTERN)) {
    findings.push({ kind: "font-face", text: match[0] });
  }
  for (const match of css.matchAll(CSS_IMPORT_PATTERN)) {
    findings.push({ kind: "import", text: match[0] });
  }
  for (const match of css.matchAll(IMAGE_FUNCTION_PATTERN)) {
    findings.push({ kind: "image-function", text: match[0] });
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
 * The image-loading element or attribute a tag carries, if any.
 * @param {string} tagName lower case
 * @param {Map<string, string>} attributes
 * @param {string} tagText
 * @returns {VisualFile[]}
 */
function findTagVisualFiles(tagName, attributes, tagText) {
  /** @type {VisualFile[]} */
  const findings = [];
  if (tagName === "img") {
    findings.push({ kind: "img", text: tagText });
  } else if (
    IMAGE_ELEMENTS.has(tagName) ||
    (tagName === "input" && attributes.get("type")?.toLowerCase() === "image")
  ) {
    findings.push({ kind: "element", text: tagText });
  } else if (tagName === "link") {
    const relations = (attributes.get("rel") ?? "").toLowerCase().split(/\s+/);
    const isPreload = relations.some(
      (relation) => relation === "preload" || relation === "prefetch",
    );
    const destination = (attributes.get("as") ?? "").trim().toLowerCase();
    const isLoadingLink =
      relations.some((relation) => LOADING_LINK_RELATIONS.has(relation)) &&
      (!isPreload || VISUAL_PRELOAD_DESTINATIONS.has(destination));
    if (isLoadingLink && attributes.get("href")?.trim() !== EMPTY_ICON_HREF) {
      findings.push({ kind: "link", text: tagText });
    }
  } else if (tagName === "use") {
    const reference = (
      attributes.get("href") ??
      attributes.get("xlink:href") ??
      ""
    ).trim();
    if (!reference.startsWith("#")) {
      findings.push({ kind: "use", text: tagText });
    }
  }
  for (const attributeName of IMAGE_ATTRIBUTES) {
    if (attributes.has(attributeName)) {
      findings.push({ kind: "attribute", text: tagText });
    }
  }
  return findings;
}

/**
 * Image-loading elements and attributes, and font faces, imports, image
 * functions and file url()s anywhere in the markup (style blocks, quoted or
 * unquoted style attributes, SVG presentation attributes such as
 * fill="url(paint.svg#gradient)"; Codex F-014 C1). Inline scripts are skipped.
 * @param {string} html
 * @returns {VisualFile[]}
 */
function findHtmlVisualFiles(html) {
  // Comments first, so a "<script>" inside a comment cannot hide the real
  // markup between two comments (Codex QA C1).
  const markup = html
    .replaceAll(HTML_COMMENT_PATTERN, "")
    .replaceAll(INLINE_SCRIPT_PATTERN, "");
  /** @type {VisualFile[]} */
  const findings = [];
  for (const match of markup.matchAll(TAG_PATTERN)) {
    const tagName = (match[1] ?? "").toLowerCase();
    findings.push(
      ...findTagVisualFiles(tagName, parseAttributes(match[2] ?? ""), match[0]),
    );
  }
  findings.push(...findCssVisualFiles(decodeHtmlEntities(markup)));
  return findings;
}

/**
 * Every visual file reference in the build.
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

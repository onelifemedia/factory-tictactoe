// F-014 (R-013): fails when the build uses a visual file: an @font-face rule,
// an <img> element or a CSS url() that references a file (same-document
// url(#fragment) is allowed). Used by CI after the build:
// node scripts/check-local-visuals.mjs dist
//
// Stub for the TDD red step: the implementer replaces it.

/** @typedef {{ file: string; kind: "font-face" | "img" | "url"; text: string }} VisualFileReference */

/**
 * Every font face, image element and file url() in the build.
 * @param {string} directory
 * @returns {VisualFileReference[]}
 */
export function findVisualFileReferences(directory) {
  throw new Error(
    `findVisualFileReferences is not implemented yet (F-014): ${directory}`,
  );
}

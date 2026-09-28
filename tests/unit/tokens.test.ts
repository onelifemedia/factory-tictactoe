// F-001 R-013, F-014 R-013: every design token in .factory/design/tokens.json
// (version 2: color.light, font, space, radius, shadow, motion, size, a11y) is
// defined as a CSS custom property with an equivalent value in the :root block
// of src/styles.css. Only version and breakpoint are excluded.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const tokensPath = `${projectRoot}.factory/design/tokens.json`;
const stylesPath = `${projectRoot}src/styles.css`;

type TokenTree = { [key: string]: TokenValue };
type TokenValue = string | number | TokenTree;

const excludedTopLevelKeys = new Set(["version", "breakpoint"]);

function isTokenTree(candidate: unknown): candidate is TokenTree {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    !Array.isArray(candidate)
  );
}

function flattenTokenTree(
  tree: TokenTree,
  prefix: string,
): Map<string, string> {
  const flattened = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith("$")) {
      continue;
    }
    const propertyName = `${prefix}-${key}`;
    if (isTokenTree(value)) {
      for (const [nestedName, nestedValue] of flattenTokenTree(
        value,
        propertyName,
      )) {
        flattened.set(nestedName, nestedValue);
      }
    } else {
      flattened.set(propertyName, String(value));
    }
  }
  return flattened;
}

function collectExpectedProperties(tokens: TokenTree): Map<string, string> {
  const expectedProperties = new Map<string, string>();
  for (const [groupName, group] of Object.entries(tokens)) {
    if (groupName.startsWith("$") || excludedTopLevelKeys.has(groupName)) {
      continue;
    }
    if (!isTokenTree(group)) {
      throw new Error(
        `Unexpected non-object token group "${groupName}" in tokens.json`,
      );
    }
    // color.light.<key> maps to --color-<key>: the theme level is dropped.
    const source = groupName === "color" ? group["light"] : group;
    if (!isTokenTree(source)) {
      throw new Error(`Token group "${groupName}" has no object to flatten`);
    }
    for (const [propertyName, value] of flattenTokenTree(
      source,
      `--${groupName}`,
    )) {
      expectedProperties.set(propertyName, value);
    }
  }
  return expectedProperties;
}

function readTokens(): TokenTree {
  const parsed = JSON.parse(readFileSync(tokensPath, "utf8")) as unknown;
  if (!isTokenTree(parsed)) {
    throw new Error("tokens.json is not an object");
  }
  return parsed;
}

function normalizeValue(value: string): string {
  return value.replaceAll("'", '"').replaceAll(/\s+/g, " ").trim();
}

function parseRootCustomProperties(stylesheet: string): Map<string, string> {
  const withoutComments = stylesheet.replaceAll(/\/\*[\s\S]*?\*\//g, "");
  const rootMatch = /:root\s*\{([^}]*)\}/.exec(withoutComments);
  const declarations = new Map<string, string>();
  if (rootMatch?.[1] === undefined) {
    return declarations;
  }
  for (const declaration of rootMatch[1].split(";")) {
    const colonIndex = declaration.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const propertyName = declaration.slice(0, colonIndex).trim();
    if (!propertyName.startsWith("--")) {
      continue;
    }
    declarations.set(
      propertyName,
      normalizeValue(declaration.slice(colonIndex + 1)),
    );
  }
  return declarations;
}

function readRootCustomProperties(): Map<string, string> {
  expect(existsSync(stylesPath), "src/styles.css must exist").toBe(true);
  return parseRootCustomProperties(readFileSync(stylesPath, "utf8"));
}

const expectedProperties = collectExpectedProperties(readTokens());

describe("design tokens in src/styles.css (F-001 R-013, F-014 R-013)", () => {
  it("maps tokens.json version 2 to the expected set of custom properties, including shadow, nested size leaves and motion (F-014 R-013)", () => {
    expect(expectedProperties.get("--motion-drop")).toBe(
      "280ms cubic-bezier(0.3, 1.6, 0.5, 1)",
    );
    expect(expectedProperties.get("--size-board-max")).toBe(
      "max(180px, min(100%, 360px, 45svh))",
    );
    expect(expectedProperties.get("--shadow-button")).toBe(
      "0 5px 0 var(--color-primary-edge)",
    );
    expect(expectedProperties.get("--color-surface-tile")).toBe("#fffaf0");
    expect(expectedProperties.has("--motion-fast")).toBe(false);
    expect(expectedProperties.get("--size-status-min-lines-narrow")).toBe("3");
    expect(expectedProperties.get("--font-weight-bold")).toBe("700");
    expect(expectedProperties.has("--color-light-surface")).toBe(false);
    expect(
      [...expectedProperties.keys()].some((name) =>
        name.startsWith("--breakpoint"),
      ),
    ).toBe(false);
  });

  for (const [propertyName, expectedValue] of expectedProperties) {
    it(`defines ${propertyName} as ${expectedValue} in :root (F-014 R-013)`, () => {
      const rootProperties = readRootCustomProperties();
      expect(
        rootProperties.has(propertyName),
        `${propertyName} is declared in :root`,
      ).toBe(true);
      expect(rootProperties.get(propertyName)).toBe(
        normalizeValue(expectedValue),
      );
    });
  }
});

// F-010 R-013, F-014 R-013: the WCAG relative-luminance contrast of every
// colour pair in design-system.md section 2, computed from
// .factory/design/tokens.json (version 2). Pairs follow the table's Class
// column: text pairs must reach 7:1 and non-text indicators 3:1 (the house
// rule, above AA). The one published exception, border on tile-edge (2.56:1),
// is asserted only at its published value. Every ratio the table publishes is
// reproduced to 2 decimals.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

interface ColorPair {
  foreground: string;
  background: string;
}

interface PublishedRatio extends ColorPair {
  ratio: number;
}

interface ColorTableRow {
  role: string;
  contrastClass: string;
  contrast: string;
}

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const tokensPath = `${projectRoot}.factory/design/tokens.json`;
const designSystemPath = `${projectRoot}.factory/design/design-system.md`;

const MINIMUM_TEXT_RATIO = 7;
const MINIMUM_NON_TEXT_RATIO = 3;
const PUBLISHED_RATIO_COUNT = 25;

// Class "text (7:1)" in design-system.md section 2.
const TEXT_PAIRS: readonly ColorPair[] = [
  { foreground: "text", background: "surface" },
  { foreground: "text", background: "surface-tile" },
  { foreground: "text", background: "surface-sunken" },
  { foreground: "text", background: "win-surface" },
  { foreground: "text-muted", background: "surface" },
  { foreground: "on-primary", background: "primary" },
  { foreground: "on-primary", background: "primary-hover" },
];

// Class "non-text (3:1)" in design-system.md section 2.
const NON_TEXT_PAIRS: readonly ColorPair[] = [
  { foreground: "primary", background: "surface" },
  { foreground: "border", background: "board-well" },
  { foreground: "border", background: "surface-tile" },
  { foreground: "border-disabled", background: "board-well" },
  { foreground: "border-disabled", background: "surface-sunken" },
  { foreground: "focus", background: "surface" },
  { foreground: "focus", background: "board-well" },
  { foreground: "mark-x", background: "surface-tile" },
  { foreground: "mark-x", background: "surface-sunken" },
  { foreground: "mark-x", background: "win-surface" },
  { foreground: "mark-o", background: "surface-tile" },
  { foreground: "mark-o", background: "surface-sunken" },
  { foreground: "mark-o", background: "win-surface" },
  { foreground: "win-marker", background: "win-surface" },
  { foreground: "win-marker", background: "board-well" },
  { foreground: "win-marker", background: "win-edge" },
];

// Published below 3:1 on purpose: only the bottom side of a tile's border
// meets its wooden edge (design-system.md section 2, border row).
const BORDER_ON_TILE_EDGE: PublishedRatio = {
  foreground: "border",
  background: "tile-edge",
  ratio: 2.56,
};

function readLightColors(): Map<string, string> {
  const tokens = JSON.parse(readFileSync(tokensPath, "utf8")) as {
    color?: { light?: Record<string, string> };
  };
  const lightColors = tokens.color?.light;
  if (lightColors === undefined) {
    throw new Error("tokens.json has no color.light group");
  }
  return new Map(Object.entries(lightColors));
}

/** The rows of the Role table in design-system.md section 2. */
function readColorTableRows(): ColorTableRow[] {
  const designSystem = readFileSync(designSystemPath, "utf8");
  const sectionStart = designSystem.indexOf("## 2. Color");
  const sectionEnd = designSystem.indexOf("## 3.", sectionStart);
  if (sectionStart === -1 || sectionEnd === -1) {
    throw new Error("design-system.md has no section 2. Color");
  }
  const rows: ColorTableRow[] = [];
  for (const line of designSystem.slice(sectionStart, sectionEnd).split("\n")) {
    if (!line.startsWith("|")) {
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    const [role, , , , contrastClass, contrast] = cells;
    if (
      role === undefined ||
      contrastClass === undefined ||
      contrast === undefined ||
      role === "Role" ||
      role.startsWith("---")
    ) {
      continue;
    }
    rows.push({ role, contrastClass, contrast });
  }
  return rows;
}

/**
 * Every "N:1 on <role>" (or "vs <role>") in the Contrast column. "<word> N:1
 * on it" means the named role on this row's colour.
 */
function parsePublishedRatios(
  rows: readonly ColorTableRow[],
): PublishedRatio[] {
  const publishedRatios: PublishedRatio[] = [];
  for (const row of rows) {
    for (const match of row.contrast.matchAll(
      /(?:([a-z-]+) )?(\d+\.\d+):1 (?:on|vs) ([a-z-]+)/g,
    )) {
      const [, precedingWord, ratioText, target] = match;
      if (ratioText === undefined || target === undefined) {
        continue;
      }
      const isOnThisRow = target === "it";
      if (isOnThisRow && precedingWord === undefined) {
        throw new Error(`"${match[0]}" names no foreground role`);
      }
      publishedRatios.push({
        foreground: isOnThisRow ? (precedingWord ?? "") : row.role,
        background: isOnThisRow ? row.role : target,
        ratio: Number(ratioText),
      });
    }
  }
  return publishedRatios;
}

function parseHexColor(hexColor: string): [number, number, number] {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hexColor);
  if (
    match?.[1] === undefined ||
    match[2] === undefined ||
    match[3] === undefined
  ) {
    throw new Error(`"${hexColor}" is not a six-digit hex colour`);
  }
  return [
    Number.parseInt(match[1], 16),
    Number.parseInt(match[2], 16),
    Number.parseInt(match[3], 16),
  ];
}

function linearizeChannel(channelByte: number): number {
  const channel = channelByte / 255;
  return channel <= 0.040_45
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function calculateRelativeLuminance(hexColor: string): number {
  const [red, green, blue] = parseHexColor(hexColor).map(linearizeChannel) as [
    number,
    number,
    number,
  ];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function calculateContrastRatio(
  foregroundHex: string,
  backgroundHex: string,
): number {
  const foregroundLuminance = calculateRelativeLuminance(foregroundHex);
  const backgroundLuminance = calculateRelativeLuminance(backgroundHex);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function lookUpColor(lightColors: Map<string, string>, role: string): string {
  const hexColor = lightColors.get(role);
  if (hexColor === undefined) {
    throw new Error(`tokens.json color.light has no "${role}"`);
  }
  return hexColor;
}

function calculatePairRatio(colorPair: ColorPair): number {
  return calculateContrastRatio(
    lookUpColor(lightColors, colorPair.foreground),
    lookUpColor(lightColors, colorPair.background),
  );
}

function describePair(colorPair: ColorPair): string {
  return `${colorPair.foreground} on ${colorPair.background}`;
}

function isSamePair(first: ColorPair, second: ColorPair): boolean {
  return (
    first.foreground === second.foreground &&
    first.background === second.background
  );
}

const lightColors = readLightColors();
const colorTableRows = readColorTableRows();
const publishedRatios = parsePublishedRatios(colorTableRows);

describe("the contrast calculation follows WCAG relative luminance (F-010 R-013)", () => {
  it("gives 21:1 for black on white and 1:1 for a colour on itself", () => {
    expect(calculateContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(calculateContrastRatio("#0b3d91", "#0b3d91")).toBeCloseTo(1, 5);
  });

  it("rejects a colour that is not six-digit hex", () => {
    expect(() => calculateContrastRatio("#fff", "#ffffff")).toThrow(
      /not a six-digit hex colour/,
    );
  });
});

describe("design-system.md section 2 publishes the ratios the tokens produce (F-014 R-013)", () => {
  it(`finds all ${String(PUBLISHED_RATIO_COUNT)} published ratios in the table (F-014 R-013)`, () => {
    expect(publishedRatios).toHaveLength(PUBLISHED_RATIO_COUNT);
  });

  for (const publishedRatio of publishedRatios) {
    it(`reproduces ${describePair(publishedRatio)} as ${publishedRatio.ratio.toFixed(2)}:1 (F-014 R-013)`, () => {
      expect(calculatePairRatio(publishedRatio).toFixed(2)).toBe(
        publishedRatio.ratio.toFixed(2),
      );
    });
  }

  it("lists every published pair of a text or non-text role in the matching pair list, except border on tile-edge (F-014 R-013)", () => {
    const classByRole = new Map(
      colorTableRows.map((row) => [row.role, row.contrastClass]),
    );
    const unlistedPairs = publishedRatios
      .filter((publishedRatio) => {
        if (isSamePair(publishedRatio, BORDER_ON_TILE_EDGE)) {
          return false;
        }
        const contrastClass = classByRole.get(publishedRatio.foreground) ?? "";
        const pairs = contrastClass.startsWith("text")
          ? TEXT_PAIRS
          : NON_TEXT_PAIRS;
        return !pairs.some((colorPair) =>
          isSamePair(colorPair, publishedRatio),
        );
      })
      .map(describePair);

    expect(unlistedPairs).toEqual([]);
  });

  it("classes every foreground role in TEXT_PAIRS as text and in NON_TEXT_PAIRS as non-text (F-014 R-013)", () => {
    const classByRole = new Map(
      colorTableRows.map((row) => [row.role, row.contrastClass]),
    );
    for (const colorPair of TEXT_PAIRS) {
      expect(
        classByRole.get(colorPair.foreground),
        colorPair.foreground,
      ).toMatch(/^text \(7:1\)/);
    }
    for (const colorPair of NON_TEXT_PAIRS) {
      expect(
        classByRole.get(colorPair.foreground),
        colorPair.foreground,
      ).toMatch(/^non-text \(3:1\)/);
    }
  });
});

describe("text colour pairs in tokens.json reach at least 7:1 (F-010 R-013, F-014 R-013)", () => {
  for (const colorPair of TEXT_PAIRS) {
    it(`${describePair(colorPair)} is at least 7:1 (F-014 R-013)`, () => {
      const contrastRatio = calculatePairRatio(colorPair);
      expect(
        contrastRatio,
        `${describePair(colorPair)} is ${contrastRatio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(MINIMUM_TEXT_RATIO);
    });
  }
});

describe("non-text indicator pairs in tokens.json reach at least 3:1 (F-010 R-013, F-014 R-013)", () => {
  for (const colorPair of NON_TEXT_PAIRS) {
    it(`${describePair(colorPair)} is at least 3:1 (F-014 R-013)`, () => {
      const contrastRatio = calculatePairRatio(colorPair);
      expect(
        contrastRatio,
        `${describePair(colorPair)} is ${contrastRatio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(MINIMUM_NON_TEXT_RATIO);
    });
  }
});

describe("the border-on-tile-edge exception (F-014 R-013)", () => {
  it("is 2.56:1, its published value (F-014 R-013)", () => {
    expect(calculatePairRatio(BORDER_ON_TILE_EDGE).toFixed(2)).toBe("2.56");
  });

  it("is published in section 2 and is not held to the 3:1 threshold list (F-014 R-013)", () => {
    expect(
      publishedRatios.some((publishedRatio) =>
        isSamePair(publishedRatio, BORDER_ON_TILE_EDGE),
      ),
    ).toBe(true);
    expect(
      NON_TEXT_PAIRS.some((colorPair) =>
        isSamePair(colorPair, BORDER_ON_TILE_EDGE),
      ),
    ).toBe(false);
    expect(
      TEXT_PAIRS.some((colorPair) =>
        isSamePair(colorPair, BORDER_ON_TILE_EDGE),
      ),
    ).toBe(false);
  });
});

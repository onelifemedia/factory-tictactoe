// F-010 R-013: the WCAG relative-luminance contrast of every colour pair in
// design-system.md section 2, computed from .factory/design/tokens.json. Text
// pairs must reach 7:1 and non-text indicators 3:1 (the house rule, above AA).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

interface ColorPair {
  foreground: string;
  background: string;
}

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const tokensPath = `${projectRoot}.factory/design/tokens.json`;

const MINIMUM_TEXT_RATIO = 7;
const MINIMUM_NON_TEXT_RATIO = 3;

const TEXT_PAIRS: readonly ColorPair[] = [
  { foreground: "text", background: "surface" },
  { foreground: "text", background: "surface-sunken" },
  { foreground: "text", background: "win-surface" },
  { foreground: "text-muted", background: "surface" },
  { foreground: "on-primary", background: "primary" },
];

const NON_TEXT_PAIRS: readonly ColorPair[] = [
  { foreground: "border", background: "surface" },
  { foreground: "border-disabled", background: "surface-sunken" },
  { foreground: "focus", background: "surface" },
  { foreground: "focus", background: "surface-sunken" },
  { foreground: "primary", background: "surface" },
  { foreground: "win-marker", background: "win-surface" },
];

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

const lightColors = readLightColors();

describe("the contrast calculation follows WCAG relative luminance (F-010 R-013)", () => {
  it("gives 21:1 for black on white and 1:1 for a colour on itself", () => {
    expect(calculateContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(calculateContrastRatio("#0b3d91", "#0b3d91")).toBeCloseTo(1, 5);
  });

  it("matches the ratios published in design-system.md section 2", () => {
    expect(calculateContrastRatio("#111111", "#ffffff")).toBeCloseTo(18.88, 2);
    expect(calculateContrastRatio("#3d3d3d", "#ffffff")).toBeCloseTo(10.86, 2);
    expect(calculateContrastRatio("#595959", "#f2f2f2")).toBeCloseTo(6.26, 2);
  });

  it("rejects a colour that is not six-digit hex", () => {
    expect(() => calculateContrastRatio("#fff", "#ffffff")).toThrow(
      /not a six-digit hex colour/,
    );
  });
});

describe("text colour pairs in tokens.json reach at least 7:1 (F-010 R-013)", () => {
  for (const colorPair of TEXT_PAIRS) {
    it(`${colorPair.foreground} on ${colorPair.background} is at least 7:1`, () => {
      const contrastRatio = calculateContrastRatio(
        lookUpColor(lightColors, colorPair.foreground),
        lookUpColor(lightColors, colorPair.background),
      );
      expect(
        contrastRatio,
        `${colorPair.foreground} on ${colorPair.background} is ${contrastRatio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(MINIMUM_TEXT_RATIO);
    });
  }
});

describe("non-text indicator pairs in tokens.json reach at least 3:1 (F-010 R-013)", () => {
  for (const colorPair of NON_TEXT_PAIRS) {
    it(`${colorPair.foreground} on ${colorPair.background} is at least 3:1`, () => {
      const contrastRatio = calculateContrastRatio(
        lookUpColor(lightColors, colorPair.foreground),
        lookUpColor(lightColors, colorPair.background),
      );
      expect(
        contrastRatio,
        `${colorPair.foreground} on ${colorPair.background} is ${contrastRatio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(MINIMUM_NON_TEXT_RATIO);
    });
  }
});

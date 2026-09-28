// F-014 R-005, F-015 R-013: sample the colour a screenshot shows at one
// viewport point and compare it with a design colour, per channel with a small
// tolerance. Shared by the game-over and motion specs.
import { expect, type Page } from "@playwright/test";
import { readPngPixel, type PixelColor } from "./read-png-pixel";

export interface ScreenPoint {
  x: number;
  y: number;
}

const PIXEL_CHANNEL_TOLERANCE = 4;

/**
 * The colour a screenshot shows at one viewport point, in CSS pixels. By
 * default Playwright fast-forwards finite animations first; "allow" samples
 * the page as it is, e.g. with animations frozen mid-flight (Codex F-015 C2).
 */
export async function readScreenColor(
  page: Page,
  point: ScreenPoint,
  animationMode: "disabled" | "allow" = "disabled",
): Promise<PixelColor> {
  const screenshot = await page.screenshot({
    clip: {
      x: Math.round(point.x) - 1,
      y: Math.round(point.y) - 1,
      width: 3,
      height: 3,
    },
    scale: "css",
    animations: animationMode,
  });
  return readPngPixel(screenshot, 1, 1);
}

export function expectColorNear(
  actualColor: PixelColor,
  expectedColor: PixelColor,
  description: string,
): void {
  for (const channel of ["red", "green", "blue"] as const) {
    expect(
      Math.abs(actualColor[channel] - expectedColor[channel]),
      `${description}: ${channel} ${String(actualColor[channel])} vs ${String(expectedColor[channel])}`,
    ).toBeLessThanOrEqual(PIXEL_CHANNEL_TOLERANCE);
  }
}

// F-010 R-010: no horizontal scrolling and 44×44 CSS px targets at 320×568,
// 390×844 and 1280×800 in every game state, and a board whose bounding box
// never moves between choose, play (taken message, longest status) and game
// over at 320×568 and 1280×800.
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import {
  activate,
  chooseFirstMover,
  locateBoard,
  locateSquare,
  locateStatus,
  playMoves,
} from "./game-page";
import {
  DIAGONAL_WIN_MOVES,
  GAME_STATES,
  LONGEST_RESULT_STATUS,
} from "./game-states";

interface Viewport {
  width: number;
  height: number;
}

interface BoardBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TargetMeasurement {
  description: string;
  width: number;
  height: number;
}

const MINIMUM_TARGET_PIXELS = 44;
const BOARD_TOLERANCE_PIXELS = 0.5;

const LAYOUT_VIEWPORTS: readonly Viewport[] = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

const STABILITY_VIEWPORTS: readonly Viewport[] = [
  { width: 320, height: 568 },
  { width: 1280, height: 800 },
];

function describeViewport(viewport: Viewport): string {
  return `${String(viewport.width)}×${String(viewport.height)}`;
}

async function measureVisibleTargets(page: Page): Promise<TargetMeasurement[]> {
  const measurements: TargetMeasurement[] = [];
  for (const target of await page.locator(".square, button").all()) {
    if (!(await target.isVisible())) {
      continue;
    }
    const box = await target.boundingBox();
    const accessibleName =
      (await target.getAttribute("aria-label")) ??
      (await target.textContent()) ??
      "";
    measurements.push({
      description: accessibleName.trim(),
      width: box?.width ?? 0,
      height: box?.height ?? 0,
    });
  }
  return measurements;
}

async function readBoardBox(page: Page): Promise<BoardBox> {
  const box = await locateBoard(page).boundingBox();
  if (box === null) {
    throw new Error("the board group has no bounding box");
  }
  return box;
}

function expectSameBoardBox(
  actualBox: BoardBox,
  expectedBox: BoardBox,
  stepName: string,
): void {
  for (const edge of ["x", "y", "width", "height"] as const) {
    expect(
      Math.abs(actualBox[edge] - expectedBox[edge]),
      `board ${edge} after ${stepName}: ${String(actualBox[edge])} vs ${String(expectedBox[edge])} on the choice screen`,
    ).toBeLessThanOrEqual(BOARD_TOLERANCE_PIXELS);
  }
}

async function recordBoardBoxes(
  page: Page,
  testInfo: TestInfo,
): Promise<Map<string, BoardBox>> {
  const boardBoxesByStep = new Map<string, BoardBox>();

  await expect(locateStatus(page)).toHaveText("Who goes first?");
  boardBoxesByStep.set("the choice screen", await readBoardBox(page));

  await chooseFirstMover(page, testInfo, "You go first");
  await expect(locateStatus(page)).toHaveText("Your turn. You are X.");
  boardBoxesByStep.set("You go first", await readBoardBox(page));

  await playMoves(page, testInfo, DIAGONAL_WIN_MOVES.slice(0, 1));
  // Forced: Playwright's actionability check treats aria-disabled as disabled.
  await activate(locateSquare(page, 4), testInfo, { force: true });
  await expect(locateStatus(page)).toHaveText(
    "Row 2, column 2 is taken. Choose an empty square.",
  );
  boardBoxesByStep.set("the taken-square message", await readBoardBox(page));

  await playMoves(page, testInfo, DIAGONAL_WIN_MOVES.slice(1));
  await expect(locateStatus(page)).toHaveText(LONGEST_RESULT_STATUS);
  boardBoxesByStep.set("the longest result", await readBoardBox(page));

  await activate(page.getByRole("button", { name: "Play again" }), testInfo);
  await chooseFirstMover(page, testInfo, "Computer goes first");
  await expect(locateStatus(page)).toHaveText(
    "Computer placed O in row 1, column 1. Your turn. You are X.",
  );
  boardBoxesByStep.set(
    "the longest continuing status",
    await readBoardBox(page),
  );

  return boardBoxesByStep;
}

test.describe("layout: no horizontal scroll and 44×44 targets (F-010 R-010)", () => {
  for (const viewport of LAYOUT_VIEWPORTS) {
    for (const gameState of GAME_STATES) {
      test(`at ${describeViewport(viewport)} the ${gameState.name} state does not scroll horizontally and every square and button is at least 44×44 (F-010 R-010)`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        await gameState.reach(page, testInfo);

        const pageWidths = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(
          pageWidths.scrollWidth,
          `scrollWidth ${String(pageWidths.scrollWidth)} vs innerWidth ${String(pageWidths.innerWidth)}`,
        ).toBeLessThanOrEqual(pageWidths.innerWidth);

        const targetMeasurements = await measureVisibleTargets(page);
        expect(targetMeasurements.length).toBeGreaterThan(0);
        const undersizedTargets = targetMeasurements.filter(
          (measurement) =>
            measurement.width < MINIMUM_TARGET_PIXELS ||
            measurement.height < MINIMUM_TARGET_PIXELS,
        );
        expect(undersizedTargets, "targets smaller than 44×44").toEqual([]);
      });
    }
  }
});

test.describe("layout: the board never moves (F-010 R-010)", () => {
  for (const viewport of STABILITY_VIEWPORTS) {
    test(`at ${describeViewport(viewport)} the board's bounding box is the same on the choice screen, after You go first, after a taken-square message, after the longest continuing status and after the longest result (F-010 R-010)`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      const boardBoxesByStep = await recordBoardBoxes(page, testInfo);

      const choiceBox = boardBoxesByStep.get("the choice screen");
      if (choiceBox === undefined) {
        throw new Error("no board box was recorded on the choice screen");
      }
      for (const [stepName, boardBox] of boardBoxesByStep) {
        expectSameBoardBox(boardBox, choiceBox, stepName);
      }
    });
  }
});

// F-010 R-010: no horizontal scrolling, and 44×44 CSS px targets that are visible
// and inside the viewport, at 320×568, 390×844, 1280×800 and 640×400 (200% zoom)
// in every game state, and a board whose bounding box
// never moves between choose, play (taken message, longest status) and game
// over at 320×568 and 1280×800.
// F-014 R-010: at 320×568, 390×844, 844×390 and 1280×800 the board (the
// tray) is max(180px, min(100%, 360px, 45svh)) square, every tile is at least
// 44×44 and inside the tray, nothing overflows horizontally, and at 320×568
// both stacked choice buttons end, with their 5 px edge, inside the viewport.
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import {
  activate,
  chooseFirstMover,
  locateBoard,
  locateSquare,
  locateStatus,
  playMoves,
  waitForAnimationsToFinish,
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
  isVisible: boolean;
  left: number;
  right: number;
  width: number;
  height: number;
}

const MINIMUM_TARGET_PIXELS = 44;
const BOARD_TOLERANCE_PIXELS = 0.5;

const LAYOUT_VIEWPORTS: readonly Viewport[] = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
  // 1280×800 at 200% zoom has the same CSS-pixel viewport (WCAG 1.4.4, 1.4.10;
  // Codex F-010 review, missing evidence for 200%).
  { width: 640, height: 400 },
];

// The buttons each state must show besides the nine squares (Codex F-010
// review C1: required targets are asserted, never skipped when hidden).
const REQUIRED_BUTTONS_BY_STATE: Readonly<Record<string, readonly string[]>> = {
  choice: ["You go first", "Computer goes first"],
  "in play": [],
  "computer won": ["Play again"],
  draw: ["Play again"],
};
const SQUARE_COUNT = 9;

const STABILITY_VIEWPORTS: readonly Viewport[] = [
  { width: 320, height: 568 },
  { width: 1280, height: 800 },
];

function describeViewport(viewport: Viewport): string {
  return `${String(viewport.width)}×${String(viewport.height)}`;
}

/** Every required target of the state: the nine squares plus its buttons. */
async function measureRequiredTargets(
  page: Page,
  stateName: string,
): Promise<TargetMeasurement[]> {
  const requiredButtons = REQUIRED_BUTTONS_BY_STATE[stateName] ?? [];
  const squares = locateBoard(page).locator(".square");
  await expect(squares).toHaveCount(SQUARE_COUNT);
  await expect(page.locator("button")).toHaveCount(
    SQUARE_COUNT + requiredButtons.length,
  );
  const targets = [
    ...(await squares.all()),
    ...requiredButtons.map((name) => page.getByRole("button", { name })),
  ];
  const measurements: TargetMeasurement[] = [];
  for (const target of targets) {
    const box = await target.boundingBox();
    const accessibleName =
      (await target.getAttribute("aria-label")) ??
      (await target.textContent()) ??
      "";
    measurements.push({
      description: accessibleName.trim(),
      // Playwright's isVisible() accepts opacity 0 (Codex F-010 round 2 C1),
      // so the effective opacity along the ancestor chain is checked too.
      isVisible:
        (await target.isVisible()) &&
        (await target.evaluate((element) => {
          let opacity = 1;
          for (
            let current: Element | null = element;
            current !== null;
            current = current.parentElement
          ) {
            const style = getComputedStyle(current);
            if (style.visibility === "hidden" || style.display === "none") {
              return false;
            }
            opacity *= Number(style.opacity);
          }
          return opacity > 0;
        })),
      left: box?.x ?? Number.NaN,
      right: (box?.x ?? Number.NaN) + (box?.width ?? 0),
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

        const targetMeasurements = await measureRequiredTargets(
          page,
          gameState.name,
        );
        const hiddenTargets = targetMeasurements.filter(
          (measurement) => !measurement.isVisible,
        );
        expect(hiddenTargets, "required targets that are not visible").toEqual(
          [],
        );
        // Codex F-010 review C2: no overflow alone does not prove a target is
        // on screen; each must lie within the viewport horizontally.
        const offscreenTargets = targetMeasurements.filter(
          (measurement) =>
            !(measurement.left >= 0) ||
            !(measurement.right <= pageWidths.innerWidth),
        );
        expect(
          offscreenTargets,
          "targets outside the viewport horizontally",
        ).toEqual([]);
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

// Codex F-010 round 2 C2: WCAG 1.4.4 is about enlarged *text*. All type sizes
// are in rem, so a 200% root font size is the text-only zoom equivalent. The
// longest messages must stay unclipped and every control usable.
test.describe("layout: text enlarged to 200% (F-010 R-010, WCAG 1.4.4)", () => {
  for (const gameState of GAME_STATES) {
    test(`at 1280×800 with 200% text the ${gameState.name} state keeps all text readable and every target visible and on screen (F-010 R-010)`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");
      // A wide font present on both macOS (Verdana) and the Linux CI runners
      // (DejaVu Sans) makes this platform-independent: macOS's narrower system
      // font hid a clipped label that CI caught.
      await page.addStyleTag({
        content:
          "html { font-size: 200%; } body, button { font-family: Verdana, 'DejaVu Sans', sans-serif !important; }",
      });
      await gameState.reach(page, testInfo);

      const textFits = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            ".title, .status, .hint, .button",
          ),
        ]
          .filter((element) => element.offsetParent !== null)
          .map((element) => ({
            text: element.textContent ?? "",
            isClipped:
              element.scrollWidth > element.clientWidth + 1 ||
              element.scrollHeight > element.clientHeight + 1,
          })),
      );
      expect(
        textFits.filter((entry) => entry.isClipped),
        "clipped text at 200%",
      ).toEqual([]);

      const pageWidths = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(pageWidths.scrollWidth).toBeLessThanOrEqual(pageWidths.innerWidth);
      const targetMeasurements = await measureRequiredTargets(
        page,
        gameState.name,
      );
      expect(
        targetMeasurements.filter(
          (measurement) =>
            !measurement.isVisible ||
            !(measurement.left >= 0) ||
            !(measurement.right <= pageWidths.innerWidth),
        ),
        "targets hidden or off screen at 200% text",
      ).toEqual([]);
    });
  }
});

interface BoardGeometry {
  boardBox: BoardBox;
  containerContentWidth: number;
  viewportHeight: number;
  scrollWidth: number;
  innerWidth: number;
  tileBoxes: BoardBox[];
}

const BOARD_FORMULA_VIEWPORTS: readonly Viewport[] = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
];
const BOARD_FLOOR_PIXELS = 180;
const BOARD_CEILING_PIXELS = 360;
const BOARD_VIEWPORT_HEIGHT_SHARE = 0.45;
const FORMULA_TOLERANCE_PIXELS = 1;
const BUTTON_EDGE_PIXELS = 5;

async function measureBoardGeometry(page: Page): Promise<BoardGeometry> {
  return locateBoard(page).evaluate((board) => {
    const toBox = (element: Element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    const container = board.parentElement ?? document.body;
    const containerStyle = getComputedStyle(container);
    return {
      boardBox: toBox(board),
      containerContentWidth:
        container.clientWidth -
        Number.parseFloat(containerStyle.paddingLeft) -
        Number.parseFloat(containerStyle.paddingRight),
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      tileBoxes: [...board.querySelectorAll(".square")].map(toBox),
    };
  });
}

function calculateExpectedBoardWidth(geometry: BoardGeometry): number {
  return Math.max(
    BOARD_FLOOR_PIXELS,
    Math.min(
      geometry.containerContentWidth,
      BOARD_CEILING_PIXELS,
      BOARD_VIEWPORT_HEIGHT_SHARE * geometry.viewportHeight,
    ),
  );
}

test.describe("layout: the Tabletop Tiles board size (F-014 R-010)", () => {
  for (const viewport of BOARD_FORMULA_VIEWPORTS) {
    for (const gameState of GAME_STATES) {
      test(`at ${describeViewport(viewport)} in the ${gameState.name} state the board is max(180px, min(100%, 360px, 45svh)) square, its tiles are at least 44×44 and inside it, and nothing overflows horizontally (F-014 R-010)`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        await gameState.reach(page, testInfo);
        await waitForAnimationsToFinish(page);

        const geometry = await measureBoardGeometry(page);
        const expectedWidth = calculateExpectedBoardWidth(geometry);

        expect(
          Math.abs(geometry.boardBox.width - expectedWidth),
          `board width ${String(geometry.boardBox.width)} vs ${String(expectedWidth)}`,
        ).toBeLessThanOrEqual(FORMULA_TOLERANCE_PIXELS);
        expect(
          Math.abs(geometry.boardBox.height - geometry.boardBox.width),
          `board height ${String(geometry.boardBox.height)} vs width ${String(geometry.boardBox.width)}`,
        ).toBeLessThanOrEqual(FORMULA_TOLERANCE_PIXELS);
        expect(
          geometry.scrollWidth,
          `scrollWidth ${String(geometry.scrollWidth)} vs innerWidth ${String(geometry.innerWidth)}`,
        ).toBeLessThanOrEqual(geometry.innerWidth);

        expect(geometry.tileBoxes).toHaveLength(SQUARE_COUNT);
        const { boardBox } = geometry;
        const misfitTiles = geometry.tileBoxes
          .map((tileBox, index) => ({ index, ...tileBox }))
          .filter(
            (tileBox) =>
              tileBox.width < MINIMUM_TARGET_PIXELS ||
              tileBox.height < MINIMUM_TARGET_PIXELS ||
              tileBox.x < boardBox.x ||
              tileBox.y < boardBox.y ||
              tileBox.x + tileBox.width > boardBox.x + boardBox.width ||
              tileBox.y + tileBox.height > boardBox.y + boardBox.height,
          );
        expect(misfitTiles, "tiles under 44×44 or outside the tray").toEqual(
          [],
        );
      });
    }
  }

  test("at 320×568 both stacked choice buttons, including their 5 px edge, end inside the viewport (F-014 R-010)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");
    await expect(locateStatus(page)).toHaveText("Who goes first?");

    for (const choiceName of ["You go first", "Computer goes first"]) {
      const button = page.getByRole("button", { name: choiceName });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box, `${choiceName} box`).not.toBeNull();
      expect(
        (box?.y ?? Number.POSITIVE_INFINITY) +
          (box?.height ?? 0) +
          BUTTON_EDGE_PIXELS,
        `${choiceName} bottom plus its edge`,
      ).toBeLessThanOrEqual(568);
    }
  });
});

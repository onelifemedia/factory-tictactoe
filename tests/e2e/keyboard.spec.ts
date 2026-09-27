// F-008 R-007 R-006: keyboard-only play with managed focus. Every move, choice
// and focus change is driven by page.keyboard (Tab, Shift+Tab, arrows, Enter,
// Space); no pointer, no locator-driven focus and no injected .focus(). The one
// pointer action is in the pointer-to-keyboard sync test. Focus map and hint
// copy: .factory/design/screens.md. Move sequences follow the real computer
// player (ADR-010), as in tests/unit/game.test.ts.
import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  SQUARE_COUNT,
  activate,
  expectEverySquareNativelyDisabled,
  expectVisibleMarksMatchNames,
  locateBoard,
  locateSquare,
  locateSquares,
  locateStatus,
  readSquareContents,
  type MovePair,
} from "./game-page";

type ArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";
type PlacementKey = "Enter" | "Space";

interface ArrowStep {
  key: ArrowKey;
  expectedSquare: number;
}

const COLUMN_COUNT = 3;
const MINIMUM_FOCUS_RING_WIDTH_PIXELS = 2;
const HINT_TEXT = "Arrow keys move between squares. Enter or Space places X.";

// Human first: X0 O4, X1 O2, X3 O6; the computer wins on squares 2, 4, 6.
const COMPUTER_WIN_MOVES: readonly MovePair[] = [
  { humanSquare: 0, computerReply: 4 },
  { humanSquare: 1, computerReply: 2 },
  { humanSquare: 3, computerReply: 6 },
];

// Computer first: O0, X4 O1, X2 O6, X3 O5, X7 O8; O's fifth mark draws.
const COMPUTER_OPENING_SQUARE = 0;
const COMPUTER_FIRST_DRAW_MOVES: readonly MovePair[] = [
  { humanSquare: 4, computerReply: 1 },
  { humanSquare: 2, computerReply: 6 },
  { humanSquare: 3, computerReply: 5 },
  { humanSquare: 7, computerReply: 8 },
];

function locateChoice(
  page: Page,
  choiceName: "You go first" | "Computer goes first",
): Locator {
  return page.getByRole("button", { name: choiceName });
}

function locatePlayAgain(page: Page): Locator {
  return page.getByRole("button", { name: "Play again" });
}

function locateHint(page: Page): Locator {
  return page.locator("#hint");
}

function rowOf(index: number): number {
  return Math.floor(index / COLUMN_COUNT);
}

function columnOf(index: number): number {
  return index % COLUMN_COUNT;
}

/** The index of the focused square, or null when focus is not on a square. */
async function readFocusedSquareIndex(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const focusedElement = document.activeElement;
    if (
      !(focusedElement instanceof HTMLElement) ||
      !focusedElement.classList.contains("square")
    ) {
      return null;
    }
    return Number(focusedElement.dataset["index"]);
  });
}

async function readSquareTabIndexes(page: Page): Promise<(string | null)[]> {
  return locateSquares(page).evaluateAll((squares) =>
    squares.map((square) => square.getAttribute("tabindex")),
  );
}

async function readFocusedTagName(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.tagName ?? null);
}

/** Exactly `index` has tabindex="0"; every other square has tabindex="-1". */
async function expectOnlyTabbableSquare(
  page: Page,
  index: number,
): Promise<void> {
  const expectedTabIndexes = Array.from(
    { length: SQUARE_COUNT },
    (_, squareIndex) => (squareIndex === index ? "0" : "-1"),
  );
  await expect
    .poll(() => readSquareTabIndexes(page), {
      message: `only square ${String(index)} is in the Tab order`,
    })
    .toEqual(expectedTabIndexes);
}

/** Focus is on `index`, and it is the one square in the Tab order. */
async function expectFocusedSquare(page: Page, index: number): Promise<void> {
  await expect(locateSquare(page, index)).toBeFocused();
  await expectOnlyTabbableSquare(page, index);
}

/** Outside play no square is in the Tab order and every square is disabled. */
async function expectNoTabbableSquare(page: Page): Promise<void> {
  await expect
    .poll(() => readSquareTabIndexes(page), {
      message: "every square has tabindex=-1 outside play",
    })
    .toEqual(Array.from({ length: SQUARE_COUNT }, () => "-1"));
  await expectEverySquareNativelyDisabled(page);
}

/** The hint and every aria-describedby are gone (choosing, game over). */
async function expectNoHint(page: Page): Promise<void> {
  await expect(locateHint(page)).toHaveCount(0);
  await expect(page.locator("[aria-describedby]")).toHaveCount(0);
}

/**
 * Presses arrow keys from the focused square to `targetIndex` (rows first,
 * then columns), using page.keyboard only.
 */
async function moveFocusToSquare(
  page: Page,
  targetIndex: number,
): Promise<void> {
  await expect(
    locateBoard(page).locator(":focus"),
    "a square has focus before arrowing",
  ).toHaveCount(1);
  const startIndex = await readFocusedSquareIndex(page);
  if (startIndex === null) {
    throw new Error("Focus is not on a square, so arrows cannot move it");
  }
  const rowDistance = rowOf(targetIndex) - rowOf(startIndex);
  const columnDistance = columnOf(targetIndex) - columnOf(startIndex);
  const verticalKey: ArrowKey = rowDistance > 0 ? "ArrowDown" : "ArrowUp";
  const horizontalKey: ArrowKey =
    columnDistance > 0 ? "ArrowRight" : "ArrowLeft";
  for (
    let pressCount = 0;
    pressCount < Math.abs(rowDistance);
    pressCount += 1
  ) {
    await page.keyboard.press(verticalKey);
  }
  for (
    let pressCount = 0;
    pressCount < Math.abs(columnDistance);
    pressCount += 1
  ) {
    await page.keyboard.press(horizontalKey);
  }
  await expectFocusedSquare(page, targetIndex);
}

/** Tab from a fresh load to a choice, then activate it with Enter. */
async function chooseFirstMoverByKeyboard(
  page: Page,
  choiceName: "You go first" | "Computer goes first",
): Promise<void> {
  await page.keyboard.press("Tab");
  await expect(locateChoice(page, "You go first")).toBeFocused();
  if (choiceName === "Computer goes first") {
    await page.keyboard.press("Tab");
  }
  await expect(locateChoice(page, choiceName)).toBeFocused();
  await page.keyboard.press("Enter");
}

/**
 * Arrows to each human square and places X with Enter or Space (alternating),
 * waiting for the real computer reply. While the game continues, focus stays
 * on the square just played.
 */
async function playMovesByKeyboard(
  page: Page,
  movePairs: readonly MovePair[],
): Promise<void> {
  for (const [moveNumber, movePair] of movePairs.entries()) {
    const placementKey: PlacementKey = moveNumber % 2 === 0 ? "Space" : "Enter";
    await moveFocusToSquare(page, movePair.humanSquare);
    await page.keyboard.press(placementKey);
    await expect(locateSquare(page, movePair.humanSquare)).toHaveAccessibleName(
      /, X$/,
    );
    if (movePair.computerReply !== undefined) {
      await expect(
        locateSquare(page, movePair.computerReply),
      ).toHaveAccessibleName(/, O$/);
    }
    await expectVisibleMarksMatchNames(page);
    const isLastMove = moveNumber === movePairs.length - 1;
    if (!isLastMove) {
      await expectFocusedSquare(page, movePair.humanSquare);
    }
  }
}

/** The focused element's computed outline, read after a keyboard focus. */
async function readFocusedOutline(
  page: Page,
): Promise<{ widthPixels: number; style: string }> {
  return page.evaluate(() => {
    const focusedElement = document.activeElement;
    if (!focusedElement) {
      return { widthPixels: 0, style: "none" };
    }
    const computedStyle = getComputedStyle(focusedElement);
    return {
      widthPixels: Number.parseFloat(computedStyle.outlineWidth),
      style: computedStyle.outlineStyle,
    };
  });
}

async function expectFocusRingAtLeastTwoPixels(
  page: Page,
  description: string,
): Promise<void> {
  const outline = await readFocusedOutline(page);
  expect(outline.style, `${description} outline style`).not.toBe("none");
  expect(
    outline.widthPixels,
    `${description} outline width`,
  ).toBeGreaterThanOrEqual(MINIMUM_FOCUS_RING_WIDTH_PIXELS);
}

test.describe("keyboard play and managed focus (F-008)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(locateStatus(page)).toHaveText("Who goes first?");
  });

  test("a fresh load has nothing focused: document.activeElement is body (F-008 R-007)", async ({
    page,
  }) => {
    await expect.poll(() => readFocusedTagName(page)).toBe("BODY");
    await expect(page.locator(":focus")).toHaveCount(0);
  });

  test("plain Tab from a fresh load lands on You go first in every project (F-008 R-007)", async ({
    page,
  }) => {
    await page.keyboard.press("Tab");

    await expect(locateChoice(page, "You go first")).toBeFocused();
  });

  test("a whole game choosing You go first and a second game choosing Computer goes first reach results with the keyboard only (F-008 R-007 R-006)", async ({
    page,
  }) => {
    await chooseFirstMoverByKeyboard(page, "You go first");
    await expect(locateStatus(page)).toHaveText("Your turn. You are X.");
    await expectFocusedSquare(page, 0);

    await playMovesByKeyboard(page, COMPUTER_WIN_MOVES);

    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );
    await expect(locatePlayAgain(page)).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await expect(locateChoice(page, "You go first")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(locateChoice(page, "Computer goes first")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(locateChoice(page, "You go first")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(locateChoice(page, "Computer goes first")).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(
      locateSquare(page, COMPUTER_OPENING_SQUARE),
    ).toHaveAccessibleName(/, O$/);
    await expectFocusedSquare(page, 1);

    await playMovesByKeyboard(page, COMPUTER_FIRST_DRAW_MOVES);

    await expect(locateStatus(page)).toHaveText("It's a draw.");
    await expect(locatePlayAgain(page)).toBeFocused();
  });

  test("from row 2, column 2 each arrow moves one square, an edge keeps focus, and only the focused square has tabindex=0 after every press (F-008 R-007)", async ({
    page,
  }) => {
    await chooseFirstMoverByKeyboard(page, "You go first");
    await expectFocusedSquare(page, 0);
    await moveFocusToSquare(page, 4);

    const arrowSteps: readonly ArrowStep[] = [
      { key: "ArrowUp", expectedSquare: 1 },
      { key: "ArrowUp", expectedSquare: 1 },
      { key: "ArrowDown", expectedSquare: 4 },
      { key: "ArrowDown", expectedSquare: 7 },
      { key: "ArrowDown", expectedSquare: 7 },
      { key: "ArrowUp", expectedSquare: 4 },
      { key: "ArrowLeft", expectedSquare: 3 },
      { key: "ArrowLeft", expectedSquare: 3 },
      { key: "ArrowRight", expectedSquare: 4 },
      { key: "ArrowRight", expectedSquare: 5 },
      { key: "ArrowRight", expectedSquare: 5 },
      { key: "ArrowUp", expectedSquare: 2 },
      { key: "ArrowUp", expectedSquare: 2 },
      { key: "ArrowRight", expectedSquare: 2 },
      { key: "ArrowLeft", expectedSquare: 1 },
      { key: "ArrowLeft", expectedSquare: 0 },
      { key: "ArrowLeft", expectedSquare: 0 },
      { key: "ArrowUp", expectedSquare: 0 },
      { key: "ArrowDown", expectedSquare: 3 },
      { key: "ArrowDown", expectedSquare: 6 },
      { key: "ArrowLeft", expectedSquare: 6 },
      { key: "ArrowDown", expectedSquare: 6 },
      { key: "ArrowRight", expectedSquare: 7 },
      { key: "ArrowRight", expectedSquare: 8 },
      { key: "ArrowDown", expectedSquare: 8 },
      { key: "ArrowRight", expectedSquare: 8 },
    ];
    for (const arrowStep of arrowSteps) {
      await page.keyboard.press(arrowStep.key);
      await expectFocusedSquare(page, arrowStep.expectedSquare);
    }
  });

  test("arrow keys do not scroll the page or change the board: they only move focus (F-008 R-007)", async ({
    page,
  }) => {
    await chooseFirstMoverByKeyboard(page, "You go first");
    await expectFocusedSquare(page, 0);
    const contentsBefore = await readSquareContents(page);
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    await expectFocusedSquare(page, 6);
    expect(await readSquareContents(page)).toEqual(contentsBefore);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });

  test("choosing You go first focuses row 1, column 1 (F-008 R-007)", async ({
    page,
  }) => {
    await chooseFirstMoverByKeyboard(page, "You go first");

    await expectFocusedSquare(page, 0);
    await expect(locateSquare(page, 0)).toHaveAccessibleName(
      "Row 1, column 1, empty",
    );
  });

  test("choosing Computer goes first focuses row 1, column 2, the first empty square after the opening O (F-008 R-007)", async ({
    page,
  }) => {
    await chooseFirstMoverByKeyboard(page, "Computer goes first");

    await expect(locateSquare(page, 0)).toHaveAccessibleName(
      "Row 1, column 1, O",
    );
    await expectFocusedSquare(page, 1);
    await expect(locateSquare(page, 1)).toHaveAccessibleName(
      "Row 1, column 2, empty",
    );
  });

  test("placing X keeps focus on the square played, and Enter on a taken square changes nothing and keeps focus there (F-008 R-007)", async ({
    page,
  }) => {
    await chooseFirstMoverByKeyboard(page, "You go first");
    await moveFocusToSquare(page, 2);
    await page.keyboard.press("Enter");

    await expect(locateSquare(page, 2)).toHaveAccessibleName(
      "Row 1, column 3, X",
    );
    await expectFocusedSquare(page, 2);
    const contentsBefore = await readSquareContents(page);

    await page.keyboard.press("Enter");

    await expect(locateStatus(page)).toHaveText(
      "Row 1, column 3 is taken. Choose an empty square.",
    );
    expect(await readSquareContents(page)).toEqual(contentsBefore);
    await expectFocusedSquare(page, 2);

    await page.keyboard.press("Space");

    expect(await readSquareContents(page)).toEqual(contentsBefore);
    await expectFocusedSquare(page, 2);
  });

  test("game over focuses Play again, and Play again focuses You go first (F-008 R-006 R-007)", async ({
    page,
  }) => {
    await chooseFirstMoverByKeyboard(page, "You go first");
    await playMovesByKeyboard(page, COMPUTER_WIN_MOVES);

    await expect(locatePlayAgain(page)).toBeFocused();

    await page.keyboard.press("Space");

    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await expect(locateChoice(page, "You go first")).toBeFocused();
  });

  test("a keyboard-focused square, choice button and Play again each show an outline at least 2 CSS px wide (F-008 R-007)", async ({
    page,
  }) => {
    await page.keyboard.press("Tab");
    await expect(locateChoice(page, "You go first")).toBeFocused();
    await expectFocusRingAtLeastTwoPixels(page, "You go first");

    await page.keyboard.press("Tab");
    await expect(locateChoice(page, "Computer goes first")).toBeFocused();
    await expectFocusRingAtLeastTwoPixels(page, "Computer goes first");

    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Enter");
    await expectFocusedSquare(page, 0);
    await expectFocusRingAtLeastTwoPixels(page, "square after the choice");

    await page.keyboard.press("ArrowRight");
    await expectFocusedSquare(page, 1);
    await expectFocusRingAtLeastTwoPixels(page, "square after an arrow");

    await page.keyboard.press("ArrowLeft");
    await playMovesByKeyboard(page, COMPUTER_WIN_MOVES);
    await expect(locatePlayAgain(page)).toBeFocused();
    await expectFocusRingAtLeastTwoPixels(page, "Play again");
  });

  test("during play the hint is shown and is the focused square's accessible description; while choosing and after game over it and every aria-describedby are absent (F-008 R-007)", async ({
    page,
  }) => {
    await expectNoHint(page);

    await chooseFirstMoverByKeyboard(page, "You go first");

    await expect(locateHint(page)).toBeVisible();
    await expect(locateHint(page)).toHaveText(HINT_TEXT);
    await expectFocusedSquare(page, 0);
    await expect(locateSquare(page, 0)).toHaveAccessibleDescription(HINT_TEXT);
    for (const square of await locateSquares(page).all()) {
      await expect(square).toHaveAttribute("aria-describedby", "hint");
    }

    await page.keyboard.press("ArrowDown");
    await expectFocusedSquare(page, 3);
    await expect(locateSquare(page, 3)).toHaveAccessibleDescription(HINT_TEXT);

    await page.keyboard.press("ArrowUp");
    await playMovesByKeyboard(page, COMPUTER_WIN_MOVES);
    await expect(locatePlayAgain(page)).toBeFocused();

    await expectNoHint(page);

    await page.keyboard.press("Enter");
    await expect(locateChoice(page, "You go first")).toBeFocused();

    await expectNoHint(page);
  });

  test("arrows move through X and O squares, every square stays natively enabled during play, and Enter on an O square changes nothing (F-008 R-007)", async ({
    page,
  }) => {
    await chooseFirstMoverByKeyboard(page, "You go first");
    await expectFocusedSquare(page, 0);
    await page.keyboard.press("Space");
    await expect(locateSquare(page, 0)).toHaveAccessibleName(
      "Row 1, column 1, X",
    );
    await expect(locateSquare(page, 4)).toHaveAccessibleName(
      "Row 2, column 2, O",
    );
    await expectFocusedSquare(page, 0);

    const disabledFlags = await locateSquares(page).evaluateAll((squares) =>
      squares.map((square) => (square as HTMLButtonElement).disabled),
    );
    expect(disabledFlags).toEqual(
      Array.from({ length: SQUARE_COUNT }, () => false),
    );

    await page.keyboard.press("ArrowRight");
    await expectFocusedSquare(page, 1);
    await page.keyboard.press("ArrowDown");
    await expectFocusedSquare(page, 4);
    await page.keyboard.press("ArrowRight");
    await expectFocusedSquare(page, 5);
    await page.keyboard.press("ArrowLeft");
    await expectFocusedSquare(page, 4);

    const contentsBefore = await readSquareContents(page);
    await page.keyboard.press("Enter");

    await expect(locateStatus(page)).toHaveText(
      "Row 2, column 2 is taken. Choose an empty square.",
    );
    expect(await readSquareContents(page)).toEqual(contentsBefore);
    await expectFocusedSquare(page, 4);

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await expectFocusedSquare(page, 0);
  });

  test("outside play no square is in the Tab order: every square has tabindex=-1 while choosing and after game over (F-008 R-007)", async ({
    page,
  }) => {
    await expectNoTabbableSquare(page);

    await chooseFirstMoverByKeyboard(page, "You go first");
    await playMovesByKeyboard(page, COMPUTER_WIN_MOVES);
    await expect(locatePlayAgain(page)).toBeFocused();

    await expectNoTabbableSquare(page);

    await page.keyboard.press("Enter");
    await expect(locateChoice(page, "You go first")).toBeFocused();

    await expectNoTabbableSquare(page);
  });

  test("Tab leaves the board and Shift+Tab returns to the last active square, including an occupied one (F-008 R-007)", async ({
    page,
  }) => {
    await chooseFirstMoverByKeyboard(page, "You go first");
    await moveFocusToSquare(page, 5);

    await page.keyboard.press("Tab");
    await expect.poll(() => readFocusedSquareIndex(page)).toBeNull();

    await page.keyboard.press("Shift+Tab");
    await expectFocusedSquare(page, 5);

    await page.keyboard.press("Space");
    await expect(locateSquare(page, 5)).toHaveAccessibleName(
      "Row 2, column 3, X",
    );
    await expectFocusedSquare(page, 5);

    await page.keyboard.press("Tab");
    await expect.poll(() => readFocusedSquareIndex(page)).toBeNull();

    await page.keyboard.press("Shift+Tab");
    await expectFocusedSquare(page, 5);
  });

  test("after a pointer activation that square is the only tabindex=0 square and arrows start from it (F-008 R-007)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMoverByKeyboard(page, "You go first");
    await expectFocusedSquare(page, 0);

    // The one pointer action in this spec: click or tap square 8.
    await activate(locateSquare(page, 8), testInfo);

    await expect(locateSquare(page, 8)).toHaveAccessibleName(
      "Row 3, column 3, X",
    );
    await expectFocusedSquare(page, 8);

    await page.keyboard.press("ArrowLeft");
    await expectFocusedSquare(page, 7);
    await page.keyboard.press("ArrowUp");
    await expectFocusedSquare(page, 4);
  });
});

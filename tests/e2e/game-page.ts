// F-006 R-001 R-010, F-007: shared page helpers for the e2e game specs:
// touch-aware activation, board and status locators, and board expectations.
import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

export type ActivationMethod = "tap" | "click";

export interface ActivationOptions {
  force?: boolean;
}

export interface MovePair {
  humanSquare: number;
  computerReply: number | undefined;
}

const COLUMN_COUNT = 3;
export const SQUARE_COUNT = 9;

/** Taps on touch projects and clicks otherwise; reports which one it used. */
export async function activate(
  locator: Locator,
  testInfo: TestInfo,
  options: ActivationOptions = {},
): Promise<ActivationMethod> {
  const isForced = options.force ?? false;
  if (testInfo.project.use.hasTouch === true) {
    await locator.tap({ force: isForced });
    return "tap";
  }
  await locator.click({ force: isForced });
  return "click";
}

export function locateBoard(page: Page): Locator {
  return page.getByRole("group", { name: "Board" });
}

export function locateSquares(page: Page): Locator {
  return locateBoard(page).getByRole("button", {
    name: /^Row \d, column \d, /,
  });
}

export function locateSquare(page: Page, index: number): Locator {
  const row = Math.floor(index / COLUMN_COUNT) + 1;
  const column = (index % COLUMN_COUNT) + 1;
  return locateBoard(page).getByRole("button", {
    name: new RegExp(`^Row ${String(row)}, column ${String(column)}, `),
  });
}

export function locateSquaresShowing(page: Page, mark: "X" | "O"): Locator {
  return locateBoard(page).getByRole("button", {
    name: new RegExp(`, ${mark}$`),
  });
}

export function locateStatus(page: Page): Locator {
  return page.locator("#status");
}

/** Every square's accessible name and visible text, in board order. */
export async function readSquareContents(page: Page): Promise<string[]> {
  return locateSquares(page).evaluateAll((squares) =>
    squares.map(
      (square) =>
        `${square.getAttribute("aria-label") ?? ""}|${square.textContent ?? ""}`,
    ),
  );
}

/**
 * The visible mark in every square matches its accessible name (Codex F-006
 * review C1): a board that announces X or O must also show it.
 */
export async function expectVisibleMarksMatchNames(page: Page): Promise<void> {
  for (const square of await locateSquares(page).all()) {
    const name = (await square.getAttribute("aria-label")) ?? "";
    const expectedMark =
      name.endsWith(", X") || name.endsWith(", O") ? name.slice(-1) : "";
    const mark = square.locator(".mark");
    await expect(mark).toHaveText(expectedMark);
    if (expectedMark !== "") {
      await expect(mark).toBeVisible();
    }
  }
}

export async function expectEverySquareNativelyDisabled(
  page: Page,
): Promise<void> {
  const squares = locateSquares(page);
  await expect(squares).toHaveCount(SQUARE_COUNT);
  for (const square of await squares.all()) {
    await expect(square).toBeDisabled();
    expect(
      await square.evaluate(
        (element) => (element as HTMLButtonElement).disabled,
      ),
    ).toBe(true);
  }
}

export async function chooseFirstMover(
  page: Page,
  testInfo: TestInfo,
  choiceName: "You go first" | "Computer goes first",
): Promise<void> {
  await activate(page.getByRole("button", { name: choiceName }), testInfo);
}

/** Plays each human square and waits for the expected computer reply. */
export async function playMoves(
  page: Page,
  testInfo: TestInfo,
  movePairs: readonly MovePair[],
): Promise<void> {
  for (const movePair of movePairs) {
    await activate(locateSquare(page, movePair.humanSquare), testInfo);
    await expect(locateSquare(page, movePair.humanSquare)).toHaveAccessibleName(
      /, X$/,
    );
    if (movePair.computerReply !== undefined) {
      await expect(
        locateSquare(page, movePair.computerReply),
      ).toHaveAccessibleName(/, O$/);
    }
    await expectVisibleMarksMatchNames(page);
  }
}

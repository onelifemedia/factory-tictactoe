// F-007 R-004 R-005 R-006: show the result, highlight the winning line and
// play again. Target markup: .factory/design/screens/game-03-game-over.html
// (3a, 3b, 3c). Move sequences follow the real computer player (ADR-010).
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import {
  SQUARE_COUNT,
  activate,
  chooseFirstMover,
  expectEverySquareNativelyDisabled,
  expectVisibleMarksMatchNames,
  locateBoard,
  locateSquare,
  locateSquares,
  locateStatus,
  playMoves,
  type MovePair,
} from "./game-page";

type LineKind = "row" | "column" | "diagonal-down" | "diagonal-up";

const WINNING_BORDER_WIDTH = "4px";
const REGULAR_BORDER_WIDTH = "2px";

// 3a: human 0, 1, 3; the computer wins on squares 2, 4, 6.
const DIAGONAL_WIN_MOVES: readonly MovePair[] = [
  { humanSquare: 0, computerReply: 4 },
  { humanSquare: 1, computerReply: 2 },
  { humanSquare: 3, computerReply: 6 },
];
const DIAGONAL_WIN_SQUARES: readonly number[] = [2, 4, 6];

// 3c: human 0, 6, 1; the computer wins on row 2 (squares 3, 4, 5).
const ROW_WIN_MOVES: readonly MovePair[] = [
  { humanSquare: 0, computerReply: 4 },
  { humanSquare: 6, computerReply: 3 },
  { humanSquare: 1, computerReply: 5 },
];
const ROW_WIN_SQUARES: readonly number[] = [3, 4, 5];

// Codex F-007 review, missing coverage: the other two strike directions, from
// real games against the perfect opponent (human first).
const COLUMN_WIN_MOVES: readonly MovePair[] = [
  { humanSquare: 0, computerReply: 4 },
  { humanSquare: 2, computerReply: 1 },
  { humanSquare: 3, computerReply: 7 },
];
const COLUMN_WIN_SQUARES: readonly number[] = [1, 4, 7];
const DIAGONAL_DOWN_WIN_MOVES: readonly MovePair[] = [
  { humanSquare: 1, computerReply: 0 },
  { humanSquare: 2, computerReply: 3 },
  { humanSquare: 6, computerReply: 4 },
  { humanSquare: 5, computerReply: 8 },
];
const DIAGONAL_DOWN_WIN_SQUARES: readonly number[] = [0, 4, 8];

// 3b: human 0, 1, 6, 5, 8; the board fills with no winner.
const DRAW_MOVES: readonly MovePair[] = [
  { humanSquare: 0, computerReply: 4 },
  { humanSquare: 1, computerReply: 2 },
  { humanSquare: 6, computerReply: 3 },
  { humanSquare: 5, computerReply: 7 },
  { humanSquare: 8, computerReply: undefined },
];

function locatePlayAgain(page: Page) {
  return page.getByRole("button", { name: "Play again" });
}

async function playGame(
  page: Page,
  testInfo: TestInfo,
  movePairs: readonly MovePair[],
): Promise<void> {
  await chooseFirstMover(page, testInfo, "You go first");
  await playMoves(page, testInfo, movePairs);
}

async function readBorderTopWidth(page: Page, index: number): Promise<string> {
  return locateSquare(page, index).evaluate(
    (element) => getComputedStyle(element).borderTopWidth,
  );
}

async function readStrikeContent(page: Page, index: number): Promise<string> {
  return locateSquare(page, index).evaluate(
    (element) => getComputedStyle(element, "::after").content,
  );
}

/** Exactly the winning squares carry data-winning and data-line; no others. */
async function expectWinningLine(
  page: Page,
  winningSquares: readonly number[],
  lineKind: LineKind,
): Promise<void> {
  for (let index = 0; index < SQUARE_COUNT; index += 1) {
    const square = locateSquare(page, index);
    if (winningSquares.includes(index)) {
      await expect(square).toHaveAttribute("data-winning", "true");
      await expect(square).toHaveAttribute("data-line", lineKind);
    } else {
      await expect(square).not.toHaveAttribute("data-winning");
      await expect(square).not.toHaveAttribute("data-line");
    }
  }
}

async function expectNoSquareMarkedWinning(page: Page): Promise<void> {
  await expect(locateBoard(page).locator("[data-winning]")).toHaveCount(0);
  await expect(locateBoard(page).locator("[data-line]")).toHaveCount(0);
}

test.describe("game over: result, winning line and play again (F-007)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("a computer diagonal win names the line, marks squares 2, 4 and 6 as diagonal-up and disables every square (F-007 R-004 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DIAGONAL_WIN_MOVES);

    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );
    await expectWinningLine(page, DIAGONAL_WIN_SQUARES, "diagonal-up");
    await expectEverySquareNativelyDisabled(page);
    await expectVisibleMarksMatchNames(page);
  });

  test("winning squares have a 4px border and a strike line, and the other squares keep a 2px border with no strike (F-007 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DIAGONAL_WIN_MOVES);
    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );

    for (let index = 0; index < SQUARE_COUNT; index += 1) {
      const borderTopWidth = await readBorderTopWidth(page, index);
      const strikeContent = await readStrikeContent(page, index);
      if (DIAGONAL_WIN_SQUARES.includes(index)) {
        expect(borderTopWidth, `square ${String(index)} border`).toBe(
          WINNING_BORDER_WIDTH,
        );
        expect(strikeContent, `square ${String(index)} strike`).not.toBe(
          "none",
        );
      } else {
        expect(borderTopWidth, `square ${String(index)} border`).toBe(
          REGULAR_BORDER_WIDTH,
        );
        expect(strikeContent, `square ${String(index)} strike`).toBe("none");
      }
    }
  });

  test("a computer row win marks squares 3, 4 and 5 as row and names row 2 (F-007 R-004 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, ROW_WIN_MOVES);

    await expect(locateStatus(page)).toHaveText("Computer wins with row 2.");
    await expectWinningLine(page, ROW_WIN_SQUARES, "row");
    await expectEverySquareNativelyDisabled(page);
  });

  test("a computer column win marks squares 1, 4 and 7 as column and names column 2 (F-007 R-004 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, COLUMN_WIN_MOVES);

    await expect(locateStatus(page)).toHaveText("Computer wins with column 2.");
    await expectWinningLine(page, COLUMN_WIN_SQUARES, "column");
    await expectEverySquareNativelyDisabled(page);
  });

  test("a computer win on the diagonal from top left marks squares 0, 4 and 8 as diagonal-down (F-007 R-004 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DIAGONAL_DOWN_WIN_MOVES);

    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top left to bottom right.",
    );
    await expectWinningLine(page, DIAGONAL_DOWN_WIN_SQUARES, "diagonal-down");
    await expectEverySquareNativelyDisabled(page);
  });

  test("a draw says It's a draw., disables every square and marks no square as winning (F-007 R-004 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DRAW_MOVES);

    await expect(locateStatus(page)).toHaveText("It's a draw.");
    await expectEverySquareNativelyDisabled(page);
    await expectNoSquareMarkedWinning(page);
  });

  test("Play again is hidden while choosing and during play, and visible as a native button in the action area after a win (F-007 R-006)", async ({
    page,
  }, testInfo) => {
    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await expect(locatePlayAgain(page)).toHaveCount(0);

    await chooseFirstMover(page, testInfo, "You go first");
    await expect(locatePlayAgain(page)).toHaveCount(0);
    await playMoves(page, testInfo, DIAGONAL_WIN_MOVES.slice(0, 2));
    await expect(locatePlayAgain(page)).toHaveCount(0);

    await playMoves(page, testInfo, DIAGONAL_WIN_MOVES.slice(2));
    const playAgain = page.locator("#actions").getByRole("button", {
      name: "Play again",
    });
    await expect(playAgain).toBeVisible();
    await expect(playAgain).toBeEnabled();
    await expect(playAgain).toHaveClass(/\bbutton--play-again\b/);
    expect(await playAgain.evaluate((element) => element.tagName)).toBe(
      "BUTTON",
    );
    await expect(
      page.getByRole("button", { name: "You go first" }),
    ).toHaveCount(0);
  });

  test("activating Play again after a win shows the choice and an empty, disabled board with no leftover attributes (F-007 R-006)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DIAGONAL_WIN_MOVES);
    await expectWinningLine(page, DIAGONAL_WIN_SQUARES, "diagonal-up");
    await expect(locatePlayAgain(page)).toBeVisible();

    await activate(locatePlayAgain(page), testInfo);

    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await expect(
      page.getByRole("button", { name: "You go first" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Computer goes first" }),
    ).toBeVisible();
    await expect(locatePlayAgain(page)).toHaveCount(0);
    await expect(
      locateBoard(page).getByRole("button", { name: /, empty$/ }),
    ).toHaveCount(SQUARE_COUNT);
    await expectEverySquareNativelyDisabled(page);
    await expectNoSquareMarkedWinning(page);
    await expect(locateBoard(page).locator("[aria-disabled]")).toHaveCount(0);
    await expectVisibleMarksMatchNames(page);
  });

  test("after Play again, You go first gives an active empty board and a move plays normally (F-007 R-006)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DIAGONAL_WIN_MOVES);
    await expect(locatePlayAgain(page)).toBeVisible();
    await activate(locatePlayAgain(page), testInfo);
    await chooseFirstMover(page, testInfo, "You go first");

    await expect(locateStatus(page)).toHaveText("Your turn. You are X.");
    await expect(
      locateBoard(page).getByRole("button", { name: /, empty$/ }),
    ).toHaveCount(SQUARE_COUNT);
    for (const square of await locateSquares(page).all()) {
      await expect(square).toBeEnabled();
    }

    await playMoves(page, testInfo, [{ humanSquare: 0, computerReply: 4 }]);
    await expect(locateSquare(page, 0)).toHaveAccessibleName(
      "Row 1, column 1, X",
    );
    await expect(locateSquare(page, 4)).toHaveAccessibleName(
      "Row 2, column 2, O",
    );
    await expectNoSquareMarkedWinning(page);
  });

  test("Play again is visible after a draw (F-007 R-006)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DRAW_MOVES);

    await expect(locatePlayAgain(page)).toBeVisible();
  });
});

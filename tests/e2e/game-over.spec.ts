// F-007 R-004 R-005 R-006: show the result, highlight the winning line and
// play again. F-014 R-005: the winning line is one aria-hidden .win-line
// overlay whose path runs through the lifted winning tiles' centres, under
// the pieces, which sit on a win-surface backing disc; there is no ::after
// strike, and the overlay is hidden again after Play again. Target markup:
// .factory/design/screens/game-03-game-over.html (3a, 3b, 3c). Move sequences
// follow the real computer player (ADR-010).
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
  readPiece,
  waitForAnimationsToFinish,
  type MovePair,
} from "./game-page";
import type { PixelColor } from "./read-png-pixel";
import {
  expectColorNear,
  readScreenColor,
  type ScreenPoint,
} from "./screen-color";

type LineKind = "row" | "column" | "diagonal-down" | "diagonal-up";

interface WinLineMeasurement {
  overlayCount: number;
  isShown: boolean;
  tagName: string;
  ariaHidden: string | null;
  pathCount: number;
  stroke: string;
  start: ScreenPoint | null;
  end: ScreenPoint | null;
}

const WINNING_BORDER_WIDTH = "4px";
const REGULAR_BORDER_WIDTH = "2px";
const COLUMN_COUNT = 3;
const CENTRE_TOLERANCE_PIXELS = 1;
const LIFT_HEIGHT_PIXELS = 3;
const WIN_SURFACE: PixelColor = { red: 0xff, green: 0xd7, blue: 0x66 };
const WIN_MARKER: PixelColor = { red: 0x2b, green: 0x1d, blue: 0x13 };
const WIN_SURFACE_RGB = "rgb(255, 215, 102)";
const WIN_MARKER_RGB = "rgb(43, 29, 19)";

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

/**
 * The board's .win-line overlay: how many there are, whether the first is
 * shown (displayed, visible, with a non-empty path), and its path's rendered
 * endpoints in viewport pixels.
 */
async function measureWinLine(page: Page): Promise<WinLineMeasurement> {
  return locateBoard(page).evaluate((board) => {
    const overlays = board.querySelectorAll(".win-line");
    const [overlay] = overlays;
    const paths = overlay?.querySelectorAll("path") ?? [];
    const [path] = paths;
    if (overlay === undefined) {
      return {
        overlayCount: 0,
        isShown: false,
        tagName: "",
        ariaHidden: null,
        pathCount: 0,
        stroke: "",
        start: null,
        end: null,
      };
    }
    const overlayStyle = getComputedStyle(overlay);
    const overlayBox = overlay.getBoundingClientRect();
    const pathLength =
      path === undefined || (path.getAttribute("d") ?? "").trim() === ""
        ? 0
        : path.getTotalLength();
    const isShown =
      !overlay.hasAttribute("hidden") &&
      overlayStyle.display !== "none" &&
      overlayStyle.visibility !== "hidden" &&
      Number(overlayStyle.opacity) > 0 &&
      overlayBox.width > 0 &&
      overlayBox.height > 0 &&
      path !== undefined &&
      getComputedStyle(path).display !== "none" &&
      pathLength > 0;
    const screenMatrix = path?.getScreenCTM() ?? null;
    const toScreenPoint = (distance: number) => {
      if (path === undefined || screenMatrix === null || pathLength === 0) {
        return null;
      }
      const point = path
        .getPointAtLength(distance)
        .matrixTransform(screenMatrix);
      return { x: point.x, y: point.y };
    };
    return {
      overlayCount: overlays.length,
      isShown,
      tagName: overlay.tagName.toLowerCase(),
      ariaHidden: overlay.getAttribute("aria-hidden"),
      pathCount: paths.length,
      stroke: path === undefined ? "" : getComputedStyle(path).stroke,
      start: toScreenPoint(0),
      end: toScreenPoint(pathLength),
    };
  });
}

async function readSquareCentres(page: Page): Promise<ScreenPoint[]> {
  return locateSquares(page).evaluateAll((squares) =>
    squares.map((square) => {
      const box = square.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    }),
  );
}

function measureDistanceToSegment(
  point: ScreenPoint,
  start: ScreenPoint,
  end: ScreenPoint,
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
              lengthSquared,
          ),
        );
  return Math.hypot(
    point.x - (start.x + projection * segmentX),
    point.y - (start.y + projection * segmentY),
  );
}

function findCentre(
  centres: readonly ScreenPoint[],
  index: number,
): ScreenPoint {
  const centre = centres[index];
  if (centre === undefined) {
    throw new Error(`no rendered centre for square ${String(index)}`);
  }
  return centre;
}

/**
 * Where a winning tile's centre would be if it were not lifted, taken from a
 * non-winning tile in the same row, or else from the non-winning tiles above
 * and below it in the same column.
 */
function locateRestingCentreY(
  centres: readonly ScreenPoint[],
  winningSquares: readonly number[],
  index: number,
): number {
  const row = Math.floor(index / COLUMN_COUNT);
  const column = index % COLUMN_COUNT;
  for (let peerColumn = 0; peerColumn < COLUMN_COUNT; peerColumn += 1) {
    const peer = row * COLUMN_COUNT + peerColumn;
    if (!winningSquares.includes(peer)) {
      return findCentre(centres, peer).y;
    }
  }
  const above = findCentre(centres, column);
  const below = findCentre(centres, (COLUMN_COUNT - 1) * COLUMN_COUNT + column);
  return above.y + ((below.y - above.y) * row) / (COLUMN_COUNT - 1);
}

/**
 * One shown, aria-hidden svg.win-line with one path in win-marker, whose
 * rendered segment passes within 1 px of the three winning tiles' centres,
 * and those tiles are lifted 3 px.
 */
async function expectWinLineThroughLiftedCentres(
  page: Page,
  winningSquares: readonly number[],
): Promise<void> {
  await waitForAnimationsToFinish(page);
  const winLine = await measureWinLine(page);
  expect(winLine).toMatchObject({
    overlayCount: 1,
    isShown: true,
    tagName: "svg",
    ariaHidden: "true",
    pathCount: 1,
    stroke: WIN_MARKER_RGB,
  });
  const { start, end } = winLine;
  if (start === null || end === null) {
    throw new Error("the win-line path has no rendered endpoints");
  }
  const centres = await readSquareCentres(page);
  for (const index of winningSquares) {
    const centre = findCentre(centres, index);
    expect(
      measureDistanceToSegment(centre, start, end),
      `distance from square ${String(index)}'s centre (${centre.x.toFixed(1)}, ${centre.y.toFixed(1)}) to the bar from (${start.x.toFixed(1)}, ${start.y.toFixed(1)}) to (${end.x.toFixed(1)}, ${end.y.toFixed(1)})`,
    ).toBeLessThanOrEqual(CENTRE_TOLERANCE_PIXELS);
    expect(
      locateRestingCentreY(centres, winningSquares, index) - centre.y,
      `square ${String(index)} lift in px`,
    ).toBeCloseTo(LIFT_HEIGHT_PIXELS, 0);
  }
}

/** The overlay is absent, or present once and not shown (Codex F-014 missing). */
async function expectWinLineHidden(
  page: Page,
  stepName: string,
): Promise<void> {
  const winLine = await measureWinLine(page);
  expect(
    winLine.overlayCount,
    `win-line overlays ${stepName}`,
  ).toBeLessThanOrEqual(1);
  expect(winLine.isShown, `win line shown ${stepName}`).toBe(false);
}

/** A custom property of the square's piece, resolved to rgb() ("" if unset). */
async function readPieceBackingColor(
  page: Page,
  index: number,
): Promise<string> {
  return locateSquare(page, index)
    .locator(".mark")
    .evaluate((piece) => {
      const backing = getComputedStyle(piece)
        .getPropertyValue("--mark-backing")
        .trim();
      if (backing === "" || backing === "none") {
        return backing;
      }
      const probe = document.createElement("span");
      probe.style.color = backing;
      document.body.append(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    });
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

  test("winning squares have a 4px border and the other squares a 2px border, and no square draws an ::after strike (F-007 R-005, F-014 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DIAGONAL_WIN_MOVES);
    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );

    for (let index = 0; index < SQUARE_COUNT; index += 1) {
      const borderTopWidth = await readBorderTopWidth(page, index);
      const strikeContent = await readStrikeContent(page, index);
      expect(borderTopWidth, `square ${String(index)} border`).toBe(
        DIAGONAL_WIN_SQUARES.includes(index)
          ? WINNING_BORDER_WIDTH
          : REGULAR_BORDER_WIDTH,
      );
      expect(strikeContent, `square ${String(index)} ::after strike`).toBe(
        "none",
      );
    }
  });

  test("a diagonal win shows one aria-hidden win-line overlay whose path passes within 1 px of the lifted centres of squares 2, 4 and 6 (F-014 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DIAGONAL_WIN_MOVES);
    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );

    await expectWinLineThroughLiftedCentres(page, DIAGONAL_WIN_SQUARES);
  });

  test("a row win shows one aria-hidden win-line overlay whose path passes within 1 px of the lifted centres of squares 3, 4 and 5 (F-014 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, ROW_WIN_MOVES);
    await expect(locateStatus(page)).toHaveText("Computer wins with row 2.");

    await expectWinLineThroughLiftedCentres(page, ROW_WIN_SQUARES);
  });

  test("winning pieces sit on a win-surface backing disc and other pieces have none (F-014 R-005, Codex F-014 C2)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DIAGONAL_WIN_MOVES);
    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );

    for (const index of DIAGONAL_WIN_SQUARES) {
      expect(await readPiece(locateSquare(page, index))).toBe("O");
      expect(
        await readPieceBackingColor(page, index),
        `square ${String(index)} backing`,
      ).toBe(WIN_SURFACE_RGB);
    }
    for (const index of [0, 1, 3]) {
      expect(await readPiece(locateSquare(page, index))).toBe("X");
      expect(
        await readPieceBackingColor(page, index),
        `square ${String(index)} backing`,
      ).toMatch(/^(none)?$/);
    }
  });

  test("the winning O at the centre paints above the bar: its centre pixel is win-surface while the bar shows between tiles (F-014 R-005, Codex F-014 C2)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DIAGONAL_WIN_MOVES);
    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );
    expect(await readPiece(locateSquare(page, 4))).toBe("O");
    await waitForAnimationsToFinish(page);

    const centres = await readSquareCentres(page);
    const centreOfO = findCentre(centres, 4);
    const topRightCentre = findCentre(centres, 2);
    const gapOnTheBar = {
      x: (centreOfO.x + topRightCentre.x) / 2,
      y: (centreOfO.y + topRightCentre.y) / 2,
    };

    expectColorNear(
      await readScreenColor(page, gapOnTheBar),
      WIN_MARKER,
      "the bar between squares 4 and 2",
    );
    expectColorNear(
      await readScreenColor(page, centreOfO),
      WIN_SURFACE,
      "the centre of the winning O in square 4",
    );
  });

  test("after a win, Play again hides the win line, and it stays hidden through the next game and a following draw (F-014 R-005 R-006, Codex F-014 missing)", async ({
    page,
  }, testInfo) => {
    await expectWinLineHidden(page, "on the choice screen");
    await playGame(page, testInfo, DIAGONAL_WIN_MOVES);
    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );
    expect((await measureWinLine(page)).isShown, "win line after the win").toBe(
      true,
    );

    await activate(locatePlayAgain(page), testInfo);
    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await expectWinLineHidden(page, "after Play again");

    await chooseFirstMover(page, testInfo, "You go first");
    await expect(locateStatus(page)).toHaveText("Your turn. You are X.");
    await expectWinLineHidden(page, "after You go first");

    await playMoves(page, testInfo, DRAW_MOVES.slice(0, 2));
    await expectWinLineHidden(page, "during the next game");

    await playMoves(page, testInfo, DRAW_MOVES.slice(2));
    await expect(locateStatus(page)).toHaveText("It's a draw.");
    await expectWinLineHidden(page, "after the following draw");
  });

  test("a draw from a fresh page shows no win line (F-014 R-005)", async ({
    page,
  }, testInfo) => {
    await playGame(page, testInfo, DRAW_MOVES);
    await expect(locateStatus(page)).toHaveText("It's a draw.");

    await expectWinLineHidden(page, "after a draw");
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

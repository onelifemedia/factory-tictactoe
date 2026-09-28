// F-014 R-005 R-013: pieces are inline SVG. An occupied square holds one
// aria-hidden svg.mark whose use element references the same-document
// #mark-x or #mark-o symbol, with no X/O text glyph and unchanged accessible
// names. An empty square holds no piece element, both at first and after Play
// again empties a board. The symbols exist, start with the backing disc, and
// render (the use element's box is not empty). Target markup:
// .factory/design/screens/game-03-game-over.html.
import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  SQUARE_COUNT,
  activate,
  chooseFirstMover,
  expectVisibleMarksMatchNames,
  locateBoard,
  locateSquare,
  locateSquares,
  locateStatus,
  playMoves,
  readPiece,
} from "./game-page";
import {
  DIAGONAL_WIN_MOVES,
  DRAW_MOVES,
  IN_PLAY_MOVES,
  LONGEST_RESULT_STATUS,
} from "./game-states";

interface PieceMarkup {
  tagName: string;
  className: string;
  ariaHidden: string | null;
  useCount: number;
  href: string;
  squareText: string;
}

interface SymbolMarkup {
  tagName: string;
  count: number;
  firstChildTagName: string;
  firstChildClassName: string;
  firstChildRadius: string;
}

async function readPieceMarkup(square: Locator): Promise<PieceMarkup> {
  return square.evaluate((element) => {
    const piece = element.querySelector(".mark");
    const useElements = piece?.querySelectorAll("use") ?? [];
    const [useElement] = useElements;
    return {
      tagName: piece?.tagName.toLowerCase() ?? "",
      className: piece?.getAttribute("class") ?? "",
      ariaHidden: piece?.getAttribute("aria-hidden") ?? null,
      useCount: useElements.length,
      href: useElement?.getAttribute("href") ?? "",
      squareText: (element.textContent ?? "").trim(),
    };
  });
}

async function readSymbolMarkup(
  page: Page,
  symbolId: string,
): Promise<SymbolMarkup> {
  return page.evaluate((id) => {
    const matches = document.querySelectorAll(`[id="${id}"]`);
    const symbol = document.getElementById(id);
    const firstChild = symbol?.firstElementChild ?? null;
    return {
      tagName: symbol?.tagName.toLowerCase() ?? "",
      count: matches.length,
      firstChildTagName: firstChild?.tagName.toLowerCase() ?? "",
      firstChildClassName: firstChild?.getAttribute("class") ?? "",
      firstChildRadius: firstChild?.getAttribute("r") ?? "",
    };
  }, symbolId);
}

async function countPieceElements(square: Locator): Promise<number> {
  return square.locator(".mark, svg, use").count();
}

/** Every square with an "empty" name holds no piece element (Codex F-014 C1). */
async function expectEmptySquaresHoldNoPiece(page: Page): Promise<void> {
  const emptySquares = locateBoard(page).getByRole("button", {
    name: /, empty$/,
  });
  for (const square of await emptySquares.all()) {
    const name = (await square.getAttribute("aria-label")) ?? "";
    expect(await countPieceElements(square), `pieces in ${name}`).toBe(0);
  }
}

test.describe("pieces are inline SVG use elements (F-014 R-005 R-013)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("an X and an O are aria-hidden svg.mark pieces whose single use element references #mark-x or #mark-o, with no text glyph and unchanged names (F-014 R-005 R-013)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, IN_PLAY_MOVES);

    await expect(locateSquare(page, 0)).toHaveAccessibleName(
      "Row 1, column 1, X",
    );
    await expect(locateSquare(page, 4)).toHaveAccessibleName(
      "Row 2, column 2, O",
    );
    expect(await readPieceMarkup(locateSquare(page, 0))).toEqual({
      tagName: "svg",
      className: expect.stringMatching(/(^|\s)mark(\s|$)/) as unknown,
      ariaHidden: "true",
      useCount: 1,
      href: "#mark-x",
      squareText: "",
    });
    expect(await readPieceMarkup(locateSquare(page, 4))).toEqual({
      tagName: "svg",
      className: expect.stringMatching(/(^|\s)mark(\s|$)/) as unknown,
      ariaHidden: "true",
      useCount: 1,
      href: "#mark-o",
      squareText: "",
    });
    await expect(locateSquare(page, 0).locator(".mark")).toHaveClass(
      /\bmark--x\b/,
    );
    await expect(locateSquare(page, 4).locator(".mark")).toHaveClass(
      /\bmark--o\b/,
    );
  });

  test("after a full game every piece matches its square's name and the board shows no X or O text (F-014 R-005 R-013)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, DRAW_MOVES);
    await expect(locateStatus(page)).toHaveText("It's a draw.");

    await expectVisibleMarksMatchNames(page);
    for (let index = 0; index < SQUARE_COUNT; index += 1) {
      expect(
        await readPiece(locateSquare(page, index)),
        `square ${String(index)}`,
      ).toMatch(/^[XO]$/);
    }
    expect(
      (await locateBoard(page).textContent())?.trim() ?? "",
      "text inside the board",
    ).toBe("");
  });

  test("empty squares hold no piece element on the choice screen, after You go first and during play (F-014 R-005, Codex F-014 C1)", async ({
    page,
  }, testInfo) => {
    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await expect(
      locateBoard(page).getByRole("button", { name: /, empty$/ }),
    ).toHaveCount(SQUARE_COUNT);
    await expectEmptySquaresHoldNoPiece(page);

    await chooseFirstMover(page, testInfo, "You go first");
    await expect(locateStatus(page)).toHaveText("Your turn. You are X.");
    await expectEmptySquaresHoldNoPiece(page);

    await playMoves(page, testInfo, IN_PLAY_MOVES);
    await expect(
      locateBoard(page).getByRole("button", { name: /, empty$/ }),
    ).toHaveCount(SQUARE_COUNT - 2);
    await expectEmptySquaresHoldNoPiece(page);
  });

  test("after a win, Play again empties every square of its piece, and the next game adds pieces only where played (F-014 R-005, Codex F-014 C1)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, DIAGONAL_WIN_MOVES);
    await expect(locateStatus(page)).toHaveText(LONGEST_RESULT_STATUS);

    await activate(page.getByRole("button", { name: "Play again" }), testInfo);
    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await expect(
      locateBoard(page).getByRole("button", { name: /, empty$/ }),
    ).toHaveCount(SQUARE_COUNT);
    for (const square of await locateSquares(page).all()) {
      expect(await countPieceElements(square)).toBe(0);
    }

    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, IN_PLAY_MOVES);
    await expectEmptySquaresHoldNoPiece(page);
    await expectVisibleMarksMatchNames(page);
  });

  test("the #mark-x and #mark-o symbols exist once each and start with the r=37 backing disc (F-014 R-005 R-013, Codex F-014 C2)", async ({
    page,
  }) => {
    for (const symbolId of ["mark-x", "mark-o"]) {
      expect(await readSymbolMarkup(page, symbolId), symbolId).toEqual({
        tagName: "symbol",
        count: 1,
        firstChildTagName: "circle",
        firstChildClassName: "mark-backing",
        firstChildRadius: "37",
      });
    }
  });

  test("an X and an O piece render: each use element has a non-empty box (F-014 R-005 R-013, Codex F-014 C2)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, IN_PLAY_MOVES);

    for (const index of [0, 4]) {
      const useElement = locateSquare(page, index).locator(".mark use");
      await expect(useElement).toHaveCount(1);
      const renderedBox = await useElement.boundingBox();
      expect(
        renderedBox?.width ?? 0,
        `square ${String(index)} use width`,
      ).toBeGreaterThan(0);
      expect(
        renderedBox?.height ?? 0,
        `square ${String(index)} use height`,
      ).toBeGreaterThan(0);
      const geometryBox = await useElement.evaluate((element) => {
        const box = (element as SVGGraphicsElement).getBBox();
        return { width: box.width, height: box.height };
      });
      expect(
        geometryBox.width,
        `square ${String(index)} use geometry width`,
      ).toBeGreaterThan(0);
      expect(
        geometryBox.height,
        `square ${String(index)} use geometry height`,
      ).toBeGreaterThan(0);
    }
  });
});

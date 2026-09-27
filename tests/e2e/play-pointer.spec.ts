// F-006 R-001 R-002 R-010: render the first-mover choice and the board, and
// play a whole game by click (desktop projects) or tap (mobile projects).
// Exact copy: .factory/design/screens.md "Copy"; move sequences follow the
// real computer player (ADR-010), as in tests/unit/game.test.ts.
import { test, expect } from "@playwright/test";
import {
  SQUARE_COUNT,
  activate,
  chooseFirstMover,
  expectEverySquareNativelyDisabled,
  expectVisibleMarksMatchNames,
  locateBoard,
  locateSquare,
  locateSquares,
  locateSquaresShowing,
  locateStatus,
  playMoves,
  readSquareContents,
  type ActivationMethod,
} from "./game-page";

test.describe("render and pointer play (F-006)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("a fresh load shows the choice and an empty, natively disabled board with no symbol picker (F-006 R-002 R-001)", async ({
    page,
  }) => {
    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await expect(
      page.getByRole("button", { name: "You go first" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Computer goes first" }),
    ).toBeVisible();

    await expect(locateSquares(page)).toHaveCount(SQUARE_COUNT);
    await expect(
      locateBoard(page).getByRole("button", { name: /, empty$/ }),
    ).toHaveCount(SQUARE_COUNT);
    await expectEverySquareNativelyDisabled(page);

    await expect(
      page.getByRole("button", { name: /^(X|O)$|\b(as|play|choose) (X|O)\b/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("listbox")).toHaveCount(0);
  });

  test("choosing You go first gives an empty active board, then X at row 1, column 1 brings O at row 2, column 2 (F-006 R-002 R-001)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");

    await expect(locateStatus(page)).toHaveText("Your turn. You are X.");
    await expect(
      locateBoard(page).getByRole("button", { name: /, empty$/ }),
    ).toHaveCount(SQUARE_COUNT);
    for (const square of await locateSquares(page).all()) {
      await expect(square).toBeEnabled();
    }

    await activate(locateSquare(page, 0), testInfo);

    await expect(locateSquare(page, 0)).toHaveAccessibleName(
      "Row 1, column 1, X",
    );
    await expect(locateSquaresShowing(page, "X")).toHaveCount(1);
    await expect(locateSquaresShowing(page, "O")).toHaveCount(1);
    await expect(locateSquare(page, 4)).toHaveAccessibleName(
      "Row 2, column 2, O",
    );
    await expect(locateStatus(page)).toHaveText(
      "Computer placed O in row 2, column 2. Your turn.",
    );
  });

  test("choosing Computer goes first shows exactly one O at row 1, column 1 and names it in the status (F-006 R-002)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "Computer goes first");

    await expect(locateSquaresShowing(page, "O")).toHaveCount(1);
    await expect(locateSquaresShowing(page, "X")).toHaveCount(0);
    await expect(locateSquare(page, 0)).toHaveAccessibleName(
      "Row 1, column 1, O",
    );
    await expect(locateStatus(page)).toHaveText(
      "Computer placed O in row 1, column 1. Your turn. You are X.",
    );
    await expectVisibleMarksMatchNames(page);
  });

  test("activating an occupied square changes nothing and shows the taken message until the next valid move (F-006 R-001)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, [{ humanSquare: 0, computerReply: 4 }]);

    const computerSquare = locateSquare(page, 4);
    await expect(computerSquare).toHaveAttribute("aria-disabled", "true");
    expect(
      await computerSquare.evaluate(
        (element) => (element as HTMLButtonElement).disabled,
      ),
    ).toBe(false);
    const contentsBefore = await readSquareContents(page);

    // Forced: Playwright's actionability check treats aria-disabled as disabled.
    await activate(computerSquare, testInfo, { force: true });

    await expect(locateStatus(page)).toHaveText(
      "Row 2, column 2 is taken. Choose an empty square.",
    );
    expect(await readSquareContents(page)).toEqual(contentsBefore);

    const humanSquare = locateSquare(page, 0);
    await expect(humanSquare).toHaveAttribute("aria-disabled", "true");
    expect(
      await humanSquare.evaluate(
        (element) => (element as HTMLButtonElement).disabled,
      ),
    ).toBe(false);
    await activate(humanSquare, testInfo, { force: true });

    await expect(locateStatus(page)).toHaveText(
      "Row 1, column 1 is taken. Choose an empty square.",
    );
    expect(await readSquareContents(page)).toEqual(contentsBefore);

    await page.getByRole("heading", { name: "Tic-tac-toe" }).hover();
    await locateSquare(page, 8).focus();
    await expect(locateStatus(page)).toHaveText(
      "Row 1, column 1 is taken. Choose an empty square.",
    );

    await playMoves(page, testInfo, [{ humanSquare: 1, computerReply: 2 }]);
    await expect(locateStatus(page)).toHaveText(
      "Computer placed O in row 1, column 3. Your turn.",
    );
  });

  test("before the choice, squares are natively disabled and a forced click or tap and Enter place nothing (F-006 R-001)", async ({
    page,
  }, testInfo) => {
    await expectEverySquareNativelyDisabled(page);
    const contentsBefore = await readSquareContents(page);

    await activate(locateSquare(page, 0), testInfo, { force: true });
    await locateSquare(page, 4).press("Enter");

    expect(await readSquareContents(page)).toEqual(contentsBefore);
    await expect(
      locateBoard(page).getByRole("button", { name: /, empty$/ }),
    ).toHaveCount(SQUARE_COUNT);
    await expect(locateStatus(page)).toHaveText("Who goes first?");
  });

  test("a pointer game the computer wins shows the diagonal result and disables every square (F-006 R-001)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, [
      { humanSquare: 0, computerReply: 4 },
      { humanSquare: 1, computerReply: 2 },
      { humanSquare: 3, computerReply: 6 },
    ]);

    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );
    await expectEverySquareNativelyDisabled(page);

    const contentsBefore = await readSquareContents(page);
    await activate(locateSquare(page, 8), testInfo, { force: true });
    expect(await readSquareContents(page)).toEqual(contentsBefore);
    await expect(locateStatus(page)).toHaveText(
      "Computer wins with the diagonal from top right to bottom left.",
    );
  });

  test("a pointer game ending in a draw shows the result after X's ninth-move mark with no O after it (F-006 R-001)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, [
      { humanSquare: 0, computerReply: 4 },
      { humanSquare: 1, computerReply: 2 },
      { humanSquare: 6, computerReply: 3 },
      { humanSquare: 5, computerReply: 7 },
      { humanSquare: 8, computerReply: undefined },
    ]);

    await expect(locateStatus(page)).toHaveText("It's a draw.");
    await expect(locateSquare(page, 8)).toHaveAccessibleName(
      "Row 3, column 3, X",
    );
    await expect(locateSquaresShowing(page, "X")).toHaveCount(5);
    await expect(locateSquaresShowing(page, "O")).toHaveCount(4);
    await expectEverySquareNativelyDisabled(page);

    const contentsBefore = await readSquareContents(page);
    await activate(locateSquare(page, 4), testInfo, { force: true });
    expect(await readSquareContents(page)).toEqual(contentsBefore);
    await expect(locateStatus(page)).toHaveText("It's a draw.");
  });

  test("places X by tap on touch projects and by click on desktop projects (F-006 R-010)", async ({
    page,
  }, testInfo) => {
    const hasTouch = testInfo.project.use.hasTouch === true;
    expect(hasTouch).toBe(testInfo.project.name.startsWith("mobile-"));
    const expectedMethod: ActivationMethod = hasTouch ? "tap" : "click";

    const choiceMethod = await activate(
      page.getByRole("button", { name: "You go first" }),
      testInfo,
    );
    const squareMethod = await activate(locateSquare(page, 2), testInfo);

    expect(choiceMethod).toBe(expectedMethod);
    expect(squareMethod).toBe(expectedMethod);
    await expect(locateSquare(page, 2)).toHaveAccessibleName(
      "Row 1, column 3, X",
    );
  });
});

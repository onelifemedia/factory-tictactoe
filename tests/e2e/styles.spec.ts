// F-014 R-010 R-013: the Tabletop Tiles faces, edges, focus offsets and fonts,
// read as computed styles (design-system.md §3–§5, tokens.json version 2).
// Disabled squares use surface-sunken with the 2 px tile-resting edge, active
// empty squares surface-tile with the 6 px tile edge; buttons are primary
// pills with the 5 px button edge; focus rings sit 6 px out on buttons and 3 px
// on squares; the title font begins ui-rounded, system-ui and the body font
// system-ui.
import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  chooseFirstMover,
  locateBoard,
  locateSquare,
  locateSquares,
  locateStatus,
  playMoves,
  waitForAnimationsToFinish,
} from "./game-page";
import { IN_PLAY_MOVES } from "./game-states";

interface SurfaceStyle {
  backgroundColor: string;
  borderTopColor: string;
  borderTopWidth: string;
  boxShadow: string;
}

interface FocusStyle {
  isFocusVisible: boolean;
  outlineStyle: string;
  outlineWidth: string;
  outlineColor: string;
  outlineOffset: string;
}

const SURFACE_SUNKEN_RGB = "rgb(236, 223, 198)";
const SURFACE_TILE_RGB = "rgb(255, 250, 240)";
const SURFACE_RGB = "rgb(243, 232, 212)";
const BOARD_WELL_RGB = "rgb(227, 207, 174)";
const BORDER_RGB = "rgb(122, 95, 68)";
const PRIMARY_RGB = "rgb(11, 91, 98)";
const ON_PRIMARY_RGB = "rgb(255, 250, 240)";
const FOCUS_RGB = "rgb(43, 29, 19)";
const MARK_X_RGB = "rgb(179, 38, 30)";
const MARK_O_RGB = "rgb(11, 91, 98)";

// Computed box-shadow lists each shadow as "<colour> <x> <y> <blur> <spread>".
const TILE_RESTING_EDGE = /rgb\(198, 165, 123\) 0px 2px 0px/;
const TILE_EDGE = /rgb\(198, 165, 123\) 0px 6px 0px/;
const BUTTON_EDGE = /rgb\(6, 54, 58\) 0px 5px 0px/;

async function readSurfaceStyle(element: Locator): Promise<SurfaceStyle> {
  return element.evaluate((target) => {
    const style = getComputedStyle(target);
    return {
      backgroundColor: style.backgroundColor,
      borderTopColor: style.borderTopColor,
      borderTopWidth: style.borderTopWidth,
      boxShadow: style.boxShadow,
    };
  });
}

async function readFocusStyle(page: Page): Promise<FocusStyle> {
  return page.evaluate(() => {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) {
      throw new Error("nothing is focused");
    }
    const style = getComputedStyle(focused);
    return {
      isFocusVisible: focused.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
    };
  });
}

async function readFontFamily(element: Locator): Promise<string> {
  return element.evaluate((target) => getComputedStyle(target).fontFamily);
}

test.describe("tile and button faces and edges (F-014 R-010 R-013)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("disabled squares on the choice screen use the surface-sunken face, the border-disabled outline and the 2 px tile-resting edge (F-014 R-013)", async ({
    page,
  }) => {
    await expect(locateStatus(page)).toHaveText("Who goes first?");

    for (const square of await locateSquares(page).all()) {
      await expect(square).toBeDisabled();
      const surfaceStyle = await readSurfaceStyle(square);
      expect(surfaceStyle.backgroundColor).toBe(SURFACE_SUNKEN_RGB);
      expect(surfaceStyle.borderTopColor).toBe(BORDER_RGB);
      expect(surfaceStyle.borderTopWidth).toBe("2px");
      expect(surfaceStyle.boxShadow).toMatch(TILE_RESTING_EDGE);
      expect(surfaceStyle.boxShadow).not.toMatch(TILE_EDGE);
    }
  });

  test("active empty squares during play use the surface-tile face, the border outline and the 6 px tile edge (F-014 R-013)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, IN_PLAY_MOVES);
    await page.mouse.move(0, 0);
    await waitForAnimationsToFinish(page);

    const emptySquares = locateBoard(page).getByRole("button", {
      name: /, empty$/,
    });
    await expect(emptySquares).toHaveCount(7);
    for (const square of await emptySquares.all()) {
      await expect(square).toBeEnabled();
      const surfaceStyle = await readSurfaceStyle(square);
      expect(surfaceStyle.backgroundColor).toBe(SURFACE_TILE_RGB);
      expect(surfaceStyle.borderTopColor).toBe(BORDER_RGB);
      expect(surfaceStyle.borderTopWidth).toBe("2px");
      expect(surfaceStyle.boxShadow).toMatch(TILE_EDGE);
    }
  });

  test("the page is the surface table and the board is the board-well tray (F-014 R-013)", async ({
    page,
  }) => {
    expect(
      await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
    ).toBe(SURFACE_RGB);
    expect(
      await locateBoard(page).evaluate(
        (board) => getComputedStyle(board).backgroundColor,
      ),
    ).toBe(BOARD_WELL_RGB);
  });

  test("X pieces are drawn in mark-x and O pieces in mark-o (F-014 R-013)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, IN_PLAY_MOVES);

    expect(
      await locateSquare(page, 0)
        .locator(".mark")
        .evaluate((piece) => getComputedStyle(piece).color),
    ).toBe(MARK_X_RGB);
    expect(
      await locateSquare(page, 4)
        .locator(".mark")
        .evaluate((piece) => getComputedStyle(piece).color),
    ).toBe(MARK_O_RGB);
  });

  test("choice buttons are primary-filled pills with on-primary labels and the 5 px button edge (F-014 R-013)", async ({
    page,
  }) => {
    for (const choiceName of ["You go first", "Computer goes first"]) {
      const button = page.getByRole("button", { name: choiceName });
      const surfaceStyle = await readSurfaceStyle(button);
      expect(surfaceStyle.backgroundColor, choiceName).toBe(PRIMARY_RGB);
      expect(surfaceStyle.boxShadow, choiceName).toMatch(BUTTON_EDGE);
      expect(
        await button.evaluate((element) => getComputedStyle(element).color),
        choiceName,
      ).toBe(ON_PRIMARY_RGB);
      expect(
        await button.evaluate(
          (element) => getComputedStyle(element).borderTopLeftRadius,
        ),
        choiceName,
      ).toBe("999px");
    }
  });
});

test.describe("focus offsets (F-014 R-010 R-013)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("a keyboard-focused button shows a 3 px focus ring 6 px out, clear of its 5 px edge (F-014 R-013)", async ({
    page,
  }) => {
    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "You go first" }),
    ).toBeFocused();

    expect(await readFocusStyle(page)).toEqual({
      isFocusVisible: true,
      outlineStyle: "solid",
      outlineWidth: "3px",
      outlineColor: FOCUS_RGB,
      outlineOffset: "6px",
    });
  });

  test("a keyboard-focused square shows a 3 px focus ring 3 px out (F-014 R-013)", async ({
    page,
  }) => {
    await expect(locateStatus(page)).toHaveText("Who goes first?");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "You go first" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(locateSquare(page, 0)).toBeFocused();

    expect(await readFocusStyle(page)).toEqual({
      isFocusVisible: true,
      outlineStyle: "solid",
      outlineWidth: "3px",
      outlineColor: FOCUS_RGB,
      outlineOffset: "3px",
    });
  });
});

test.describe("fonts (F-014 R-013)", () => {
  test("the title's font-family begins with ui-rounded, system-ui and the body's with system-ui (F-014 R-013)", async ({
    page,
  }) => {
    await page.goto("/");

    const titleFontFamily = await readFontFamily(page.locator("h1"));
    const bodyFontFamily = await readFontFamily(page.locator("body"));

    expect(titleFontFamily).toMatch(/^ui-rounded,\s*system-ui\b/);
    expect(bodyFontFamily).toMatch(/^system-ui\b/);
  });
});

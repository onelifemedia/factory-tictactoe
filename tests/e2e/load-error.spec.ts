// F-011 R-001: the page tells the player when JavaScript is off or the game
// fails to load, and never shows the load-error message on a normal load.
import { test, expect, type Page } from "@playwright/test";
import { locateSquares, SQUARE_COUNT } from "./game-page";

const LOAD_ERROR_TEXT = "The game didn't load. Try reloading the page.";
const NOSCRIPT_TEXT =
  "This game needs JavaScript, which is turned off in this browser. Turn it on and reload the page.";
const BOARD_ELEMENT_PATTERN = /<div\b[^>]*\bid="board"[^>]*><\/div>/;

interface LoadErrorProbeWindow {
  loadErrorWasShown?: boolean;
}

function locateLoadError(page: Page) {
  return page.locator("#load-error");
}

test.describe("load error fallback (F-011 R-001)", () => {
  test("shows the load-error message and renders no squares when the bundle request is aborted (F-011 R-001)", async ({
    page,
  }) => {
    await page.route("**/assets/*.js", (route) => route.abort());

    await page.goto("/");
    await page.waitForLoadState("load");

    await expect(page.getByText(LOAD_ERROR_TEXT)).toBeVisible();
    await expect(locateLoadError(page)).toBeVisible();
    await expect(locateSquares(page)).toHaveCount(0);
  });

  test("never shows the load-error message during a normal load, renders the game, and keeps the message hidden (F-011 R-001)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const probeWindow = window as unknown as LoadErrorProbeWindow;
      probeWindow.loadErrorWasShown = false;
      const recordIfLoadErrorShown = (): void => {
        const loadError = document.getElementById("load-error");
        if (loadError && !loadError.hasAttribute("hidden")) {
          probeWindow.loadErrorWasShown = true;
        }
      };
      const observer = new MutationObserver(recordIfLoadErrorShown);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden"],
      });
      document.addEventListener("DOMContentLoaded", recordIfLoadErrorShown);
    });

    await page.goto("/");
    await page.waitForLoadState("load");

    await expect(locateSquares(page)).toHaveCount(SQUARE_COUNT);
    await expect(locateLoadError(page)).toHaveCount(1);
    await expect(locateLoadError(page)).toHaveAttribute("hidden", "");
    await expect(locateLoadError(page)).toHaveText(LOAD_ERROR_TEXT);
    await expect(locateLoadError(page)).toBeHidden();
    const wasLoadErrorShown = await page.evaluate(
      () => (window as unknown as LoadErrorProbeWindow).loadErrorWasShown,
    );
    expect(wasLoadErrorShown, "load error was never shown during load").toBe(
      false,
    );
  });

  test("shows the load-error message and rethrows when start-up cannot find the board (F-011 R-001)", async ({
    page,
  }) => {
    const pageErrorMessages: string[] = [];
    page.on("pageerror", (pageError) => {
      pageErrorMessages.push(pageError.message);
    });
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() !== "document") {
        await route.fallback();
        return;
      }
      const response = await route.fetch();
      const originalHtml = await response.text();
      expect(originalHtml, "the served page contains the board root").toMatch(
        BOARD_ELEMENT_PATTERN,
      );
      await route.fulfill({
        response,
        body: originalHtml.replace(BOARD_ELEMENT_PATTERN, ""),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("load");

    await expect(page.locator("#board")).toHaveCount(0);
    await expect(page.getByText(LOAD_ERROR_TEXT)).toBeVisible();
    await expect(locateLoadError(page)).toBeVisible();
    await expect
      .poll(() =>
        pageErrorMessages.some((message) => message.includes("#board")),
      )
      .toBe(true);
  });
});

test.describe("JavaScript turned off (F-011 R-001)", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the noscript message and keeps the load-error message hidden (F-011 R-001)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await expect(page.getByText(NOSCRIPT_TEXT)).toBeVisible();
    await expect(locateLoadError(page)).toHaveCount(1);
    await expect(locateLoadError(page)).toBeHidden();
  });
});

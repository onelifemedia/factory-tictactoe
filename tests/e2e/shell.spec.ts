// F-001 R-013 R-015: the built page shell renders in every Playwright project.
import { test, expect } from "@playwright/test";

test.describe("page shell (F-001)", () => {
  test("renders the page shell with language, title, heading, main landmark and system font, without errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (pageError) => {
      pageErrors.push(pageError.message);
    });

    await page.goto("/");
    await page.waitForLoadState("load");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle(
      "Tic-tac-toe: play against a computer that never loses",
    );
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Tic-tac-toe");
    await expect(page.locator("main")).toHaveCount(1);

    const bodyFontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(
      bodyFontFamily.startsWith("system-ui"),
      `body font-family is "${bodyFontFamily}"`,
    ).toBe(true);

    expect(consoleErrors, "no console errors during load").toEqual([]);
    expect(pageErrors, "no page errors during load").toEqual([]);
  });
});

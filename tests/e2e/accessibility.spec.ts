// F-010 R-009: axe-core reports 0 WCAG 2.2 AA violations in every game state
// (choice, in play, computer won, draw) in every Playwright project, and the
// board is exposed as a labelled group.
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { SQUARE_COUNT, locateBoard, locateSquares } from "./game-page";
import { GAME_STATES } from "./game-states";

const WCAG_TAGS: readonly string[] = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

interface AxeViolationSummary {
  id: string;
  targets: string[];
}

test.describe("accessibility: WCAG 2.2 AA with axe-core (F-010 R-009)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("the board is exposed as a group named Board that contains the nine squares (F-010 R-009)", async ({
    page,
  }) => {
    await expect(locateBoard(page)).toHaveCount(1);
    await expect(locateBoard(page)).toBeVisible();
    await expect(locateSquares(page)).toHaveCount(SQUARE_COUNT);
  });

  for (const gameState of GAME_STATES) {
    test(`the ${gameState.name} state has 0 axe violations for wcag2a, wcag2aa, wcag21a, wcag21aa and wcag22aa (F-010 R-009)`, async ({
      page,
    }, testInfo) => {
      await gameState.reach(page, testInfo);
      await expect(locateBoard(page)).toBeVisible();

      const axeResults = await new AxeBuilder({ page })
        .withTags([...WCAG_TAGS])
        .analyze();
      expect(
        axeResults.passes.length,
        "axe evaluated at least one rule",
      ).toBeGreaterThan(0);

      const violationSummaries: AxeViolationSummary[] =
        axeResults.violations.map((violation) => ({
          id: violation.id,
          targets: violation.nodes.map((node) => node.target.join(" ")),
        }));
      expect(
        violationSummaries,
        `axe violations in the ${gameState.name} state`,
      ).toEqual([]);
      // Codex F-010 review: zero violations is the automated gate, not full
      // conformance. Rules axe could not decide ("incomplete") are recorded
      // for the human QA pass instead of failing the build.
      const incompleteRuleIds = axeResults.incomplete.map((rule) => rule.id);
      testInfo.annotations.push({
        type: "axe-incomplete",
        description:
          incompleteRuleIds.length > 0 ? incompleteRuleIds.join(", ") : "none",
      });
      console.info(
        `axe incomplete (${testInfo.project.name}, ${gameState.name}): ${incompleteRuleIds.join(", ") || "none"}`,
      );
    });
  }
});

// F-013 R-014: post-deploy smoke test. It waits for the live page to report
// the expected build id (Pages can serve the previous build for a while),
// then plays one move: "You go first", X in the top-left square, and the
// computer answers with exactly one O.
//
// Environment:
// - EXPECTED_BUILD_ID (required): the id the deployed page must report in
//   <meta name="build-id">, normally the deployed commit SHA.
// - SMOKE_POLL_SECONDS (optional, default 180): how long to keep reloading
//   before giving up. Tests of this harness shorten it.
// The base URL comes from SMOKE_URL through playwright.smoke.config.ts. This
// file is self-contained because that config's testDir is tests/smoke.
import { expect, test, type Page } from "@playwright/test";

const DEFAULT_POLL_SECONDS = 180;
const RELOAD_INTERVAL_MILLISECONDS = 2_000;
const SMOKE_TIMEOUT_MILLISECONDS = 240_000;

function readRequiredEnvironmentValue(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
}

function readPollSeconds(): number {
  const rawPollSeconds = process.env["SMOKE_POLL_SECONDS"];
  if (rawPollSeconds === undefined || rawPollSeconds === "") {
    return DEFAULT_POLL_SECONDS;
  }
  const pollSeconds = Number(rawPollSeconds);
  if (!Number.isFinite(pollSeconds) || pollSeconds <= 0) {
    throw new Error(
      `SMOKE_POLL_SECONDS must be a positive number, got "${rawPollSeconds}"`,
    );
  }
  return pollSeconds;
}

async function readLiveBuildId(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      document
        .querySelector('meta[name="build-id"]')
        ?.getAttribute("content") ?? null,
  );
}

async function waitForBuildId(
  page: Page,
  expectedBuildId: string,
  pollSeconds: number,
): Promise<void> {
  const deadline = Date.now() + pollSeconds * 1_000;
  let lastSeenDescription = "nothing (no page loaded yet)";
  let isFirstAttempt = true;

  while (Date.now() < deadline) {
    try {
      if (isFirstAttempt) {
        // Relative to the configured URL, so a project site such as
        // https://owner.github.io/factory-tictactoe/ keeps its path.
        await page.goto("./");
      } else {
        await page.reload();
      }
      const liveBuildId = await readLiveBuildId(page);
      if (liveBuildId === expectedBuildId) {
        return;
      }
      lastSeenDescription =
        liveBuildId === null ? "no build-id meta tag" : `"${liveBuildId}"`;
    } catch (navigationError) {
      lastSeenDescription = `a failed load (${String(navigationError)})`;
    }
    isFirstAttempt = false;
    await page.waitForTimeout(RELOAD_INTERVAL_MILLISECONDS);
  }

  throw new Error(
    `Live build-id never became "${expectedBuildId}" within ${String(pollSeconds)} s; last seen ${lastSeenDescription}`,
  );
}

test("the deployed page reports the expected build id and plays one move (F-013 R-014)", async ({
  page,
}) => {
  test.setTimeout(SMOKE_TIMEOUT_MILLISECONDS);
  const expectedBuildId = readRequiredEnvironmentValue("EXPECTED_BUILD_ID");
  const pollSeconds = readPollSeconds();

  await waitForBuildId(page, expectedBuildId, pollSeconds);

  await page.getByRole("button", { name: "You go first" }).click();
  const board = page.getByRole("group", { name: "Board" });
  const topLeftSquare = board.getByRole("button", {
    name: /^Row 1, column 1, /,
  });
  await topLeftSquare.click();

  await expect(topLeftSquare).toHaveAccessibleName(/, X$/);
  await expect(board.getByRole("button", { name: /, O$/ })).toHaveCount(1);
});

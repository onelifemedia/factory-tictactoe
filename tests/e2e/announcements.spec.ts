// F-009 R-008: every move and result is announced through a visually hidden
// role="status" live region, exactly once per action, with the exact texts of
// .factory/acceptance.md "Announcement text" (A1–A3, A5–A8; A4 is unreachable
// with the real computer and is covered at unit level by F-005). Move sequences
// follow the real computer player (ADR-010), as in tests/unit/game.test.ts.
import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  SQUARE_COUNT,
  activate,
  chooseFirstMover,
  expectVisibleMarksMatchNames,
  locateSquare,
  locateSquares,
  playMoves,
} from "./game-page";

interface AnnouncementRecordingWindow extends Window {
  announcementRecords?: string[];
}

const COLUMN_COUNT = 3;

const A1_HUMAN_FIRST = "New game. You go first. You are X. Your turn.";
const A2_COMPUTER_FIRST =
  "New game. Computer goes first as O. Computer placed O in row 1, column 1. Your turn.";
const A3_MOVE_AND_REPLY =
  "You placed X in row 1, column 1. Computer placed O in row 2, column 2. Your turn.";
const A5_HUMAN_FILLS_BOARD = "You placed X in row 3, column 3. It's a draw.";
const A6_COMPUTER_WINS =
  "You placed X in row 2, column 1. Computer placed O in row 3, column 1. Computer wins with the diagonal from top right to bottom left.";
const A7_COMPUTER_FILLS_BOARD =
  "You placed X in row 3, column 2. Computer placed O in row 3, column 3. It's a draw.";
const A8_TAKEN_SQUARE = "Row 2, column 2 is taken. Choose an empty square.";

function locateAnnouncer(page: Page): Locator {
  return page.getByRole("status");
}

/** Records the region's text after every mutation into window state. */
async function startRecordingAnnouncements(page: Page): Promise<void> {
  await page.evaluate(() => {
    const region = document.getElementById("announcer");
    if (!region) {
      throw new Error("The page is missing #announcer");
    }
    const records: string[] = [];
    (window as AnnouncementRecordingWindow).announcementRecords = records;
    const observer = new MutationObserver(() => {
      records.push(region.textContent ?? "");
    });
    observer.observe(region, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
}

/** Lets two animation frames pass so any late second write would be recorded. */
async function waitTwoAnimationFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
}

async function readAnnouncementRecords(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as AnnouncementRecordingWindow).announcementRecords ?? [],
  );
}

async function readNonEmptyAnnouncements(page: Page): Promise<string[]> {
  const records = await readAnnouncementRecords(page);
  return records.filter((text) => text !== "");
}

/** Runs the action and expects exactly one non-empty write with the text. */
async function expectSingleAnnouncement(
  page: Page,
  action: () => Promise<unknown>,
  expectedText: string,
): Promise<void> {
  await startRecordingAnnouncements(page);
  await action();
  await expect(locateAnnouncer(page)).toHaveText(expectedText);
  await waitTwoAnimationFrames(page);
  expect(await readNonEmptyAnnouncements(page)).toEqual([expectedText]);
  await expect(locateAnnouncer(page)).toHaveText(expectedText);
}

function describeSquareName(index: number, mark: "X" | "O" | null): string {
  const row = Math.floor(index / COLUMN_COUNT) + 1;
  const column = (index % COLUMN_COUNT) + 1;
  return `Row ${String(row)}, column ${String(column)}, ${mark ?? "empty"}`;
}

/** Every square's accessible name is "Row R, column C, empty|X|O" for the board. */
async function expectSquareNames(
  page: Page,
  xSquares: readonly number[],
  oSquares: readonly number[],
): Promise<void> {
  await expect(locateSquares(page)).toHaveCount(SQUARE_COUNT);
  for (let index = 0; index < SQUARE_COUNT; index += 1) {
    const mark = xSquares.includes(index)
      ? "X"
      : oSquares.includes(index)
        ? "O"
        : null;
    await expect(locateSquare(page, index)).toHaveAccessibleName(
      describeSquareName(index, mark),
    );
  }
  await expectVisibleMarksMatchNames(page);
}

test.describe("announcements (F-009 R-008)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("a fresh load has one empty, visually hidden role=status region inside main (F-009 R-008)", async ({
    page,
  }) => {
    const region = locateAnnouncer(page);
    await expect(region).toHaveCount(1);
    await expect(region).toHaveId("announcer");
    await expect(region).toHaveAttribute("role", "status");
    await expect(region).toHaveText("");
    await expect(page.locator("main #announcer")).toHaveCount(1);

    const display = await region.evaluate(
      (element) => getComputedStyle(element).display,
    );
    expect(display).not.toBe("none");
    const visibility = await region.evaluate(
      (element) => getComputedStyle(element).visibility,
    );
    expect(visibility).not.toBe("hidden");
    const box = await region.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
    expect(box?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);

    await waitTwoAnimationFrames(page);
    await expect(region).toHaveText("");
  });

  test("choosing You go first announces A1 once (F-009 R-008)", async ({
    page,
  }, testInfo) => {
    await expectSingleAnnouncement(
      page,
      () => chooseFirstMover(page, testInfo, "You go first"),
      A1_HUMAN_FIRST,
    );
    await expectSquareNames(page, [], []);
  });

  test("choosing Computer goes first announces A2 naming row 1, column 1 once (F-009 R-008)", async ({
    page,
  }, testInfo) => {
    await expectSingleAnnouncement(
      page,
      () => chooseFirstMover(page, testInfo, "Computer goes first"),
      A2_COMPUTER_FIRST,
    );
    await expectSquareNames(page, [], [0]);
  });

  test("a human move and the computer reply are announced together as A3 in exactly one update (F-009 R-008)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await expect(locateAnnouncer(page)).toHaveText(A1_HUMAN_FIRST);

    await expectSingleAnnouncement(
      page,
      () => activate(locateSquare(page, 0), testInfo),
      A3_MOVE_AND_REPLY,
    );
    await expectSquareNames(page, [0], [4]);
  });

  test("a human move that fills the board announces the A5 draw once (F-009 R-008)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, [
      { humanSquare: 0, computerReply: 4 },
      { humanSquare: 1, computerReply: 2 },
      { humanSquare: 6, computerReply: 3 },
      { humanSquare: 5, computerReply: 7 },
    ]);

    await expectSingleAnnouncement(
      page,
      () => activate(locateSquare(page, 8), testInfo),
      A5_HUMAN_FILLS_BOARD,
    );
    await expectSquareNames(page, [0, 1, 5, 6, 8], [2, 3, 4, 7]);
  });

  test("a computer move that wins announces A6 with the line once (F-009 R-008)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, [
      { humanSquare: 0, computerReply: 4 },
      { humanSquare: 1, computerReply: 2 },
    ]);

    await expectSingleAnnouncement(
      page,
      () => activate(locateSquare(page, 3), testInfo),
      A6_COMPUTER_WINS,
    );
    await expectSquareNames(page, [0, 1, 3], [2, 4, 6]);
  });

  test("a computer move that fills the board announces the A7 draw once (F-009 R-008)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "Computer goes first");
    await playMoves(page, testInfo, [
      { humanSquare: 4, computerReply: 1 },
      { humanSquare: 2, computerReply: 6 },
      { humanSquare: 3, computerReply: 5 },
    ]);

    await expectSingleAnnouncement(
      page,
      () => activate(locateSquare(page, 7), testInfo),
      A7_COMPUTER_FILLS_BOARD,
    );
    await expectSquareNames(page, [2, 3, 4, 7], [0, 1, 5, 6, 8]);
  });

  test("activating a taken square announces A8 once and changes no square name (F-009 R-008)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, [{ humanSquare: 0, computerReply: 4 }]);
    await expect(locateAnnouncer(page)).toHaveText(A3_MOVE_AND_REPLY);

    // Forced: Playwright's actionability check treats aria-disabled as disabled.
    await expectSingleAnnouncement(
      page,
      () => activate(locateSquare(page, 4), testInfo, { force: true }),
      A8_TAKEN_SQUARE,
    );
    await expectSquareNames(page, [0], [4]);
  });

  test("activating the same taken square twice clears the region and sets A8 again, so it is heard twice (F-009 R-008)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, [{ humanSquare: 0, computerReply: 4 }]);
    await expect(locateAnnouncer(page)).toHaveText(A3_MOVE_AND_REPLY);
    await startRecordingAnnouncements(page);

    await activate(locateSquare(page, 4), testInfo, { force: true });
    await expect
      .poll(() => readNonEmptyAnnouncements(page))
      .toEqual([A8_TAKEN_SQUARE]);

    await activate(locateSquare(page, 4), testInfo, { force: true });
    await expect
      .poll(() => readNonEmptyAnnouncements(page))
      .toEqual([A8_TAKEN_SQUARE, A8_TAKEN_SQUARE]);

    await waitTwoAnimationFrames(page);
    expect(await readAnnouncementRecords(page)).toEqual([
      "",
      A8_TAKEN_SQUARE,
      "",
      A8_TAKEN_SQUARE,
    ]);
    await expect(locateAnnouncer(page)).toHaveText(A8_TAKEN_SQUARE);
    await expectSquareNames(page, [0], [4]);
  });
});

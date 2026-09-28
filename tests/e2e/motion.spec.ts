// F-015 R-008 R-010 R-013: tactile motion. Pieces placed by the last action
// carry `is-new` and drop (280 ms, transform only); a win lifts the winning
// tiles and the bar (240 ms from 280 ms) while their edge deepens; squares and
// buttons move on hover and press (80 ms); nothing of it runs under
// prefers-reduced-motion, nothing waits for it, and the board never moves.
// Acceptance criteria 1-5, 7 and 8 of .factory/features/F-015.md (criterion 6,
// the iOS touchstart listener, is a unit test plus a manual real-device check).
//
// Timing is deterministic: animations are frozen in the first frame after the
// click and then seeked (animation.pause(); animation.currentTime = t), the
// "nothing waits" values come from a browser-side probe scheduled from the
// click, and natural completion is checked once, 600 ms after the move.
import {
  test,
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import {
  activate,
  chooseFirstMover,
  locateBoard,
  locateSquare,
  locateStatus,
  playMoves,
  waitForAnimationsToFinish,
} from "./game-page";
import { DIAGONAL_WIN_MOVES, LONGEST_RESULT_STATUS } from "./game-states";
import type { PixelColor } from "./read-png-pixel";
import { expectColorNear, readScreenColor } from "./screen-color";

type AnimationKind = "piece" | "square" | "win-line" | "other";

interface RunningAnimation {
  kind: AnimationKind;
  squareIndex: number | null;
  animationName: string;
  durationMilliseconds: number;
  delayMilliseconds: number;
  keyframeProperties: string[];
}

interface PageBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface FrameSample {
  millisecondsSinceClick: number;
  statusText: string;
  liveRegionText: string;
  focusedLabel: string;
  runningAnimationCount: number;
  boardBox: PageBox;
}

// Just before the 280 ms drop ends and the 280 ms lift delay runs out.
const DROP_LANDED_MILLISECONDS = 279;

interface MotionProbeWindow {
  motionFreeze?: Promise<void>;
  animationEndTimes?: Promise<number[]>;
  keyboardFreeze?: Promise<{ transform: string; transitionDuration: string }>;
  frameSamples?: Promise<FrameSample[]>;
}

interface ComputedMotionStyle {
  transform: string;
  boxShadow: string;
  top: string;
  transitionProperty: string;
  transitionDuration: string;
}

interface TransformReading {
  translateY: number;
  scaleX: number;
  scaleY: number;
}

interface LiftGeometry {
  squareTops: number[];
  squareShadows: string[];
  winLineTop: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

const DROP_DURATION_MILLISECONDS = 280;
const LIFT_DURATION_MILLISECONDS = 240;
const LIFT_DELAY_MILLISECONDS = 280;
const PRESS_DURATION_MILLISECONDS = 80;
// A winning move's motion settles by 520 ms: drop 280 ms, then lift 240 ms
// (design-system.md section 4).
const SETTLED_BY_MILLISECONDS = 520;
const DROP_START_TRANSLATE_Y_PIXELS = -22;
const DROP_START_SCALE = 1.15;
const DROP_EASING = [0.3, 1.6, 0.5, 1];
const HOVER_TRANSLATE_Y_PIXELS = -1;
const PRESS_DEPTH_PIXELS = 4;
const LIFT_HEIGHT_PIXELS = 3;
const PIXEL_TOLERANCE = 0.5;
const SCALE_TOLERANCE = 0.01;
const BEFORE_LIFT_MILLISECONDS = 100;
const MID_DROP_MILLISECONDS = 140;
const MID_LIFT_MILLISECONDS = LIFT_DELAY_MILLISECONDS + 120;
const FIRST_MOVE_STATUS = "Computer placed O in row 2, column 2. Your turn.";
const DIAGONAL_WIN_SQUARES: readonly number[] = [2, 4, 6];
const WIN_SURFACE: PixelColor = { red: 0xff, green: 0xd7, blue: 0x66 };
const WIN_MARKER: PixelColor = { red: 0x2b, green: 0x1d, blue: 0x13 };
const BOARD_VIEWPORTS: readonly ViewportSize[] = [
  { width: 320, height: 568 },
  { width: 1280, height: 800 },
];
const TOUCH_SKIP_REASON =
  "hover and a held mouse press need a mouse pointer; touch projects cover the tap path";

function isTouchProject(testInfo: TestInfo): boolean {
  return testInfo.project.use.hasTouch === true;
}

/**
 * Activates `locator` and pauses every animation in the first animation frame
 * after the click, so the drop and lift can be inspected and seeked however
 * long the test takes (a capture-phase listener runs before the page's own).
 */
async function activateAndFreezeMotion(
  page: Page,
  locator: Locator,
  testInfo: TestInfo,
  options: { force?: boolean } = {},
): Promise<void> {
  await page.evaluate(() => {
    const probeWindow = window as unknown as MotionProbeWindow;
    probeWindow.motionFreeze = new Promise<void>((resolve, reject) => {
      const failsafeTimer = window.setTimeout(() => {
        reject(new Error("no click reached the page within 5 s"));
      }, 5000);
      document.addEventListener(
        "click",
        () => {
          requestAnimationFrame(() => {
            window.clearTimeout(failsafeTimer);
            for (const animation of document.getAnimations()) {
              animation.pause();
            }
            resolve();
          });
        },
        { capture: true, once: true },
      );
    });
  });
  await activate(locator, testInfo, options);
  await page.evaluate(
    () => (window as unknown as MotionProbeWindow).motionFreeze,
  );
}

/**
 * Registers a probe that samples status, live region, focus, running CSS
 * animations and the board box in the first and second animation frames after
 * the next click (Codex F-015 C1).
 */
async function installFrameProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const probeWindow = window as unknown as MotionProbeWindow;
    probeWindow.frameSamples = new Promise<FrameSample[]>((resolve) => {
      document.addEventListener(
        "click",
        () => {
          const clickTime = performance.now();
          const takeSample = (): FrameSample => {
            const focused = document.activeElement;
            const boardBox =
              document.getElementById("board")?.getBoundingClientRect() ??
              new DOMRect();
            return {
              millisecondsSinceClick: performance.now() - clickTime,
              statusText: document.getElementById("status")?.textContent ?? "",
              liveRegionText:
                document.getElementById("announcer")?.textContent ?? "",
              focusedLabel:
                focused?.getAttribute("aria-label") ??
                focused?.textContent?.trim() ??
                "",
              runningAnimationCount: document
                .getAnimations()
                .filter((animation) => animation instanceof CSSAnimation)
                .length,
              boardBox: {
                left: boardBox.left + window.scrollX,
                top: boardBox.top + window.scrollY,
                width: boardBox.width,
                height: boardBox.height,
              },
            };
          };
          requestAnimationFrame(() => {
            const firstFrame = takeSample();
            requestAnimationFrame(() => {
              resolve([firstFrame, takeSample()]);
            });
          });
        },
        { capture: true, once: true },
      );
    });
  });
}

async function readFrameSamples(
  page: Page,
): Promise<[FrameSample, FrameSample]> {
  const samples = await page.evaluate(
    () => (window as unknown as MotionProbeWindow).frameSamples,
  );
  const [firstFrame, secondFrame] = samples ?? [];
  if (firstFrame === undefined || secondFrame === undefined) {
    throw new Error("the frame probe recorded fewer than two frames");
  }
  return [firstFrame, secondFrame];
}

/** Every running CSS animation (not transition), by what it animates. */
async function readRunningAnimations(page: Page): Promise<RunningAnimation[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (animation): animation is CSSAnimation =>
          animation instanceof CSSAnimation,
      )
      .map((animation) => {
        const effect = animation.effect;
        const target = effect instanceof KeyframeEffect ? effect.target : null;
        const kind: AnimationKind =
          target === null
            ? "other"
            : target.closest(".win-line") !== null
              ? "win-line"
              : target.closest(".mark") !== null
                ? "piece"
                : target.classList.contains("square")
                  ? "square"
                  : "other";
        const indexText =
          target?.closest(".square")?.getAttribute("data-index") ?? null;
        const timing = effect?.getTiming();
        const keyframes =
          effect instanceof KeyframeEffect ? effect.getKeyframes() : [];
        const keyframeProperties = [
          ...new Set(
            keyframes.flatMap((keyframe) =>
              Object.keys(keyframe).filter(
                (key) =>
                  !["offset", "computedOffset", "easing", "composite"].includes(
                    key,
                  ),
              ),
            ),
          ),
        ];
        return {
          kind,
          squareIndex: indexText === null ? null : Number(indexText),
          animationName: animation.animationName,
          durationMilliseconds: Number(timing?.duration ?? Number.NaN),
          delayMilliseconds: Number(timing?.delay ?? Number.NaN),
          keyframeProperties,
        };
      }),
  );
}

async function countAllAnimations(page: Page): Promise<number> {
  return page.evaluate(() => document.getAnimations().length);
}

function listSquareIndexes(
  animations: readonly RunningAnimation[],
  kind: AnimationKind,
): number[] {
  return animations
    .filter((animation) => animation.kind === kind)
    .map((animation) => animation.squareIndex ?? -1)
    .sort((first, second) => first - second);
}

/** Pauses every CSS animation and seeks it to `milliseconds` (delay included). */
async function seekAnimations(page: Page, milliseconds: number): Promise<void> {
  await page.evaluate((currentTime) => {
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSAnimation) {
        animation.pause();
        animation.currentTime = currentTime;
      }
    }
  }, milliseconds);
}

async function finishAllAnimations(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      animation.finish();
    }
  });
}

async function readNewSquares(page: Page): Promise<number[]> {
  return locateBoard(page).evaluate((board) =>
    Array.from(board.querySelectorAll(".is-new"), (element) =>
      Number(element.closest(".square")?.getAttribute("data-index") ?? -1),
    ).sort((first, second) => first - second),
  );
}

async function readSquaresWithPieces(page: Page): Promise<number[]> {
  return locateBoard(page).evaluate((board) =>
    Array.from(board.querySelectorAll(".square"))
      .filter((square) => square.querySelector(".mark") !== null)
      .map((square) => Number(square.getAttribute("data-index")))
      .sort((first, second) => first - second),
  );
}

async function readMotionStyle(locator: Locator): Promise<ComputedMotionStyle> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transform: style.transform,
      boxShadow: style.boxShadow,
      top: style.top,
      transitionProperty: style.transitionProperty,
      transitionDuration: style.transitionDuration,
    };
  });
}

/** A custom property's box-shadow as this browser computes and serializes it. */
async function resolveShadowToken(
  page: Page,
  tokenName: string,
): Promise<string> {
  return page.evaluate((customProperty) => {
    const probe = document.createElement("div");
    probe.style.boxShadow = `var(${customProperty})`;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).boxShadow;
    probe.remove();
    return resolved;
  }, tokenName);
}

/** Reads translateY and scale from a computed transform (matrix form or none). */
function parseTransform(transform: string): TransformReading {
  if (transform === "none" || transform === "") {
    return { translateY: 0, scaleX: 1, scaleY: 1 };
  }
  const numbers = (transform.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(
    Number,
  );
  if (transform.startsWith("matrix3d(") && numbers.length >= 17) {
    // The leading "3" of "matrix3d" is matched first; skip it.
    const [, scaleX = 1, , , , , scaleY = 1] = numbers;
    return { translateY: numbers[14] ?? 0, scaleX, scaleY };
  }
  if (transform.startsWith("matrix(") && numbers.length === 6) {
    const [scaleX = 1, , , scaleY = 1, , translateY = 0] = numbers;
    return { translateY, scaleX, scaleY };
  }
  throw new Error(`unexpected computed transform "${transform}"`);
}

function parseTimeMilliseconds(time: string): number {
  const amount = Number.parseFloat(time);
  return time.trim().endsWith("ms") ? amount : amount * 1000;
}

/** The transition duration that applies to `property` (or to all), in ms. */
function readTransitionMilliseconds(
  style: ComputedMotionStyle,
  property: string,
): number {
  const properties = style.transitionProperty
    .split(",")
    .map((name) => name.trim());
  const durations = style.transitionDuration
    .split(",")
    .map((duration) => parseTimeMilliseconds(duration));
  const propertyIndex = properties.findIndex(
    (name) => name === property || name === "all",
  );
  if (propertyIndex === -1 || durations.length === 0) {
    return 0;
  }
  return durations[propertyIndex % durations.length] ?? 0;
}

function readLongestTransitionMilliseconds(style: ComputedMotionStyle): number {
  return Math.max(
    0,
    ...style.transitionDuration
      .split(",")
      .map((duration) => parseTimeMilliseconds(duration)),
  );
}

function expectNear(
  actual: number,
  expected: number,
  tolerance: number,
  description: string,
): void {
  expect(
    Math.abs(actual - expected),
    `${description}: ${String(actual)} vs ${String(expected)}`,
  ).toBeLessThanOrEqual(tolerance);
}

async function readBoardPageBox(page: Page): Promise<PageBox> {
  return locateBoard(page).evaluate((board) => {
    const box = board.getBoundingClientRect();
    return {
      left: box.left + window.scrollX,
      top: box.top + window.scrollY,
      width: box.width,
      height: box.height,
    };
  });
}

function expectSameBox(
  actual: PageBox,
  expected: PageBox,
  description: string,
): void {
  for (const edge of ["left", "top", "width", "height"] as const) {
    expectNear(
      actual[edge],
      expected[edge],
      PIXEL_TOLERANCE,
      `${description}: board ${edge}`,
    );
  }
}

/** Page tops of the given squares and of the win line, and the squares' edges. */
async function readLiftGeometry(
  page: Page,
  squareIndexes: readonly number[],
): Promise<LiftGeometry> {
  return locateBoard(page).evaluate((board, indexes) => {
    const squares = indexes.map((index) =>
      board.querySelector(`.square[data-index="${String(index)}"]`),
    );
    return {
      squareTops: squares.map(
        (square) => square?.getBoundingClientRect().top ?? Number.NaN,
      ),
      squareShadows: squares.map((square) =>
        square === null ? "" : getComputedStyle(square).boxShadow,
      ),
      winLineTop:
        board.querySelector(".win-line")?.getBoundingClientRect().top ??
        Number.NaN,
    };
  }, squareIndexes);
}

async function readPieceTransform(
  page: Page,
  index: number,
): Promise<TransformReading> {
  return parseTransform(
    await locateSquare(page, index)
      .locator(".mark")
      .evaluate((piece) => getComputedStyle(piece).transform),
  );
}

async function readSquareCentre(
  page: Page,
  index: number,
): Promise<{ x: number; y: number }> {
  return locateSquare(page, index).evaluate((square) => {
    const box = square.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  });
}

/** Plays the first two moves of the diagonal win (X 0, 1; O 4, 2) at rest. */
async function playUpToWinningMove(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  await chooseFirstMover(page, testInfo, "You go first");
  await playMoves(page, testInfo, DIAGONAL_WIN_MOVES.slice(0, 2));
  await waitForAnimationsToFinish(page);
}

test.describe("drop, lift and timing with no motion preference (F-015)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
  });

  test("only the squares the last move filled carry is-new, and only their pieces run a 280 ms transform-only drop from translateY(-22px) scale(1.15) (F-015 R-013, criteria 1 and 5)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await activateAndFreezeMotion(page, locateSquare(page, 0), testInfo);

    expect(await readNewSquares(page), "squares carrying is-new").toEqual([
      0, 4,
    ]);
    const animations = await readRunningAnimations(page);
    expect(listSquareIndexes(animations, "piece"), "dropping pieces").toEqual([
      0, 4,
    ]);
    expect(
      animations.filter((animation) => animation.kind !== "piece"),
      "animations other than the drop",
    ).toEqual([]);
    for (const animation of animations) {
      expect(animation.durationMilliseconds, "drop duration").toBe(
        DROP_DURATION_MILLISECONDS,
      );
      expect(animation.delayMilliseconds, "drop delay").toBe(0);
      expect(animation.keyframeProperties, "drop keyframes").not.toContain(
        "opacity",
      );
    }
    const easingNumbers = await locateSquare(page, 0)
      .locator(".mark")
      .evaluate((piece) =>
        (
          getComputedStyle(piece).animationTimingFunction.match(
            /-?\d*\.?\d+/g,
          ) ?? []
        ).map(Number),
      );
    expect(easingNumbers, "drop easing cubic-bezier").toEqual(DROP_EASING);

    await seekAnimations(page, 0);
    for (const index of [0, 4]) {
      const startTransform = await readPieceTransform(page, index);
      expectNear(
        startTransform.translateY,
        DROP_START_TRANSLATE_Y_PIXELS,
        PIXEL_TOLERANCE,
        `square ${String(index)} piece translateY at drop start`,
      );
      expectNear(
        startTransform.scaleX,
        DROP_START_SCALE,
        SCALE_TOLERANCE,
        `square ${String(index)} piece scaleX at drop start`,
      );
      expectNear(
        startTransform.scaleY,
        DROP_START_SCALE,
        SCALE_TOLERANCE,
        `square ${String(index)} piece scaleY at drop start`,
      );
      expect(
        await locateSquare(page, index)
          .locator(".mark")
          .evaluate((piece) => getComputedStyle(piece).opacity),
        `square ${String(index)} piece opacity at drop start`,
      ).toBe("1");
    }
  });

  test("a second move made before the drop finishes moves is-new and the drop to the new pieces only (F-015 R-013, criterion 8)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await activateAndFreezeMotion(page, locateSquare(page, 0), testInfo);
    expect(
      listSquareIndexes(await readRunningAnimations(page), "piece"),
      "pieces dropping after the first move",
    ).toEqual([0, 4]);

    await activateAndFreezeMotion(page, locateSquare(page, 1), testInfo);

    expect(await readNewSquares(page), "squares carrying is-new").toEqual([
      1, 2,
    ]);
    expect(
      listSquareIndexes(await readRunningAnimations(page), "piece"),
      "pieces dropping after the second move",
    ).toEqual([1, 2]);
  });

  test("the computer's opening O carries is-new and drops (F-015 R-013, criterion 8)", async ({
    page,
  }, testInfo) => {
    await activateAndFreezeMotion(
      page,
      page.getByRole("button", { name: "Computer goes first" }),
      testInfo,
    );

    const squaresWithPieces = await readSquaresWithPieces(page);
    expect(squaresWithPieces, "the opening O").toHaveLength(1);
    expect(await readNewSquares(page), "squares carrying is-new").toEqual(
      squaresWithPieces,
    );
    expect(
      listSquareIndexes(await readRunningAnimations(page), "piece"),
      "dropping pieces",
    ).toEqual(squaresWithPieces);
  });

  test("a taken-square attempt removes every is-new and animates nothing (F-015 R-013, criterion 8)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await activateAndFreezeMotion(page, locateSquare(page, 0), testInfo);
    expect(await readNewSquares(page), "is-new after the move").toEqual([0, 4]);
    await finishAllAnimations(page);

    // Playwright treats aria-disabled as disabled, so the attempt is forced.
    await activateAndFreezeMotion(page, locateSquare(page, 4), testInfo, {
      force: true,
    });

    await expect(locateStatus(page)).not.toHaveText(FIRST_MOVE_STATUS);
    expect(await readNewSquares(page), "is-new after the attempt").toEqual([]);
    expect(
      await countAllAnimations(page),
      "animations and transitions after the attempt",
    ).toBe(0);
  });

  test("after Play again no is-new remains, and the next game animates only its own opening O (F-015 R-013, criterion 8)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, DIAGONAL_WIN_MOVES);
    await expect(locateStatus(page)).toHaveText(LONGEST_RESULT_STATUS);
    expect(await readNewSquares(page), "is-new after the win").toEqual([3, 6]);
    await waitForAnimationsToFinish(page);

    await activateAndFreezeMotion(
      page,
      page.getByRole("button", { name: "Play again" }),
      testInfo,
    );
    expect(await readNewSquares(page), "is-new after Play again").toEqual([]);
    expect(
      await readRunningAnimations(page),
      "CSS animations after Play again",
    ).toEqual([]);

    await activateAndFreezeMotion(
      page,
      page.getByRole("button", { name: "Computer goes first" }),
      testInfo,
    );
    const squaresWithPieces = await readSquaresWithPieces(page);
    expect(squaresWithPieces, "the next game's opening O").toHaveLength(1);
    expect(await readNewSquares(page), "is-new in the next game").toEqual(
      squaresWithPieces,
    );
    const animations = await readRunningAnimations(page);
    expect(listSquareIndexes(animations, "piece"), "dropping pieces").toEqual(
      squaresWithPieces,
    );
    expect(
      animations.filter((animation) => animation.kind !== "piece"),
      "animations other than the opening drop",
    ).toEqual([]);
  });

  test("in the first frame after a move the status is final, and the live region is final by the second, while the pieces still drop (F-015 R-008, criterion 2)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    const boardBefore = await readBoardPageBox(page);
    await installFrameProbe(page);

    await activate(locateSquare(page, 0), testInfo);
    const [firstFrame, secondFrame] = await readFrameSamples(page);

    expect(firstFrame.statusText, "status in frame 1").toBe(FIRST_MOVE_STATUS);
    expect(
      firstFrame.runningAnimationCount,
      `CSS animations in frame 1 (${firstFrame.millisecondsSinceClick.toFixed(0)} ms after the click)`,
    ).toBeGreaterThan(0);
    expect(
      secondFrame.runningAnimationCount,
      `CSS animations in frame 2 (${secondFrame.millisecondsSinceClick.toFixed(0)} ms after the click)`,
    ).toBeGreaterThan(0);
    expectSameBox(firstFrame.boardBox, boardBefore, "frame 1");
    expectSameBox(secondFrame.boardBox, boardBefore, "frame 2");
    await expect(page.locator("#announcer")).not.toHaveText("");
    const finalAnnouncement = await page.locator("#announcer").textContent();
    expect(secondFrame.liveRegionText, "live region in frame 2").toBe(
      finalAnnouncement,
    );
  });

  test("in the first frame after the winning move the status and focus on Play again are final, and the live region by the second, while motion still runs (F-015 R-008, criterion 2)", async ({
    page,
  }, testInfo) => {
    await playUpToWinningMove(page, testInfo);
    const boardBefore = await readBoardPageBox(page);
    await installFrameProbe(page);

    await activate(locateSquare(page, 3), testInfo);
    const [firstFrame, secondFrame] = await readFrameSamples(page);

    expect(firstFrame.statusText, "status in frame 1").toBe(
      LONGEST_RESULT_STATUS,
    );
    expect(firstFrame.focusedLabel, "focus in frame 1").toBe("Play again");
    expect(
      firstFrame.runningAnimationCount,
      `CSS animations in frame 1 (${firstFrame.millisecondsSinceClick.toFixed(0)} ms after the click)`,
    ).toBeGreaterThan(0);
    expect(
      secondFrame.runningAnimationCount,
      `CSS animations in frame 2 (${secondFrame.millisecondsSinceClick.toFixed(0)} ms after the click)`,
    ).toBeGreaterThan(0);
    expectSameBox(firstFrame.boardBox, boardBefore, "frame 1");
    expectSameBox(secondFrame.boardBox, boardBefore, "frame 2");
    await expect(page.locator("#announcer")).not.toHaveText("");
    const finalAnnouncement = await page.locator("#announcer").textContent();
    expect(secondFrame.liveRegionText, "live region in frame 2").toBe(
      finalAnnouncement,
    );
  });

  test("a win lifts the winning tiles and the line for 240 ms from 280 ms, deepening the tiles' edge during the lift and not before (F-015 R-013, criterion 3)", async ({
    page,
  }, testInfo) => {
    await playUpToWinningMove(page, testInfo);
    await activateAndFreezeMotion(page, locateSquare(page, 3), testInfo);

    const animations = await readRunningAnimations(page);
    expect(listSquareIndexes(animations, "square"), "lifting tiles").toEqual(
      DIAGONAL_WIN_SQUARES,
    );
    const liftAnimations = animations.filter(
      (animation) =>
        animation.kind === "square" || animation.kind === "win-line",
    );
    expect(
      liftAnimations.filter((animation) => animation.kind === "win-line"),
      "win-line lift animations",
    ).toHaveLength(1);
    for (const animation of liftAnimations) {
      expect(
        animation.durationMilliseconds,
        `${animation.kind} lift duration`,
      ).toBe(LIFT_DURATION_MILLISECONDS);
      expect(animation.delayMilliseconds, `${animation.kind} lift delay`).toBe(
        LIFT_DELAY_MILLISECONDS,
      );
    }
    const tileShadow = await resolveShadowToken(page, "--shadow-tile");
    const winShadow = await resolveShadowToken(page, "--shadow-tile-win");

    await seekAnimations(page, BEFORE_LIFT_MILLISECONDS);
    const beforeLift = await readLiftGeometry(page, DIAGONAL_WIN_SQUARES);
    await seekAnimations(page, MID_LIFT_MILLISECONDS);
    const midLift = await readLiftGeometry(page, DIAGONAL_WIN_SQUARES);
    await finishAllAnimations(page);
    const settled = await readLiftGeometry(page, DIAGONAL_WIN_SQUARES);

    DIAGONAL_WIN_SQUARES.forEach((index, position) => {
      const name = `square ${String(index)}`;
      const restingTop = beforeLift.squareTops[position] ?? Number.NaN;
      const midTop = midLift.squareTops[position] ?? Number.NaN;
      const settledTop = settled.squareTops[position] ?? Number.NaN;
      expectNear(
        restingTop - settledTop,
        LIFT_HEIGHT_PIXELS,
        PIXEL_TOLERANCE,
        `${name} lift from before the delay to settled`,
      );
      expect(midTop, `${name} top at the lift midpoint`).toBeLessThan(
        restingTop - PIXEL_TOLERANCE,
      );
      expect(midTop, `${name} top at the lift midpoint`).toBeGreaterThan(
        settledTop + PIXEL_TOLERANCE / 5,
      );
      expect(
        beforeLift.squareShadows[position],
        `${name} edge before the lift`,
      ).toBe(tileShadow);
      expect(midLift.squareShadows[position], `${name} edge mid-lift`).not.toBe(
        tileShadow,
      );
      expect(midLift.squareShadows[position], `${name} edge mid-lift`).not.toBe(
        winShadow,
      );
      expect(settled.squareShadows[position], `${name} edge settled`).toBe(
        winShadow,
      );
    });
    expectNear(
      beforeLift.winLineTop - settled.winLineTop,
      LIFT_HEIGHT_PIXELS,
      PIXEL_TOLERANCE,
      "win line lift from before the delay to settled",
    );
  });

  test("every animation of the winning move is timed to settle by 520 ms, and none remain once they finish (F-015 R-013, criterion 3)", async ({
    page,
  }, testInfo) => {
    await playUpToWinningMove(page, testInfo);
    // Measured by each animation's own timing (delay + duration), read in the
    // first frame after the click: a slower design fails, but a loaded machine
    // that starts the animations a few frames late does not (Codex F-015 C1;
    // QA: the earlier wall-clock deadline flaked on Firefox, CR-12).
    await page.evaluate(() => {
      const probeWindow = window as unknown as MotionProbeWindow;
      probeWindow.animationEndTimes = new Promise<number[]>((resolve) => {
        document.addEventListener(
          "click",
          () => {
            requestAnimationFrame(() => {
              resolve(
                document
                  .getAnimations()
                  .map((animation) =>
                    Number(animation.effect?.getComputedTiming().endTime),
                  ),
              );
            });
          },
          { capture: true, once: true },
        );
      });
    });

    await activate(locateSquare(page, 3), testInfo);
    const endTimes = await page.evaluate(
      () => (window as unknown as MotionProbeWindow).animationEndTimes,
    );
    expect(
      endTimes?.length ?? 0,
      "CSS animations in the first frame after the winning move",
    ).toBeGreaterThan(0);
    for (const endTime of endTimes ?? []) {
      expect(
        endTime,
        "an animation's delay plus duration, in milliseconds",
      ).toBeLessThanOrEqual(SETTLED_BY_MILLISECONDS);
    }

    await waitForAnimationsToFinish(page);
    expect(
      await countAllAnimations(page),
      "animations once every one has finished",
    ).toBe(0);
  });

  test("switching to reduced motion mid-lift cancels every animation at once and leaves the final appearance (F-015 R-013, criterion 8)", async ({
    page,
  }, testInfo) => {
    await playUpToWinningMove(page, testInfo);
    await activateAndFreezeMotion(page, locateSquare(page, 3), testInfo);
    expect(
      listSquareIndexes(await readRunningAnimations(page), "square"),
      "lifting tiles before the switch",
    ).toEqual(DIAGONAL_WIN_SQUARES);
    await seekAnimations(page, BEFORE_LIFT_MILLISECONDS);

    await page.emulateMedia({ reducedMotion: "reduce" });

    expect(
      await countAllAnimations(page),
      "animations after switching to reduce",
    ).toBe(0);
    const winShadow = await resolveShadowToken(page, "--shadow-tile-win");
    for (const index of DIAGONAL_WIN_SQUARES) {
      const style = await readMotionStyle(locateSquare(page, index));
      expect(style.top, `square ${String(index)} top`).toBe(
        `${String(-LIFT_HEIGHT_PIXELS)}px`,
      );
      expect(style.boxShadow, `square ${String(index)} edge`).toBe(winShadow);
    }
    for (const index of [3, 6]) {
      expect(
        await readPieceTransform(page, index),
        `square ${String(index)} piece transform`,
      ).toEqual({ translateY: 0, scaleX: 1, scaleY: 1 });
    }
  });
});

test.describe("press and hover with no motion preference (F-015 criterion 5)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(isTouchProject(testInfo), TOUCH_SKIP_REASON);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
  });

  test("an active empty square rises 1 px on hover and moves down 4 px with the pressed edge when pressed, over an 80 ms transition (F-015 R-013)", async ({
    page,
  }, testInfo) => {
    await chooseFirstMover(page, testInfo, "You go first");
    const square = locateSquare(page, 4);
    const pressedEdge = await resolveShadowToken(page, "--shadow-tile-pressed");

    await square.hover();
    await waitForAnimationsToFinish(page);
    const hovered = await readMotionStyle(square);
    expectNear(
      parseTransform(hovered.transform).translateY,
      HOVER_TRANSLATE_Y_PIXELS,
      PIXEL_TOLERANCE / 5,
      "hovered square translateY",
    );
    expect(
      readTransitionMilliseconds(hovered, "transform"),
      "transform transition on an active empty square",
    ).toBe(PRESS_DURATION_MILLISECONDS);

    await page.mouse.down();
    await waitForAnimationsToFinish(page);
    const pressed = await readMotionStyle(square);
    await page.mouse.up();

    expectNear(
      parseTransform(pressed.transform).translateY,
      PRESS_DEPTH_PIXELS,
      PIXEL_TOLERANCE / 5,
      "pressed square translateY",
    );
    expect(pressed.boxShadow, "pressed square edge").toBe(pressedEdge);
  });

  test("a choice button moves down 4 px with the pressed edge when pressed, over an 80 ms transition (F-015 R-013)", async ({
    page,
  }) => {
    const button = page.getByRole("button", { name: "You go first" });
    const pressedEdge = await resolveShadowToken(
      page,
      "--shadow-button-pressed",
    );

    await button.hover();
    await waitForAnimationsToFinish(page);
    expect(
      readTransitionMilliseconds(await readMotionStyle(button), "transform"),
      "transform transition on a button",
    ).toBe(PRESS_DURATION_MILLISECONDS);
    await page.mouse.down();
    await waitForAnimationsToFinish(page);
    const pressed = await readMotionStyle(button);
    await page.mouse.move(0, 0);
    await page.mouse.up();

    expectNear(
      parseTransform(pressed.transform).translateY,
      PRESS_DEPTH_PIXELS,
      PIXEL_TOLERANCE / 5,
      "pressed button translateY",
    );
    expect(pressed.boxShadow, "pressed button edge").toBe(pressedEdge);
  });

  test("disabled and occupied squares ignore hover and press and have no transition (F-015 R-013, Codex F-015 C2)", async ({
    page,
  }, testInfo) => {
    const disabledSquare = locateSquare(page, 4);
    await disabledSquare.hover({ force: true });
    await waitForAnimationsToFinish(page);
    const disabledHovered = await readMotionStyle(disabledSquare);
    expect(disabledHovered.transform, "disabled square on hover").toBe("none");
    expect(
      readLongestTransitionMilliseconds(disabledHovered),
      "disabled square transition",
    ).toBe(0);

    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, [{ humanSquare: 0, computerReply: 4 }]);
    await waitForAnimationsToFinish(page);
    const occupiedSquare = locateSquare(page, 4);
    await occupiedSquare.hover({ force: true });
    await waitForAnimationsToFinish(page);
    const occupiedHovered = await readMotionStyle(occupiedSquare);
    await page.mouse.down();
    await waitForAnimationsToFinish(page);
    const occupiedPressed = await readMotionStyle(occupiedSquare);
    await page.mouse.up();

    expect(occupiedHovered.transform, "occupied square on hover").toBe("none");
    expect(occupiedPressed.transform, "occupied square when pressed").toBe(
      "none",
    );
    expect(
      readLongestTransitionMilliseconds(occupiedHovered),
      "occupied square transition",
    ).toBe(0);
  });

  test("a hovered empty square that the computer's winning O fills drops its hover at once and its O paints above the bar (F-015 R-013, Codex F-015 C2)", async ({
    page,
  }, testInfo) => {
    await playUpToWinningMove(page, testInfo);
    const hoveredSquare = locateSquare(page, 6);
    await hoveredSquare.hover();
    await waitForAnimationsToFinish(page);
    expectNear(
      parseTransform((await readMotionStyle(hoveredSquare)).transform)
        .translateY,
      HOVER_TRANSLATE_Y_PIXELS,
      PIXEL_TOLERANCE / 5,
      "square 6 translateY while hovered",
    );

    // Freeze in the first frame after the keypress, so the transient state
    // the regression targets is what gets measured (Codex F-015 C2).
    await page.evaluate(() => {
      const probeWindow = window as unknown as MotionProbeWindow;
      probeWindow.keyboardFreeze = new Promise((resolve) => {
        document.addEventListener(
          "keydown",
          () => {
            requestAnimationFrame(() => {
              for (const animation of document.getAnimations()) {
                animation.pause();
              }
              const square = document.querySelectorAll(".square")[6];
              const style = square ? getComputedStyle(square) : null;
              resolve({
                transform: style?.transform ?? "missing",
                transitionDuration: style?.transitionDuration ?? "missing",
              });
            });
          },
          { capture: true, once: true },
        );
      });
    });
    await locateSquare(page, 3).focus();
    await page.keyboard.press("Enter");
    const firstFrame = await page.evaluate(
      () => (window as unknown as MotionProbeWindow).keyboardFreeze,
    );
    await expect(locateStatus(page)).toHaveText(LONGEST_RESULT_STATUS);
    expect(
      firstFrame?.transform,
      "square 6 transform in the first frame after the win",
    ).toBe("none");
    expect(
      firstFrame?.transitionDuration
        .split(",")
        .every((duration) => Number.parseFloat(duration) === 0),
      "square 6 has no transition once occupied",
    ).toBe(true);

    // Still frozen, seek to just before the drop ends: the O has landed and
    // the lift has not started, so the layering is sampled without
    // Playwright fast-forwarding anything.
    await page.evaluate((landedMilliseconds) => {
      for (const animation of document.getAnimations()) {
        animation.currentTime = landedMilliseconds;
      }
    }, DROP_LANDED_MILLISECONDS);
    const centreOfO = await readSquareCentre(page, 6);
    const centreColor = await readScreenColor(page, centreOfO, "allow");
    expectColorNear(
      centreColor,
      WIN_SURFACE,
      "the centre of the O in square 6",
    );
    expect(
      Math.abs(centreColor.red - WIN_MARKER.red) +
        Math.abs(centreColor.green - WIN_MARKER.green) +
        Math.abs(centreColor.blue - WIN_MARKER.blue),
      "the centre of the O in square 6 is not the bar colour",
    ).toBeGreaterThan(12);
  });
});

test.describe("reduced motion (F-015 criterion 4)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
  });

  test("no animation or transition runs after choosing, after each move or after a win, and winning tiles are shown lifted at once (F-015 R-013)", async ({
    page,
  }, testInfo) => {
    await activateAndFreezeMotion(
      page,
      page.getByRole("button", { name: "You go first" }),
      testInfo,
    );
    expect(await countAllAnimations(page), "animations after choosing").toBe(0);

    for (const movePair of DIAGONAL_WIN_MOVES) {
      await activateAndFreezeMotion(
        page,
        locateSquare(page, movePair.humanSquare),
        testInfo,
      );
      expect(
        await countAllAnimations(page),
        `animations after X on square ${String(movePair.humanSquare)}`,
      ).toBe(0);
    }

    await expect(locateStatus(page)).toHaveText(LONGEST_RESULT_STATUS);
    for (const index of DIAGONAL_WIN_SQUARES) {
      expect(
        (await readMotionStyle(locateSquare(page, index))).top,
        `square ${String(index)} top`,
      ).toBe(`${String(-LIFT_HEIGHT_PIXELS)}px`);
      expect(
        await readPieceTransform(page, index),
        `square ${String(index)} piece transform`,
      ).toEqual({ translateY: 0, scaleX: 1, scaleY: 1 });
    }
  });

  test("squares and buttons never move on hover or press; a press only shortens the edge (F-015 R-013)", async ({
    page,
  }, testInfo) => {
    test.skip(isTouchProject(testInfo), TOUCH_SKIP_REASON);
    const button = page.getByRole("button", { name: "You go first" });
    await button.hover();
    await page.mouse.down();
    const pressedButton = await readMotionStyle(button);
    await page.mouse.up();
    expect(pressedButton.transform, "pressed button transform").toBe("none");
    expect(pressedButton.boxShadow, "pressed button edge").toBe(
      await resolveShadowToken(page, "--shadow-button-pressed"),
    );
    expect(
      readLongestTransitionMilliseconds(pressedButton),
      "button transition",
    ).toBe(0);

    await expect(locateStatus(page)).toHaveText("Your turn. You are X.");
    const square = locateSquare(page, 4);
    await square.hover();
    const hoveredSquare = await readMotionStyle(square);
    await page.mouse.down();
    const pressedSquare = await readMotionStyle(square);
    await page.mouse.move(0, 0);
    await page.mouse.up();

    expect(hoveredSquare.transform, "hovered square transform").toBe("none");
    expect(pressedSquare.transform, "pressed square transform").toBe("none");
    expect(pressedSquare.boxShadow, "pressed square edge").toBe(
      await resolveShadowToken(page, "--shadow-tile-pressed"),
    );
    expect(
      readLongestTransitionMilliseconds(hoveredSquare),
      "square transition",
    ).toBe(0);
    expect(await countAllAnimations(page), "animations").toBe(0);
  });
});

test.describe("board stability during motion (F-015 R-010, criterion 7)", () => {
  for (const viewport of BOARD_VIEWPORTS) {
    const viewportName = `${String(viewport.width)}x${String(viewport.height)}`;

    test(`at ${viewportName} the board box is identical while choosing, mid-drop, settled, mid-lift and after a win (F-015 R-010)`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("/");
      await expect(locateStatus(page)).toHaveText("Who goes first?");
      const choosingBox = await readBoardPageBox(page);

      await chooseFirstMover(page, testInfo, "You go first");
      await activateAndFreezeMotion(page, locateSquare(page, 0), testInfo);
      expect(
        listSquareIndexes(await readRunningAnimations(page), "piece"),
        "dropping pieces",
      ).toEqual([0, 4]);
      await seekAnimations(page, MID_DROP_MILLISECONDS);
      expectSameBox(await readBoardPageBox(page), choosingBox, "mid-drop");
      await finishAllAnimations(page);
      expectSameBox(
        await readBoardPageBox(page),
        choosingBox,
        "after the drop",
      );

      await playMoves(page, testInfo, DIAGONAL_WIN_MOVES.slice(1, 2));
      await waitForAnimationsToFinish(page);
      await activateAndFreezeMotion(page, locateSquare(page, 3), testInfo);
      expect(
        listSquareIndexes(await readRunningAnimations(page), "square"),
        "lifting tiles",
      ).toEqual(DIAGONAL_WIN_SQUARES);
      await seekAnimations(page, MID_LIFT_MILLISECONDS);
      expectSameBox(await readBoardPageBox(page), choosingBox, "mid-lift");
      await finishAllAnimations(page);
      expectSameBox(await readBoardPageBox(page), choosingBox, "after the win");
    });
  }
});

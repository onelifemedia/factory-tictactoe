// F-007, F-005 (R-005): which way a winning line runs. One classifier for both
// the strike line (view) and its wording (messages), so they cannot drift
// apart (QA code review).
import type { Line } from "../game/board";

export type LineDirection = "row" | "column" | "diagonal-down" | "diagonal-up";

/** The direction of a winning line, classified by its squares. */
export function classifyLine(line: Line): LineDirection {
  const [first, second] = line;
  if (first === 0 && second === 4) {
    return "diagonal-down";
  }
  if (first === 2 && second === 4) {
    return "diagonal-up";
  }
  return second - first === 1 ? "row" : "column";
}

/**
 * F-014 R-005: the win-line overlay path ("M x1 y1 L x2 y2") in the 300×300
 * overlay's coordinates. Stub for the TDD red step; not implemented yet.
 */
export function describeWinLinePath(line: Line): string {
  throw new Error(
    `describeWinLinePath is not implemented yet (F-014): ${line.join(",")}`,
  );
}

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

// F-007, F-005, F-014 (R-005): which way a winning line runs, and where its
// win-line overlay is drawn. One classifier for both the view and the wording
// (messages), so they cannot drift apart (QA code review).
import { COLUMN_COUNT, type Line } from "../game/board";

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

// F-014 R-005: the overlay is a 300×300 box whose inset puts the tile centres
// at 50, 150 and 250 (design-system §5 Win line). The bar runs from the first
// winning centre to the third, extended by WIN_LINE_OVERHANG_UNITS at each end.
const TILE_CENTRE_POSITIONS_UNITS = [50, 150, 250] as const;
const WIN_LINE_OVERHANG_UNITS = 18;
const CENTRE_DISTANCE_UNITS =
  TILE_CENTRE_POSITIONS_UNITS[2] - TILE_CENTRE_POSITIONS_UNITS[0];

function findTileCentre(index: number): [number, number] {
  const centreX = TILE_CENTRE_POSITIONS_UNITS[index % COLUMN_COUNT];
  const centreY = TILE_CENTRE_POSITIONS_UNITS[Math.floor(index / COLUMN_COUNT)];
  if (centreX === undefined || centreY === undefined) {
    throw new RangeError(`Square ${String(index)} is not on the board`);
  }
  return [centreX, centreY];
}

/** The win-line overlay path ("M x1 y1 L x2 y2") in the overlay's coordinates. */
export function describeWinLinePath(line: Line): string {
  const [startX, startY] = findTileCentre(line[0]);
  const [endX, endY] = findTileCentre(line[2]);
  const overhangX =
    ((endX - startX) / CENTRE_DISTANCE_UNITS) * WIN_LINE_OVERHANG_UNITS;
  const overhangY =
    ((endY - startY) / CENTRE_DISTANCE_UNITS) * WIN_LINE_OVERHANG_UNITS;
  return `M${startX - overhangX} ${startY - overhangY} L${endX + overhangX} ${endY + overhangY}`;
}

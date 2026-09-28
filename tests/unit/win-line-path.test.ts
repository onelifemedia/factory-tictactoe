// F-014 R-005: every winning line maps to one win-line overlay path in the
// 300×300 overlay (design-system.md §5 Win line): through the tile centres at
// 50, 150 and 250, extended 18 units past the first and third centres.
import { describe, expect, it } from "vitest";
import { LINES, type Line } from "../../src/game/board";
import { describeWinLinePath } from "../../src/ui/line-direction";

interface OverlayPoint {
  x: number;
  y: number;
}

const TILE_CENTRES = [50, 150, 250] as const;
const EXTENSION_UNITS = 18;
const COLUMN_COUNT = 3;

const EXPECTED_PATHS_BY_LINE: readonly (readonly [Line, string])[] = [
  [[0, 1, 2], "M32 50 L268 50"],
  [[3, 4, 5], "M32 150 L268 150"],
  [[6, 7, 8], "M32 250 L268 250"],
  [[0, 3, 6], "M50 32 L50 268"],
  [[1, 4, 7], "M150 32 L150 268"],
  [[2, 5, 8], "M250 32 L250 268"],
  [[0, 4, 8], "M32 32 L268 268"],
  [[2, 4, 6], "M268 32 L32 268"],
];

function locateTileCentre(index: number): OverlayPoint {
  const centreX = TILE_CENTRES[index % COLUMN_COUNT];
  const centreY = TILE_CENTRES[Math.floor(index / COLUMN_COUNT)];
  if (centreX === undefined || centreY === undefined) {
    throw new Error(`square ${String(index)} is not on the board`);
  }
  return { x: centreX, y: centreY };
}

function parsePathEndpoints(path: string): [OverlayPoint, OverlayPoint] {
  const match = /^M(-?\d+) (-?\d+) L(-?\d+) (-?\d+)$/.exec(path);
  if (match === null) {
    throw new Error(`"${path}" is not of the form "Mx1 y1 Lx2 y2"`);
  }
  const [, startX, startY, endX, endY] = match.map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  return [
    { x: startX, y: startY },
    { x: endX, y: endY },
  ];
}

describe("describeWinLinePath (F-014 R-005)", () => {
  it("covers each of the 8 winning lines exactly once (F-014 R-005)", () => {
    expect(EXPECTED_PATHS_BY_LINE.map(([line]) => line)).toEqual(
      LINES.map((line) => [...line]),
    );
  });

  for (const [line, expectedPath] of EXPECTED_PATHS_BY_LINE) {
    it(`maps line ${line.join(", ")} to "${expectedPath}" (F-014 R-005)`, () => {
      expect(describeWinLinePath(line)).toBe(expectedPath);
    });
  }

  for (const line of LINES) {
    it(`draws line ${line.join(", ")} from 18 units before the first tile centre to 18 units past the third, through the middle one (F-014 R-005)`, () => {
      const [start, end] = parsePathEndpoints(describeWinLinePath(line));
      const [firstCentre, middleCentre, thirdCentre] = line.map(
        locateTileCentre,
      ) as [OverlayPoint, OverlayPoint, OverlayPoint];
      const stepX = Math.sign(thirdCentre.x - firstCentre.x);
      const stepY = Math.sign(thirdCentre.y - firstCentre.y);

      expect(start).toEqual({
        x: firstCentre.x - stepX * EXTENSION_UNITS,
        y: firstCentre.y - stepY * EXTENSION_UNITS,
      });
      expect(end).toEqual({
        x: thirdCentre.x + stepX * EXTENSION_UNITS,
        y: thirdCentre.y + stepY * EXTENSION_UNITS,
      });
      expect({ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }).toEqual(
        middleCentre,
      );
    });
  }
});

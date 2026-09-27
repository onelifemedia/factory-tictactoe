// F-007 R-005: every winning line maps to its strike direction (Codex F-007
// review, missing coverage of column and diagonal-down).
import { describe, expect, it } from "vitest";
import { LINES } from "../../src/game/board";
import { classifyLine } from "../../src/ui/view";

const EXPECTED_DIRECTIONS = [
  "row",
  "row",
  "row",
  "column",
  "column",
  "column",
  "diagonal-down",
  "diagonal-up",
];

describe("classifyLine (F-007 R-005)", () => {
  it("classifies all eight winning lines", () => {
    expect(LINES.map((line) => classifyLine(line))).toEqual(
      EXPECTED_DIRECTIONS,
    );
  });
});

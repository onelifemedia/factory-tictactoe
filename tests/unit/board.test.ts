// F-002 R-001 R-004: the board model places marks immutably, lists the 8
// winning lines, and detects a win (with its line), a draw, or no result yet.
import { describe, it, expect } from "vitest";
import type {
  Mark,
  Cell,
  Board,
  Line,
  BoardResult,
} from "../../src/game/board";
import {
  LINES,
  createEmptyBoard,
  findWinner,
  isFull,
  evaluateResult,
  emptySquares,
  placeMark,
} from "../../src/game/board";

// A board layout is 9 characters in reading order: "X", "O", or "." for empty.
function parseBoard(layout: string): Board {
  expect(layout).toHaveLength(9);
  return [...layout].map((character): Cell => {
    if (character === "X" || character === "O") {
      return character;
    }
    if (character === ".") {
      return null;
    }
    throw new Error(`Unexpected character "${character}" in board layout`);
  });
}

function swapMarks(layout: string): string {
  return [...layout]
    .map((character) => {
      if (character === "X") {
        return "O";
      }
      if (character === "O") {
        return "X";
      }
      return character;
    })
    .join("");
}

const expectedLines: readonly Line[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// Each layout fills one line with X; the other squares are mixed and form no other line.
const xWinLayouts: readonly { line: Line; layout: string; name: string }[] = [
  { name: "top row", line: [0, 1, 2], layout: "XXXOO...." },
  { name: "middle row", line: [3, 4, 5], layout: "OO.XXX..." },
  { name: "bottom row", line: [6, 7, 8], layout: "OO....XXX" },
  { name: "left column", line: [0, 3, 6], layout: "XO.XO.X.." },
  { name: "middle column", line: [1, 4, 7], layout: "OX.OX..X." },
  { name: "right column", line: [2, 5, 8], layout: ".OX.OX..X" },
  { name: "falling diagonal", line: [0, 4, 8], layout: "XO.OX...X" },
  { name: "rising diagonal", line: [2, 4, 6], layout: "O.XOX.X.." },
];

const winCases: readonly {
  winner: Mark;
  line: Line;
  layout: string;
  name: string;
}[] = [
  ...xWinLayouts.map((winCase) => ({ ...winCase, winner: "X" as const })),
  ...xWinLayouts.map((winCase) => ({
    ...winCase,
    winner: "O" as const,
    layout: swapMarks(winCase.layout),
  })),
];

const drawLayout = "XOXXOOOXX";
const partialLayout = "XO..X.O..";

describe("LINES (F-002 R-004)", () => {
  it("lists exactly 8 lines: 3 rows, 3 columns, then 2 diagonals, as row-major indexes", () => {
    expect(LINES).toHaveLength(8);
    expect(LINES).toEqual(expectedLines);
  });
});

describe("createEmptyBoard (F-002 R-001)", () => {
  it("returns a board of 9 empty cells", () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(9);
    expect(board).toEqual(Array.from({ length: 9 }, () => null));
  });
});

describe("win detection (F-002 R-004)", () => {
  it("covers 16 win cases: each of the 8 lines for X and for O", () => {
    expect(winCases).toHaveLength(16);
  });

  for (const winCase of winCases) {
    it(`finds ${winCase.winner} as the winner on the ${winCase.name} (${winCase.layout})`, () => {
      const board = parseBoard(winCase.layout);
      expect(findWinner(board)).toEqual({
        winner: winCase.winner,
        line: winCase.line,
      });
    });

    it(`evaluates a ${winCase.name} of ${winCase.winner} as a win with that line (${winCase.layout})`, () => {
      const board = parseBoard(winCase.layout);
      const expectedResult: BoardResult = {
        kind: "win",
        winner: winCase.winner,
        line: winCase.line,
      };
      expect(evaluateResult(board)).toEqual(expectedResult);
    });
  }
});

describe("draw and no result (F-002 R-004)", () => {
  it("evaluates a full board with no three in a row as a draw", () => {
    const board = parseBoard(drawLayout);
    const expectedResult: BoardResult = { kind: "draw" };
    expect(evaluateResult(board)).toEqual(expectedResult);
    expect(isFull(board)).toBe(true);
    expect(findWinner(board)).toBeNull();
  });

  it("gives no result for a partly filled board with no three in a row", () => {
    const board = parseBoard(partialLayout);
    expect(evaluateResult(board)).toBeNull();
    expect(isFull(board)).toBe(false);
    expect(findWinner(board)).toBeNull();
  });
});

describe("placeMark (F-002 R-001)", () => {
  it("returns a new board with only the chosen empty square changed, leaving the input untouched", () => {
    const board = parseBoard(partialLayout);
    const boardBefore = [...board];

    const placedBoard = placeMark(board, 2, "O");

    expect(placedBoard).not.toBe(board);
    expect(board).toEqual(boardBefore);
    expect(placedBoard).toEqual(parseBoard("XOO.X.O.."));
    for (const [index, cell] of placedBoard.entries()) {
      if (index === 2) {
        expect(cell).toBe("O");
      } else {
        expect(cell).toBe(board[index]);
      }
    }
  });

  it("throws a RangeError naming the square when it is already occupied, leaving the input untouched", () => {
    const board = parseBoard(partialLayout);
    const boardBefore = [...board];

    expect(() => placeMark(board, 4, "O")).toThrow(RangeError);
    expect(() => placeMark(board, 4, "O")).toThrow(/\b4\b/);
    expect(board).toEqual(boardBefore);
  });

  for (const invalidIndex of [-1, 9, 1.5, Number.NaN]) {
    it(`throws a RangeError for the invalid index ${invalidIndex}, leaving the input untouched`, () => {
      const board = createEmptyBoard();
      const boardBefore = [...board];

      expect(() => placeMark(board, invalidIndex, "X")).toThrow(RangeError);
      expect(board).toEqual(boardBefore);
    });
  }
});

describe("emptySquares (F-002 R-001)", () => {
  it("returns all 9 indexes in reading order for the empty board", () => {
    expect(emptySquares(createEmptyBoard())).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("returns the empty indexes of a partly filled board in ascending order", () => {
    expect(emptySquares(parseBoard(partialLayout))).toEqual([2, 3, 5, 7, 8]);
  });

  it("returns no indexes for a full board", () => {
    expect(emptySquares(parseBoard(drawLayout))).toEqual([]);
  });
});

describe("F-002 review follow-ups (R-004)", () => {
  it("reports a win, not a draw, when the winning move fills the board", () => {
    const board = parseBoard("XXXOOXXOO");
    expect(isFull(board)).toBe(true);
    expect(evaluateResult(board)).toEqual({
      kind: "win",
      winner: "X",
      line: [0, 1, 2],
    });
  });

  it("freezes every winning line, not only the list", () => {
    expect(Object.isFrozen(LINES)).toBe(true);
    for (const line of LINES) {
      expect(Object.isFrozen(line)).toBe(true);
    }
  });
});

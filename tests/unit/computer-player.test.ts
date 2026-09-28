// F-003 R-003: the computer player takes a win when one is available, is
// deterministic with lowest-index tie-breaks, and refuses finished boards.
import { describe, it, expect } from "vitest";
import type { Board } from "../../src/game/board";
import {
  createEmptyBoard,
  listEmptySquares,
  findWinner,
  placeMark,
} from "../../src/game/board";
import { chooseComputerMove } from "../../src/game/computer-player";
import {
  COMPUTER_MARK,
  enumerateGames,
  formatBoard,
  parseBoard,
} from "./game-enumeration";

function collectComputerPositions(): Board[] {
  const humanFirst = enumerateGames("human", chooseComputerMove);
  const computerFirst = enumerateGames("computer", chooseComputerMove);
  return [...humanFirst.computerPositions, ...computerFirst.computerPositions];
}

function isWinningMoveForComputer(board: Board, square: number): boolean {
  return (
    findWinner(placeMark(board, square, COMPUTER_MARK))?.winner ===
    COMPUTER_MARK
  );
}

describe("chooseComputerMove takes the win (F-003 R-003)", () => {
  it("completes a line in every reachable position where O can complete one", () => {
    const winnablePositions = collectComputerPositions().filter((board) =>
      listEmptySquares(board).some((square) =>
        isWinningMoveForComputer(board, square),
      ),
    );
    expect(winnablePositions.length).toBeGreaterThan(0);

    const missedWinLayouts = winnablePositions
      .filter(
        (board) => !isWinningMoveForComputer(board, chooseComputerMove(board)),
      )
      .map((board) => formatBoard(board));
    expect(missedWinLayouts).toEqual([]);
  });
});

describe("chooseComputerMove is deterministic (F-003 R-003)", () => {
  it("returns the same empty square twice for every reachable O-to-move position", () => {
    const computerPositions = collectComputerPositions();
    expect(computerPositions.length).toBeGreaterThan(0);

    for (const board of computerPositions) {
      const firstChoice = chooseComputerMove(board);
      const secondChoice = chooseComputerMove(board);
      expect(secondChoice, formatBoard(board)).toBe(firstChoice);
      expect(listEmptySquares(board), formatBoard(board)).toContain(
        firstChoice,
      );
    }
  });

  it("opens at index 0 on an empty board", () => {
    expect(chooseComputerMove(createEmptyBoard())).toBe(0);
  });

  it("replies to X at the centre with the lowest-index corner, 0", () => {
    expect(chooseComputerMove(parseBoard("....X...."))).toBe(0);
  });

  it("replies to X at 0 and 8 with O at 4 by taking the edge at 1", () => {
    expect(chooseComputerMove(parseBoard("X...O...X"))).toBe(1);
  });
});

describe("chooseComputerMove with no legal move (F-003 R-003)", () => {
  it("throws a RangeError on a full, drawn board", () => {
    expect(() => chooseComputerMove(parseBoard("XOXXOOOXX"))).toThrow(
      RangeError,
    );
  });

  it("throws a RangeError on a board X has already won", () => {
    expect(() => chooseComputerMove(parseBoard("XXXOO...."))).toThrow(
      RangeError,
    );
  });

  it("throws a RangeError on a board O has already won", () => {
    expect(() => chooseComputerMove(parseBoard("OOOXX.X.."))).toThrow(
      RangeError,
    );
  });
});

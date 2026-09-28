// F-015 R-013: findNewlyPlacedSquares tells the view which squares the last
// action filled, so only those pieces carry `is-new` and drop: your X and the
// computer's reply together, the computer's opening O alone, nothing for a
// taken-square attempt (unchanged board) and nothing after Play again.
import { describe, expect, it } from "vitest";
import { createEmptyBoard, type Board, type Cell } from "../../src/game/board";
import { findNewlyPlacedSquares } from "../../src/ui/new-pieces";

/** A board with the given pieces on the given squares and the rest empty. */
function createBoardWith(
  piecesBySquare: Readonly<Record<number, Cell>>,
): Board {
  return createEmptyBoard().map((cell, index) => piecesBySquare[index] ?? cell);
}

describe("findNewlyPlacedSquares (F-015 R-013)", () => {
  it("returns both your X and the computer's reply after a move", () => {
    const previousBoard = createBoardWith({ 0: "X", 4: "O" });
    const nextBoard = createBoardWith({ 0: "X", 4: "O", 1: "X", 2: "O" });

    expect(findNewlyPlacedSquares(previousBoard, nextBoard)).toEqual([1, 2]);
  });

  it("returns both pieces of the first move from an empty board", () => {
    expect(
      findNewlyPlacedSquares(
        createEmptyBoard(),
        createBoardWith({ 0: "X", 4: "O" }),
      ),
    ).toEqual([0, 4]);
  });

  it("returns only the square of the computer's opening O", () => {
    expect(
      findNewlyPlacedSquares(createEmptyBoard(), createBoardWith({ 4: "O" })),
    ).toEqual([4]);
  });

  it("returns no squares for an unchanged board (a taken-square attempt)", () => {
    const board = createBoardWith({ 0: "X", 4: "O" });

    expect(findNewlyPlacedSquares(board, board)).toEqual([]);
    expect(
      findNewlyPlacedSquares(board, createBoardWith({ 0: "X", 4: "O" })),
    ).toEqual([]);
  });

  it("returns no squares when the next board is empty (Play again)", () => {
    const finishedBoard = createBoardWith({
      0: "X",
      1: "X",
      3: "X",
      2: "O",
      4: "O",
      6: "O",
    });

    expect(findNewlyPlacedSquares(finishedBoard, createEmptyBoard())).toEqual(
      [],
    );
  });
});

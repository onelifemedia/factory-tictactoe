// F-008 R-007 R-006: pure focus decisions for keyboard play. Arrow keys move
// one square on the 3x3 grid and stay at the edge; every game step names where
// focus goes next (focus map: .factory/design/screens.md). Steps come from the
// real game (src/game/game.ts) and its real computer player (ADR-010).
import { describe, it, expect } from "vitest";
import type { Board } from "../../src/game/board";
import { listEmptySquares } from "../../src/game/board";
import type { GameStep, Opponent } from "../../src/game/game";
import { playHumanMove, resetToChoosing, startGame } from "../../src/game/game";
import type { FocusTarget } from "../../src/ui/focus";
import { chooseFocusTarget, nextSquareIndex } from "../../src/ui/focus";

type ArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

// Expected square after each arrow, for every square in reading order:
//   0 1 2
//   3 4 5
//   6 7 8
const NEXT_SQUARES_BY_ARROW: Record<ArrowKey, readonly number[]> = {
  ArrowUp: [0, 1, 2, 0, 1, 2, 3, 4, 5],
  ArrowDown: [3, 4, 5, 6, 7, 8, 6, 7, 8],
  ArrowLeft: [0, 0, 1, 3, 3, 4, 6, 6, 7],
  ArrowRight: [1, 2, 2, 4, 5, 5, 7, 8, 8],
};

const ARROW_KEYS: readonly ArrowKey[] = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
];

const NON_ARROW_KEYS: readonly string[] = [
  "Enter",
  " ",
  "Tab",
  "Home",
  "End",
  "Escape",
  "a",
  "Up",
  "",
];

// Human first, real opponent: X0 O4, X1 O2, X3 O6 -> the computer wins.
const COMPUTER_WIN_MOVES: readonly number[] = [0, 1, 3];

// Human first, real opponent: X's ninth mark fills the board (A5).
const HUMAN_FIRST_DRAW_MOVES: readonly number[] = [0, 1, 6, 5, 8];

// Computer first, real opponent: O's fifth mark fills the board (A7).
const COMPUTER_FIRST_DRAW_MOVES: readonly number[] = [4, 2, 3, 7];

// Human first against the lowest-empty-index opponent: X wins the middle row.
const HUMAN_WIN_MOVES: readonly number[] = [3, 4, 5];

/** A deliberately weak opponent: always the lowest empty square. */
function chooseLowestEmptySquare(board: Board): number {
  const [lowestSquare] = listEmptySquares(board);
  if (lowestSquare === undefined) {
    throw new RangeError("The board is full; there is no square to choose");
  }
  return lowestSquare;
}

/** Plays each human move in turn from `initialStep`; returns the last step. */
function playHumanMoves(
  initialStep: GameStep,
  humanMoves: readonly number[],
  opponent?: Opponent,
): GameStep {
  let step = initialStep;
  for (const humanMove of humanMoves) {
    step = playHumanMove(step.state, humanMove, opponent);
  }
  return step;
}

describe("nextSquareIndex (F-008 R-007)", () => {
  for (const arrowKey of ARROW_KEYS) {
    const expectedSquares = NEXT_SQUARES_BY_ARROW[arrowKey];
    expectedSquares.forEach((expectedSquare, index) => {
      it(`${arrowKey} from square ${String(index)} moves to square ${String(expectedSquare)} (F-008 R-007)`, () => {
        expect(nextSquareIndex(index, arrowKey)).toBe(expectedSquare);
      });
    });
  }

  it("keeps every edge square in place when the arrow points off the board (F-008 R-007)", () => {
    for (const index of [0, 1, 2]) {
      expect(nextSquareIndex(index, "ArrowUp")).toBe(index);
    }
    for (const index of [6, 7, 8]) {
      expect(nextSquareIndex(index, "ArrowDown")).toBe(index);
    }
    for (const index of [0, 3, 6]) {
      expect(nextSquareIndex(index, "ArrowLeft")).toBe(index);
    }
    for (const index of [2, 5, 8]) {
      expect(nextSquareIndex(index, "ArrowRight")).toBe(index);
    }
  });

  for (const nonArrowKey of NON_ARROW_KEYS) {
    it(`returns null for the non-arrow key ${JSON.stringify(nonArrowKey)} (F-008 R-007)`, () => {
      expect(nextSquareIndex(4, nonArrowKey)).toBeNull();
    });
  }
});

describe("chooseFocusTarget (F-008 R-007 R-006)", () => {
  it("focuses row 1, column 1 when the human goes first (F-008 R-007)", () => {
    const expected: FocusTarget = { kind: "square", index: 0 };
    expect(chooseFocusTarget(startGame("human"))).toEqual(expected);
  });

  it("focuses the first empty square, row 1, column 2, after the computer opens at row 1, column 1 (F-008 R-007)", () => {
    const step = startGame("computer");
    expect(step.state.phase === "playing" && step.state.board[0]).toBe("O");

    const expected: FocusTarget = { kind: "square", index: 1 };
    expect(chooseFocusTarget(step)).toEqual(expected);
  });

  it("focuses the first empty square of an injected opening that leaves row 1, column 1 empty (F-008 R-007)", () => {
    const step = startGame("computer", () => 4);

    const expected: FocusTarget = { kind: "square", index: 0 };
    expect(chooseFocusTarget(step)).toEqual(expected);
  });

  it("keeps focus on the square just played when the game continues (F-008 R-007)", () => {
    const openingStep = startGame("human");
    const step = playHumanMove(openingStep.state, 2);
    expect(step.state.phase).toBe("playing");

    const expected: FocusTarget = { kind: "square", index: 2 };
    expect(chooseFocusTarget(step)).toEqual(expected);
  });

  it("keeps focus on the square just played, not the computer's reply, later in the game (F-008 R-007)", () => {
    const step = playHumanMoves(startGame("human"), [0, 1]);
    expect(step.state.phase).toBe("playing");

    const expected: FocusTarget = { kind: "square", index: 1 };
    expect(chooseFocusTarget(step)).toEqual(expected);
  });

  it("keeps focus on a taken square that was activated (F-008 R-007)", () => {
    const afterFirstMove = playHumanMoves(startGame("human"), [0]);
    const computerSquareStep = playHumanMove(afterFirstMove.state, 4);
    const humanSquareStep = playHumanMove(afterFirstMove.state, 0);
    expect(computerSquareStep.events).toEqual([
      { type: "rejected", reason: "occupied", index: 4 },
    ]);

    const expectedComputerSquare: FocusTarget = { kind: "square", index: 4 };
    const expectedHumanSquare: FocusTarget = { kind: "square", index: 0 };
    expect(chooseFocusTarget(computerSquareStep)).toEqual(
      expectedComputerSquare,
    );
    expect(chooseFocusTarget(humanSquareStep)).toEqual(expectedHumanSquare);
  });

  it("focuses Play again when the computer wins (F-008 R-006)", () => {
    const step = playHumanMoves(startGame("human"), COMPUTER_WIN_MOVES);
    expect(step.state.phase).toBe("over");

    const expected: FocusTarget = { kind: "play-again" };
    expect(chooseFocusTarget(step)).toEqual(expected);
  });

  it("focuses Play again when the human wins against an injected losing opponent (F-008 R-006)", () => {
    const step = playHumanMoves(
      startGame("human", chooseLowestEmptySquare),
      HUMAN_WIN_MOVES,
      chooseLowestEmptySquare,
    );
    expect(step.state.phase === "over" && step.state.result).toMatchObject({
      kind: "win",
      winner: "X",
    });

    const expected: FocusTarget = { kind: "play-again" };
    expect(chooseFocusTarget(step)).toEqual(expected);
  });

  it("focuses Play again when X's last mark fills the board in a draw (F-008 R-006)", () => {
    const step = playHumanMoves(startGame("human"), HUMAN_FIRST_DRAW_MOVES);
    expect(step.state.phase === "over" && step.state.result).toEqual({
      kind: "draw",
    });

    const expected: FocusTarget = { kind: "play-again" };
    expect(chooseFocusTarget(step)).toEqual(expected);
  });

  it("focuses Play again when O's last mark fills the board in a draw (F-008 R-006)", () => {
    const step = playHumanMoves(
      startGame("computer"),
      COMPUTER_FIRST_DRAW_MOVES,
    );
    expect(step.state.phase === "over" && step.state.result).toEqual({
      kind: "draw",
    });

    const expected: FocusTarget = { kind: "play-again" };
    expect(chooseFocusTarget(step)).toEqual(expected);
  });

  it("focuses You go first after Play again resets to the choice (F-008 R-006)", () => {
    const expected: FocusTarget = { kind: "first-choice" };
    expect(chooseFocusTarget(resetToChoosing())).toEqual(expected);
  });

  it("returns null for a not-playing rejection after game over, checked before the over-state rule (F-008 R-007, Codex C3)", () => {
    const overStep = playHumanMoves(startGame("human"), COMPUTER_WIN_MOVES);
    const rejectedStep = playHumanMove(overStep.state, 5);
    expect(rejectedStep.state.phase).toBe("over");
    expect(rejectedStep.events).toEqual([
      { type: "rejected", reason: "not-playing", index: 5 },
    ]);

    expect(chooseFocusTarget(rejectedStep)).toBeNull();
  });

  it("returns null for a not-playing rejection while choosing, checked before the choosing rule (F-008 R-007, Codex C3)", () => {
    const rejectedStep = playHumanMove(resetToChoosing().state, 0);
    expect(rejectedStep.state.phase).toBe("choosing");

    expect(chooseFocusTarget(rejectedStep)).toBeNull();
  });

  it("returns null for a step with no events that is not the reset choice (F-008 R-007)", () => {
    const playingStep: GameStep = {
      state: startGame("human").state,
      events: [],
    };

    expect(chooseFocusTarget(playingStep)).toBeNull();
  });
});

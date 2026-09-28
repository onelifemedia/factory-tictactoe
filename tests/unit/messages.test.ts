// F-005 R-005 R-008: every announcement (A1–A8), square name and status line
// the player hears or sees comes from src/ui/messages.ts. Expected strings are
// copied verbatim from acceptance.md ("Announcement text") and design/screens.md
// ("Copy"); the events come from real game.ts calls, not hand-built arrays.
import { describe, it, expect } from "vitest";
import type { Board, Cell, Line } from "../../src/game/board";
import { LINES, listEmptySquares } from "../../src/game/board";
import type { FirstMover, GameStep, Opponent } from "../../src/game/game";
import { playHumanMove, resetToChoosing, startGame } from "../../src/game/game";
import {
  describeEvents,
  describeLine,
  describeSquare,
  describeSquareLabel,
  describeStatus,
} from "../../src/ui/messages";

// Human first, real opponent, O wins on the rising diagonal:
// X0 O4, X1 O2, X3 O6 -> "XXOXO.O..".
const COMPUTER_WIN_MOVES: readonly number[] = [0, 1, 3];

// Human first, real opponent, ends in a draw on X's ninth mark (A5):
// X0 O4, X1 O2, X6 O3, X5 O7, X8 -> "XXOOOXXOX".
const HUMAN_FIRST_DRAW_MOVES: readonly number[] = [0, 1, 6, 5, 8];

// Computer first, real opponent, O's fifth mark fills the board (A7):
// O0, X4 O1, X2 O6, X3 O5, X7 O8 -> "OOXXXOOXO".
const COMPUTER_FIRST_DRAW_MOVES: readonly number[] = [4, 2, 3, 7];

// Human first against the lowest-empty-index opponent, X wins the middle row:
// X3 O0, X4 O1, X5 -> "OO.XXX...".
const HUMAN_WIN_MOVES: readonly number[] = [3, 4, 5];

/** A deliberately weak opponent: always the lowest empty square. */
function chooseLowestEmptySquare(board: Board): number {
  const [lowestSquare] = listEmptySquares(board);
  if (lowestSquare === undefined) {
    throw new RangeError("The board is full; there is no square to choose");
  }
  return lowestSquare;
}

/** Starts a game and plays every human move; returns the last step only. */
function playToLastStep(
  firstMover: FirstMover,
  humanMoves: readonly number[],
  opponent?: Opponent,
): GameStep {
  let step = startGame(firstMover, opponent);
  for (const humanMove of humanMoves) {
    step = playHumanMove(step.state, humanMove, opponent);
  }
  return step;
}

describe("describeEvents announcements A1–A8 (F-005 R-008 R-005)", () => {
  it("announces A1 when the human starts a new game", () => {
    const step = startGame("human");

    expect(describeEvents(step.events)).toBe(
      "New game. You go first. You are X. Your turn.",
    );
  });

  it("announces A2 with the computer's opening O at row 1, column 1", () => {
    const step = startGame("computer");

    expect(describeEvents(step.events)).toBe(
      "New game. Computer goes first as O. Computer placed O in row 1, column 1. Your turn.",
    );
  });

  it("announces A3 for X at row 1, column 1 and O's reply at row 2, column 2", () => {
    const step = playToLastStep("human", [0]);

    expect(describeEvents(step.events)).toBe(
      "You placed X in row 1, column 1. Computer placed O in row 2, column 2. Your turn.",
    );
  });

  it("announces A4 when X wins row 2 against an injected losing opponent", () => {
    const step = playToLastStep(
      "human",
      HUMAN_WIN_MOVES,
      chooseLowestEmptySquare,
    );

    expect(describeEvents(step.events)).toBe(
      "You placed X in row 2, column 3. You win with row 2.",
    );
  });

  it("announces A5 when X's move fills the board with no winner", () => {
    const step = playToLastStep("human", HUMAN_FIRST_DRAW_MOVES);

    expect(describeEvents(step.events)).toBe(
      "You placed X in row 3, column 3. It's a draw.",
    );
  });

  it("announces A6 when the computer wins on the diagonal from top right", () => {
    const step = playToLastStep("human", COMPUTER_WIN_MOVES);

    expect(describeEvents(step.events)).toBe(
      "You placed X in row 2, column 1. Computer placed O in row 3, column 1. Computer wins with the diagonal from top right to bottom left.",
    );
  });

  it("announces A7 when the computer's move fills the board with no winner", () => {
    const step = playToLastStep("computer", COMPUTER_FIRST_DRAW_MOVES);

    expect(describeEvents(step.events)).toBe(
      "You placed X in row 3, column 2. Computer placed O in row 3, column 3. It's a draw.",
    );
  });

  it("announces A8 when the human activates the occupied square at row 2, column 2", () => {
    const { state } = playToLastStep("human", [0]);

    const step = playHumanMove(state, 4);

    expect(describeEvents(step.events)).toBe(
      "Row 2, column 2 is taken. Choose an empty square.",
    );
  });
});

describe("describeEvents announces nothing (F-005 R-008)", () => {
  it("returns an empty string for no events (Play again)", () => {
    expect(describeEvents([])).toBe("");
    expect(describeEvents(resetToChoosing().events)).toBe("");
  });

  it("returns an empty string for a not-playing rejection while choosing", () => {
    const step = playHumanMove(resetToChoosing().state, 4);

    expect(describeEvents(step.events)).toBe("");
  });

  it("returns an empty string for a not-playing rejection after the game is over", () => {
    const { state } = playToLastStep("human", COMPUTER_WIN_MOVES);

    const step = playHumanMove(state, 5);

    expect(describeEvents(step.events)).toBe("");
  });
});

describe("describeLine (F-005 R-005)", () => {
  const expectedWordings: readonly { line: Line; wording: string }[] = [
    { line: [0, 1, 2], wording: "row 1" },
    { line: [3, 4, 5], wording: "row 2" },
    { line: [6, 7, 8], wording: "row 3" },
    { line: [0, 3, 6], wording: "column 1" },
    { line: [1, 4, 7], wording: "column 2" },
    { line: [2, 5, 8], wording: "column 3" },
    {
      line: [0, 4, 8],
      wording: "the diagonal from top left to bottom right",
    },
    {
      line: [2, 4, 6],
      wording: "the diagonal from top right to bottom left",
    },
  ];

  it("covers exactly the 8 winning lines from the board module", () => {
    expect(LINES).toEqual(expectedWordings.map(({ line }) => line));
  });

  for (const { line, wording } of expectedWordings) {
    it(`names the line [${line.join(", ")}] as "${wording}"`, () => {
      const boardLine = LINES.find(
        (candidate) => candidate.join() === line.join(),
      );
      expect(boardLine).toBeDefined();

      expect(describeLine(boardLine ?? line)).toBe(wording);
    });
  }
});

describe("describeSquare (F-005 R-008)", () => {
  const expectedFragments: readonly string[] = [
    "row 1, column 1",
    "row 1, column 2",
    "row 1, column 3",
    "row 2, column 1",
    "row 2, column 2",
    "row 2, column 3",
    "row 3, column 1",
    "row 3, column 2",
    "row 3, column 3",
  ];

  expectedFragments.forEach((fragment, index) => {
    it(`describes square ${String(index)} as "${fragment}"`, () => {
      expect(describeSquare(index)).toBe(fragment);
    });
  });
});

describe("describeSquareLabel (F-005 R-008)", () => {
  const expectedLabels: readonly {
    index: number;
    cell: Cell;
    label: string;
  }[] = [
    { index: 0, cell: null, label: "Row 1, column 1, empty" },
    { index: 0, cell: "X", label: "Row 1, column 1, X" },
    { index: 0, cell: "O", label: "Row 1, column 1, O" },
    { index: 1, cell: null, label: "Row 1, column 2, empty" },
    { index: 1, cell: "X", label: "Row 1, column 2, X" },
    { index: 1, cell: "O", label: "Row 1, column 2, O" },
    { index: 2, cell: null, label: "Row 1, column 3, empty" },
    { index: 2, cell: "X", label: "Row 1, column 3, X" },
    { index: 2, cell: "O", label: "Row 1, column 3, O" },
    { index: 3, cell: null, label: "Row 2, column 1, empty" },
    { index: 3, cell: "X", label: "Row 2, column 1, X" },
    { index: 3, cell: "O", label: "Row 2, column 1, O" },
    { index: 4, cell: null, label: "Row 2, column 2, empty" },
    { index: 4, cell: "X", label: "Row 2, column 2, X" },
    { index: 4, cell: "O", label: "Row 2, column 2, O" },
    { index: 5, cell: null, label: "Row 2, column 3, empty" },
    { index: 5, cell: "X", label: "Row 2, column 3, X" },
    { index: 5, cell: "O", label: "Row 2, column 3, O" },
    { index: 6, cell: null, label: "Row 3, column 1, empty" },
    { index: 6, cell: "X", label: "Row 3, column 1, X" },
    { index: 6, cell: "O", label: "Row 3, column 1, O" },
    { index: 7, cell: null, label: "Row 3, column 2, empty" },
    { index: 7, cell: "X", label: "Row 3, column 2, X" },
    { index: 7, cell: "O", label: "Row 3, column 2, O" },
    { index: 8, cell: null, label: "Row 3, column 3, empty" },
    { index: 8, cell: "X", label: "Row 3, column 3, X" },
    { index: 8, cell: "O", label: "Row 3, column 3, O" },
  ];

  for (const { index, cell, label } of expectedLabels) {
    it(`labels square ${String(index)} holding ${cell ?? "nothing"} as "${label}"`, () => {
      expect(describeSquareLabel(index, cell)).toBe(label);
    });
  }
});

describe("describeStatus (F-005 R-005 R-008)", () => {
  it("asks who goes first while choosing", () => {
    const step = resetToChoosing();

    expect(describeStatus(step.state, step.events)).toBe("Who goes first?");
  });

  it("tells the human it is their turn as X when they start", () => {
    const step = startGame("human");

    expect(describeStatus(step.state, step.events)).toBe(
      "Your turn. You are X.",
    );
  });

  it("names the computer's opening O and the human's symbol when the computer starts", () => {
    const step = startGame("computer");

    expect(describeStatus(step.state, step.events)).toBe(
      "Computer placed O in row 1, column 1. Your turn. You are X.",
    );
  });

  it("names the computer's reply after a human move", () => {
    const step = playToLastStep("human", [0]);

    expect(describeStatus(step.state, step.events)).toBe(
      "Computer placed O in row 2, column 2. Your turn.",
    );
  });

  it("names the computer's reply after a human move in a computer-first game", () => {
    const step = playToLastStep("computer", [4]);

    expect(describeStatus(step.state, step.events)).toBe(
      "Computer placed O in row 1, column 2. Your turn.",
    );
  });

  it("says the square is taken on an occupied rejection", () => {
    const { state } = playToLastStep("human", [0]);

    const step = playHumanMove(state, 4);

    expect(describeStatus(step.state, step.events)).toBe(
      "Row 2, column 2 is taken. Choose an empty square.",
    );
  });

  it("names the winning line when the computer wins", () => {
    const step = playToLastStep("human", COMPUTER_WIN_MOVES);

    expect(describeStatus(step.state, step.events)).toBe(
      "Computer wins with the diagonal from top right to bottom left.",
    );
  });

  it("says it's a draw when the human's move fills the board", () => {
    const step = playToLastStep("human", HUMAN_FIRST_DRAW_MOVES);

    expect(describeStatus(step.state, step.events)).toBe("It's a draw.");
  });

  it("says it's a draw when the computer's move fills the board", () => {
    const step = playToLastStep("computer", COMPUTER_FIRST_DRAW_MOVES);

    expect(describeStatus(step.state, step.events)).toBe("It's a draw.");
  });

  it("names the winning line when the human wins against an injected losing opponent", () => {
    const step = playToLastStep(
      "human",
      HUMAN_WIN_MOVES,
      chooseLowestEmptySquare,
    );

    expect(describeStatus(step.state, step.events)).toBe("You win with row 2.");
  });
});

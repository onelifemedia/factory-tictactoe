// F-004 R-001 R-002 R-004 R-006: the game runs as a pure state machine. Each
// call returns the next state plus the events it produced; the human is X, the
// opponent is O, and the opponent is only asked for a move while the game
// continues. Scripted games use the real chooseComputerMove replies (F-003).
import { describe, it, expect, vi } from "vitest";
import type { Board } from "../../src/game/board";
import { createEmptyBoard, emptySquares } from "../../src/game/board";
import { chooseComputerMove } from "../../src/game/computer-player";
import type {
  FirstMover,
  GameEvent,
  GameState,
  GameStep,
  Opponent,
} from "../../src/game/game";
import { playHumanMove, resetToChoosing, startGame } from "../../src/game/game";
import { parseBoard } from "./game-enumeration";

// Human first, real opponent, ends in a draw on X's ninth mark (A5):
// X0 O4, X1 O2, X6 O3, X5 O7, X8 -> "XXOOOXXOX".
const HUMAN_FIRST_DRAW_MOVES: readonly number[] = [0, 1, 6, 5, 8];

// Human first, real opponent, O wins on the rising diagonal:
// X0 O4, X1 O2, X3 O6 -> "XXOXO.O..".
const COMPUTER_WIN_MOVES: readonly number[] = [0, 1, 3];

// Computer first, real opponent, O's fifth mark fills the board (A7):
// O0, X4 O1, X2 O6, X3 O5, X7 O8 -> "OOXXXOOXO".
const COMPUTER_FIRST_DRAW_MOVES: readonly number[] = [4, 2, 3, 7];

// Human first against the lowest-empty-index opponent, X wins the middle row:
// X3 O0, X4 O1, X5 -> "OO.XXX...".
const HUMAN_WIN_MOVES: readonly number[] = [3, 4, 5];

/** A deliberately weak opponent: always the lowest empty square. */
function chooseLowestEmptySquare(board: Board): number {
  const [lowestSquare] = emptySquares(board);
  if (lowestSquare === undefined) {
    throw new RangeError("The board is full; there is no square to choose");
  }
  return lowestSquare;
}

interface ScriptedGame {
  steps: GameStep[];
  finalState: GameState;
  events: GameEvent[];
}

/** Plays each human move in turn from `initialStep`, collecting every step. */
function playHumanMoves(
  initialStep: GameStep,
  humanMoves: readonly number[],
  opponent?: Opponent,
): ScriptedGame {
  const steps: GameStep[] = [initialStep];
  let state = initialStep.state;
  for (const humanMove of humanMoves) {
    const step = playHumanMove(state, humanMove, opponent);
    steps.push(step);
    state = step.state;
  }
  return {
    steps,
    finalState: state,
    events: steps.flatMap((step) => step.events),
  };
}

function playScriptedGame(
  firstMover: FirstMover,
  humanMoves: readonly number[],
  opponent?: Opponent,
): ScriptedGame {
  return playHumanMoves(startGame(firstMover, opponent), humanMoves, opponent);
}

function placedEvent(mark: "X" | "O", index: number): GameEvent {
  return { type: "placed", mark, index };
}

describe("startGame (F-004 R-001 R-002)", () => {
  it("starts a human-first game with an empty board and only a started event", () => {
    const step = startGame("human");

    expect(step.state).toEqual({
      phase: "playing",
      board: createEmptyBoard(),
      firstMover: "human",
    });
    expect(step.events).toEqual([{ type: "started", firstMover: "human" }]);
  });

  it("starts a computer-first game with the real opponent's O on square 0", () => {
    expect(chooseComputerMove(createEmptyBoard())).toBe(0);

    const step = startGame("computer");

    expect(step.state).toEqual({
      phase: "playing",
      board: parseBoard("O........"),
      firstMover: "computer",
    });
    expect(step.events).toEqual([
      { type: "started", firstMover: "computer" },
      placedEvent("O", 0),
    ]);
  });
});

describe("playHumanMove while the game continues (F-004 R-001 R-002)", () => {
  it("places X and then the opponent's O in one call, and stays playing", () => {
    const { state } = startGame("human");

    const step = playHumanMove(state, 0);

    expect(step.events).toEqual([placedEvent("X", 0), placedEvent("O", 4)]);
    expect(step.state).toEqual({
      phase: "playing",
      board: parseBoard("X...O...."),
      firstMover: "human",
    });
  });

  it("asks the injected opponent for O's move with the board after X", () => {
    const opponent = vi.fn(chooseLowestEmptySquare);
    const { state } = startGame("human", opponent);

    const step = playHumanMove(state, 4, opponent);

    expect(opponent).toHaveBeenCalledTimes(1);
    expect(opponent).toHaveBeenCalledWith(parseBoard("....X...."));
    expect(step.events).toEqual([placedEvent("X", 4), placedEvent("O", 0)]);
  });

  it("does not change the input state when it returns the next one", () => {
    const { state } = startGame("human");
    const stateBefore = structuredClone(state);

    playHumanMove(state, 0);

    expect(state).toEqual(stateBefore);
  });
});

describe("the opponent is not called once the human's move ends the game (F-004 R-004)", () => {
  it("does not call the opponent when X's move wins (A4)", () => {
    const beforeWinningMove = playScriptedGame(
      "human",
      HUMAN_WIN_MOVES.slice(0, -1),
      chooseLowestEmptySquare,
    );
    const spyOpponent = vi.fn(chooseLowestEmptySquare);

    const step = playHumanMove(beforeWinningMove.finalState, 5, spyOpponent);

    expect(spyOpponent).not.toHaveBeenCalled();
    expect(step.state.phase).toBe("over");
    expect(step.events).toEqual([
      placedEvent("X", 5),
      { type: "ended", result: { kind: "win", winner: "X", line: [3, 4, 5] } },
    ]);
  });

  it("does not call the opponent when X's ninth mark fills the board (A5)", () => {
    const beforeLastMove = playScriptedGame(
      "human",
      HUMAN_FIRST_DRAW_MOVES.slice(0, -1),
    );
    expect(beforeLastMove.finalState.phase).toBe("playing");
    const spyOpponent = vi.fn(chooseComputerMove);

    const step = playHumanMove(beforeLastMove.finalState, 8, spyOpponent);

    expect(spyOpponent).not.toHaveBeenCalled();
    expect(step.events).toEqual([
      placedEvent("X", 8),
      { type: "ended", result: { kind: "draw" } },
    ]);
  });
});

describe("win and draw results (F-004 R-004)", () => {
  it("ends with an O win and its line when the computer completes a line", () => {
    const game = playScriptedGame("human", COMPUTER_WIN_MOVES);

    expect(game.finalState).toEqual({
      phase: "over",
      board: parseBoard("XXOXO.O.."),
      firstMover: "human",
      result: { kind: "win", winner: "O", line: [2, 4, 6] },
    });
    expect(game.steps.at(-1)?.events).toEqual([
      placedEvent("X", 3),
      placedEvent("O", 6),
      { type: "ended", result: { kind: "win", winner: "O", line: [2, 4, 6] } },
    ]);
  });

  it("ends in a draw when the human-first game fills the board with no line", () => {
    const game = playScriptedGame("human", HUMAN_FIRST_DRAW_MOVES);

    expect(game.finalState).toEqual({
      phase: "over",
      board: parseBoard("XXOOOXXOX"),
      firstMover: "human",
      result: { kind: "draw" },
    });
    expect(game.events.at(-1)).toEqual({
      type: "ended",
      result: { kind: "draw" },
    });
  });

  it("ends right after O's placement when the computer's move fills the board (A7)", () => {
    const game = playScriptedGame("computer", COMPUTER_FIRST_DRAW_MOVES);

    expect(game.finalState).toEqual({
      phase: "over",
      board: parseBoard("OOXXXOOXO"),
      firstMover: "computer",
      result: { kind: "draw" },
    });
    expect(game.steps.at(-1)?.events).toEqual([
      placedEvent("X", 7),
      placedEvent("O", 8),
      { type: "ended", result: { kind: "draw" } },
    ]);
  });
});

describe("rejected moves (F-004 R-002 R-006)", () => {
  it("rejects a square taken by X as occupied, returning the same state", () => {
    const { state } = playHumanMove(startGame("human").state, 0);
    const spyOpponent = vi.fn(chooseComputerMove);

    const step = playHumanMove(state, 0, spyOpponent);

    expect(step.state).toBe(state);
    expect(step.events).toEqual([
      { type: "rejected", reason: "occupied", index: 0 },
    ]);
    expect(spyOpponent).not.toHaveBeenCalled();
  });

  it("rejects a square taken by O as occupied, returning the same state", () => {
    const { state } = startGame("computer");

    const step = playHumanMove(state, 0);

    expect(step.state).toBe(state);
    expect(step.events).toEqual([
      { type: "rejected", reason: "occupied", index: 0 },
    ]);
  });

  it("rejects any move in the choosing phase as not-playing, returning the same state", () => {
    const { state } = resetToChoosing();

    const step = playHumanMove(state, 4);

    expect(step.state).toBe(state);
    expect(step.events).toEqual([
      { type: "rejected", reason: "not-playing", index: 4 },
    ]);
  });

  it("rejects a move on an empty square after the game is over as not-playing", () => {
    const { finalState } = playScriptedGame("human", COMPUTER_WIN_MOVES);
    expect(finalState.phase).toBe("over");
    const spyOpponent = vi.fn(chooseComputerMove);

    const step = playHumanMove(finalState, 5, spyOpponent);

    expect(step.state).toBe(finalState);
    expect(step.events).toEqual([
      { type: "rejected", reason: "not-playing", index: 5 },
    ]);
    expect(spyOpponent).not.toHaveBeenCalled();
  });

  it("checks not-playing before occupied on a finished game's taken square", () => {
    const { finalState } = playScriptedGame("human", COMPUTER_WIN_MOVES);

    const step = playHumanMove(finalState, 0);

    expect(step.state).toBe(finalState);
    expect(step.events).toEqual([
      { type: "rejected", reason: "not-playing", index: 0 },
    ]);
  });
});

describe("marks (F-004 R-001)", () => {
  const scriptedGames: readonly {
    firstMover: FirstMover;
    humanMoves: readonly number[];
  }[] = [
    { firstMover: "human", humanMoves: HUMAN_FIRST_DRAW_MOVES },
    { firstMover: "computer", humanMoves: COMPUTER_FIRST_DRAW_MOVES },
  ];

  for (const { firstMover, humanMoves } of scriptedGames) {
    it(`places X for every human move and O for every opponent move when the ${firstMover} starts`, () => {
      const game = playScriptedGame(firstMover, humanMoves);
      const placedEvents = game.events.filter(
        (event) => event.type === "placed",
      );

      const humanMarks = placedEvents
        .filter((event) => humanMoves.includes(event.index))
        .map((event) => event.mark);
      const opponentMarks = placedEvents
        .filter((event) => !humanMoves.includes(event.index))
        .map((event) => event.mark);

      expect(placedEvents).toHaveLength(9);
      expect(humanMarks).toEqual(humanMoves.map(() => "X"));
      expect(opponentMarks).toEqual(
        Array.from({ length: 9 - humanMoves.length }, () => "O"),
      );
    });
  }
});

describe("resetToChoosing (F-004 R-006)", () => {
  it("returns the choosing phase with no events (Play again)", () => {
    const step = resetToChoosing();

    expect(step.state).toEqual({ phase: "choosing" });
    expect(step.events).toEqual([]);
  });
});

describe("injected opponent (F-004 R-004)", () => {
  it("lets X win against the lowest-empty-index opponent, ending with placed X then ended", () => {
    const opponent = vi.fn(chooseLowestEmptySquare);

    const game = playScriptedGame("human", HUMAN_WIN_MOVES, opponent);

    expect(opponent).toHaveBeenCalledTimes(2);
    expect(game.finalState).toEqual({
      phase: "over",
      board: parseBoard("OO.XXX..."),
      firstMover: "human",
      result: { kind: "win", winner: "X", line: [3, 4, 5] },
    });
    expect(game.events.slice(-2)).toEqual([
      placedEvent("X", 5),
      { type: "ended", result: { kind: "win", winner: "X", line: [3, 4, 5] } },
    ]);
  });

  it("uses the injected opponent for the computer's opening move", () => {
    const opponent = vi.fn(() => 8);

    const step = startGame("computer", opponent);

    expect(opponent).toHaveBeenCalledTimes(1);
    expect(step.events).toEqual([
      { type: "started", firstMover: "computer" },
      placedEvent("O", 8),
    ]);
  });
});

describe("out-of-range index (F-004 R-002)", () => {
  it("throws a RangeError for index 9, a programming error rather than a rejection", () => {
    const { state } = startGame("human");

    expect(() => playHumanMove(state, 9)).toThrow(RangeError);
  });
});

// F-004 (R-001, R-002, R-004, R-006): the game as a pure state machine.
// Each call returns the next state plus the events that describe what happened
// (ADR-009); the UI turns events into text and never inspects the rules.
import {
  createEmptyBoard,
  evaluateResult,
  placeMark,
  type Board,
  type BoardResult,
  type Mark,
} from "./board";
import { chooseComputerMove } from "./computer-player";

export type FirstMover = "human" | "computer";
export type Opponent = (board: Board) => number;
export type GameState =
  | { phase: "choosing" }
  | { phase: "playing"; board: Board; firstMover: FirstMover }
  | {
      phase: "over";
      board: Board;
      firstMover: FirstMover;
      result: BoardResult;
    };
export type GameEvent =
  | { type: "started"; firstMover: FirstMover }
  | { type: "placed"; mark: Mark; index: number }
  | { type: "ended"; result: BoardResult }
  | { type: "rejected"; reason: "occupied" | "not-playing"; index: number };
export interface GameStep {
  state: GameState;
  events: GameEvent[];
}

const HUMAN_MARK: Mark = "X";
const COMPUTER_MARK: Mark = "O";

export function resetToChoosing(): GameStep {
  return { state: { phase: "choosing" }, events: [] };
}

// Places one mark and settles the state: `over` with an `ended` event if that
// mark finished the game, otherwise still `playing`.
function applyMark(
  board: Board,
  firstMover: FirstMover,
  index: number,
  mark: Mark,
  events: GameEvent[],
): GameState {
  const nextBoard = placeMark(board, index, mark);
  events.push({ type: "placed", mark, index });
  const result = evaluateResult(nextBoard);
  if (result) {
    events.push({ type: "ended", result });
    return { phase: "over", board: nextBoard, firstMover, result };
  }
  return { phase: "playing", board: nextBoard, firstMover };
}

export function startGame(
  firstMover: FirstMover,
  opponent: Opponent = chooseComputerMove,
): GameStep {
  const events: GameEvent[] = [{ type: "started", firstMover }];
  const board = createEmptyBoard();
  if (firstMover === "human") {
    return { state: { phase: "playing", board, firstMover }, events };
  }
  const state = applyMark(
    board,
    firstMover,
    opponent(board),
    COMPUTER_MARK,
    events,
  );
  return { state, events };
}

/**
 * Plays X on `index` and, if the game continues, the opponent's O in the same
 * call. Illegal moves return the same state and a `rejected` event. An index
 * outside 0–8 is a programming error and throws (from placeMark).
 */
export function playHumanMove(
  state: GameState,
  index: number,
  opponent: Opponent = chooseComputerMove,
): GameStep {
  if (state.phase !== "playing") {
    return {
      state,
      events: [{ type: "rejected", reason: "not-playing", index }],
    };
  }
  if (state.board[index] != null) {
    return { state, events: [{ type: "rejected", reason: "occupied", index }] };
  }
  const events: GameEvent[] = [];
  const afterHuman = applyMark(
    state.board,
    state.firstMover,
    index,
    HUMAN_MARK,
    events,
  );
  if (afterHuman.phase !== "playing") {
    return { state: afterHuman, events };
  }
  const afterComputer = applyMark(
    afterHuman.board,
    afterHuman.firstMover,
    opponent(afterHuman.board),
    COMPUTER_MARK,
    events,
  );
  return { state: afterComputer, events };
}

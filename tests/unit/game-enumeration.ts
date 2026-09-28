// F-003 R-003: shared test helper that walks every game the human can force
// against the computer. The human (X) branches on every empty square; the
// computer (O) plays whatever the given chooseComputerMove returns.
import type { Board, BoardResult, Cell, Mark } from "../../src/game/board";
import {
  createEmptyBoard,
  listEmptySquares,
  evaluateResult,
  placeMark,
} from "../../src/game/board";

export type ChooseComputerMove = (board: Board) => number;
export type Starter = "human" | "computer";

export const HUMAN_MARK: Mark = "X";
export const COMPUTER_MARK: Mark = "O";

export interface FinishedGame {
  finalBoard: Board;
  result: BoardResult;
}

export interface GameEnumeration {
  finishedGames: FinishedGame[];
  /** Every distinct position reached with the computer (O) to move. */
  computerPositions: Board[];
}

/** A 9-character layout in reading order: "X", "O", or "." for empty. */
export function formatBoard(board: Board): string {
  return board.map((cell) => cell ?? ".").join("");
}

/** The inverse of formatBoard; throws on a malformed layout. */
export function parseBoard(layout: string): Board {
  if (layout.length !== 9) {
    throw new Error(`Board layout "${layout}" must have 9 characters`);
  }
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

export function formatResult(result: BoardResult): string {
  return result.kind === "draw" ? "draw" : `${result.winner} wins`;
}

export function enumerateGames(
  starter: Starter,
  chooseComputerMove: ChooseComputerMove,
): GameEnumeration {
  const finishedGames: FinishedGame[] = [];
  const computerPositionsByLayout = new Map<string, Board>();

  function walkPosition(board: Board, markToMove: Mark): void {
    const result = evaluateResult(board);
    if (result !== null) {
      finishedGames.push({ finalBoard: board, result });
      return;
    }
    if (markToMove === COMPUTER_MARK) {
      computerPositionsByLayout.set(formatBoard(board), board);
      const chosenSquare = chooseComputerMove(board);
      walkPosition(placeMark(board, chosenSquare, COMPUTER_MARK), HUMAN_MARK);
      return;
    }
    for (const square of listEmptySquares(board)) {
      walkPosition(placeMark(board, square, HUMAN_MARK), COMPUTER_MARK);
    }
  }

  walkPosition(
    createEmptyBoard(),
    starter === "human" ? HUMAN_MARK : COMPUTER_MARK,
  );

  return {
    finishedGames,
    computerPositions: [...computerPositionsByLayout.values()],
  };
}

/** A deterministic, sorted summary: one "layout: result" entry per finished game. */
export function summarizeFinishedGames(
  finishedGames: readonly FinishedGame[],
): string[] {
  return finishedGames
    .map(
      (game) => `${formatBoard(game.finalBoard)}: ${formatResult(game.result)}`,
    )
    .sort();
}

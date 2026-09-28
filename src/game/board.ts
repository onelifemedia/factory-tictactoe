// F-002 (R-001, R-004): the board model. Pure and DOM-free (ADR-009).
// Squares are numbered 0–8 in reading order: index = (row - 1) * 3 + (column - 1).

export type Mark = "X" | "O";
// A square's content (the PRD calls the positions "squares"; Cell is what one holds).
export type Cell = Mark | null;
export type Board = readonly Cell[];
export type Line = readonly [number, number, number];
export type BoardResult =
  { kind: "win"; winner: Mark; line: Line } | { kind: "draw" };

export const SQUARE_COUNT = 9;
export const COLUMN_COUNT = 3;

/** The 8 winning lines: rows, then columns, then the two diagonals. */
export const LINES: readonly Line[] = Object.freeze(
  (
    [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ] as const
  ).map((line): Line => Object.freeze(line)),
);

export function createEmptyBoard(): Board {
  return Array.from({ length: SQUARE_COUNT }, (): Cell => null);
}

export function findWinner(board: Board): { winner: Mark; line: Line } | null {
  for (const line of LINES) {
    const [first, second, third] = line;
    const mark = board[first];
    if (mark != null && board[second] === mark && board[third] === mark) {
      return { winner: mark, line };
    }
  }
  return null;
}

export function isFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

/** A win, a draw, or null while the game can continue. */
export function evaluateResult(board: Board): BoardResult | null {
  const win = findWinner(board);
  if (win) {
    return { kind: "win", ...win };
  }
  return isFull(board) ? { kind: "draw" } : null;
}

/** Indexes of the empty squares, in reading order. */
export function listEmptySquares(board: Board): number[] {
  return board.flatMap((cell, index) => (cell === null ? [index] : []));
}

/**
 * Returns a new board with `mark` on `index`. Throws a RangeError for an
 * occupied square or an index outside 0–8: callers check legality first, so a
 * throw here is a programming error, not a player's illegal move.
 */
export function placeMark(board: Board, index: number, mark: Mark): Board {
  if (!Number.isInteger(index) || index < 0 || index >= SQUARE_COUNT) {
    throw new RangeError(`Square ${String(index)} is not on the board`);
  }
  if (board[index] !== null) {
    throw new RangeError(`Square ${String(index)} is already taken`);
  }
  return board.map((cell, position) => (position === index ? mark : cell));
}

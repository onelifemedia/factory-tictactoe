// F-015 R-013: which squares gained a piece between two rendered boards, so
// the view can mark them `is-new` and only those pieces drop. Pure and DOM-free.
import type { Board } from "../game/board";

/**
 * Indexes (ascending) of squares empty in `previousBoard` and holding a piece
 * in `nextBoard`.
 */
export function findNewlyPlacedSquares(
  previousBoard: Board,
  nextBoard: Board,
): number[] {
  return nextBoard.flatMap((cell, index) =>
    cell !== null && (previousBoard[index] ?? null) === null ? [index] : [],
  );
}

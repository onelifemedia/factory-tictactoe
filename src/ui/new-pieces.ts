// F-015 R-013: which squares gained a piece between two rendered boards, so
// the view can mark them `is-new` and only those pieces drop. Pure and DOM-free.
import type { Board } from "../game/board";

/**
 * Indexes (ascending) of squares empty in `previousBoard` and holding a piece
 * in `nextBoard`. Stub for the TDD red step; not implemented yet.
 */
export function findNewlyPlacedSquares(
  previousBoard: Board,
  nextBoard: Board,
): number[] {
  throw new Error(
    `findNewlyPlacedSquares is not implemented yet (F-015): ${String(previousBoard.length)} to ${String(nextBoard.length)} squares`,
  );
}

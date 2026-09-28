// F-003 (R-003): the perfect computer player. Full-depth minimax, memoized (ADR-010).
import {
  listEmptySquares,
  evaluateResult,
  placeMark,
  type Board,
  type Mark,
} from "./board";

const WIN_VALUE = 10;

// Keyed by board plus side to move. Values are node-relative (distance to the
// end, from O's point of view), so they stay valid across searches, games and
// starters.
const valuesByPositionKey = new Map<string, number>();

function buildPositionKey(board: Board, sideToMove: Mark): string {
  return board.map((cell) => cell ?? ".").join("") + sideToMove;
}

// Move a child's value one ply toward 0: a win found later is worth less, a
// loss found later hurts less.
function stepTowardZero(value: number): number {
  if (value > 0) {
    return value - 1;
  }
  if (value < 0) {
    return value + 1;
  }
  return 0;
}

function evaluatePosition(board: Board, sideToMove: Mark): number {
  const result = evaluateResult(board);
  if (result) {
    if (result.kind === "draw") {
      return 0;
    }
    return result.winner === "O" ? WIN_VALUE : -WIN_VALUE;
  }
  const key = buildPositionKey(board, sideToMove);
  const cached = valuesByPositionKey.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const nextSide: Mark = sideToMove === "O" ? "X" : "O";
  const childValues = listEmptySquares(board).map((index) =>
    stepTowardZero(
      evaluatePosition(placeMark(board, index, sideToMove), nextSide),
    ),
  );
  const value =
    sideToMove === "O" ? Math.max(...childValues) : Math.min(...childValues);
  valuesByPositionKey.set(key, value);
  return value;
}

/**
 * The square O plays on `board` (O to move). Never loses; wins as soon as it
 * can; ties go to the lowest index. Throws a RangeError if the game is over.
 */
export function chooseComputerMove(board: Board): number {
  if (evaluateResult(board)) {
    throw new RangeError("The game is over; there is no move to choose");
  }
  let bestSquare = -1;
  let bestValue = -Infinity;
  for (const index of listEmptySquares(board)) {
    const value = evaluatePosition(placeMark(board, index, "O"), "X");
    if (value > bestValue) {
      bestValue = value;
      bestSquare = index;
    }
  }
  return bestSquare;
}

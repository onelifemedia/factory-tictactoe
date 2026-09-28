// F-008 (R-007, R-006): where keyboard focus goes. Pure, no DOM; the view
// applies these decisions (architecture §5, design/screens.md focus map).
import { emptySquares } from "../game/board";
import type { GameStep } from "../game/game";

export type FocusTarget =
  | { kind: "square"; index: number }
  | { kind: "play-again" }
  | { kind: "first-choice" };

const COLUMN_COUNT = 3;
const LAST_ROW_START = 6;

/** The square an arrow key moves to, staying put at the edge; null for other keys. */
export function nextSquareIndex(index: number, key: string): number | null {
  const column = index % COLUMN_COUNT;
  switch (key) {
    case "ArrowUp":
      return index >= COLUMN_COUNT ? index - COLUMN_COUNT : index;
    case "ArrowDown":
      return index < LAST_ROW_START ? index + COLUMN_COUNT : index;
    case "ArrowLeft":
      return column > 0 ? index - 1 : index;
    case "ArrowRight":
      return column < COLUMN_COUNT - 1 ? index + 1 : index;
    default:
      return null;
  }
}

/** Where focus should land after a game step; null leaves focus alone. */
export function chooseFocusTarget(step: GameStep): FocusTarget | null {
  const { state, events } = step;
  const rejection = events.find((event) => event.type === "rejected");
  if (rejection) {
    return rejection.reason === "occupied"
      ? { kind: "square", index: rejection.index }
      : null;
  }
  if (state.phase === "over") {
    return { kind: "play-again" };
  }
  if (state.phase === "choosing") {
    return events.length === 0 ? { kind: "first-choice" } : null;
  }
  if (events.some((event) => event.type === "started")) {
    const [firstEmpty] = emptySquares(state.board);
    return firstEmpty === undefined
      ? null
      : { kind: "square", index: firstEmpty };
  }
  const humanMove = events.find(
    (event) => event.type === "placed" && event.mark === "X",
  );
  return humanMove?.type === "placed"
    ? { kind: "square", index: humanMove.index }
    : null;
}

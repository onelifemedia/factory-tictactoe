// F-005 (R-005, R-008): every word the game shows or announces. Pure, no DOM.
// Exact texts: acceptance.md "Announcement text" (A1–A8) and design/screens.md "Copy".
import type { BoardResult, Cell, Line } from "../game/board";
import type { GameEvent, GameState } from "../game/game";

const COLUMN_COUNT = 3;

/** "row R, column C" for a square index 0–8. */
export function describeSquare(index: number): string {
  const row = Math.floor(index / COLUMN_COUNT) + 1;
  const column = (index % COLUMN_COUNT) + 1;
  return `row ${String(row)}, column ${String(column)}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Accessible name of a square: "Row R, column C, empty|X|O". */
export function squareLabel(index: number, cell: Cell): string {
  return `${capitalize(describeSquare(index))}, ${cell ?? "empty"}`;
}

/** The {LINE} wording, classified by the line's squares. */
export function describeLine(line: Line): string {
  const [first, second, third] = line;
  if (first === 0 && second === 4 && third === 8) {
    return "the diagonal from top left to bottom right";
  }
  if (first === 2 && second === 4 && third === 6) {
    return "the diagonal from top right to bottom left";
  }
  if (second - first === 1) {
    return `row ${String(Math.floor(first / COLUMN_COUNT) + 1)}`;
  }
  return `column ${String(first + 1)}`;
}

function describeResult(result: BoardResult): string {
  if (result.kind === "draw") {
    return "It's a draw.";
  }
  const winner = result.winner === "X" ? "You win" : "Computer wins";
  return `${winner} with ${describeLine(result.line)}.`;
}

function describeTakenSquare(index: number): string {
  return `${capitalize(describeSquare(index))} is taken. Choose an empty square.`;
}

/** The live-region text for one player action (A1–A8); "" when nothing is announced. */
export function describeEvents(events: readonly GameEvent[]): string {
  const sentences: string[] = [];
  let hasEnded = false;
  for (const event of events) {
    switch (event.type) {
      case "rejected":
        return event.reason === "occupied"
          ? describeTakenSquare(event.index)
          : "";
      case "started":
        sentences.push(
          event.firstMover === "human"
            ? "New game. You go first. You are X."
            : "New game. Computer goes first as O.",
        );
        break;
      case "placed":
        sentences.push(
          event.mark === "X"
            ? `You placed X in ${describeSquare(event.index)}.`
            : `Computer placed O in ${describeSquare(event.index)}.`,
        );
        break;
      case "ended":
        sentences.push(describeResult(event.result));
        hasEnded = true;
        break;
    }
  }
  if (sentences.length === 0) {
    return "";
  }
  if (!hasEnded) {
    sentences.push("Your turn.");
  }
  return sentences.join(" ");
}

/** The visible status line for the current state and the events that led to it. */
export function statusText(
  state: GameState,
  events: readonly GameEvent[],
): string {
  if (state.phase === "choosing") {
    return "Who goes first?";
  }
  if (state.phase === "over") {
    return describeResult(state.result);
  }
  const rejection = events.find((event) => event.type === "rejected");
  if (rejection) {
    return describeTakenSquare(rejection.index);
  }
  const hasJustStarted = events.some((event) => event.type === "started");
  const computerMoves = events.filter(
    (event): event is Extract<GameEvent, { type: "placed" }> =>
      event.type === "placed" && event.mark === "O",
  );
  const computerMove = computerMoves.at(-1);
  if (!computerMove) {
    return "Your turn. You are X.";
  }
  const placedText = `Computer placed O in ${describeSquare(computerMove.index)}.`;
  return hasJustStarted
    ? `${placedText} Your turn. You are X.`
    : `${placedText} Your turn.`;
}

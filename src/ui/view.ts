// F-006 (R-001, R-002, R-010): renders the game state into the page.
// Every attribute is derived from the state on each render, and stale ones are
// removed, so any phase can follow any other (render contract, F-006 spec).
import type { Board, Cell } from "../game/board";
import type { FirstMover, GameState } from "../game/game";
import { squareLabel } from "./messages";

const SQUARE_COUNT = 9;
const EMPTY_BOARD: Board = Array.from(
  { length: SQUARE_COUNT },
  (): Cell => null,
);

export interface GameViewElements {
  status: HTMLElement;
  board: HTMLElement;
  actions: HTMLElement;
}

export interface GameViewHandlers {
  onChooseFirstMover: (firstMover: FirstMover) => void;
  onSquareActivated: (index: number) => void;
}

export interface GameView {
  render: (state: GameState, status: string) => void;
}

function createSquare(
  index: number,
  handlers: GameViewHandlers,
): HTMLButtonElement {
  const square = document.createElement("button");
  square.type = "button";
  square.className = "square";
  square.dataset["index"] = String(index);
  const mark = document.createElement("span");
  mark.className = "mark";
  mark.setAttribute("aria-hidden", "true");
  square.append(mark);
  square.addEventListener("click", () => {
    handlers.onSquareActivated(index);
  });
  return square;
}

function createChoice(handlers: GameViewHandlers): HTMLElement {
  const choice = document.createElement("div");
  choice.className = "choice";
  choice.setAttribute("role", "group");
  choice.setAttribute("aria-label", "Who goes first");
  const options: [FirstMover, string][] = [
    ["human", "You go first"],
    ["computer", "Computer goes first"],
  ];
  for (const [firstMover, label] of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      handlers.onChooseFirstMover(firstMover);
    });
    choice.append(button);
  }
  return choice;
}

function renderSquare(
  square: HTMLButtonElement,
  index: number,
  cell: Cell,
  isPlaying: boolean,
): void {
  const mark = square.firstElementChild;
  if (mark) {
    mark.textContent = cell ?? "";
  }
  square.setAttribute("aria-label", squareLabel(index, cell));
  square.disabled = !isPlaying;
  if (isPlaying && cell !== null) {
    square.setAttribute("aria-disabled", "true");
  } else {
    square.removeAttribute("aria-disabled");
  }
}

export function createGameView(
  elements: GameViewElements,
  handlers: GameViewHandlers,
): GameView {
  const squares = Array.from({ length: SQUARE_COUNT }, (_, index) =>
    createSquare(index, handlers),
  );
  elements.board.replaceChildren(...squares);
  let renderedPhase: GameState["phase"] | null = null;

  function renderActions(state: GameState): void {
    if (state.phase === renderedPhase) {
      return;
    }
    renderedPhase = state.phase;
    if (state.phase === "choosing") {
      elements.actions.replaceChildren(createChoice(handlers));
    } else {
      elements.actions.replaceChildren();
    }
  }

  return {
    render(state, status) {
      elements.status.textContent = status;
      const board = state.phase === "choosing" ? EMPTY_BOARD : state.board;
      const isPlaying = state.phase === "playing";
      squares.forEach((square, index) => {
        renderSquare(square, index, board[index] ?? null, isPlaying);
      });
      renderActions(state);
    },
  };
}

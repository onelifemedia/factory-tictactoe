// F-006, F-007, F-008 (R-001, R-002, R-006, R-007, R-010): renders the game
// state into the page and manages keyboard focus (roving tabindex, ADR-012).
// Every attribute is derived from the state on each render, and stale ones are
// removed, so any phase can follow any other (render contract, F-006 spec).
import type { Board, Cell, Line } from "../game/board";
import type { FirstMover, GameState } from "../game/game";
import { nextSquareIndex, type FocusTarget } from "./focus";
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
  onPlayAgain: () => void;
}

export type LineDirection = "row" | "column" | "diagonal-down" | "diagonal-up";

/** The strike direction of a winning line, classified by its squares. */
export function classifyLine(line: Line): LineDirection {
  const [first, second] = line;
  if (first === 0 && second === 4) {
    return "diagonal-down";
  }
  if (first === 2 && second === 4) {
    return "diagonal-up";
  }
  return second - first === 1 ? "row" : "column";
}

export interface GameView {
  render: (
    state: GameState,
    status: string,
    focusTarget: FocusTarget | null,
  ) => void;
}

const HINT_ID = "hint";
const HINT_TEXT = "Arrow keys move between squares. Enter or Space places X.";

function createSquare(
  index: number,
  handlers: GameViewHandlers,
): HTMLButtonElement {
  const square = document.createElement("button");
  square.type = "button";
  square.className = "square";
  square.dataset["index"] = String(index);
  square.tabIndex = -1;
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
    // Safari skips buttons on plain Tab unless they carry an explicit tabindex.
    button.tabIndex = 0;
    button.textContent = label;
    button.addEventListener("click", () => {
      handlers.onChooseFirstMover(firstMover);
    });
    choice.append(button);
  }
  return choice;
}

function createPlayAgain(handlers: GameViewHandlers): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button--play-again";
  button.tabIndex = 0;
  button.textContent = "Play again";
  button.addEventListener("click", () => {
    handlers.onPlayAgain();
  });
  return button;
}

function createHint(): HTMLElement {
  const hint = document.createElement("p");
  hint.id = HINT_ID;
  hint.className = "hint";
  hint.textContent = HINT_TEXT;
  return hint;
}

function winningLineOf(state: GameState): Line | null {
  return state.phase === "over" && state.result.kind === "win"
    ? state.result.line
    : null;
}

function renderSquare(
  square: HTMLButtonElement,
  index: number,
  cell: Cell,
  isPlaying: boolean,
  winningLine: Line | null,
): void {
  const mark = square.firstElementChild;
  if (mark) {
    mark.textContent = cell ?? "";
  }
  square.setAttribute("aria-label", squareLabel(index, cell));
  square.disabled = !isPlaying;
  if (isPlaying) {
    square.setAttribute("aria-describedby", HINT_ID);
  } else {
    square.removeAttribute("aria-describedby");
    square.tabIndex = -1;
  }
  if (isPlaying && cell !== null) {
    square.setAttribute("aria-disabled", "true");
  } else {
    square.removeAttribute("aria-disabled");
  }
  if (winningLine?.includes(index)) {
    square.dataset["winning"] = "true";
    square.dataset["line"] = classifyLine(winningLine);
  } else {
    delete square.dataset["winning"];
    delete square.dataset["line"];
  }
}

function readSquareIndex(target: EventTarget | null): number | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  const index = target.closest<HTMLElement>(".square")?.dataset["index"];
  return index === undefined ? null : Number(index);
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
  let activeIndex = 0;

  // Roving tabindex: exactly one square is tabbable during play, and it is
  // updated on every focus change, not only on render (APG algorithm).
  function makeActive(index: number, shouldFocus: boolean): void {
    squares[activeIndex]?.setAttribute("tabindex", "-1");
    activeIndex = index;
    const square = squares[index];
    square?.setAttribute("tabindex", "0");
    if (shouldFocus) {
      square?.focus();
    }
  }

  elements.board.addEventListener("keydown", (event) => {
    const index = readSquareIndex(event.target);
    if (index === null || renderedPhase !== "playing") {
      return;
    }
    const next = nextSquareIndex(index, event.key);
    if (next === null) {
      return;
    }
    event.preventDefault();
    makeActive(next, true);
  });

  elements.board.addEventListener("focusin", (event) => {
    const index = readSquareIndex(event.target);
    if (
      index !== null &&
      renderedPhase === "playing" &&
      index !== activeIndex
    ) {
      makeActive(index, false);
    }
  });

  function renderActions(state: GameState): void {
    if (state.phase === renderedPhase) {
      return;
    }
    renderedPhase = state.phase;
    if (state.phase === "choosing") {
      elements.actions.replaceChildren(createChoice(handlers));
    } else if (state.phase === "over") {
      elements.actions.replaceChildren(createPlayAgain(handlers));
    } else {
      elements.actions.replaceChildren(createHint());
    }
  }

  function applyFocus(focusTarget: FocusTarget | null): void {
    if (focusTarget === null) {
      return;
    }
    if (focusTarget.kind === "square") {
      makeActive(focusTarget.index, true);
      return;
    }
    const selector =
      focusTarget.kind === "play-again" ? ".button--play-again" : ".button";
    elements.actions.querySelector<HTMLElement>(selector)?.focus();
  }

  return {
    render(state, status, focusTarget) {
      elements.status.textContent = status;
      const board = state.phase === "choosing" ? EMPTY_BOARD : state.board;
      const isPlaying = state.phase === "playing";
      const winningLine = winningLineOf(state);
      squares.forEach((square, index) => {
        renderSquare(
          square,
          index,
          board[index] ?? null,
          isPlaying,
          winningLine,
        );
      });
      if (isPlaying) {
        makeActive(activeIndex, false);
      }
      renderActions(state);
      applyFocus(focusTarget);
    },
  };
}

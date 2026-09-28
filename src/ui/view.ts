// F-006, F-007, F-008, F-014, F-015 (R-001, R-002, R-005, R-006, R-007, R-010,
// R-013): renders the game state into the page and manages keyboard focus
// (roving tabindex, ADR-012). Pieces are inline SVG using the #mark-x / #mark-o symbols in
// index.html, and a win is drawn by one overlay on the board. Squares whose
// piece the last action placed carry is-new, so only those pieces drop in.
// Every attribute is derived from the state on each render, and stale ones are
// removed, so any phase can follow any other (render contract, F-006 spec).
import {
  createEmptyBoard,
  SQUARE_COUNT,
  type Board,
  type Cell,
  type Line,
} from "../game/board";
import type { FirstMover, GameState } from "../game/game";
import { nextSquareIndex, type FocusTarget } from "./focus";
import { classifyLine, describeWinLinePath } from "./line-direction";
import { describeSquareLabel } from "./messages";
import { findNewlyPlacedSquareIndexes } from "./new-pieces";

const EMPTY_BOARD = createEmptyBoard();

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

export interface GameView {
  render: (
    state: GameState,
    status: string,
    focusTarget: FocusTarget | null,
  ) => void;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
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
  square.addEventListener("click", () => {
    handlers.onSquareActivated(index);
  });
  return square;
}

// A piece is the inline SVG drawing of a mark; `.mark` is its class in the
// design system (design-system.md §5), so the CSS keeps that name.
function createPiece(mark: NonNullable<Cell>): SVGSVGElement {
  const piece = document.createElementNS(SVG_NAMESPACE, "svg");
  piece.setAttribute("aria-hidden", "true");
  piece.setAttribute("viewBox", "0 0 100 100");
  piece.append(document.createElementNS(SVG_NAMESPACE, "use"));
  setPieceSymbol(piece, mark);
  return piece;
}

function setPieceSymbol(piece: SVGSVGElement, mark: NonNullable<Cell>): void {
  const markSuffix = mark === "X" ? "x" : "o";
  piece.setAttribute("class", `mark mark--${markSuffix}`);
  const symbolReference = piece.querySelector("use");
  if (symbolReference === null) {
    throw new Error("A piece is missing its <use> element");
  }
  symbolReference.setAttribute("href", `#mark-${markSuffix}`);
}

/** Shows the cell's piece, or removes it so an empty square holds no piece. */
function renderPiece(square: HTMLButtonElement, cell: Cell): void {
  const piece = square.querySelector<SVGSVGElement>(".mark");
  if (cell === null) {
    piece?.remove();
  } else if (piece) {
    setPieceSymbol(piece, cell);
  } else {
    square.append(createPiece(cell));
  }
}

interface WinLineOverlay {
  overlay: SVGSVGElement;
  path: SVGPathElement;
}

function createWinLineOverlay(): WinLineOverlay {
  const overlay = document.createElementNS(SVG_NAMESPACE, "svg");
  overlay.setAttribute("class", "win-line");
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("viewBox", "0 0 300 300");
  overlay.setAttribute("preserveAspectRatio", "none");
  overlay.setAttribute("hidden", "");
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  overlay.append(path);
  return { overlay, path };
}

function renderWinLineOverlay(
  winLineOverlay: WinLineOverlay,
  winningLine: Line | null,
): void {
  if (winningLine === null) {
    winLineOverlay.overlay.setAttribute("hidden", "");
    return;
  }
  winLineOverlay.path.setAttribute("d", describeWinLinePath(winningLine));
  winLineOverlay.overlay.removeAttribute("hidden");
}

function createChoice(handlers: GameViewHandlers): HTMLElement {
  const choice = document.createElement("div");
  choice.className = "choice";
  choice.setAttribute("role", "group");
  choice.setAttribute("aria-label", "Who goes first");
  const firstMoverChoices: [FirstMover, string][] = [
    ["human", "You go first"],
    ["computer", "Computer goes first"],
  ];
  for (const [firstMover, label] of firstMoverChoices) {
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

function findWinningLine(state: GameState): Line | null {
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
  renderPiece(square, cell);
  square.setAttribute("aria-label", describeSquareLabel(index, cell));
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
    // No style reads data-line since F-014 (the overlay draws the line); it
    // stays as a test and debugging hook naming the line's direction.
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
  const winLineOverlay = createWinLineOverlay();
  elements.board.replaceChildren(...squares, winLineOverlay.overlay);
  let renderedPhase: GameState["phase"] | null = null;
  let renderedBoard: Board = EMPTY_BOARD;
  let activeIndex = 0;

  // Roving tabindex: exactly one square is tabbable during play, and it is
  // updated on every focus change, not only on render (APG algorithm).
  function makeSquareActive(index: number, shouldFocus: boolean): void {
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
    const nextIndex = nextSquareIndex(index, event.key);
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    makeSquareActive(nextIndex, true);
  });

  elements.board.addEventListener("focusin", (event) => {
    const index = readSquareIndex(event.target);
    if (
      index !== null &&
      renderedPhase === "playing" &&
      index !== activeIndex
    ) {
      makeSquareActive(index, false);
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

  function moveFocusToTarget(focusTarget: FocusTarget | null): void {
    if (focusTarget === null) {
      return;
    }
    if (focusTarget.kind === "square") {
      makeSquareActive(focusTarget.index, true);
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
      const winningLine = findWinningLine(state);
      const newlyPlacedIndexes = findNewlyPlacedSquareIndexes(
        renderedBoard,
        board,
      );
      renderedBoard = board;
      squares.forEach((square, index) => {
        renderSquare(
          square,
          index,
          board[index] ?? null,
          isPlaying,
          winningLine,
        );
        square.classList.toggle("is-new", newlyPlacedIndexes.includes(index));
      });
      renderWinLineOverlay(winLineOverlay, winningLine);
      if (isPlaying) {
        makeSquareActive(activeIndex, false);
      }
      renderActions(state);
      moveFocusToTarget(focusTarget);
    },
  };
}

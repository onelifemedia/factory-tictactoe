// F-001, F-006: wires the pure game (src/game) to the page (src/ui).
import "./styles.css";
import {
  playHumanMove,
  resetToChoosing,
  startGame,
  type GameStep,
} from "./game/game";
import { statusText } from "./ui/messages";
import { createGameView } from "./ui/view";

function findElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`The page is missing #${id}`);
  }
  return element;
}

let current = resetToChoosing();

const view = createGameView(
  {
    status: findElement("status"),
    board: findElement("board"),
    actions: findElement("actions"),
  },
  {
    onChooseFirstMover(firstMover) {
      apply(startGame(firstMover));
    },
    onSquareActivated(index) {
      apply(playHumanMove(current.state, index));
    },
  },
);

// The status is recomputed from every step; only square activations and
// choices produce steps, so a taken-square message stays until the next one.
function apply(step: GameStep): void {
  current = step;
  view.render(step.state, statusText(step.state, step.events));
}

apply(current);

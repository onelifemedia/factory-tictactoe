// F-001, F-006 to F-009, F-011: wires the pure game (src/game) to the page (src/ui).
import "./styles.css";
import {
  playHumanMove,
  resetToChoosing,
  startGame,
  type GameStep,
} from "./game/game";
import { createAnnouncer } from "./ui/announcer";
import { chooseFocusTarget, type FocusTarget } from "./ui/focus";
import { describeEvents, describeStatus } from "./ui/messages";
import { createGameView } from "./ui/view";

function findElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`The page is missing #${id}`);
  }
  return element;
}

function revealLoadError(): void {
  document.getElementById("load-error")?.removeAttribute("hidden");
}

function startApplication(): void {
  let currentStep = resetToChoosing();
  const announcer = createAnnouncer(findElement("announcer"));

  const view = createGameView(
    {
      status: findElement("status"),
      board: findElement("board"),
      actions: findElement("actions"),
    },
    {
      onChooseFirstMover(firstMover) {
        applyGameStep(startGame(firstMover));
      },
      onSquareActivated(index) {
        applyGameStep(playHumanMove(currentStep.state, index));
      },
      onPlayAgain() {
        applyGameStep(resetToChoosing());
      },
    },
  );

  // The status is recomputed from every step; only square activations and
  // choices produce steps, so a taken-square message stays until the next one.
  // Focus follows the design's focus map; the first render moves no focus.
  function applyGameStep(
    step: GameStep,
    focusTarget: FocusTarget | null = chooseFocusTarget(step),
  ): void {
    currentStep = step;
    view.render(
      step.state,
      describeStatus(step.state, step.events),
      focusTarget,
    );
    announcer.announce(describeEvents(step.events));
  }

  applyGameStep(currentStep, null);
}

// F-011: if start-up fails, show the load-error message and rethrow so the
// error still reaches the console.
try {
  startApplication();
} catch (error) {
  revealLoadError();
  throw error;
}

// F-010 R-009 R-010: the four game states the accessibility and layout specs
// check (choice, in play, computer won, draw), reached with real move
// sequences against the perfect computer player (ADR-010).
import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  chooseFirstMover,
  locateStatus,
  playMoves,
  type MovePair,
} from "./game-page";

export interface GameState {
  name: string;
  reach: (page: Page, testInfo: TestInfo) => Promise<void>;
}

// Human 0; the computer replies 4.
export const IN_PLAY_MOVES: readonly MovePair[] = [
  { humanSquare: 0, computerReply: 4 },
];

// 3a: human 0, 1, 3; the computer wins on squares 2, 4, 6.
export const DIAGONAL_WIN_MOVES: readonly MovePair[] = [
  { humanSquare: 0, computerReply: 4 },
  { humanSquare: 1, computerReply: 2 },
  { humanSquare: 3, computerReply: 6 },
];

// 3b: human 0, 1, 6, 5, 8; the board fills with no winner.
export const DRAW_MOVES: readonly MovePair[] = [
  { humanSquare: 0, computerReply: 4 },
  { humanSquare: 1, computerReply: 2 },
  { humanSquare: 6, computerReply: 3 },
  { humanSquare: 5, computerReply: 7 },
  { humanSquare: 8, computerReply: undefined },
];

export const LONGEST_RESULT_STATUS =
  "Computer wins with the diagonal from top right to bottom left.";

export const GAME_STATES: readonly GameState[] = [
  {
    name: "choice",
    reach: async (page) => {
      await expect(locateStatus(page)).toHaveText("Who goes first?");
    },
  },
  {
    name: "in play",
    reach: async (page, testInfo) => {
      await chooseFirstMover(page, testInfo, "You go first");
      await playMoves(page, testInfo, IN_PLAY_MOVES);
      await expect(locateStatus(page)).toHaveText(
        "Computer placed O in row 2, column 2. Your turn.",
      );
    },
  },
  {
    name: "computer won",
    reach: async (page, testInfo) => {
      await chooseFirstMover(page, testInfo, "You go first");
      await playMoves(page, testInfo, DIAGONAL_WIN_MOVES);
      await expect(locateStatus(page)).toHaveText(LONGEST_RESULT_STATUS);
    },
  },
  {
    name: "draw",
    reach: async (page, testInfo) => {
      await chooseFirstMover(page, testInfo, "You go first");
      await playMoves(page, testInfo, DRAW_MOVES);
      await expect(locateStatus(page)).toHaveText("It's a draw.");
    },
  },
];

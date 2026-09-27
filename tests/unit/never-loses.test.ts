// F-003 R-003: the computer never loses. Enumerates every legal human move at
// every human turn, for both starting sides, and checks no game is an X win.
import { describe, it, expect, vi } from "vitest";
import { chooseComputerMove } from "../../src/game/computer-player";
import type { ChooseComputerMove, Starter } from "./game-enumeration";
import { enumerateGames, summarizeFinishedGames } from "./game-enumeration";

const STARTERS: readonly Starter[] = ["human", "computer"];
const TIME_LIMIT_MILLISECONDS = 60_000;

async function importFreshChooseComputerMove(): Promise<ChooseComputerMove> {
  vi.resetModules();
  const freshModule = await import("../../src/game/computer-player");
  return freshModule.chooseComputerMove;
}

describe("exhaustive enumeration (F-003 R-003)", () => {
  for (const starter of STARTERS) {
    it(`finishes at least one game and loses none when the ${starter} starts`, () => {
      const { finishedGames } = enumerateGames(starter, chooseComputerMove);
      const humanWinCount = finishedGames.filter(
        (game) => game.result.kind === "win" && game.result.winner === "X",
      ).length;

      console.info(
        `${starter} first: ${String(finishedGames.length)} finished games, ${String(humanWinCount)} human wins`,
      );

      expect(finishedGames.length).toBeGreaterThan(0);
      expect(humanWinCount).toBe(0);
    });
  }

  it(
    "enumerates both starting sides in under 60 seconds",
    async () => {
      const freshChooseComputerMove = await importFreshChooseComputerMove();
      const startMilliseconds = performance.now();
      for (const starter of STARTERS) {
        enumerateGames(starter, freshChooseComputerMove);
      }
      const elapsedMilliseconds = performance.now() - startMilliseconds;

      console.info(
        `both starters enumerated in ${elapsedMilliseconds.toFixed(0)} ms`,
      );

      expect(elapsedMilliseconds).toBeLessThan(TIME_LIMIT_MILLISECONDS);
    },
    TIME_LIMIT_MILLISECONDS,
  );

  it("gives the same results on alternating starters in one module instance as on fresh instances", async () => {
    const sharedChooseComputerMove = await importFreshChooseComputerMove();
    const alternatingStarters: readonly Starter[] = [
      "human",
      "computer",
      "human",
      "computer",
    ];
    const sharedSummaries = alternatingStarters.map((starter) =>
      summarizeFinishedGames(
        enumerateGames(starter, sharedChooseComputerMove).finishedGames,
      ),
    );

    const freshSummariesByStarter = new Map<Starter, string[]>();
    for (const starter of STARTERS) {
      const freshChooseComputerMove = await importFreshChooseComputerMove();
      freshSummariesByStarter.set(
        starter,
        summarizeFinishedGames(
          enumerateGames(starter, freshChooseComputerMove).finishedGames,
        ),
      );
    }

    alternatingStarters.forEach((starter, runIndex) => {
      const freshSummary = freshSummariesByStarter.get(starter);
      expect(freshSummary?.length ?? 0).toBeGreaterThan(0);
      expect(sharedSummaries[runIndex]).toEqual(freshSummary);
    });
  });
});

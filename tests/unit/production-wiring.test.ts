// QA code review: R-008 says the production bundle offers no way to inject an
// opponent (only tests use game.ts's optional opponent parameter), and R-015
// needs the es2022 build target. Both are checked on the source.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import viteConfig from "../../vite.config";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const mainSource = readFileSync(
  path.join(projectRoot, "src", "main.ts"),
  "utf8",
);

function readCallArguments(source: string, functionName: string): string[] {
  return [
    ...source.matchAll(new RegExp(`\\b${functionName}\\(([^)]*)\\)`, "g")),
  ].map((match) => match[1] ?? "");
}

describe("production wiring (R-008, R-015)", () => {
  it("calls startGame with only the first mover and playHumanMove with only state and square", () => {
    const startCalls = readCallArguments(mainSource, "startGame");
    const moveCalls = readCallArguments(mainSource, "playHumanMove");

    expect(startCalls.length).toBeGreaterThan(0);
    expect(moveCalls.length).toBeGreaterThan(0);
    for (const argumentsText of startCalls) {
      expect(
        argumentsText.split(",").filter((part) => part.trim() !== ""),
      ).toHaveLength(1);
    }
    for (const argumentsText of moveCalls) {
      expect(
        argumentsText.split(",").filter((part) => part.trim() !== ""),
      ).toHaveLength(2);
    }
  });

  it("never imports an opponent or computer player into the page wiring", () => {
    expect(mainSource).not.toMatch(
      /Opponent|computer-player|chooseComputerMove/,
    );
  });

  it("builds for es2022, which every supported browser runs (R-015)", () => {
    expect(viteConfig.build?.target).toBe("es2022");
  });
});

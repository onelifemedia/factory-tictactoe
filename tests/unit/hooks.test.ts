// F-001 R-015: git hooks in .githooks run the configured standards commands
// and block the Git operation when a command fails.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it, expect } from "vitest";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

type StandardsSettings = {
  commands: Record<string, string>;
  hooks: Record<string, unknown>;
};

function readStandardsSettings(): StandardsSettings {
  const parsed = JSON.parse(
    readFileSync(path.join(projectRoot, ".factory/config.json"), "utf8"),
  ) as {
    standards: StandardsSettings;
  };
  return parsed.standards;
}

function readPrepareScript(): string | undefined {
  const manifest = JSON.parse(
    readFileSync(path.join(projectRoot, "package.json"), "utf8"),
  ) as {
    scripts?: Record<string, string>;
  };
  return manifest.scripts?.["prepare"];
}

const standards = readStandardsSettings();
const expectedHookCommands: Record<string, string[]> = {
  "pre-commit": ["format_check"],
  "pre-push": ["format_check", "lint", "typecheck", "test"],
};

function hookPathFor(hookName: string): string {
  return path.join(projectRoot, ".githooks", hookName);
}

function commandFor(commandName: string): string {
  const command = standards.commands[commandName];
  if (command === undefined) {
    throw new Error(`standards.commands.${commandName} is not configured`);
  }
  return command;
}

const stubDirectories: string[] = [];

function createFailingNpmStubDirectory(): string {
  const stubDirectory = mkdtempSync(path.join(tmpdir(), "failing-npm-"));
  stubDirectories.push(stubDirectory);
  const stubPath = path.join(stubDirectory, "npm");
  writeFileSync(stubPath, "#!/bin/sh\nexit 1\n");
  chmodSync(stubPath, 0o755);
  return stubDirectory;
}

afterEach(() => {
  for (const stubDirectory of stubDirectories.splice(0)) {
    rmSync(stubDirectory, { recursive: true, force: true });
  }
});

describe("git hooks (F-001 R-015)", () => {
  it("configures the hook commands in .factory/config.json as specified", () => {
    expect(standards.hooks["pre-commit"]).toEqual(
      expectedHookCommands["pre-commit"],
    );
    expect(standards.hooks["pre-push"]).toEqual(
      expectedHookCommands["pre-push"],
    );
  });

  it("sets core.hooksPath to .githooks in the package.json prepare script", () => {
    expect(readPrepareScript()).toMatch(
      /git config core\.hooksPath \.githooks\b/,
    );
  });

  for (const [hookName, commandNames] of Object.entries(expectedHookCommands)) {
    describe(hookName, () => {
      it(`exists and is executable`, () => {
        const hookPath = hookPathFor(hookName);
        expect(existsSync(hookPath), `${hookPath} exists`).toBe(true);
        expect(
          statSync(hookPath).mode & 0o111,
          `${hookPath} is executable`,
        ).not.toBe(0);
      });

      it(`invokes ${commandNames.join(", ")} in that order`, () => {
        const hookScript = readFileSync(hookPathFor(hookName), "utf8");
        let previousPosition = -1;
        for (const commandName of commandNames) {
          const position = hookScript.indexOf(commandFor(commandName));
          expect(
            position,
            `${hookName} invokes ${commandName}`,
          ).toBeGreaterThan(previousPosition);
          previousPosition = position;
        }
        const unexpectedCommandNames = Object.keys(standards.commands).filter(
          (commandName) => !commandNames.includes(commandName),
        );
        for (const commandName of unexpectedCommandNames) {
          expect(
            hookScript,
            `${hookName} does not invoke ${commandName}`,
          ).not.toContain(commandFor(commandName));
        }
      });

      it("exits non-zero when a configured command fails, blocking the Git operation", () => {
        const stubDirectory = createFailingNpmStubDirectory();
        const hookRun = spawnSync("bash", [hookPathFor(hookName)], {
          cwd: projectRoot,
          env: {
            ...process.env,
            PATH: `${stubDirectory}${path.delimiter}${process.env["PATH"] ?? ""}`,
          },
          encoding: "utf8",
        });
        expect(hookRun.error).toBeUndefined();
        expect(hookRun.status).not.toBe(0);
      });
    });
  }
});

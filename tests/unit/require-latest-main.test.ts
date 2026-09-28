// F-013 R-014, whole-change QA review: behavioural tests of the guard that
// deploy, smoke and rollback run before acting. The action's bash script is
// taken from action.yml and run against a stub `gh` on PATH.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const actionText = readFileSync(
  path.join(
    projectRoot,
    ".github",
    "actions",
    "require-latest-main",
    "action.yml",
  ),
  "utf8",
);
const MAIN_TIP = "a".repeat(40);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** The `run: |` block of the action's only step, de-indented. */
function readGuardScript(): string {
  const lines = actionText.split("\n");
  const runIndex = lines.findIndex((line) => /^\s*run: \|\s*$/.test(line));
  const body = lines.slice(runIndex + 1).filter((line) => line.trim() !== "");
  const indent = Math.min(
    ...body.map((line) => line.length - line.trimStart().length),
  );
  return body.map((line) => line.slice(indent)).join("\n");
}

function runGuard(
  candidateSha: string,
  stubBehaviour: "tip" | "fail",
): number | null {
  const directory = mkdtempSync(path.join(tmpdir(), "require-latest-main-"));
  temporaryDirectories.push(directory);
  const stubPath = path.join(directory, "gh");
  writeFileSync(
    stubPath,
    stubBehaviour === "tip"
      ? `#!/usr/bin/env bash\necho "${MAIN_TIP}"\n`
      : "#!/usr/bin/env bash\necho 'HTTP 502' >&2\nexit 1\n",
  );
  chmodSync(stubPath, 0o755);
  const result = spawnSync("bash", ["-c", readGuardScript()], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${directory}${path.delimiter}${process.env["PATH"] ?? ""}`,
      GH_TOKEN: "test-token",
      REPOSITORY: "owner/repository",
      CANDIDATE_SHA: candidateSha,
    },
  });
  return result.status;
}

describe("require-latest-main guard (F-013 R-014)", () => {
  it("passes when the commit is still main's tip", () => {
    expect(runGuard(MAIN_TIP, "tip")).toBe(0);
  });

  it("fails when main has moved on (a stale rerun of deploy, smoke or rollback)", () => {
    expect(runGuard("b".repeat(40), "tip")).toBe(1);
  });

  it("fails when the GitHub API call fails, so nothing acts on an unknown state", () => {
    expect(runGuard(MAIN_TIP, "fail")).not.toBe(0);
  });
});

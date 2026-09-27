// F-013 R-014: the rollback job's CLI must survive large API pages (Codex
// F-013 review round 2: a 100-run page is over 1 MiB, above execFileSync's
// default buffer). A stub `gh` on PATH returns an oversized raw page.
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const scriptPath = path.join(
  projectRoot,
  "scripts",
  "deploy",
  "find-rollback-run.mjs",
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function writeStubGitHubCli(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "stub-gh-"));
  temporaryDirectories.push(directory);
  // 100 runs with a large padding field each (about 2 MiB raw), newest first:
  // run 100 is the current run, run 99 is on another branch, run 98 is good.
  const stubSource = `#!/usr/bin/env node
const endpoint = process.argv[3] ?? "";
const filterIndex = process.argv.indexOf("--jq");
const padding = "x".repeat(20000);
let body;
if (endpoint.includes("/jobs")) {
  body = { jobs: [{ name: "deploy", conclusion: "success", padding }, { name: "smoke", conclusion: "success", padding }] };
} else if (endpoint.includes("page=1")) {
  body = { workflow_runs: Array.from({ length: 100 }, (_, offset) => ({ id: 100 - offset, head_branch: offset === 1 ? "feature" : "main", status: "completed", conclusion: "success", padding })) };
} else {
  body = { workflow_runs: [] };
}
if (filterIndex !== -1) {
  // Emulate the projection the script asks gh to apply.
  body = endpoint.includes("/jobs")
    ? body.jobs.map(({ name, conclusion }) => ({ name, conclusion }))
    : body.workflow_runs.map(({ id, head_branch, status }) => ({ id, head_branch, status }));
}
process.stdout.write(JSON.stringify(body));
`;
  const stubPath = path.join(directory, "gh");
  writeFileSync(stubPath, stubSource);
  chmodSync(stubPath, 0o755);
  return directory;
}

describe("find-rollback-run CLI with large API pages (F-013 R-014)", () => {
  it("selects the newest good run from a page larger than 1 MiB", () => {
    const stubDirectory = writeStubGitHubCli();
    const result = spawnSync(
      process.execPath,
      [scriptPath, "owner/repository", "100"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${stubDirectory}${path.delimiter}${process.env["PATH"] ?? ""}`,
        },
      },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ runId: 98 });
  });
});

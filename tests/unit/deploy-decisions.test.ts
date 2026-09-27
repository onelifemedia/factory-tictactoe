// F-013 R-014: the deploy workflow's decisions are pure functions in
// scripts/deploy/*.mjs, each with a thin CLI fed JSON from `gh api`.
//
// CLI contract (every script): the only argument is the path to a JSON input
// file whose content is the function's argument object (for
// select-rollback-run, the input of the synchronous selectRollbackRun). The
// script prints its JSON result to stdout.
// - decide-deployment: always exits 0 on a decision and prints
//   { shouldDeploy, reason }.
// - resolve-dispatch-sha: exits 0 printing { sha }, or 1 printing { refusal }.
// - select-rollback-run: exits 0 printing { runId }, or 1 printing
//   { runId: null }.
// Unreadable or malformed input is not a decision and exits non-zero.
//
// Fixtures are shaped like the GitHub REST API: `workflow_runs[]` items with
// id/head_sha/status/conclusion and `jobs[]` items with name/conclusion.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { decideDeployment } from "../../scripts/deploy/decide-deployment.mjs";
import { resolveDispatchSha } from "../../scripts/deploy/resolve-dispatch-sha.mjs";
import {
  findRollbackRun,
  selectRollbackRun,
} from "../../scripts/deploy/select-rollback-run.mjs";
import { buildRunsEndpoint } from "../../scripts/deploy/find-rollback-run.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const deployScriptsDirectory = path.join(projectRoot, "scripts", "deploy");

const MAIN_TIP_SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const OLDER_SHA = "0f1e2d3c4b5a69788796a5b4c3d2e1f0fedcba98";
const PAGE_SIZE = 100;

type JobConclusion = "success" | "failure" | "skipped" | "cancelled" | null;

function createCiRun(
  id: number,
  headSha: string,
  status: "queued" | "in_progress" | "completed",
  conclusion: "success" | "failure" | "cancelled" | null,
) {
  return {
    id,
    name: "CI",
    head_sha: headSha,
    head_branch: "main",
    event: "push",
    status,
    conclusion,
  };
}

function createDeployRun(
  id: number,
  conclusion: "success" | "failure" | "cancelled" | null,
) {
  return {
    id,
    name: "Deploy",
    path: ".github/workflows/deploy.yml",
    head_sha: `${String(id).padStart(8, "0")}${"c".repeat(32)}`,
    head_branch: "main",
    event: "workflow_run",
    status: "completed",
    conclusion,
  };
}

function createDeployJobs(
  deployConclusion: JobConclusion,
  smokeConclusion: JobConclusion,
) {
  const isDeployed = deployConclusion === "success";
  return [
    { id: 1, name: "prepare", status: "completed", conclusion: "success" },
    {
      id: 2,
      name: "build",
      status: "completed",
      conclusion: isDeployed ? "success" : deployConclusion,
    },
    {
      id: 3,
      name: "deploy",
      status: "completed",
      conclusion: deployConclusion,
    },
    { id: 4, name: "smoke", status: "completed", conclusion: smokeConclusion },
    {
      id: 5,
      name: "rollback",
      status: "completed",
      conclusion: smokeConclusion === "failure" ? "success" : "skipped",
    },
  ];
}

const goodDeployJobs = () => createDeployJobs("success", "success");
const staleNoOpJobs = () => createDeployJobs("skipped", "skipped");
const smokeFailedJobs = () => createDeployJobs("success", "failure");

const temporaryDirectories: string[] = [];

function writeInputFile(input: unknown): string {
  const directory = mkdtempSync(path.join(tmpdir(), "deploy-decisions-"));
  temporaryDirectories.push(directory);
  const inputPath = path.join(directory, "input.json");
  writeFileSync(inputPath, JSON.stringify(input));
  return inputPath;
}

function runDeployScript(
  scriptName: string,
  commandArguments: readonly string[],
): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    [path.join(deployScriptsDirectory, scriptName), ...commandArguments],
    { cwd: projectRoot, encoding: "utf8" },
  );
}

function parseStandardOutput(
  result: SpawnSyncReturns<string>,
): Record<string, unknown> {
  return JSON.parse(result.stdout.trim()) as Record<string, unknown>;
}

/** The refusal text of a resolveDispatchSha result, which must carry no sha. */
function readRefusal(resolution: unknown): string {
  expect(resolution).not.toHaveProperty("sha");
  const refusal = (resolution as { refusal?: unknown } | null)?.refusal;
  expect(typeof refusal).toBe("string");
  return String(refusal);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("decideDeployment (F-013 R-014)", () => {
  it("deploys when the candidate is still the tip of main (F-013 R-014)", () => {
    const decision = decideDeployment({
      candidateSha: MAIN_TIP_SHA,
      mainTipSha: MAIN_TIP_SHA,
    });

    expect(decision.shouldDeploy).toBe(true);
    expect(decision.reason).toEqual(expect.any(String));
  });

  it("skips an older candidate and names the newer tip in the reason (F-013 R-014)", () => {
    const decision = decideDeployment({
      candidateSha: OLDER_SHA,
      mainTipSha: MAIN_TIP_SHA,
    });

    expect(decision.shouldDeploy).toBe(false);
    expect(decision.reason).toContain(MAIN_TIP_SHA);
  });

  it("never deploys when either SHA is missing, even though two empty values are equal (F-013 R-014)", () => {
    const emptyDecision = decideDeployment({
      candidateSha: "",
      mainTipSha: "",
    });
    const missingTipDecision = decideDeployment({
      candidateSha: MAIN_TIP_SHA,
      mainTipSha: "",
    });

    expect(emptyDecision.shouldDeploy).toBe(false);
    expect(missingTipDecision.shouldDeploy).toBe(false);
    expect(emptyDecision.reason.length).toBeGreaterThan(0);
  });
});

describe("resolveDispatchSha (F-013 R-014)", () => {
  it("returns main's tip when a CI run for that exact SHA succeeded (F-013 R-014)", () => {
    const resolution = resolveDispatchSha({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [createCiRun(11, MAIN_TIP_SHA, "completed", "success")],
    });

    expect(resolution).toEqual({ sha: MAIN_TIP_SHA });
  });

  it("returns the SHA when a re-run succeeded after an earlier failure (F-013 R-014)", () => {
    const resolution = resolveDispatchSha({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [
        createCiRun(12, MAIN_TIP_SHA, "completed", "success"),
        createCiRun(11, MAIN_TIP_SHA, "completed", "failure"),
      ],
    });

    expect(resolution).toEqual({ sha: MAIN_TIP_SHA });
  });

  it("refuses while main's CI is in progress and says so (F-013 R-014)", () => {
    const resolution = resolveDispatchSha({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [createCiRun(11, MAIN_TIP_SHA, "in_progress", null)],
    });

    expect(readRefusal(resolution)).toMatch(/in.progress/i);
  });

  it("refuses while main's CI is queued and says so (F-013 R-014)", () => {
    const resolution = resolveDispatchSha({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [createCiRun(11, MAIN_TIP_SHA, "queued", null)],
    });

    expect(readRefusal(resolution)).toMatch(/queued|pending/i);
  });

  it("refuses when main's CI failed and says so (F-013 R-014)", () => {
    const resolution = resolveDispatchSha({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [createCiRun(11, MAIN_TIP_SHA, "completed", "failure")],
    });

    expect(readRefusal(resolution)).toMatch(/fail/i);
  });

  it("refuses when there is no CI run for main's tip, naming the SHA (F-013 R-014)", () => {
    const resolution = resolveDispatchSha({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [],
    });

    const refusal = readRefusal(resolution);
    expect(refusal).toContain(MAIN_TIP_SHA);
    expect(refusal).toMatch(/no\b.*\bCI run|none|not found/i);
  });

  it("ignores a successful CI run for a different SHA (F-013 R-014)", () => {
    const resolution = resolveDispatchSha({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [createCiRun(11, OLDER_SHA, "completed", "success")],
    });

    expect(readRefusal(resolution).length).toBeGreaterThan(0);
  });

  it("refuses an empty main tip SHA (F-013 R-014)", () => {
    const resolution = resolveDispatchSha({
      mainTipSha: "",
      ciRuns: [createCiRun(11, "", "completed", "success")],
    });

    expect(readRefusal(resolution).length).toBeGreaterThan(0);
  });
});

describe("selectRollbackRun (F-013 R-014, Codex C5)", () => {
  it("(a) selects the newest run whose deploy and smoke jobs both succeeded (F-013 R-014)", () => {
    const runId = selectRollbackRun({
      runs: [createDeployRun(30, "success"), createDeployRun(20, "success")],
      jobsByRunId: { "30": goodDeployJobs(), "20": goodDeployJobs() },
      currentRunId: 99,
    });

    expect(runId).toBe(30);
  });

  it("(b) skips a successful stale no-op run and the current failed run, selecting the good deploy (F-013 R-014)", () => {
    const runId = selectRollbackRun({
      runs: [
        createDeployRun(40, "failure"),
        createDeployRun(30, "success"),
        createDeployRun(20, "success"),
      ],
      jobsByRunId: {
        "40": smokeFailedJobs(),
        "30": staleNoOpJobs(),
        "20": goodDeployJobs(),
      },
      currentRunId: 40,
    });

    expect(runId).toBe(20);
  });

  it("(c) never selects an earlier run whose smoke test failed, was skipped or was cancelled (F-013 R-014)", () => {
    const runId = selectRollbackRun({
      runs: [
        createDeployRun(40, "failure"),
        createDeployRun(35, "failure"),
        createDeployRun(32, "cancelled"),
        createDeployRun(30, "failure"),
        createDeployRun(20, "success"),
      ],
      jobsByRunId: {
        "40": smokeFailedJobs(),
        "35": smokeFailedJobs(),
        "32": createDeployJobs("success", "cancelled"),
        "30": createDeployJobs("success", "skipped"),
        "20": goodDeployJobs(),
      },
      currentRunId: 40,
    });

    expect(runId).toBe(20);
  });

  it("(c) returns null when the only deployed run's smoke test failed (F-013 R-014)", () => {
    const runId = selectRollbackRun({
      runs: [createDeployRun(40, "failure"), createDeployRun(35, "failure")],
      jobsByRunId: { "40": smokeFailedJobs(), "35": smokeFailedJobs() },
      currentRunId: 40,
    });

    expect(runId).toBeNull();
  });

  it("(d) excludes the current run even when its deploy and smoke jobs show success (F-013 R-014)", () => {
    const runId = selectRollbackRun({
      runs: [createDeployRun(50, null), createDeployRun(40, "success")],
      jobsByRunId: { "50": goodDeployJobs(), "40": goodDeployJobs() },
      currentRunId: 50,
    });

    expect(runId).toBe(40);
  });

  it("(e) returns null when there are no runs (F-013 R-014)", () => {
    const runId = selectRollbackRun({
      runs: [],
      jobsByRunId: {},
      currentRunId: 50,
    });

    expect(runId).toBeNull();
  });

  it("(e) returns null when only stale no-op runs and the current run exist (F-013 R-014)", () => {
    const runId = selectRollbackRun({
      runs: [createDeployRun(50, "failure"), createDeployRun(40, "success")],
      jobsByRunId: { "50": smokeFailedJobs(), "40": staleNoOpJobs() },
      currentRunId: 50,
    });

    expect(runId).toBeNull();
  });

  it("(f) treats a run without fetched jobs as ineligible (F-013 R-014)", () => {
    const runId = selectRollbackRun({
      runs: [createDeployRun(40, "success"), createDeployRun(30, "success")],
      jobsByRunId: { "30": goodDeployJobs() },
      currentRunId: 99,
    });

    expect(runId).toBe(30);
  });

  it("(f) matches jobs by their exact API name only (Codex C5, F-013 R-014)", () => {
    const renamedJobs = [
      { id: 1, name: "Deploy", status: "completed", conclusion: "success" },
      {
        id: 2,
        name: "smoke / chromium",
        status: "completed",
        conclusion: "success",
      },
    ];

    const runId = selectRollbackRun({
      runs: [createDeployRun(40, "success"), createDeployRun(30, "success")],
      jobsByRunId: { "40": renamedJobs, "30": goodDeployJobs() },
      currentRunId: 99,
    });

    expect(runId).toBe(30);
  });

  it("(f) accepts runs and jobs taken straight from the API's workflow_runs[] and jobs[] responses (F-013 R-014)", () => {
    const runsResponse = {
      total_count: 2,
      workflow_runs: [
        createDeployRun(40, "success"),
        createDeployRun(30, "success"),
      ],
    };
    const jobsResponsesByRunId = {
      "40": { total_count: 5, jobs: staleNoOpJobs() },
      "30": { total_count: 5, jobs: goodDeployJobs() },
    };

    const runId = selectRollbackRun({
      runs: runsResponse.workflow_runs,
      jobsByRunId: {
        "40": jobsResponsesByRunId["40"].jobs,
        "30": jobsResponsesByRunId["30"].jobs,
      },
      currentRunId: 99,
    });

    expect(runId).toBe(30);
  });
});

describe("findRollbackRun pagination (F-013 R-014, Codex C6)", () => {
  function createPagedHistory(
    runs: ReturnType<typeof createDeployRun>[],
    jobsByRunId: Record<string, ReturnType<typeof createDeployJobs>>,
  ) {
    const requestedPageNumbers: number[] = [];
    const fetchedJobRunIds: number[] = [];
    // GitHub's list endpoints number pages from 1.
    const fetchRunsPage = (pageNumber: number) => {
      requestedPageNumbers.push(pageNumber);
      const firstIndex = (pageNumber - 1) * PAGE_SIZE;
      return Promise.resolve(runs.slice(firstIndex, firstIndex + PAGE_SIZE));
    };
    const fetchJobs = (runId: number) => {
      fetchedJobRunIds.push(runId);
      return Promise.resolve(jobsByRunId[String(runId)] ?? []);
    };
    return { fetchRunsPage, fetchJobs, requestedPageNumbers, fetchedJobRunIds };
  }

  it("finds an eligible run on page 2 after 100 ineligible runs and stops there (F-013 R-014)", async () => {
    const runs: ReturnType<typeof createDeployRun>[] = [];
    const jobsByRunId: Record<string, ReturnType<typeof createDeployJobs>> = {};
    const currentRunId = 1000;
    runs.push(createDeployRun(currentRunId, null));
    jobsByRunId[String(currentRunId)] = goodDeployJobs();
    for (let runIndex = 1; runIndex < PAGE_SIZE; runIndex += 1) {
      const runId = currentRunId - runIndex;
      runs.push(
        createDeployRun(runId, runIndex % 2 === 0 ? "success" : "failure"),
      );
      jobsByRunId[String(runId)] =
        runIndex % 2 === 0 ? staleNoOpJobs() : smokeFailedJobs();
    }
    runs.push(createDeployRun(800, "success"));
    jobsByRunId["800"] = staleNoOpJobs();
    runs.push(createDeployRun(799, "success"));
    jobsByRunId["799"] = goodDeployJobs();
    for (let runId = 798; runId > 700; runId -= 1) {
      runs.push(createDeployRun(runId, "success"));
      jobsByRunId[String(runId)] = goodDeployJobs();
    }
    const history = createPagedHistory(runs, jobsByRunId);

    const runId = await findRollbackRun({
      fetchRunsPage: history.fetchRunsPage,
      fetchJobs: history.fetchJobs,
      currentRunId,
      pageSize: PAGE_SIZE,
    });

    expect(runId).toBe(799);
    expect(history.requestedPageNumbers).toContain(2);
    expect(history.requestedPageNumbers).not.toContain(3);
    expect(history.fetchedJobRunIds).not.toContain(798);
  });

  it("returns null once the history is exhausted without an eligible run (F-013 R-014)", async () => {
    const runs: ReturnType<typeof createDeployRun>[] = [];
    const jobsByRunId: Record<string, ReturnType<typeof createDeployJobs>> = {};
    for (let runId = 500; runId > 370; runId -= 1) {
      runs.push(createDeployRun(runId, "success"));
      jobsByRunId[String(runId)] = staleNoOpJobs();
    }
    const history = createPagedHistory(runs, jobsByRunId);

    const runId = await findRollbackRun({
      fetchRunsPage: history.fetchRunsPage,
      fetchJobs: history.fetchJobs,
      currentRunId: 501,
      pageSize: PAGE_SIZE,
    });

    expect(runId).toBeNull();
    expect(history.requestedPageNumbers).toContain(2);
  });

  it("returns null for an empty history (F-013 R-014)", async () => {
    const history = createPagedHistory([], {});

    const runId = await findRollbackRun({
      fetchRunsPage: history.fetchRunsPage,
      fetchJobs: history.fetchJobs,
      currentRunId: 501,
      pageSize: PAGE_SIZE,
    });

    expect(runId).toBeNull();
    expect(history.fetchedJobRunIds).toEqual([]);
  });
});

describe("deploy decision CLIs (F-013 R-014)", () => {
  it("decide-deployment prints { shouldDeploy: true } and exits 0 for the tip (F-013 R-014)", () => {
    const inputPath = writeInputFile({
      candidateSha: MAIN_TIP_SHA,
      mainTipSha: MAIN_TIP_SHA,
    });

    const result = runDeployScript("decide-deployment.mjs", [inputPath]);

    expect(result.status).toBe(0);
    const decision = parseStandardOutput(result);
    expect(Object.keys(decision).sort()).toEqual(["reason", "shouldDeploy"]);
    expect(decision.shouldDeploy).toBe(true);
    expect(typeof decision.reason).toBe("string");
  });

  it("decide-deployment prints { shouldDeploy: false } and still exits 0 for a stale candidate (F-013 R-014)", () => {
    const inputPath = writeInputFile({
      candidateSha: OLDER_SHA,
      mainTipSha: MAIN_TIP_SHA,
    });

    const result = runDeployScript("decide-deployment.mjs", [inputPath]);

    expect(result.status).toBe(0);
    const decision = parseStandardOutput(result);
    expect(decision.shouldDeploy).toBe(false);
    expect(typeof decision.reason).toBe("string");
  });

  it("resolve-dispatch-sha prints { sha } and exits 0 after a successful CI run (F-013 R-014)", () => {
    const inputPath = writeInputFile({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [createCiRun(11, MAIN_TIP_SHA, "completed", "success")],
    });

    const result = runDeployScript("resolve-dispatch-sha.mjs", [inputPath]);

    expect(result.status).toBe(0);
    expect(parseStandardOutput(result)).toEqual({ sha: MAIN_TIP_SHA });
  });

  it("resolve-dispatch-sha prints { refusal } and exits 1 while CI is in progress (F-013 R-014)", () => {
    const inputPath = writeInputFile({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [createCiRun(11, MAIN_TIP_SHA, "in_progress", null)],
    });

    const result = runDeployScript("resolve-dispatch-sha.mjs", [inputPath]);

    expect(result.status).toBe(1);
    expect(readRefusal(parseStandardOutput(result))).toMatch(/in.progress/i);
  });

  it("select-rollback-run prints { runId } and exits 0 when a good deploy exists (F-013 R-014)", () => {
    const inputPath = writeInputFile({
      runs: [createDeployRun(40, "failure"), createDeployRun(20, "success")],
      jobsByRunId: { "40": smokeFailedJobs(), "20": goodDeployJobs() },
      currentRunId: 40,
    });

    const result = runDeployScript("select-rollback-run.mjs", [inputPath]);

    expect(result.status).toBe(0);
    expect(parseStandardOutput(result)).toEqual({ runId: 20 });
  });

  it("select-rollback-run prints { runId: null } and exits 1 when no run is eligible (F-013 R-014)", () => {
    const inputPath = writeInputFile({
      runs: [createDeployRun(40, "failure")],
      jobsByRunId: { "40": smokeFailedJobs() },
      currentRunId: 40,
    });

    const result = runDeployScript("select-rollback-run.mjs", [inputPath]);

    expect(result.status).toBe(1);
    expect(parseStandardOutput(result)).toEqual({ runId: null });
  });

  for (const scriptName of [
    "decide-deployment.mjs",
    "resolve-dispatch-sha.mjs",
    "select-rollback-run.mjs",
  ]) {
    it(`${scriptName} exits non-zero with a message on a missing or malformed input file (F-013 R-014)`, () => {
      const malformedDirectory = mkdtempSync(
        path.join(tmpdir(), "deploy-decisions-malformed-"),
      );
      temporaryDirectories.push(malformedDirectory);
      const malformedPath = path.join(malformedDirectory, "input.json");
      writeFileSync(malformedPath, "{ not json");

      const missingArgumentResult = runDeployScript(scriptName, []);
      const malformedResult = runDeployScript(scriptName, [malformedPath]);

      for (const result of [missingArgumentResult, malformedResult]) {
        expect(result.status).not.toBe(0);
        expect(result.status).not.toBeNull();
        expect(result.stderr.trim().length).toBeGreaterThan(0);
      }
    });
  }
});

// Codex F-013 review C2/C3: main's own push CI decides a dispatch, and the
// rollback history is listed unfiltered (filtered searches stop at 1,000).
describe("deploy decisions review follow-ups (F-013 R-014)", () => {
  it("refuses a dispatch when only a pull-request run succeeded and main's push run is still in progress (Codex C2)", () => {
    const resolution = resolveDispatchSha({
      mainTipSha: MAIN_TIP_SHA,
      ciRuns: [
        {
          ...createCiRun(21, MAIN_TIP_SHA, "completed", "success"),
          event: "pull_request",
          head_branch: "feature",
        },
        createCiRun(22, MAIN_TIP_SHA, "in_progress", null),
      ],
    });

    expect(resolution).not.toHaveProperty("sha");
    expect(readRefusal(resolution)).toMatch(/in.progress/i);
  });

  it("builds an unfiltered runs endpoint so pagination is not capped at 1,000 results (Codex C3)", () => {
    const endpoint = buildRunsEndpoint("owner/repository", 11);

    expect(endpoint).toContain("actions/workflows/deploy.yml/runs");
    expect(endpoint).toContain("page=11");
    expect(endpoint).not.toMatch(
      /[?&](branch|status|event|actor|created|head_sha)=/,
    );
  });

  it("skips runs that are not completed runs on main while paging (Codex C3)", async () => {
    const runs = [
      { ...createDeployRun(30, "success"), head_branch: "feature" },
      { ...createDeployRun(20, null), status: "in_progress" },
      createDeployRun(10, "success"),
    ];
    const runId = await findRollbackRun({
      fetchRunsPage: (pageNumber: number) => (pageNumber === 1 ? runs : []),
      fetchJobs: () => goodDeployJobs(),
      currentRunId: 99,
      pageSize: PAGE_SIZE,
    });

    expect(runId).toBe(10);
  });
});

// F-013 (R-014): the rollback job's entry point. Pages through this
// workflow's runs on main with `gh api` (100 per page) and prints
// { runId } of the newest run whose deploy and smoke jobs succeeded.
// Usage: node scripts/deploy/find-rollback-run.mjs <owner/repo> <current-run-id>
import { execFileSync } from "node:child_process";
import { isRunAsCommandLine } from "./read-json-input.mjs";
import { findRollbackRun } from "./select-rollback-run.mjs";

const PAGE_SIZE = 100;

/**
 * @param {string} endpoint
 * @returns {unknown}
 */
function callGitHub(endpoint) {
  return JSON.parse(
    execFileSync("gh", ["api", endpoint], { encoding: "utf8" }),
  );
}

if (isRunAsCommandLine(import.meta.url)) {
  const [repository, currentRunText] = process.argv.slice(2);
  if (repository === undefined || currentRunText === undefined) {
    console.error(
      "Usage: node find-rollback-run.mjs <owner/repo> <current-run-id>",
    );
    process.exit(2);
  }
  const runId = await findRollbackRun({
    fetchRunsPage: (pageNumber) =>
      /** @type {{ workflow_runs: { id: number }[] }} */ (
        callGitHub(
          `repos/${repository}/actions/workflows/deploy.yml/runs?branch=main&status=completed&per_page=${String(PAGE_SIZE)}&page=${String(pageNumber)}`,
        )
      ).workflow_runs,
    fetchJobs: (candidateRunId) =>
      /** @type {{ jobs: { name: string; conclusion: string | null }[] }} */ (
        callGitHub(
          `repos/${repository}/actions/runs/${String(candidateRunId)}/jobs?per_page=100`,
        )
      ).jobs,
    currentRunId: Number(currentRunText),
    pageSize: PAGE_SIZE,
  });
  console.log(JSON.stringify({ runId }));
  process.exitCode = runId === null ? 1 : 0;
}

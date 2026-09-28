// F-013 (R-014): the rollback job's entry point. Pages through this
// workflow's runs with `gh api` (100 per page) and prints { runId } of the
// newest completed run on main whose deploy and smoke jobs succeeded.
// Usage: node scripts/deploy/find-rollback-run.mjs <owner/repo> <current-run-id>
import { execFileSync } from "node:child_process";
import { isRunAsCommandLine } from "./read-json-input.mjs";
import { findRollbackRun } from "./select-rollback-run.mjs";

const PAGE_SIZE = 100;
// Output limit for one `gh api` call. The --jq projections keep responses
// small; this is headroom, not the fix (Codex F-013 review round 2).
const MAXIMUM_OUTPUT_BYTES = 64 * 1024 * 1024;
const RUN_FIELDS = "[.workflow_runs[] | {id, head_branch, status}]";
const JOB_FIELDS = "[.jobs[] | {name, conclusion}]";

/**
 * The runs listing for one page, deliberately without branch/status/event
 * filters: GitHub caps filtered searches at 1,000 results (Codex F-013 review
 * C3). findRollbackRun filters to completed runs on main itself.
 * @param {string} repository
 * @param {number} pageNumber
 * @returns {string}
 */
export function buildRunsEndpoint(repository, pageNumber) {
  return `repos/${repository}/actions/workflows/deploy.yml/runs?per_page=${String(PAGE_SIZE)}&page=${String(pageNumber)}`;
}

/**
 * Calls `gh api` and lets gh project only the fields the decision needs, so a
 * 100-run page (over 1 MiB raw) never reaches Node's output buffer whole.
 * @param {string} endpoint
 * @param {string} fieldFilter
 * @returns {unknown}
 */
function callGitHub(endpoint, fieldFilter) {
  return JSON.parse(
    execFileSync("gh", ["api", endpoint, "--jq", fieldFilter], {
      encoding: "utf8",
      maxBuffer: MAXIMUM_OUTPUT_BYTES,
    }),
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
      /** @type {{ id: number; head_branch: string; status: string }[]} */ (
        callGitHub(buildRunsEndpoint(repository, pageNumber), RUN_FIELDS)
      ),
    fetchJobs: (candidateRunId) =>
      /** @type {{ name: string; conclusion: string | null }[]} */ (
        callGitHub(
          `repos/${repository}/actions/runs/${String(candidateRunId)}/jobs?per_page=100`,
          JOB_FIELDS,
        )
      ),
    currentRunId: Number(currentRunText),
    pageSize: PAGE_SIZE,
  });
  console.log(JSON.stringify({ runId }));
  process.exitCode = runId === null ? 1 : 0;
}

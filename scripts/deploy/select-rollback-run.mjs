// F-013 (R-014): the rollback target is the newest earlier deploy run whose
// `deploy` and `smoke` jobs both succeeded. A stale no-op run concludes
// "success" with its deploy skipped, so run conclusions alone are not enough
// (ADR-011). Job display names are frozen in deploy.yml for this.

/** @typedef {{ id: number; conclusion?: string | null; head_branch?: string; status?: string }} DeployRun */
/** @typedef {{ name: string; conclusion: string | null }} DeployJob */

/**
 * @param {DeployJob[] | undefined} jobs
 * @returns {boolean}
 */
function hasDeployedAndPassedSmoke(jobs) {
  if (jobs === undefined) {
    return false;
  }
  const hasJobSucceeded = (/** @type {string} */ name) =>
    jobs.some((job) => job.name === name && job.conclusion === "success");
  return hasJobSucceeded("deploy") && hasJobSucceeded("smoke");
}

/**
 * @param {{ runs: DeployRun[]; jobsByRunId: Record<string, DeployJob[]>; currentRunId: number }} input
 * @returns {number | null}
 */
export function selectRollbackRun({ runs, jobsByRunId, currentRunId }) {
  const eligible = runs.find(
    (run) =>
      run.id !== currentRunId &&
      hasDeployedAndPassedSmoke(jobsByRunId[String(run.id)]),
  );
  return eligible === undefined ? null : eligible.id;
}

/**
 * Walks the run history page by page (pages start at 1), newest first, and
 * stops at the first eligible run.
 * @param {{
 *   fetchRunsPage: (pageNumber: number) => DeployRun[] | Promise<DeployRun[]>;
 *   fetchJobs: (runId: number) => DeployJob[] | Promise<DeployJob[]>;
 *   currentRunId: number;
 *   pageSize: number;
 * }} options
 * @returns {Promise<number | null>}
 */
export async function findRollbackRun({
  fetchRunsPage,
  fetchJobs,
  currentRunId,
  pageSize,
}) {
  for (let pageNumber = 1; ; pageNumber += 1) {
    const runs = await fetchRunsPage(pageNumber);
    for (const run of runs) {
      // The history is listed unfiltered (filtered searches stop at 1,000
      // results), so runs on other branches or still running are skipped here.
      const isCompletedRunOnMain =
        run.head_branch === "main" && run.status === "completed";
      if (
        isCompletedRunOnMain &&
        run.id !== currentRunId &&
        hasDeployedAndPassedSmoke(await fetchJobs(run.id))
      ) {
        return run.id;
      }
    }
    if (runs.length < pageSize) {
      return null;
    }
  }
}

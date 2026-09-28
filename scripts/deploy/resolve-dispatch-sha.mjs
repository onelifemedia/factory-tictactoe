// F-013 (R-014): a manual deploy targets main's tip, and only when CI passed
// for that exact SHA; otherwise it refuses (ADR-011).
import { isRunAsCommandLine, readJsonInput } from "./read-json-input.mjs";

/** @typedef {{ id: number; head_sha: string; status: string; conclusion: string | null; event?: string; head_branch?: string }} CiRun */

/**
 * @param {{ mainTipSha?: string; ciRuns?: CiRun[] }} input
 * @returns {{ sha: string } | { refusal: string }}
 */
export function resolveDispatchSha({ mainTipSha = "", ciRuns = [] }) {
  if (mainTipSha === "") {
    return { refusal: "Main's tip SHA is missing; refusing to deploy." };
  }
  // Only main's own push CI counts; a pull request's run for the same commit
  // does not (Codex F-013 review C2).
  const runsForTip = ciRuns.filter(
    (run) =>
      run.head_sha === mainTipSha &&
      (run.event ?? "push") === "push" &&
      (run.head_branch ?? "main") === "main",
  );
  if (runsForTip.some((run) => run.conclusion === "success")) {
    return { sha: mainTipSha };
  }
  if (runsForTip.length === 0) {
    return {
      refusal: `No CI run found for main's tip ${mainTipSha}; refusing to deploy.`,
    };
  }
  const states = new Set(
    runsForTip.map((run) =>
      run.status === "completed" ? String(run.conclusion) : run.status,
    ),
  );
  const described = [...states]
    .map((state) =>
      state === "in_progress"
        ? "in progress"
        : state === "queued"
          ? "queued (pending)"
          : state === "failure"
            ? "failed"
            : state,
    )
    .join(", ");
  return {
    refusal: `CI for main's tip ${mainTipSha} is ${described}, not successful; refusing to deploy.`,
  };
}

if (isRunAsCommandLine(import.meta.url)) {
  const input = /** @type {{ mainTipSha?: string; ciRuns?: CiRun[] }} */ (
    readJsonInput()
  );
  const resolution = resolveDispatchSha(input);
  console.log(JSON.stringify(resolution));
  process.exitCode = "sha" in resolution ? 0 : 1;
}

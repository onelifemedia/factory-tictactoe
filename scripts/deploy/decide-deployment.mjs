// F-013 (R-014): deploy only the latest commit on main. Checked after the run
// has acquired the `pages` concurrency slot (ADR-011).
import { isRunAsCommandLine, readJsonInput } from "../command-line.mjs";

/**
 * @param {{ candidateSha?: string; mainTipSha?: string }} input
 * @returns {{ shouldDeploy: boolean; reason: string }}
 */
export function decideDeployment({ candidateSha = "", mainTipSha = "" }) {
  if (candidateSha === "" || mainTipSha === "") {
    return {
      shouldDeploy: false,
      reason:
        "The candidate or main's tip SHA is missing; nothing is deployed.",
    };
  }
  if (candidateSha === mainTipSha) {
    return {
      shouldDeploy: true,
      reason: `${candidateSha} is the latest commit on main.`,
    };
  }
  return {
    shouldDeploy: false,
    reason: `${candidateSha} is no longer the latest commit on main (${mainTipSha}); the newer commit's queued run deploys it.`,
  };
}

if (isRunAsCommandLine(import.meta.url)) {
  const input = /** @type {{ candidateSha?: string; mainTipSha?: string }} */ (
    readJsonInput()
  );
  console.log(JSON.stringify(decideDeployment(input)));
}

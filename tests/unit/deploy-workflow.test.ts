// F-013 R-014: static checks on .github/workflows/deploy.yml, read as text.
// actionlint 1.7.12 does not know `concurrency.queue` (Codex C1), so this test
// asserts the concurrency block itself. Job ids and display names are frozen
// because rollback matches jobs by the API's `name` (Codex C5), and the
// dependency graph and conditions are explicit (Codex C2, C3).
// Blocks are extracted by indentation; there is no YAML dependency.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const workflowPath = path.join(
  projectRoot,
  ".github",
  "workflows",
  "deploy.yml",
);
const workflowText = existsSync(workflowPath)
  ? readFileSync(workflowPath, "utf8")
  : "";
const workflowLines = workflowText.split(/\r?\n/);

const JOB_IDS = ["prepare", "build", "deploy", "smoke", "rollback"] as const;

function measureIndent(line: string): number {
  return line.length - line.trimStart().length;
}

function isContentLine(line: string): boolean {
  const trimmedLine = line.trim();
  return trimmedLine.length > 0 && !trimmedLine.startsWith("#");
}

/**
 * The block for `key` at exactly `indent` spaces inside `lines`: its header
 * line plus every following line indented deeper (blank lines included).
 */
function extractBlock(
  lines: readonly string[],
  key: string,
  indent: number,
): string[] {
  const headerPattern = new RegExp(
    `^ {${String(indent)}}["']?${key}["']?:(\\s|$)`,
  );
  const headerIndex = lines.findIndex((line) => headerPattern.test(line));
  if (headerIndex === -1) {
    return [];
  }
  const blockLines = [lines[headerIndex] ?? ""];
  for (const line of lines.slice(headerIndex + 1)) {
    if (isContentLine(line) && measureIndent(line) <= indent) {
      break;
    }
    blockLines.push(line);
  }
  return blockLines;
}

function extractJobBlock(jobId: string): string[] {
  return extractBlock(extractBlock(workflowLines, "jobs", 0), jobId, 2);
}

/**
 * The value of a job-level key (4 spaces deep), with any block scalar or block
 * list folded onto one line and `${{ }}` removed.
 */
function readJobKey(jobId: string, key: string): string {
  const keyBlock = extractBlock(extractJobBlock(jobId), key, 4);
  const [headerLine, ...continuationLines] = keyBlock;
  if (headerLine === undefined) {
    return "";
  }
  const inlineValue = headerLine.slice(headerLine.indexOf(":") + 1).trim();
  const continuation = continuationLines
    .filter((line) => isContentLine(line))
    .map((line) => line.trim().replace(/^-\s*/, ""))
    .join(" ");
  const value = /^[>|][-+]?$/.test(inlineValue)
    ? continuation
    : `${inlineValue} ${continuation}`.trim();
  return value
    .replace(/^\$\{\{\s*/, "")
    .replace(/\s*\}\}$/, "")
    .trim();
}

function readJobNeeds(jobId: string): string[] {
  const needsValue = readJobKey(jobId, "needs");
  return needsValue
    .replace(/[[\]]/g, " ")
    .split(/[\s,]+/)
    .filter((need) => need.length > 0)
    .sort();
}

function extractJobSteps(jobId: string): string[] {
  const stepsBlock = extractBlock(extractJobBlock(jobId), "steps", 4);
  const steps: string[] = [];
  let stepIndent: number | undefined;
  for (const line of stepsBlock.slice(1)) {
    const isStepStart =
      /^\s*- /.test(line) &&
      (stepIndent === undefined || measureIndent(line) === stepIndent);
    if (isStepStart) {
      stepIndent = measureIndent(line);
      steps.push(line);
    } else if (steps.length > 0) {
      steps[steps.length - 1] += `\n${line}`;
    }
  }
  return steps;
}

function findStepUsing(jobId: string, actionName: string): string {
  return (
    extractJobSteps(jobId).find((step) =>
      new RegExp(`uses:\\s*${actionName}@`).test(step),
    ) ?? ""
  );
}

describe("deploy.yml (F-013 R-014)", () => {
  it("exists at .github/workflows/deploy.yml (F-013 R-014)", () => {
    expect(existsSync(workflowPath)).toBe(true);
  });

  it("runs after CI completes on main and on a manual dispatch (F-013 R-014)", () => {
    const triggerBlock = extractBlock(workflowLines, "on", 0).join("\n");
    const workflowRunBlock = extractBlock(
      triggerBlock.split("\n"),
      "workflow_run",
      2,
    ).join("\n");

    expect(workflowRunBlock).toMatch(
      /workflows:\s*(\[\s*["']?CI["']?\s*\]|\n\s*-\s*["']?CI["']?)/,
    );
    expect(workflowRunBlock).toMatch(
      /types:\s*(\[\s*completed\s*\]|\n\s*-\s*completed)/,
    );
    expect(workflowRunBlock).toMatch(
      /branches:\s*(\[\s*main\s*\]|\n\s*-\s*main)/,
    );
    expect(triggerBlock).toMatch(/^ {2}workflow_dispatch:/m);
  });

  it("offers a boolean force_smoke_failure input on workflow_dispatch that the smoke job reads (F-013 R-014)", () => {
    const triggerLines = extractBlock(workflowLines, "on", 0);
    const dispatchLines = extractBlock(triggerLines, "workflow_dispatch", 2);
    const inputBlock = extractBlock(
      extractBlock(dispatchLines, "inputs", 4),
      "force_smoke_failure",
      6,
    ).join("\n");

    expect(inputBlock).toMatch(/type:\s*boolean/);
    expect(extractJobBlock("smoke").join("\n")).toContain(
      "inputs.force_smoke_failure",
    );
  });

  it("queues every run in the workflow-level pages concurrency group without cancelling (F-013 R-014)", () => {
    const concurrencyBlock = extractBlock(workflowLines, "concurrency", 0).join(
      "\n",
    );

    expect(concurrencyBlock).toMatch(/\bgroup:\s*["']?pages["']?(\s|,|}|$)/m);
    expect(concurrencyBlock).toMatch(/\bqueue:\s*max\b/);
    expect(concurrencyBlock).toMatch(/\bcancel-in-progress:\s*false\b/);
  });

  it("never sets cancel-in-progress: true anywhere (F-013 R-014)", () => {
    expect(workflowText.length).toBeGreaterThan(0);
    expect(workflowText).not.toMatch(/cancel-in-progress:\s*true/);
  });

  for (const jobId of JOB_IDS) {
    it(`declares the ${jobId} job with the display name ${jobId} (Codex C5, F-013 R-014)`, () => {
      expect(extractJobBlock(jobId).length).toBeGreaterThan(0);
      expect(readJobKey(jobId, "name").replace(/^["']|["']$/g, "")).toBe(jobId);
    });
  }

  it("runs prepare only after a successful CI run or on a dispatch (F-013 R-014)", () => {
    const condition = readJobKey("prepare", "if");

    expect(condition).toContain(
      "github.event.workflow_run.conclusion == 'success'",
    );
    expect(condition).toContain("workflow_dispatch");
  });

  it("gates build on prepare's should_deploy output (Codex C2, F-013 R-014)", () => {
    expect(readJobNeeds("build")).toEqual(["prepare"]);
    expect(readJobKey("build", "if")).toContain(
      "needs.prepare.outputs.should_deploy == 'true'",
    );
  });

  it("makes deploy need build and smoke need prepare and deploy (Codex C2, F-013 R-014)", () => {
    expect(readJobNeeds("deploy")).toEqual(["build", "prepare"]);
    expect(readJobNeeds("smoke")).toEqual(["deploy", "prepare"]);
  });

  it("runs rollback only when deploy succeeded and smoke failed, even after a failure (Codex C2, F-013 R-014)", () => {
    const condition = readJobKey("rollback", "if");

    expect(readJobNeeds("rollback")).toEqual(["deploy", "prepare", "smoke"]);
    expect(condition).toContain("always()");
    expect(condition).toContain("needs.deploy.result == 'success'");
    expect(condition).toContain("needs.smoke.result == 'failure'");
  });

  it("uploads dist as the Pages artifact with 90-day retention (F-013 R-014)", () => {
    const uploadStep = findStepUsing("build", "actions/upload-pages-artifact");

    expect(uploadStep).toMatch(/^\s*path:\s*["']?(\.\/)?dist\/?["']?\s*$/m);
    expect(uploadStep).toMatch(/^\s*retention-days:\s*90\s*$/m);
    expect(workflowText).toMatch(/retention-days:\s*90\b/);
  });

  it("targets the github-pages environment in both deploy and rollback (Codex C3, F-013 R-014)", () => {
    // Either `environment: github-pages` or a block with `name: github-pages`.
    const environmentPattern =
      /^ {4}environment:\s*["']?github-pages["']?\s*$|^ {6,}name:\s*["']?github-pages["']?\s*$/m;

    expect(
      extractBlock(extractJobBlock("deploy"), "environment", 4).join("\n"),
    ).toMatch(environmentPattern);
    expect(
      extractBlock(extractJobBlock("rollback"), "environment", 4).join("\n"),
    ).toMatch(environmentPattern);
  });

  it("re-uploads the previous artifact as github-pages-rollback and deploys that artifact (F-013 R-014)", () => {
    const uploadStep = findStepUsing("rollback", "actions/upload-artifact");
    const deployStep = findStepUsing("rollback", "actions/deploy-pages");

    expect(uploadStep).toMatch(
      /^\s*name:\s*["']?github-pages-rollback["']?\s*$/m,
    );
    expect(deployStep).toMatch(
      /^\s*artifact_name:\s*["']?github-pages-rollback["']?\s*$/m,
    );
  });

  // QA security review (LOW): only CI triggered by a push to this repository
  // may start a deploy.
  it("starts prepare only for CI runs triggered by a push in this repository", () => {
    const condition = readJobKey("prepare", "if");

    expect(condition).toContain("github.event.workflow_run.event == 'push'");
    expect(condition).toContain(
      "github.event.workflow_run.head_repository.full_name == github.repository",
    );
  });

  // QA security review (LOW): actions pinned by commit SHA, images by digest;
  // local actions in this repository are pinned by the commit itself.
  it("pins every action by full commit SHA and every container by digest", () => {
    const ciText = readFileSync(
      path.join(path.dirname(workflowPath), "ci.yml"),
      "utf8",
    );
    const usesLines = `${workflowText}\n${ciText}`
      .split(/\r?\n/)
      .filter((line) => /^\s*(-\s*)?uses:/.test(line));

    expect(usesLines.length).toBeGreaterThan(0);
    for (const line of usesLines) {
      expect(line).toMatch(
        /uses:\s*(?:[\w.-]+\/[\w.-]+@[0-9a-f]{40}|docker:\/\/[^\s@]+@sha256:[0-9a-f]{64}|\.\/\.github\/actions\/[\w.-]+)(\s|$)/,
      );
    }
  });

  // Whole-change QA review (Codex C1, round 2): "Re-run failed jobs" reuses
  // passed jobs, so every job that touches the site (deploy, smoke, rollback)
  // first requires that this run's commit is still main's tip, on every
  // attempt, through one local action.
  for (const [jobId, guardedAction] of [
    ["deploy", "actions/deploy-pages"],
    ["smoke", "npx playwright test"],
    ["rollback", "actions/download-artifact"],
  ] as const) {
    it(`requires the commit to still be main's tip in ${jobId} before it acts`, () => {
      const steps = extractJobSteps(jobId);
      const guardIndex = steps.findIndex(
        (step) =>
          /uses:\s*\.\/\.github\/actions\/require-latest-main\b/.test(step) &&
          step.includes("needs.prepare.outputs.sha"),
      );
      const actionIndex = steps.findIndex((step) =>
        step.includes(guardedAction),
      );

      expect(guardIndex).toBeGreaterThanOrEqual(0);
      expect(actionIndex).toBeGreaterThan(guardIndex);
    });
  }

  it("defines the require-latest-main action that fails unless the sha is main's tip", () => {
    const actionPath = path.join(
      path.dirname(workflowPath),
      "..",
      "actions",
      "require-latest-main",
      "action.yml",
    );
    const actionText = existsSync(actionPath)
      ? readFileSync(actionPath, "utf8")
      : "";

    expect(actionText).toMatch(/using:\s*["']?composite/);
    expect(actionText).toContain("commits/main");
    expect(actionText).toMatch(/exit 1/);
  });
});

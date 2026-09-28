# QA reconciliation (2026-09-27)

Scope: `0d19214..87bb290` (all features merged) plus the QA fixes `87bb290..bbdeba7` on `factory/qa-fixes`.

## Reviewer availability

| Reviewer | Ran | Notes |
|---|---|---|
| factory-code-reviewer (agent) | yes | REQUEST-CHANGES: 2 high, 13 medium, 7 low |
| factory-security-reviewer (agent) | yes | CLEAN: 2 low; `npm audit` 0 vulnerabilities |
| Codex (whole change) | yes, 3 rounds | See below. The first attempt with `--diff --base 0d19214 --head 932c9a9` failed on both tries without writing a prompt (the diff includes the 2.8k-line lockfile and every `.factory` record). It was rerun on a code-only diff file (`.factory/checkpoints/qa-whole-change.diff`, 69 files, 9,246 lines). |
| Ollama | no | disabled by the approver on 2026-09-27 |

## Codex rounds

1. `0d19214..932c9a9` (code only): AGREE-WITH-CONCERNS. C1 (high): a partial rerun of an old run could redeploy a stale commit. Accepted and fixed test-first (`e07b59e`, then `d7d8816`).
2. `932c9a9..d7d8816`: AGREE-WITH-CONCERNS. C1 (high): smoke and rollback reruns still bypassed the check. Missing: behavioural tests. Accepted and fixed test-first (`634162a`, then `d03ba90`).
3. `d7d8816..d03ba90`: **AGREE**. C1 (medium): guard timing. Missing: behavioural tests. Both accepted and fixed in `bbdeba7`, with guard tests proven by an inverted-comparison mutation.

No Codex finding was rejected, so no rebuttal round was needed.

## Resolution of each finding

See the findings table in `.factory/qa-report.md` (CX-1 to CX-4, CR-1 to CR-15, SR-1 to SR-2). In summary:
- **Fixed:** every HIGH and MEDIUM finding except CR-8.
- **Accepted-risk, documented:** CR-8 (`Cell` naming), CR-12 (dead board after a programming error), and CX-3's residual (a check is not atomic with publishing; the queue keeps other deploys out).
- **For-human:** CR-13 (architecture text drift).

## Conflict resolution

There were no reviewer disagreements. Default rules applied:
- Simplicity over DRY for the three identical freshness checks was not needed, because they reached three occurrences and were consolidated into one local action.
- MVP over completeness for CR-8.

## Outcome

Clear: no blocking findings remain open. The QA fixes pull request must merge (CI gate).

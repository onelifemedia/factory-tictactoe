# Planning reconciliation (2026-09-27)

Plan: `.factory/plan.json`, with 13 features in 4 milestones. `validate.sh planning` reports 0 findings and 0 warnings. Features are registered in state.

## Reviewers
| Reviewer | Verdict | Critical/High | Top finding |
|---|---|---|---|
| Codex | AGREE-WITH-CONCERNS | 0 / 2 | Concurrency could discard the latest commit's deployment |
| Ollama | Disabled by the approver 2026-09-27 | — | — |

## Accepted (plan changed)
| Finding | Change |
|---|---|
| C1 (HIGH): the pending-run replacement can drop the latest deploy | F-013 now uses `concurrency: { group: pages, queue: max, cancel-in-progress: false }` (GitHub feature since 2026-05: up to 100 queued runs, FIFO), with the stale-SHA check after acquiring the slot, and a criterion for the A/C/B completion order |
| C2 (HIGH): "latest successful run" could be a stale no-op run with no artifact | Rollback selects the latest run whose deploy **and** smoke jobs concluded success; fixture test with a no-op run in between |
| C3 (MEDIUM): F-004 always called the opponent after X | The result is evaluated after X; the opponent is only called if play continues; a spy test covers human wins and human-completed draws |
| C4 (MEDIUM): `workflow_dispatch` eligibility was unspecified | F-013 resolves main's tip, verifies CI success for that SHA, and refuses when CI is pending or failed |
| Missing: F-013 could precede M3 work | F-013 now depends on F-010, F-011 and F-012 |

## Rejected
None.

## Coverage (every MUST requirement)
R-001 F-002/F-004/F-006/F-011 · R-002 F-004/F-006 · R-003 F-003 · R-004 F-002/F-004/F-007 · R-005 F-005/F-007 · R-006 F-004/F-007/F-008 · R-007 F-008 · R-008 F-005/F-009 · R-009 F-010 · R-010 F-006/F-010 · R-011 F-012 · R-012 F-012 · R-013 F-001/F-010/F-012 · R-014 F-013 · R-015 F-001.
Screens: game-01 → F-001/F-006/F-008/F-010/F-011; game-02 → F-006/F-008/F-009/F-010; game-03 → F-007/F-008/F-009/F-010.

## Resolved by the approver (2026-09-27)
- Option (a) chosen: the specification was reopened and architecture §6 and ADR-011 corrected to match F-013 (`queue: max` verified in GitHub's docs and cited in ADR-011; rollback target requires successful deploy and smoke jobs). Details: specification-reconciliation.md, "Rework 2".

## Originally put to the human
- C1 and C2 contradict the approved **architecture §6 and ADR-011**. They say "GitHub keeps at most one pending run ... that is safe", which Codex showed is not safe, and they select rollback by "latest run that concluded successfully". Options: (a) reopen specification to correct §6 and ADR-011 (concurrency `queue: max`; rollback target requires successful deploy and smoke jobs), then re-approve the specification, design and plan together (recommended; consistent with the earlier choice); (b) leave the correction in the plan only.
- F-013's live behaviour, and enabling Pages with source "GitHub Actions" (a repo setting), happen in the ship and deploy phases with your confirmation.

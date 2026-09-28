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

## Rework 2026-09-28: Tabletop Tiles restyle (F-014, F-015)

The approved design rework (direction C, design revision 8885b635) needs implementation. Two features were added to M3; F-001 to F-013 are done and unchanged (registration preserved their status).
- **F-014 (M):** the static restyle. It covers tokens v2, the tray and tiles, SVG pieces, the win-line overlay, the board floor and fold, and the check that visuals are local files only. It carries the design approval commit on its branch, because tokens v2 fails the token and contrast tests until the restyle lands.
- **F-015 (M):** the motion. Press, drop and lift, all removed under reduced motion, plus the iOS `:active` listener.

MUST coverage stays complete (R-001 to R-015). New tracing:
- F-014: R-005, R-010, R-013.
- F-015: R-008 (announcements not delayed), R-010 (board stable) and R-013 (visual style and personality set in design).

Codex plan review (`20260928-033207-plan.json-codex.md`): AGREE-WITH-CONCERNS, 2 high, 2 medium, 1 missing. All were accepted.
- **C1 (HIGH):** the contrast criterion contradicted the documented border-on-tile-edge exception (2.56:1). Threshold pairs are now listed separately; the exception is asserted only at its published value.
- **C2 (HIGH):** a unit test on the real `dist/` would run before `npm run build` in CI. check-local-visuals unit tests are now fixture-only, and CI runs the script as a post-build step on `dist/`.
- **C3 (MEDIUM):** Vitest runs in the node environment, so it has no DOM for a view test. New-piece detection is now a pure helper (`src/ui/new-pieces.ts`) unit-tested in node; rendering is checked in Playwright. touch-active is tested with a fake EventTarget.
- **C4 (MEDIUM):** press and hover geometry wasn't specified. Added the 1 px hover, the 4 px tile and button press with pressed edges over 80 ms, occupied and disabled tiles ignoring both, and the drop's starting transform. F-015 resized S → M.
- **Missing:** motion regressions for the computer's opening O, a taken-square attempt, and Play again followed by a new game.

Rejected: none. No blocking findings remain open. Ollama was not run (non-conforming in earlier phases).

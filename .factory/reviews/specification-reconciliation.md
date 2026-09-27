# Specification reconciliation (2026-09-27)

Bundle: `prd.md`, `acceptance.md`, `architecture.md`, `adrs/ADR-001` to `ADR-012`.
Per-review details: `20260927-162223-prd-reconciled.md` and `20260927-162655-architecture-reconciled.md`.

## Reviewers
| Reviewer | PRD | Architecture + ADRs |
|---|---|---|
| Codex CLI | AGREE (0 critical, 0 high, 2 medium) | AGREE-WITH-CONCERNS (0 critical, 3 high, 4 medium, 1 missing) |
| Ollama qwen2.5:14b | Non-conforming (prose summary, no verdict or findings) | Non-conforming (prose summary, no verdict or findings) |

Ollama's output is **not** counted as agreement. Effectively there was one independent reviewer (Codex) for this phase.

## Findings and resolutions
| Finding | Severity | Resolution |
|---|---|---|
| PRD C1: engine tests presented as version coverage | MEDIUM | Accepted. R-015 separates the support requirement from engine-level verification |
| PRD C2: rollback with no previous artifact | MEDIUM | Accepted. R-014 covers the first deploy |
| PRD Missing: announcement contract | — | Accepted. R-008 points to the exact texts A1–A8 |
| Arch C1: `github-pages` artifact name clash on rollback | HIGH | Accepted. The rollback uses `github-pages-rollback` with the tar unchanged |
| Arch C2: `workflow_run` builds the wrong SHA | HIGH | Accepted. The deploy builds `workflow_run.head_sha` |
| Arch C3: artifacts expire after 90 days | HIGH | **Approver decision:** accept the limit; the rollback logs it and fails (R-014) |
| Arch C4: memo key ignores side to move | MEDIUM | Accepted. The key is board plus side to move, with node-relative values and an alternating-starter test |
| Arch C5: smoke test could hit the old deployment | MEDIUM | Accepted. The smoke test waits for the `build-id` meta |
| Arch C6: concurrency drops pending runs | MEDIUM | Accepted. Only the latest commit on main is deployed (**approver approved the R-014 wording**) |
| Arch C7: failed bundle download shows nothing | MEDIUM | Accepted. A static fallback message is tested with an aborted bundle request |
| Arch Missing: A4 unreachable in the browser | — | Accepted. A4 is covered by a unit test with an injected opponent; nothing is injectable in production |
| Ollama PRD suggestions (help page, more screen readers, richer win feedback) | — | Rejected. Explicit non-goals |

No blocking findings remain open.

## Approver decisions recorded
- PRD open questions: no mid-game "New game"; the computer replies instantly; 44 px targets kept.
- R-014: 90-day artifact expiry accepted; deploy "latest commit on main".

## Accepted risks
- Real screen-reader (VoiceOver) and real-device iOS/Android checks are not performed; the QA report lists them as human follow-up.
- Rollback cannot restore if the last successful deploy is older than 90 days.
- Deploy workflow behaviour (R-014) can only be verified in the deploy phase.

## Unavailable reviewers
- Ollama qwen2.5:14b ran but did not follow the review format in either review. It is recorded as non-conforming. Consider switching the Ollama model before the planning review.

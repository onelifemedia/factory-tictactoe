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

## Rework 2026-09-27 (specification reopened after the design review)

Approver chose option (a): update architecture §2 and §5 and add the board-stability check.

| Change | Where |
|---|---|
| Load-error message ships `hidden`. It is revealed by an inline capture-phase `error` listener in `index.html` when the script fails to load, or by `main.ts` try/catch at start-up (then rethrown) | architecture §2, ADR-012, acceptance R-001 |
| Focus after a choice goes to the first empty square in reading order | architecture §5, acceptance R-007 (new criterion) |
| Board bounding box identical across states at 320×568 and 1280×800 (default text size) | acceptance R-010 (new criterion) |
| Exact load-error copy; tested against the production build; forced start-up exception test | acceptance R-001 |

Rework review: Codex, AGREE-WITH-CONCERNS (1 high, 1 missing).
- **C1 (HIGH), accepted:** Vite's HTML build rewrites the module script tag and drops `onerror`. Replaced with an inline capture-phase `window` `error` listener, tested against `dist/`.
- **Missing, accepted:** start-up exception handling was untested. Added a criterion that serves `index.html` without the board root so `main.ts` throws and the message appears.

Rejected: none. No blocking findings remain open.

## Rework 2 (2026-09-27): deploy concurrency and rollback target, after the planning review

The approver chose option (a): fix architecture §6 and ADR-011 (Codex plan review C1/C2/C4).
- **Verification:** the `concurrency.queue` key was checked against GitHub's official docs (https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) on 2026-09-27. It takes the values `single` (default: at most one pending run; an older pending run is cancelled and replaced) and `max` (up to 100 pending; the overflow is cancelled). Processing is first in, first out; `queue: max` with `cancel-in-progress: true` is a validation error; the docs example is workflow-level. It is confirmed as described and used; the URL is cited in ADR-011.
- **Changes:**
  - architecture §6 and ADR-011: `queue: max`, the latest-commit check after acquiring the slot, the rollback target requires successful deploy and smoke jobs, and manual dispatch refuses when CI is pending or failed.
  - acceptance R-014: rollback-target wording, plus two new criteria (overlapping runs; dispatch refusal).
  - PRD R-014: one-phrase clarification, "whose deploy and smoke test both succeeded".
- **Rework review (Codex):** AGREE, with 1 medium finding and 1 missing note.
  - C1 (MEDIUM), accepted as a documented limit: if more than 100 runs are pending, the overflow is cancelled. The remedy is to re-run the deploy for main's tip. This follows Codex's second option; no retry trigger was added, keeping the rollback minimal.
  - Missing, accepted: "latest" is evaluated when a run acquires the slot; a newer commit's queued run deploys next.

Rejected: none. No blocking findings remain open.

## Rework 3 (2026-09-28): drop "plain"/"simple" for the design personality

Decision D-4ff09b264a6545a69e47b5a2468b0f55, option (a), by Claude (test operator, authorized by Jim Gibbs): the new design personality (playful, tactile, confident) conflicted with "plain"/"simple" wording. The wording is dropped; every testable constraint is kept.

| Change | Where |
|---|---|
| "a plain, fast, ad-free game" → "a fast, ad-free game" | PRD §1 |
| R-013 restated: high-contrast (text ≥ 7:1, non-text ≥ 3:1), system font stack only, every visual drawn locally with CSS or inline SVG; no web fonts, no external images, no existing brand; personality set in design | PRD §4 R-013 |
| Heading renamed; new criterion: no font or image file requested during a full game, and `dist/` has no `@font-face`, no `<img>`, no file-referencing `url()` | acceptance R-013 |
| Quality standard and `design.brand` reworded without "plain"/"simple", with the same constraints made explicit | intent.json |

Unchanged: R-010 (44 px targets), R-011 (50 KB JS gzipped), R-012 (no external requests, no storage), the R-013 font-family and contrast criteria.

Rework review: Codex, AGREE (0 critical, 0 high, 2 medium).
- **C1 (MEDIUM), accepted:** the first draft of the new criterion only banned images from other origins, so a same-origin `<img src="/texture.png">` passed while R-013 requires CSS or inline SVG. The criterion now bans any image file from any origin, any `<img>` element and any file-referencing `url()` in `dist/`. The current app uses none (checked `index.html`, `src/`).
- **C2 (MEDIUM), rejected for this phase:** `design/design-system.md` still says "plain" and "no shadows". It is a design artifact; reopening at specification already invalidated the design approval, and the design rework replaces it. It is not a specification input.

For the human: C1 tightens "drawn locally" to mean CSS or inline SVG only (no image files at all, even from the site's own origin). Say so if same-origin image files should be allowed.

No blocking findings remain open.

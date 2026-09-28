# QA reconciliation, round 2 (2026-09-28): Tabletop Tiles restyle and motion

Scope: `5ebe604..661b82e` on main (F-014 #18 and F-015 #19, merged), plus the QA fixes on `factory/qa-fixes-restyle` (`94ca02a`, `bced0a5`).

## Reviewer availability

| Reviewer | Ran | Notes |
|---|---|---|
| factory-code-reviewer (agent) | yes | APPROVE: 0 critical/high, 5 medium, 9 low. It first stopped at its turn limit and delivered its report when resumed. |
| factory-security-reviewer (agent) | yes | FINDINGS, non-blocking: 1 medium, 1 low; `npm audit` 0 vulnerabilities (including `--omit=dev`); no new dependencies. |
| Codex (whole change `5ebe604..661b82e`) | yes | AGREE: no findings. |
| Ollama | no | disabled by the approver on 2026-09-27 |

## Resolution of each finding

- **SR-1 (medium), fixed:** the R-013 checker was bypassable. It now decodes CSS escapes and HTML character references. It also reports `@import`, `image-set()`/`cross-fade()`, unterminated `url(`, SVG `<image>`/`<feImage>`, `<source>`, `<object>`, `<embed>`, `<input type=image>`, icon/preload links, `srcset`/`poster`/`background`, and a `<use>` pointing at another file. Every bypass the reviewer demonstrated has a regression fixture.
- **SR-2 (low), fixed:** `index.html` declares `<link rel="icon" href="data:,">`, so browsers no longer request `/favicon.ico`. A unit test pins it, and the checker allows exactly that empty data icon.
- **CR-1 (medium), fixed:** `findNewlyPlacedSquares` → `findNewlyPlacedSquareIndexes`, and the local variable is now `newlyPlacedIndexes`.
- **CR-2 (medium), fixed:** `winLine`/`winningLine` were near-duplicate names. The overlay is now a typed `WinLineOverlay` (`createWinLineOverlay`, `renderWinLineOverlay`).
- **CR-3 (medium), partly fixed:** the element was called "piece" in TypeScript and "mark" in CSS.
  - `showPieceMark` → `setPieceSymbol`, and a comment states that a piece is the SVG drawing of a mark whose design-system class is `.mark`.
  - Renaming the CSS classes was **rejected**. `.mark`/`.mark--x`/`.mark--o` are the approved design system's names (design-system.md §5 and the mockups), and a rename would churn the design and the tests with no behaviour change.
- **CR-4 (medium), fixed:** `TILE_CENTRES` → `TILE_CENTRE_POSITIONS_UNITS`, in the source and the test.
- **CR-5 (medium), for the human:** architecture.md is stale in §1, §2 (component rows, Styles, Page, CI scripts, including `check-dist-origins` → `check-build-origins`), §5 (strike line), §6, §8 and §9 (motion). Updating it means reopening the approved specification (see the QA report).
- **CR-6 (low), fixed:** `line-direction.ts` now imports `COLUMN_COUNT`, derives the centre distance, and throws `RangeError` instead of silently falling back to 0.
- **CR-7 (low), fixed:** typed references to the `use` element (which throws if it's missing) and the overlay path replace `firstElementChild?.`.
- **CR-8 (low), fixed:** the X/O suffix is now computed once (`markSuffix`).
- **CR-9 (low), fixed:** a comment explains `data-line` as the test and debugging hook.
- **CR-10 (low), fixed:** `waitForAnimationsToFinish` is bounded to 2 s with a clear error.
- **CR-11 (low), fixed:** `readScreenColor`'s `animations` parameter → `animationMode`.
- **CR-12 (low), fixed:** the reviewer warned the 600 ms wall-clock deadline test had a thin margin, and it then flaked once on Firefox during QA, on unchanged `main` under local load. The test now reads each animation's own delay plus duration (at most 520 ms) in the first frame, then waits for them to finish (bounded).
- **QA-1 (medium), deferred:** Firefox e2e flake under local full-parallel load. `expect.poll` 5 s timeouts in `announcements.spec.ts` (piece-name poll) failed about 1 run in 3; they pass on rerun and in CI (#18 and #19 green). The same class was seen on unchanged `main`. The fix idea (fewer local workers for Firefox, or a longer expect timeout) is a tooling change for the retro.
- **CR-13 (low), accepted:** the first-frame probe compares the live region with its own final text. The exact A3/A6 strings are asserted by `announcements.spec.ts`, and this test's purpose is timing.
- **CR-14 (low), for the human:** the real-iPhone press check, added to the human follow-ups.

## Conflict resolution

There were no conflicts between reviewers. For CR-3 the approved design contract takes precedence over a naming preference (existing contract beats churn).

---

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

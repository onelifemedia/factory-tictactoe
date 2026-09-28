# QA report: factory-tictactoe, round 2 (Tabletop Tiles restyle and motion)

_Whole change since the last QA, `5ebe604` → `main` @ `661b82e` (F-014 #18, F-015 #19, both merged), plus the QA fixes on `factory/qa-fixes-restyle` (`94ca02a`, `bced0a5`, and `d92c991` after Codex reviewed the fixes). Date: 2026-09-28. The first QA round is kept below._

## For the human (decide or do)

1. **Approve this QA report.** Then the QA fixes pull request (`factory/qa-fixes-restyle`, unit `QA`) must merge, because the CI gate requires it.
2. **Not performed by the factory: human follow-ups**, as agreed in intent.
   - **Real screen-reader pass (VoiceOver on macOS):**
     - Play a full game with each first mover.
     - Confirm that A1–A8 are spoken, including the move, the result and the winning line.
     - Confirm that a repeated taken-square message (A8 twice) is spoken again.
     - Confirm that the new SVG pieces add nothing to what is spoken: they are `aria-hidden`, and square names are unchanged.
   - **Real devices, iOS Safari and Android Chrome:**
     - Tap play, the layout at phone width, 44 px targets and focus behaviour.
     - The Tabletop Tiles look: tray, tiles, pieces, and the gold winning tiles with the bar under the pieces.
     - With the OS set to reduce motion, nothing moves.
   - **New: real-iPhone press check (F-015).** On an iPhone, pressing a tile or a button visibly sinks it (the `:active` state).
     - The passive `touchstart` listener that iOS Safari needs is unit-tested and wired in `main.ts`.
     - iOS Safari's `:active` behaviour can't be emulated.
3. **Deploys are failing (operational; outside this QA's scope).**
   - Every Deploy run on `main` since the first one (02:37, before this change, then again after #18 and #19) builds and deploys, but the smoke test times out waiting for the new `build-id`.
   - Pages reports the site at `http://onelifemedia.com/factory-tictactoe/` (the organization's custom domain), and the smoke test never sees the new build there.
   - Rollback then fails, because no successful deploy exists yet to roll back to.
   - The deploy phase has not been run for this project: R-014's live criteria are "verified in deploy phase". This belongs there (Pages settings and custom-domain DNS, then the smoke URL) and is not fixed here.
4. **Architecture text drift (agreed: note it, do not reopen).** `architecture.md` now also lags the code in these places:
   - §1 flowchart and §2 component rows: no `line-direction.ts`, `new-pieces.ts` or `touch-active.ts`.
   - The View, Styles and Page rows don't mention the SVG pieces, the win-line overlay, the symbol sheet, tokens v2 or the motion block.
   - The CI scripts row names `check-dist-origins.mjs` (the file is `check-build-origins.mjs`) and omits `check-local-visuals.mjs`.
   - §5 describes a strike line.
   - §6 and §8 omit the visuals check.
   - §9 predates the motion.

   Behaviour matches acceptance, design and the feature records; only the architecture descriptions lag. Per the approver's decision (2026-09-28) this is recorded here and in the retro, and the specification is **not** reopened.

## Reviewer verdicts

| Reviewer | Verdict | Critical / High | Notes |
|---|---|---|---|
| factory-code-reviewer | APPROVE | 0 / 0 | 5 medium, 9 low. All fixed except CR-3 (part), CR-5 and CR-14 (for-human) and CR-13 (accepted). CR-12 was first accepted, then fixed when it flaked |
| factory-security-reviewer | FINDINGS (non-blocking) | 0 / 0 | SR-1 medium (checker bypasses) and SR-2 low (favicon request), both fixed. `npm audit`: 0 vulnerabilities; no new dependencies |
| Codex, whole change `5ebe604..661b82e` | AGREE | 0 / 0 | No findings |
| Codex, QA fixes `661b82e..7bb3f7c` | AGREE | 0 / 0 | 4 medium, 1 low (CQ-1 to CQ-5), all fixed. No further round, because none was high or critical |
| Ollama | disabled by the approver | — | — |

Per-feature reviews already ran:
- F-014: Codex on the spec (AGREE, 3 accepted) and on the diff (AGREE, 1 fixed).
- F-015: Codex on the spec (AGREE, 8 accepted) and on the diff (AGREE, 2 fixed).

## Findings

| ID | Severity | Source | Finding | Status |
|---|---|---|---|---|
| SR-1 | MEDIUM | security | The R-013 checker missed CSS escapes, `@import`, `image-set()`, entity-encoded `url(`, SVG `<image>`/`<feImage>`, icon/preload links, `srcset`/`poster`, `<object>`/`<embed>`/`<input type=image>` and external `<use>` | **fixed** (`94ca02a`): decoding plus element and attribute rules, with a regression fixture per bypass |
| SR-2 | LOW | security | Browsers auto-request `/favicon.ico` (an image request) | **fixed** (`94ca02a`): `<link rel="icon" href="data:,">`, pinned by a unit test |
| CR-1 | MEDIUM | code | `findNewlyPlacedSquares` returns indexes | **fixed**: `findNewlyPlacedSquareIndexes` |
| CR-2 | MEDIUM | code | `winLine` vs `winningLine` | **fixed**: typed `WinLineOverlay` |
| CR-3 | MEDIUM | code | "piece" (TypeScript) vs "mark" (CSS) | **partly fixed**: `setPieceSymbol` plus a comment. The CSS class rename was rejected: `.mark` is the approved design system's name |
| CR-4 | MEDIUM | code | `TILE_CENTRES` has no unit | **fixed**: `TILE_CENTRE_POSITIONS_UNITS` |
| CR-5 | MEDIUM | code | `architecture.md` is stale | **for-human**: item 4; recorded, not reopened |
| CR-6 | LOW | code | Hard-coded 3, literal 200, silent `?? 0` | **fixed**: `COLUMN_COUNT`, derived distance, `RangeError` |
| CR-7 | LOW | code | `firstElementChild?.` could fail silently | **fixed**: typed references; a missing `<use>` throws |
| CR-8 | LOW | code | X/O suffix computed twice | **fixed** |
| CR-9 | LOW | code | `data-line` purpose unclear | **fixed**: comment |
| CR-10 | LOW | code | `waitForAnimationsToFinish` unbounded | **fixed**: 2 s bound with a clear error |
| CR-11 | LOW | code | `animations` parameter name | **fixed**: `animationMode` |
| CR-12 | LOW | code | 600 ms wall-clock deadline test has a thin margin | **fixed** after it flaked on Firefox: it now checks each animation's delay plus duration ≤ 520 ms, then waits for them to finish |
| CR-13 | LOW | code | First-frame probe compares the live region with itself | **accepted**: exact A3/A6 text is asserted in `announcements.spec.ts`; this test is about timing |
| CR-14 | LOW | code | iOS `:active` can't be emulated | **for-human**: real-iPhone press check (item 2) |
| CQ-1 | MEDIUM | Codex (fixes) | A `<script>` tag inside a comment hid a real `<img>` between two comments | **fixed**: comments are stripped before scripts; fixture |
| CQ-2 | MEDIUM | Codex (fixes) | `&bsol;75 rl(` (named-entity CSS escape) not decoded | **fixed**: `bsol`, `num`, `semi`, `comma` and `equals` added to the shared decoder; fixture. Residual: named entities outside that table are not decoded; the build is ours and `check:origins` still guards R-012 (accepted) |
| CQ-3 | MEDIUM | Codex (fixes) | Script and style preloads were flagged | **fixed**: preload/prefetch count only for image, font or no destination; fixtures |
| CQ-4 | MEDIUM | Codex (fixes) | The settle test could be fooled by a slowed playback rate | **fixed**: end times are divided by `playbackRate`. The move-relative wall-clock deadline is not restored, because it flaked (CR-12); the design timing plus the bounded wait cover criterion 3 |
| CQ-5 | LOW | Codex (fixes) | An out-of-range CSS escape crashed the checker | **fixed**: U+FFFD per CSS; fixture |
| QA-1 | MEDIUM | QA run | Firefox e2e flake under local full-parallel load: piece-name `expect.poll` 5 s timeouts, about 1 run in 3. Also seen on unchanged `main`; green in CI (#18, #19) and on rerun | **deferred** to the retro as a tooling change (fewer local Firefox workers or a longer expect timeout). Not a product defect |

## Coverage

- **Unit (Vitest):** 541 passed, 4 skipped. Coverage is from a transient `@vitest/coverage-v8` run, not added to the project:
  - `focus.ts`: 100 % lines.
  - `line-direction.ts`: 94.7 % lines; the uncovered line is the `RangeError` guard.
  - `announcer.ts`: 92 % lines.
  - `check-local-visuals.mjs`: 83 % lines; the uncovered lines are its CLI path, which the tests run as a child process.
  - Game core, `messages.ts`, `new-pieces.ts` and `touch-active.ts`: 100 %.
  - `view.ts` and `main.ts`: 0 % in unit coverage; they are exercised by the e2e suite.
- **End to end (Playwright):** 645 tests across Chromium, Firefox, WebKit, Android and iPhone emulation; 10 hover and press tests are skipped on the touch-only projects. They cover every F-014 and F-015 criterion: tokens, pieces, the win-line geometry within 1 px, layering pixels, layout at 4 viewports, the reduced-motion and motion timing checks, board stability and the regressions. Each full run in QA had 644 passed and 1 Firefox flake (QA-1), a different test each time, which passed on rerun.
- **Primary metric (R-003):** unchanged; the exhaustive never-lose test passes (0 computer losses).
- **Declared and executed coverage:** `validate.sh qa`, 0 findings.
- **Build guards:** the JS bundle is 3,801 bytes gzipped (limit 51,200). `check:origins` and `check:visuals` (hardened) are clean on `dist/`.

## Licenses (`validate.sh licenses`)

- No dependency changed in this round: `package-lock.json` is identical between `5ebe604` and the QA fixes.
- 0 findings against the policy; license mix as in round 1.
- `npm audit`: 0 vulnerabilities, including with `--omit=dev`.

## Standards

`standards.sh check`: 0 findings. Format, lint (naming rules included) and typecheck are clean. No suppressed lint rules. The one `prettier-ignore` (`--size-win-line-inset` kept on one line to match its token) is documented in `styles.css` and in F-014.

## Open items

- The human follow-ups in item 2.
- The failing deploys (item 3), for the deploy phase.
- Architecture drift (item 4), for the retro.
- QA-1 (the Firefox flake), for the retro.
- **Plugin notes for the retro:**
  - The auto-mode safety check returned no verdict on 7 consecutive shell commands during this QA, which stopped the session once.
  - Test-writer and code-reviewer agents hit their turn limits and had to be resumed to deliver reports.
  - `validate.sh licenses` has no `--include-dev` flag now; round 1's note about including dev dependencies still applies.

---

# Previous QA round (2026-09-27): F-001 to F-013

_Whole change `0d19214` (planning approved) → `main` @ `87bb290` (F-001 to F-013 merged), plus the QA fixes on `factory/qa-fixes` @ `bbdeba7`. Date: 2026-09-27._

## For the human (decide or do)

1. **Approve this QA report.** Then the QA fixes pull request (`factory/qa-fixes`) must merge, because the CI gate requires it.
2. **Not performed by the factory: human follow-up**, as agreed in intent:
   - **Real screen-reader pass (VoiceOver on macOS):** play a full game with each first mover. Confirm that the move, result and winning-line announcements (A1–A8) are spoken, and that a **repeated taken-square message (A8 twice) is spoken again**. The tests prove only that the live region is cleared and set again.
   - **Real-device check on iOS Safari and Android Chrome:** tap play, layout at the phone width, 44 px targets, and focus behaviour. Automated coverage is engine-level only (Playwright WebKit and Chromium with phone emulation).
3. **Deploy phase prerequisites.** These are not done here: Pages is still off, as instructed.
   - Enable Pages with source "GitHub Actions".
   - The `github-pages` environment must have **no required reviewers** (otherwise the automatic rollback waits for a human) and a deployment branch policy of `main`.
   - The live deploy, smoke test and forced rollback (R-014 criteria marked "verified in deploy phase") are verified then.
4. **Architecture text drift (accepted, low).** `architecture.md` does not match the code in these places:
   - §2 names `src/ui/keyboard.ts`; the code has `focus.ts` + `view.ts`.
   - `classifyLine` now lives in `src/ui/line-direction.ts`.
   - The deploy job graph now has `deploy`/`smoke`/`rollback` each requiring `.github/actions/require-latest-main`, and `rollback` needs `prepare`.
   - Behaviour matches acceptance and ADR-011; only descriptions differ.
   - Fixing the text means reopening the approved specification, which clears the design and plan approvals, so I recommend recording this in the retro and **not** reopening now.

## Reviewer verdicts

| Reviewer | Verdict | Critical / High | Notes |
|---|---|---|---|
| factory-code-reviewer | REQUEST-CHANGES → resolved | 0 / 2 | Naming (2 high), 13 medium, 7 low. All high and medium fixed except the `Cell` rename (accepted, documented) |
| factory-security-reviewer | CLEAN | 0 / 0 | 2 low hardening items, both fixed. `npm audit`: 0 vulnerabilities |
| Codex, whole change, round 1 (`0d19214..932c9a9`, code only) | AGREE-WITH-CONCERNS | 0 / 1 | Partial rerun could redeploy a stale commit. Fixed |
| Codex, round 2 (`932c9a9..d7d8816`) | AGREE-WITH-CONCERNS | 0 / 1 | The same bypass through smoke/rollback reruns. Fixed |
| Codex, round 3 (`d7d8816..d03ba90`) | AGREE | 0 / 0 | 1 medium (guard timing) and 1 missing (behavioural tests), both fixed in `bbdeba7` |
| Ollama | disabled by the approver | — | — |

## Findings

| ID | Severity | Source | Finding | Status |
|---|---|---|---|---|
| CX-1 | HIGH | Codex r1 | "Re-run failed jobs" reused a passed `prepare`, so an old run could redeploy over a newer release | **fixed**: `deploy` re-checks main's tip on every attempt (`d7d8816`) |
| CX-2 | HIGH | Codex r2 | Smoke or rollback reruns of an old run could still roll back over a newer release | **fixed**: `.github/actions/require-latest-main` guards `deploy`, `smoke` and `rollback` (`d03ba90`) |
| CX-3 | MEDIUM | Codex r3 | Guards in smoke and rollback ran well before acting | **fixed**: each guard now runs right before its action (`bbdeba7`). Residual: an API check cannot be atomic with publishing, but the shared `pages` queue keeps other deploys out meanwhile (accepted) |
| CX-4 | MISSING | Codex r3 | No behavioural tests of the guard | **fixed**: `tests/unit/require-latest-main.test.ts` runs the action's script against a stub `gh` (tip / moved on / API failure); an inverted comparison fails 2 tests |
| CR-1 | HIGH | code | A `<span>` named `mark` (domain `Mark` = X/O) | **fixed**: `markElement` |
| CR-2 | HIGH | code | `winner` held a phrase, not a `Mark` | **fixed**: `winnerPhrase` |
| CR-3 | MEDIUM | code | R-008 "no opponent injection in production" untested | **fixed**: `tests/unit/production-wiring.test.ts`, a guard test (passes on current code) |
| CR-4 | MEDIUM | code | Line classification duplicated in view and messages | **fixed**: `src/ui/line-direction.ts`, which `describeLine` reuses |
| CR-5 | MEDIUM | code | Duplicated board constants | **fixed**: `board.ts` exports `SQUARE_COUNT`/`COLUMN_COUNT`; the view uses `createEmptyBoard()` |
| CR-6 | MEDIUM | code | Copy-pasted script helpers (3×) | **fixed**: `scripts/command-line.mjs` |
| CR-7 | MEDIUM | code | Non-verb or vague names: `emptySquares`, `squareLabel`, `statusText`, `winningLineOf`, `makeActive`, `applyFocus`, `apply`/`current`, `positionValues`/`describePosition`, `options`/`next`, `callGitHub`, `described` | **fixed**: renamed (`listEmptySquares`, `describeSquareLabel`, `describeStatus`, `findWinningLine`, `makeSquareActive`, `moveFocusToTarget`, `applyGameStep`/`currentStep`, `valuesByPositionKey`/`buildPositionKey`, `firstMoverChoices`/`nextIndex`, `fetchGitHubJson`, a `STATE_DESCRIPTIONS` table) |
| CR-8 | MEDIUM | code | `Cell` vs the PRD's "square" | **accepted-risk**: documented in `board.ts` as a square's content; a rename would touch every module for no behaviour change |
| CR-9 | LOW | code | `select-rollback-run` CLI used only by tests | **fixed**: CLI and its tests removed |
| CR-10 | LOW | code | `gh api` had no timeout or retry, and an API error looked like "no earlier deploy" | **fixed**: 30 s timeout, one retry, exit 2 for API errors (deploy.yml reports it separately); CLI tests with a failing stub |
| CR-11 | LOW | code | A missing API field defaulted to eligible | **fixed**: strict `event`/`head_branch`/`status` |
| CR-12 | LOW | code | Errors after start-up leave a dead board | **accepted-risk**: only programming errors can throw after start-up; the state machine turns illegal input into events |
| CR-13 | LOW | code | Architecture text drift | **for-human** (item 4 above) |
| CR-14 | LOW | code | `pendingFrame`, `injectBuildId` names | **fixed**: `pendingFrameHandle`, `createBuildIdPlugin` |
| CR-15 | LOW | code | No explicit test of the `es2022` target (R-015) | **fixed**: production-wiring test |
| SR-1 | LOW | security | `workflow_run` on `main` also matches a fork's branch named `main` | **fixed**: `prepare` also requires `event == 'push'` and `head_repository == github.repository` |
| SR-2 | LOW | security | Actions pinned by mutable tag | **fixed**: all actions pinned by commit SHA (tag in a comment), actionlint by image digest; a test enforces it |

No CRITICAL findings. No blocking findings remain open. No reviewer finding was rejected, so no rebuttal round was needed.

## Coverage

- **Unit (Vitest, 393 passing, plus 4 smoke-harness tests run in CI):** transient `@vitest/coverage-v8` run, not added to the project.
  - **Game core** (`board.ts`, `computer-player.ts`, `game.ts`) and **`messages.ts`**: **100 % lines and branches**.
  - `focus.ts`: 100 % lines, 93.5 % branches. `announcer.ts`: 92 % lines.
  - `view.ts` and `main.ts`: about 9 % and 0 % in unit coverage. They are exercised by the e2e suite (not instrumented).
  - Scripts: 29–82 %. Their CLI paths run as child processes in the tests, which unit coverage doesn't instrument.
- **End to end (Playwright):** 380 runs = 76 tests × 5 projects (Chromium, Firefox, WebKit, Android and iPhone emulation). They cover every UI acceptance criterion: keyboard, focus, announcements, axe (4 states × 5), layout (4 viewports, 200 % text), load errors and privacy.
- **Primary metric (R-003):** exhaustive enumeration shows **0 computer losses**: 569 games human-first, 73 computer-first.
- **Declared and executed coverage:** `validate.sh qa` reports every MUST requirement and every feature referenced by tests, named in commits, and with a recorded passing run. 0 findings.
- **Build guards:** JS bundle **3,307 bytes gzipped** (limit 51,200). No other-origin references in `dist/`.

## Licenses (`validate.sh licenses --include-dev`)

Every dependency is development-only; the shipped bundle contains only project code. 188 packages, **0 findings** against the policy.

| License | Packages |
|---|---|
| MIT | 134 |
| Apache-2.0 | 19 |
| MPL-2.0 | 14 (includes axe-core and @axe-core/playwright, used unmodified at test time only) |
| ISC | 8 |
| BSD-2-Clause | 8 |
| BSD-3-Clause | 2 |
| CC-BY-4.0 | 1 |
| CC0-1.0 | 1 |
| BlueOak-1.0.0 | 1 |

`npm audit`: 0 vulnerabilities.

## Standards

`standards.sh check`: ok, 0 findings. Format, lint (naming rules included) and typecheck are clean. No suppressed lint rules (`eslint-disable`, `@ts-ignore` and `@ts-expect-error` never appear). actionlint 1.7.12 is clean, with only the documented `queue` key ignored.

## Open items

- The human follow-ups in item 2 above.
- Deploy-phase verification of R-014 (item 3).
- Architecture text drift (item 4), recommended for the retro.
- **Plugin notes for the retro:**
  - `validate.sh licenses` omits dev dependencies by default. For a project whose dependencies are all dev-only, the QA gate reports "0 dependencies", so `--include-dev` should be the QA default.
  - `second-opinion.sh --diff` on the whole change (32,534 lines including the lockfile and `.factory`) failed without writing a prompt and was reported as "reviewer failed". The review was run on a code-only diff file instead.

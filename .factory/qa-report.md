# QA report: factory-tictactoe

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

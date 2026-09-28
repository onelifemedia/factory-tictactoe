You are an independent second-opinion reviewer in a software factory pipeline.
A different AI (Claude) produced the DRAFT below. Your job is to find what it got
wrong, what it missed, and where a materially better approach exists. Do not
rubber-stamp, and do not inflate: report only findings you would defend with
evidence (a line, an input that breaks it, a requirement it violates). Do not
rewrite the whole thing. Be specific and terse.

Review kind: prd
Reviewer: {{REVIEWER}}
Project: factory-tictactoe

Focus especially on: This amendment drops 'plain'/'simple' so the design phase can pursue a playful, tactile, confident personality. Check that every testable constraint is preserved (system font stack only, text >=7:1 and non-text >=3:1, all visuals drawn locally with no web fonts or external images, no existing brand, 44 px targets, 50 KB JS gzipped, no external requests), that no testable constraint was weakened, that nothing else still says 'plain', and that the new R-013 criterion is testable and consistent with R-012.

Respond in EXACTLY this format (markdown):

## Verdict
Exactly one of:
- AGREE — no CRITICAL or HIGH findings.
- AGREE-WITH-CONCERNS — CRITICAL or HIGH findings that can be fixed within this approach.
- DISAGREE — the approach itself is wrong: you would redo it rather than patch it, and you describe what instead under Alternative.
Findings alone, however many or severe, never make a DISAGREE; they make AGREE-WITH-CONCERNS.
One sentence of justification.

## Findings
Number every finding C1, C2, … so the author can answer each one. One bullet each:
- [C1] [CRITICAL|HIGH|MEDIUM|LOW] <where> — <what is wrong> — <evidence> — <what to do instead>
(CRITICAL = will cause data loss, security hole, wrong behavior, or blocks the goal. Use it sparingly and only when sure.)

## Missing
Bullets: things the draft should address but doesn't. Empty if none.

## Alternative
If you would take a materially different approach, describe it in <=8 lines and say why it's better. Otherwise write "None".

## Questions for the human
Bullets: decisions only the product owner can make. Empty if none.

=== CONTEXT (read-only, for reference) ===

--- .factory/intent.json ---
{
  "version": 2,
  "captured_at": "2026-09-27T20:20:18Z",
  "mode": "new",
  "project_name": "factory-tictactoe",
  "problem": {
    "statement": "Casual players who want a quick game of tic-tac-toe in a browser have to put up with ad-heavy, slow game sites that are awkward to use with a keyboard or screen reader, because those sites are built to maximise ad impressions rather than to play well.",
    "severity": "low",
    "current_solutions": "Ad-supported browser game sites and app-store apps.",
    "gaps": "Ads, slow loads, sign-up prompts, poor keyboard and screen-reader support.",
    "cost_of_inaction": "Low for players; for the team, the Software Factory lacks an end-to-end live test with every phase exercised."
  },
  "user": {
    "primary_persona": "Casual novice player with about two minutes to spare on a phone (touch) or laptop (mouse/trackpad), wanting a quick game with zero friction.",
    "day_in_the_life": "Waiting in a queue or between tasks, opens a link, plays one or two games in under two minutes, closes the tab. Today they hit ads, slow loads and sign-up prompts first.",
    "skill_level": "novice"
  },
  "success": {
    "thirty_day_goal": "Done checklist: (1) the live GitHub Pages URL loads; (2) the exhaustive never-lose test passes in CI; (3) zero axe-core violations; (4) JavaScript bundle under 50 KB gzipped; (5) a full game completes using the keyboard only (Playwright).",
    "primary_metric": "Computer losses across every reachable game position, verified by an exhaustive automated test",
    "target_value": "0"
  },
  "scope": {
    "mvp": [
      "Play a full game against a perfect (never-losing) computer: legal moves only, win/draw detection, winning line highlighted, result message, play again. Before each game the player chooses who moves first (you or the computer). The human is always X and the computer always O; when the computer starts, O opens (intended, not a bug).",
      "Full keyboard and screen-reader play: arrow/tab navigation, Enter/Space to place, live announcements of moves and results (WCAG 2.2 AA).",
      "Responsive layout usable by touch on phones and by mouse on laptops."
    ],
    "explicitly_out_of_scope": [
      "Easier modes or difficulty levels",
      "Hot-seat two-player mode",
      "Win/draw tally",
      "Choosing X or O (picking a symbol)",
      "Sound",
      "Animations beyond basics",
      "Themes / dark mode",
      "PWA / offline install",
      "Translations",
      "Accounts",
      "Persistence",
      "Bigger boards",
      "Analytics",
      "Ads",
      "Real-device iOS/Android testing (this build)",
      "Screen readers other than VoiceOver; any manual screen-reader pass by the factory",
      "Undo / take-back",
      "Move history",
      "Rules / help page",
      "Custom domain"
    ],
    "complexity_ceiling": "Anything that needs a server or storage."
  },
  "change": {
    "summary": "n/a",
    "touches": [],
    "must_not_break": []
  },
  "technology": {
    "committed": [
      "GitHub Pages hosting",
      "Static site, no backend",
      "npm",
      "Node 22 (pinned in .nvmrc and package.json engines)",
      "GitHub (repo, Actions, Pages)"
    ],
    "flexible": [],
    "excluded": [
      "Analytics / tracking",
      "Ads",
      "Database",
      "Auth",
      "External services / APIs",
      "Server-side code or storage"
    ],
    "decisions": [
      {
        "choice": "Vanilla TypeScript (strict) + Vite",
        "alternatives": [
          "Preact + Vite",
          "Svelte + Vite"
        ],
        "why": "Smallest bundle, no framework churn; pure game logic separate from a thin DOM layer for a 9-cell UI."
      },
      {
        "choice": "GitHub Pages via GitHub Actions",
        "alternatives": [
          "Netlify",
          "Vercel"
        ],
        "why": "Committed by the human; free static hosting next to the repo, no extra accounts."
      },
      {
        "choice": "npm + Node 22",
        "alternatives": [
          "pnpm",
          "Node 24"
        ],
        "why": "Human's choice; pinned in .nvmrc and engines for reproducible CI."
      },
      {
        "choice": "Prettier (formatter)",
        "alternatives": [
          "Biome",
          "dprint"
        ],
        "why": "De facto standard, zero-config."
      },
      {
        "choice": "ESLint + typescript-eslint + eslint-plugin-unicorn (linter, factory naming rules)",
        "alternatives": [
          "Biome lint",
          "oxlint"
        ],
        "why": "Only option carrying the factory's TypeScript naming recipe (standards \u00a76)."
      },
      {
        "choice": "tsc --strict (type checker)",
        "alternatives": [
          "none"
        ],
        "why": "Built into TypeScript."
      },
      {
        "choice": "Vitest (unit tests, incl. exhaustive never-lose test)",
        "alternatives": [
          "Jest",
          "node:test"
        ],
        "why": "Native to Vite, fast, TypeScript without config."
      },
      {
        "choice": "Playwright + @axe-core/playwright (e2e, keyboard, accessibility)",
        "alternatives": [
          "Cypress + cypress-axe",
          "Vitest browser mode"
        ],
        "why": "Real-browser keyboard/touch tests and axe-core zero-violation checks in CI."
      }
    ],
    "license_policy": "default"
  },
  "constraints": {
    "quality_standards": [
      "WCAG 2.2 AA (hard constraint, not a trade-off)",
      "Full keyboard play",
      "Screen-reader announcements of moves and game results",
      "Zero axe-core violations",
      "Performance: JavaScript bundle under 50 KB gzipped",
      "No analytics, no ads, no sign-up, no install",
      "Visual: high-contrast (text at least 7:1, non-text at least 3:1); system font stack only; all visuals drawn locally (CSS or inline SVG), no web fonts or external images; no existing brand",
      "Browser support: current and previous versions of Chrome, Firefox, Safari and Edge, plus iOS Safari and Android Chrome",
      "Accessibility verification (automated): Playwright on Chromium, Firefox and WebKit plus phone-viewport emulation; keyboard-only full game; zero axe-core violations; exact live-region announcement text asserted in tests",
      "No manual screen-reader pass by the factory (an agent cannot listen to one). The QA report lists 'real screen-reader pass (VoiceOver) and real-device iOS/Android check' as NOT PERFORMED - human follow-up"
    ],
    "compliance": [
      "None applicable - no personal data, cookies, storage or tracking"
    ],
    "stakeholders": [
      {
        "name": "Claude (test operator, authorized by Jim Gibbs)",
        "role": "approver"
      }
    ]
  },
  "budget": {
    "total_usd": 150,
    "unbounded_acknowledged": false,
    "alert_channel": "in-session",
    "cost_of_problem": "Low - no revenue at stake; value is a playable ad-free game and a validated factory pipeline."
  },
  "operations": {
    "uptime_target": "Whatever GitHub Pages provides (no separate SLA)",
    "on_call": "Nobody - acknowledged. Deploy or smoke-test failures notify the repo owner via the GitHub Actions failure email.",
    "auto_rollback": true,
    "incident_plan": "Minimal automatic rollback: a post-deploy smoke test loads the live URL and plays one move; if it fails, the workflow redeploys the previous successful Pages artifact - nothing more. The repo owner is notified by the Actions failure email, then reverts the offending merge and redeploys."
  },
  "design": {
    "has_ui": true,
    "source": "factory",
    "brand": "none (no existing brand) - high-contrast, system font stack only, all visuals drawn locally; character comes from personality below",
    "personality": [
      "playful",
      "tactile",
      "confident"
    ],
    "references": [
      "a chalkboard at a game night",
      "classic arcade cabinets"
    ],
    "avoid": [
      "generic web-app blue",
      "flat grey admin look"
    ]
  },
  "review": {
    "second_opinion": true,
    "mode": "advisory"
  },
  "context": {
    "multi_session": true,
    "remember": [
      "Dual purpose: real playable game (defines the product) AND a full live test of the Software Factory - exercise every phase properly, no shortcuts.",
      "Unbeatable is a correctness bar: the computer must never lose, verified exhaustively over all reachable game states.",
      "Keyboard/screen-reader users are a hard constraint (WCAG 2.2 AA in MVP), not a secondary persona. Primary persona decides other trade-offs.",
      "Use the gh CLI (already authenticated, repo+workflow scopes) for all GitHub work; the GitHub MCP server is optional and not configured.",
      "All gate approvals and final product approval are recorded --by 'Claude (test operator, authorized by Jim Gibbs)', never as Jim. No advisors.",
      "Spec must state explicitly: human always X, computer always O; O opens when the player lets the computer start. The exhaustive never-lose test covers both starting sides.",
      "Never claim a screen-reader or real-device check was done: assert announcement text in Playwright; the QA report marks the VoiceOver and real-device checks as not performed (human follow-up).",
      "By design a novice can never win: the best outcome for the player is a draw. This is intended, not a defect.",
      "Automatic rollback stays minimal: redeploy the previous successful Pages artifact when the post-deploy smoke test fails, nothing more."
    ]
  },
  "next_step": "specification"
}

--- .factory/prd.md ---
# PRD: factory-tictactoe

_Traces to: `.factory/intent.json` (v2, captured 2026-09-27T20:20:18Z). Status: draft_

## 1. Problem

Casual players who want a quick game of tic-tac-toe in a browser have to put up with ad-heavy, slow game sites that are awkward to use with a keyboard or screen reader, because those sites are built to maximise ad impressions rather than to play well. We will ship a fast, ad-free game with a computer opponent that never loses, playable by touch, mouse, keyboard and screen reader, with no install, sign-up or tracking. Severity is low for players; the build is also the end-to-end live test of the Software Factory, so every phase is exercised properly.

## 2. Users

| Persona | Context | Goal | Pain today |
|---|---|---|---|
| Casual novice player (primary) | About two minutes to spare, on a phone (touch) or laptop (mouse/trackpad); opens a link, plays one or two games, closes the tab | A quick game with zero friction | Ads, slow loads and sign-up prompts before the first move |
| Keyboard-only or screen-reader player (hard constraint, not a trade-off) | Same situations, using keyboard navigation and/or a screen reader | Play a complete game and always know the board state and result | Most game sites cannot be played without a pointer or give no spoken feedback |

A player who wants to beat the machine is served automatically by perfect play. By design a player can never win; the best outcome for the player is a draw.

## 3. Goals & Success Metrics

| Goal | Metric | Target | How measured |
|---|---|---|---|
| The computer is unbeatable | Computer losses across every reachable game position, both starting sides | 0 | Exhaustive automated test in CI (R-003) |
| Live and correct within 30 days | Done checklist: live URL loads; exhaustive test passes in CI; zero axe-core violations; JS bundle under 50 KB gzipped; full keyboard-only game completes | All 5 items true | Post-deploy smoke test (R-014), CI jobs (R-003, R-009, R-011), Playwright keyboard test (R-007) |

## 4. Non-goals (explicitly out of scope)

- Easier modes or difficulty levels
- Hot-seat two-player mode
- Win/draw tally
- Choosing X or O (picking a symbol)
- Sound
- Animations beyond basics
- Themes / dark mode
- PWA / offline install
- Translations
- Accounts
- Persistence
- Bigger boards
- Analytics
- Ads
- Real-device iOS/Android testing (this build)
- Screen readers other than VoiceOver; any manual screen-reader pass by the factory
- Undo / take-back
- Move history
- Rules / help page
- Custom domain

Complexity ceiling: anything that needs a server or storage.

## 5. Requirements

| ID | Requirement | Priority | Rationale |
|---|---|---|---|
| R-001 | The game shows a 3×3 board. Only legal moves are accepted: a move on an occupied square, out of turn, or after the game has ended changes nothing. | MUST | intent.scope.mvp[0] — legal moves only |
| R-002 | Before each game the player chooses who moves first: "You" or "Computer". The human is always X and the computer always O; when the computer starts, O opens (intended, not a bug). | MUST | intent.scope.mvp[0]; context.remember (first-mover rule) |
| R-003 | The computer plays perfectly and never loses: from every position reachable in a game against any sequence of legal human moves, with either side starting, the computer's play never produces a human win. Verified by an exhaustive automated test. | MUST | intent.success.primary_metric (target 0) |
| R-004 | The game detects a win (three in a row for X or O) and a draw (full board, no winner), ends the game at that moment, and shows a result message. | MUST | intent.scope.mvp[0] |
| R-005 | When a game is won, the three squares of the winning line are highlighted by a means that does not rely on colour alone, and the winning line is described in text. | MUST | intent.scope.mvp[0]; WCAG 2.2 AA 1.4.1 |
| R-006 | After a game ends, a "Play again" control returns the player to the first-mover choice with an empty board. | MUST | intent.scope.mvp[0] |
| R-007 | A full game, including the first-mover choice and "Play again", can be played with the keyboard only: Tab reaches the board, arrow keys move between squares, Enter or Space places X, and focus is always visible. | MUST | intent.scope.mvp[1]; success done-checklist item 5 |
| R-008 | A polite live region announces, with exact fixed wording, the start of each game, each human move, each computer move, invalid-move attempts, and the result including the winning line. The exact texts are the announcement contract A1–A8 in `acceptance.md`: a human move and the computer reply form one message that ends with either "Your turn." or the result. Each square exposes its position and contents as its accessible name. | MUST | intent.scope.mvp[1]; constraints (announcement text asserted in tests) |
| R-009 | The page meets WCAG 2.2 AA and has zero axe-core violations in every game state (choice, in play, won, drawn) in Chromium, Firefox and WebKit. | MUST | intent.constraints.quality_standards |
| R-010 | The layout works from 320 CSS px wide phones to laptop screens without horizontal scrolling or zoom, is playable by touch and mouse, and every square and button is at least 44×44 CSS px (above the WCAG 2.2 AA 2.5.8 minimum of 24 px, chosen for the touch-first primary persona; confirmed by the approver 2026-09-27). | MUST | intent.scope.mvp[2]; WCAG 2.2 1.4.10, 2.5.8 |
| R-011 | The production JavaScript bundle is under 50 KB gzipped; CI fails the build if it is not. | MUST | intent.constraints (performance) |
| R-012 | The game makes no network requests beyond its own static files, sets no cookies, uses no web storage, and contains no analytics, ads, sign-up or install prompt. | MUST | intent.constraints; technology.excluded; complexity ceiling |
| R-013 | The visual style is high-contrast (text at least 7:1, non-text indicators at least 3:1), uses only the system font stack, and draws every visual locally with CSS or inline SVG: no web fonts, no external images, no existing brand. Its personality is set in the design phase (intent.design.personality). | MUST | intent.constraints; intent.design |
| R-014 | Whenever CI passes for the latest commit on main, GitHub Actions builds exactly that commit and deploys it to GitHub Pages. An older merge whose CI finishes after a newer merge is not deployed separately; it goes live as part of the newer commit. A post-deploy smoke test waits until the live page shows the deployed commit, then plays one move. If it fails, the workflow redeploys the Pages artifact of the most recent deploy run whose deploy and smoke test both succeeded, and the run fails, so the repo owner gets the Actions failure email. If no such run exists (first deployment) or its artifact has expired (artifacts are kept 90 days), the workflow only logs that and fails. Nothing more. | MUST | intent.operations; success done-checklist item 1; approver decisions 2026-09-27 |
| R-015 | Supported browsers are the current and previous versions of Chrome, Firefox, Safari and Edge, plus iOS Safari and Android Chrome; the build targets `es2022`, which all of them support. Automated verification is narrower and engine-level only: every end-to-end test runs in Chromium, Firefox and WebKit plus touch-enabled Android and iPhone emulations. Testing specific browser versions or real devices is not performed; the QA report lists it as human follow-up. | MUST | intent.constraints (browser support, verification) |

## 6. User Flows

**Flow A — player moves first (primary)**
1. Player opens the URL. The page shows the title and the first-mover choice ("You go first" / "Computer goes first"); the board is empty.
2. Player chooses "You go first". The board becomes active; status reads "Your turn. You are X."
3. Player places X on an empty square (tap, click, or Enter/Space on the focused square).
4. The computer immediately places O. Both moves are announced in one message.
5. Steps 3–4 repeat until a win or draw.
6. The result is shown and announced; on a win the three squares are highlighted and the line described. "Play again" appears and receives focus.
7. "Play again" returns to step 1's choice with an empty board.

**Flow B — computer moves first**
1–2. As Flow A, but the player chooses "Computer goes first". The computer places O immediately; the announcement states that O opens.
3. Play continues as Flow A from step 3.

**Unhappy paths**
- Player activates an occupied square: nothing changes on the board; the live region says the square is taken.
- Player activates a square after the game has ended: nothing changes (squares are disabled).
- Player tries to play before choosing who goes first: squares are disabled until a choice is made.
- JavaScript disabled or failing to load: a static message says the game needs JavaScript.

## 7. Data

No stored data. Game state lives in memory for the life of the tab and is discarded on reload. No personal data, cookies, web storage or telemetry (R-012).

## 8. Integrations & External Dependencies

| System | Purpose | Auth | Failure mode |
|---|---|---|---|
| GitHub Actions | CI (format, lint, typecheck, unit, exhaustive, bundle size, e2e/axe) and deploy | Repository GITHUB_TOKEN | Build fails; nothing deploys; owner gets failure email |
| GitHub Pages | Static hosting | Pages deploy permission in workflow | Site unavailable (GitHub's uptime; no separate SLA); bad deploy triggers R-014 rollback |

At run time the game has no integrations.

## 9. Quality Requirements

- **Correctness:** 0 computer losses in the exhaustive test (R-003).
- **Accessibility:** WCAG 2.2 AA; zero axe-core violations in all game states; exact live-region text asserted in Playwright; keyboard-only full game in CI (R-007–R-009). A real VoiceOver pass and a real-device iOS/Android check are **not performed** by the factory; the QA report lists them as human follow-up.
- **Performance:** JS under 50 KB gzipped (R-011); no web fonts (R-013); no third-party requests (R-012).
- **Privacy/security:** no data collected, no cookies, no storage, no third-party scripts (R-012). Compliance: none applicable.
- **Browser support:** the supported browser list is a requirement; automated verification is engine-level only (R-015). Version-specific and real-device checks are human follow-up.

## 10. Open Questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| 1 | Should a "New game" control also be available mid-game (not only after the game ends)? **Resolved 2026-09-27: no.** "Play again" appears only after a game ends. | Approver | No (resolved) |
| 2 | Should the computer's reply be instant or shown after a short pause? **Resolved 2026-09-27: instant.** No animations beyond basics; both moves are announced in one message. | Approver | No (resolved) |

## 11. Second-opinion summary

Reviewed 2026-09-27 by Codex (AGREE, 2 MEDIUM) and Ollama qwen2.5:14b (summary only, no findings in the required format).
- Accepted: R-015 now separates the supported-browser requirement from the narrower engine-level verification (Codex C1). R-014 now defines the rollback target as the latest deploy run that concluded successfully, and states the first-deploy behaviour (Codex C2). R-008 points to the exact announcement contract A1–A8 (Codex, Missing).
- Rejected: Ollama's suggestions of a help page and testing more screen readers are explicit non-goals.
- Architecture review (Codex AGREE-WITH-CONCERNS, 3 HIGH and 4 MEDIUM, all resolved; Ollama non-conforming): R-014 changed by approver decision to deploy only the latest commit on main and to accept the 90-day artifact expiry limit on rollback.
Details: `.factory/reviews/specification-reconciliation.md`.

--- .factory/acceptance.md ---
# Acceptance criteria: factory-tictactoe

_Traces to: `.factory/prd.md`. Every criterion is written to be checked by an automated test (Vitest unit tests, Playwright end-to-end tests, or a CI script), except where it says "verified in deploy phase"._

## Conventions used below

- Squares are numbered by **row 1–3 (top to bottom)** and **column 1–3 (left to right)**.
- `{R}`, `{C}` are the row and column of the human's move; `{R2}`, `{C2}` are those of the computer's move.
- `{LINE}` is one of: `row 1`, `row 2`, `row 3`, `column 1`, `column 2`, `column 3`, `the diagonal from top left to bottom right`, `the diagonal from top right to bottom left`.

### Announcement text (exact, used by R-002, R-004, R-005, R-008)

| ID | When | Exact live-region text |
|---|---|---|
| A1 | Game starts, human first | `New game. You go first. You are X. Your turn.` |
| A2 | Game starts, computer first | `New game. Computer goes first as O. Computer placed O in row {R2}, column {C2}. Your turn.` |
| A3 | Human moves, game continues | `You placed X in row {R}, column {C}. Computer placed O in row {R2}, column {C2}. Your turn.` |
| A4 | Human move wins (unreachable with a perfect computer, still defined) | `You placed X in row {R}, column {C}. You win with {LINE}.` |
| A5 | Human move fills the board with no winner | `You placed X in row {R}, column {C}. It's a draw.` |
| A6 | Computer move wins | `You placed X in row {R}, column {C}. Computer placed O in row {R2}, column {C2}. Computer wins with {LINE}.` |
| A7 | Computer move fills the board with no winner | `You placed X in row {R}, column {C}. Computer placed O in row {R2}, column {C2}. It's a draw.` |
| A8 | Human activates an occupied square | `Row {R}, column {C} is taken. Choose an empty square.` |

Square accessible names: `Row {R}, column {C}, empty` / `Row {R}, column {C}, X` / `Row {R}, column {C}, O`.

## R-001 Board and legal moves

- **Given** a game in progress with the human to move, **when** the human activates an empty square, **then** exactly that square shows X and no other square changes before the computer's reply.
- **Given** a game in progress, **when** the human activates a square showing X or O, **then** the board is unchanged and it is still the human's turn.
- **Given** the game state module, **when** a human move is submitted while it is the computer's turn or after the game has ended, **then** the move is rejected and the returned state equals the input state (unit test).

### Unhappy paths

- **Given** the first-mover choice has not been made, **when** the player clicks, taps or presses Enter on any square, **then** nothing is placed (squares are disabled).
- **Given** JavaScript is disabled, **when** the page loads, **then** a visible message says the game needs JavaScript (Playwright with `javaScriptEnabled: false`).
- **Given** JavaScript is enabled but the JavaScript bundle request fails (Playwright aborts it), **when** the page loads, **then** the visible message "The game didn't load. Try reloading the page." is shown (tested against the production build in `dist/`, not the dev server); **and given** the bundle loads normally, **then** that message is never visible at any point during the load (it ships `hidden`).
- **Given** the production build, **when** start-up throws (the Playwright test serves `index.html` with the board's root element removed, so `main.ts` fails to find it), **then** the same load-error message is shown.

## R-002 First-mover choice

- **Given** a fresh page load, **when** it renders, **then** two controls "You go first" and "Computer goes first" are visible, the board is empty, and no control to choose a symbol exists.
- **Given** the choice is shown, **when** the player chooses "You go first", **then** the board is empty, it is the human's turn as X, and the live region reads A1.
- **Given** the choice is shown, **when** the player chooses "Computer goes first", **then** exactly one square shows O, no square shows X, and the live region reads A2 naming that square.
- **Given** any game, **when** squares are filled, **then** every human-placed mark is X and every computer-placed mark is O, regardless of who started.

## R-003 Perfect, never-losing computer

- **Given** both starting sides, **when** a test enumerates every legal human move at every position where it is the human's turn and applies the computer's chosen reply at every position where it is the computer's turn, **then** no reachable finished game is a human (X) win, and the test reports the number of finished games examined (greater than 0) for each starting side.
- **Given** a position where the computer can complete three in a row, **when** it chooses a move, **then** it completes the line (unit test over all such reachable positions).
- **Given** the same position twice, **when** the computer chooses a move, **then** it returns the same square both times (deterministic).
- **Given** successive games in one process with alternating starters (human, computer, human, …), **when** the exhaustive enumeration runs for each, **then** results are identical to running each starter in a fresh process (the memo stays valid across starters).
- **Given** CI, **when** the unit-test job runs, **then** the exhaustive test runs on every push and pull request and finishes in under 60 seconds.

## R-004 Win and draw detection with result message

- **Given** each of the 8 lines filled with X, and separately with O, **when** the board is evaluated, **then** the winner is that symbol and the line is identified (unit test, 16 cases).
- **Given** a full board with no three in a row, **when** it is evaluated, **then** the result is a draw.
- **Given** a move that wins or fills the board, **when** it is applied, **then** the game ends, all squares become disabled, and the visible result text contains "Computer wins", "You win" or "It's a draw" accordingly, and the live region reads A4, A5, A6 or A7 accordingly.

## R-005 Winning line highlight

- **Given** a game the computer has won, **when** the result is shown, **then** exactly the three squares of the winning line are marked as winning and each of them differs from non-winning squares in at least one non-colour computed style (border width or style, outline, or text decoration) or carries an overlaid line element.
- **Given** a game the computer has won, **when** the result is shown, **then** the visible result text and the live region both name the line using `{LINE}` wording.
- **Given** a drawn game, **when** the result is shown, **then** no square is marked as winning.

## R-006 Play again

- **Given** a finished game, **when** the result is shown, **then** a "Play again" button is visible and has keyboard focus.
- **Given** a game in progress, **when** the page is inspected, **then** no "Play again" button is visible.
- **Given** a finished game, **when** the player activates "Play again", **then** the board is empty, the first-mover choice is shown, and focus is on "You go first".

## R-007 Keyboard-only play

- **Given** a fresh page, **when** a Playwright test plays a complete game using only Tab, Shift+Tab, arrow keys, Enter and Space (no pointer events), choosing "You go first", **then** the game reaches a result and "Play again" can be activated from the keyboard to start a second game choosing "Computer goes first", which also reaches a result.
- **Given** the board has focus, **when** an arrow key is pressed, **then** focus moves one square in that direction, stays put at the board edge, and exactly one square is in the Tab order at any time.
- **Given** a square has focus, **when** Enter or Space is pressed on an empty square, **then** X is placed there.
- **Given** the first-mover choice, **when** the player chooses "You go first", **then** focus is on row 1, column 1; **and when** the player chooses "Computer goes first", **then** focus is on the first empty square in reading order (row 1, column 2 after the opening O at row 1, column 1).
- **Given** any focused control, **when** its computed style is read, **then** it has a visible focus indicator with an outline or border at least 2 CSS px wide.

## R-008 Screen-reader announcements

- **Given** each situation A1–A3 and A5–A8, **when** it occurs in a Playwright test, **then** the live region (`role="status"`, polite) text equals the exact string in the announcement table, with placeholders filled.
- **Given** A4 (human win), which the real opponent makes unreachable, **when** a unit test drives the game state machine with an injected opponent that loses and passes the events to the message builder, **then** the text equals A4 exactly; the production bundle contains no way to inject an opponent.
- **Given** any board state, **when** the squares are inspected, **then** each square's accessible name matches `Row {R}, column {C}, empty|X|O` for its current content.
- **Given** a human move, **when** the computer replies, **then** a single announcement covers both moves (the live region is updated once per human action).

## R-009 WCAG 2.2 AA and zero axe violations

- **Given** each game state (choice shown, game in progress, computer won, draw), **when** axe-core runs with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` in Chromium, Firefox and WebKit, **then** it reports 0 violations.
- **Given** the page, **when** it loads, **then** it has a `lang` attribute, a descriptive `<title>`, one `h1`, and the board is exposed as a labelled group.

## R-010 Responsive layout for touch and mouse

- **Given** viewports of 320×568, 390×844 and 1280×800 CSS px, **when** the page is shown in each game state, **then** `document.documentElement.scrollWidth` does not exceed the viewport width and all nine squares and both choice buttons are fully visible without scrolling horizontally.
- **Given** those viewports, **when** the bounding boxes of the squares and buttons are measured, **then** each is at least 44×44 CSS px.
- **Given** a touch-enabled phone emulation, **when** the player taps "You go first" and then an empty square, **then** X is placed there.
- **Given** a desktop viewport, **when** the player clicks "You go first" and then an empty square, **then** X is placed there.
- **Given** viewports of 320×568 and 1280×800 at default text size, **when** the page moves through the choose state, play (including a taken-square message and the longest computer-move status), and the game-over state, **then** the board's bounding box (x, y, width, height) is identical in every state. At 200% text zoom reflow takes priority and this check does not apply.

## R-011 Bundle size

- **Given** a production build, **when** the CI size check sums the gzipped size of every JavaScript file in `dist/`, **then** the total is under 51,200 bytes, and the check fails the build otherwise.

## R-012 No tracking, storage or third-party requests

- **Given** a Playwright test that records every network request while loading the page and playing a full game, **when** the game ends, **then** every request went to the page's own origin.
- **Given** the same full game, **when** it ends, **then** `document.cookie` is empty and `localStorage.length` and `sessionStorage.length` are 0.
- **Given** the built `dist/` output, **when** it is scanned, **then** it contains no script, link or iframe pointing to another origin.

## R-013 High-contrast, system fonts, locally drawn visuals

- **Given** the page, **when** the computed `font-family` of the body is read, **then** it begins with `system-ui`, and no font files are requested during a full game.
- **Given** the design tokens, **when** a unit test computes the contrast of every text colour against its background, **then** each ratio is at least 7:1, and every non-text indicator (square borders, focus ring, winning-line marker) is at least 3:1 against its background.
- **Given** a Playwright test that records every request while loading the page and playing a full game, **when** the game ends, **then** no font file and no image from another origin was requested, and the built `dist/` contains no `@font-face` rule and no `url()` or `src` pointing to another origin.

## R-014 Deploy to GitHub Pages with smoke test and minimal rollback

- **Given** a merge to main whose CI passes and which is still the latest commit on main, **when** the deploy workflow runs, **then** it builds exactly that commit (`workflow_run.head_sha`) and publishes it to GitHub Pages. The smoke test waits up to 3 minutes until the live page's `build-id` meta equals that SHA, then chooses "You go first", places one X, sees the computer's O, and passes. _Verified in deploy phase._
- **Given** CI passes for a commit that is no longer the latest commit on main, **when** its deploy run acquires the concurrency slot, **then** it skips without deploying. _Verified in deploy phase._
- **Given** deploy runs that overlap (one running, the latest commit's run queued, and an older commit's run queued after it), **when** they are processed, **then** none of them is discarded (`queue: max`, first in, first out), the older one skips as stale, and the latest commit ends up live. _Verified in deploy phase; the workflow's concurrency block is checked statically in CI._
- **Given** a manual `workflow_dispatch` run, **when** main's CI for its tip is pending or failed, **then** the run refuses to deploy and fails with a message. _Verified in deploy phase._
- **Given** a deploy whose smoke test fails (forced by the workflow's manual `force_smoke_failure` input), **when** the rollback job runs, **then** it redeploys, unchanged, the Pages artifact of the latest deploy run whose deploy and smoke jobs both succeeded (a stale no-op run in between is never chosen), under the artifact name `github-pages-rollback`, does nothing else, and the workflow run concludes as failed so GitHub emails the repo owner. _Verified in deploy phase._
- **Given** no previous successful deploy run exists, or its artifact has expired, **when** the smoke test fails, **then** the rollback job logs that no previous artifact is available and the run fails. _Verified in deploy phase._

## R-015 Browser coverage

- **Given** the Playwright configuration, **when** CI runs the end-to-end suite, **then** every spec runs in five projects — Chromium, Firefox, WebKit, a touch-enabled Android phone emulation (Chromium) and a touch-enabled iPhone emulation (WebKit) — and all pass.
- **Given** the production build, **when** Vite builds it, **then** its build target covers the current and previous versions of Chrome, Firefox, Safari and Edge and iOS Safari (build target `es2022`, supported by all of them).


=== DRAFT UNDER REVIEW: .factory/checkpoints/spec-rework3-amendment.diff ===
diff --git a/.factory/acceptance.md b/.factory/acceptance.md
index 5687cf2..a8a24cc 100644
--- a/.factory/acceptance.md
+++ b/.factory/acceptance.md
@@ -107,10 +107,11 @@ Square accessible names: `Row {R}, column {C}, empty` / `Row {R}, column {C}, X`
 - **Given** the same full game, **when** it ends, **then** `document.cookie` is empty and `localStorage.length` and `sessionStorage.length` are 0.
 - **Given** the built `dist/` output, **when** it is scanned, **then** it contains no script, link or iframe pointing to another origin.
 
-## R-013 Plain, high-contrast, system fonts
+## R-013 High-contrast, system fonts, locally drawn visuals
 
 - **Given** the page, **when** the computed `font-family` of the body is read, **then** it begins with `system-ui`, and no font files are requested during a full game.
 - **Given** the design tokens, **when** a unit test computes the contrast of every text colour against its background, **then** each ratio is at least 7:1, and every non-text indicator (square borders, focus ring, winning-line marker) is at least 3:1 against its background.
+- **Given** a Playwright test that records every request while loading the page and playing a full game, **when** the game ends, **then** no font file and no image from another origin was requested, and the built `dist/` contains no `@font-face` rule and no `url()` or `src` pointing to another origin.
 
 ## R-014 Deploy to GitHub Pages with smoke test and minimal rollback
 
diff --git a/.factory/intent.json b/.factory/intent.json
index 410b311..2c17922 100644
--- a/.factory/intent.json
+++ b/.factory/intent.json
@@ -147,7 +147,7 @@
       "Zero axe-core violations",
       "Performance: JavaScript bundle under 50 KB gzipped",
       "No analytics, no ads, no sign-up, no install",
-      "Visual: plain, high-contrast, system font stack; no brand",
+      "Visual: high-contrast (text at least 7:1, non-text at least 3:1); system font stack only; all visuals drawn locally (CSS or inline SVG), no web fonts or external images; no existing brand",
       "Browser support: current and previous versions of Chrome, Firefox, Safari and Edge, plus iOS Safari and Android Chrome",
       "Accessibility verification (automated): Playwright on Chromium, Firefox and WebKit plus phone-viewport emulation; keyboard-only full game; zero axe-core violations; exact live-region announcement text asserted in tests",
       "No manual screen-reader pass by the factory (an agent cannot listen to one). The QA report lists 'real screen-reader pass (VoiceOver) and real-device iOS/Android check' as NOT PERFORMED - human follow-up"
@@ -177,7 +177,20 @@
   "design": {
     "has_ui": true,
     "source": "factory",
-    "brand": "none - plain, simple, high-contrast, system font stack"
+    "brand": "none (no existing brand) - high-contrast, system font stack only, all visuals drawn locally; character comes from personality below",
+    "personality": [
+      "playful",
+      "tactile",
+      "confident"
+    ],
+    "references": [
+      "a chalkboard at a game night",
+      "classic arcade cabinets"
+    ],
+    "avoid": [
+      "generic web-app blue",
+      "flat grey admin look"
+    ]
   },
   "review": {
     "second_opinion": true,
diff --git a/.factory/prd.md b/.factory/prd.md
index 27391d0..9585519 100644
--- a/.factory/prd.md
+++ b/.factory/prd.md
@@ -4,7 +4,7 @@ _Traces to: `.factory/intent.json` (v2, captured 2026-09-27T20:20:18Z). Status:
 
 ## 1. Problem
 
-Casual players who want a quick game of tic-tac-toe in a browser have to put up with ad-heavy, slow game sites that are awkward to use with a keyboard or screen reader, because those sites are built to maximise ad impressions rather than to play well. We will ship a plain, fast, ad-free game with a computer opponent that never loses, playable by touch, mouse, keyboard and screen reader, with no install, sign-up or tracking. Severity is low for players; the build is also the end-to-end live test of the Software Factory, so every phase is exercised properly.
+Casual players who want a quick game of tic-tac-toe in a browser have to put up with ad-heavy, slow game sites that are awkward to use with a keyboard or screen reader, because those sites are built to maximise ad impressions rather than to play well. We will ship a fast, ad-free game with a computer opponent that never loses, playable by touch, mouse, keyboard and screen reader, with no install, sign-up or tracking. Severity is low for players; the build is also the end-to-end live test of the Software Factory, so every phase is exercised properly.
 
 ## 2. Users
 
@@ -63,7 +63,7 @@ Complexity ceiling: anything that needs a server or storage.
 | R-010 | The layout works from 320 CSS px wide phones to laptop screens without horizontal scrolling or zoom, is playable by touch and mouse, and every square and button is at least 44×44 CSS px (above the WCAG 2.2 AA 2.5.8 minimum of 24 px, chosen for the touch-first primary persona; confirmed by the approver 2026-09-27). | MUST | intent.scope.mvp[2]; WCAG 2.2 1.4.10, 2.5.8 |
 | R-011 | The production JavaScript bundle is under 50 KB gzipped; CI fails the build if it is not. | MUST | intent.constraints (performance) |
 | R-012 | The game makes no network requests beyond its own static files, sets no cookies, uses no web storage, and contains no analytics, ads, sign-up or install prompt. | MUST | intent.constraints; technology.excluded; complexity ceiling |
-| R-013 | The visual style is plain and high-contrast and uses the system font stack (no web fonts, no brand). | MUST | intent.constraints; intent.design |
+| R-013 | The visual style is high-contrast (text at least 7:1, non-text indicators at least 3:1), uses only the system font stack, and draws every visual locally with CSS or inline SVG: no web fonts, no external images, no existing brand. Its personality is set in the design phase (intent.design.personality). | MUST | intent.constraints; intent.design |
 | R-014 | Whenever CI passes for the latest commit on main, GitHub Actions builds exactly that commit and deploys it to GitHub Pages. An older merge whose CI finishes after a newer merge is not deployed separately; it goes live as part of the newer commit. A post-deploy smoke test waits until the live page shows the deployed commit, then plays one move. If it fails, the workflow redeploys the Pages artifact of the most recent deploy run whose deploy and smoke test both succeeded, and the run fails, so the repo owner gets the Actions failure email. If no such run exists (first deployment) or its artifact has expired (artifacts are kept 90 days), the workflow only logs that and fails. Nothing more. | MUST | intent.operations; success done-checklist item 1; approver decisions 2026-09-27 |
 | R-015 | Supported browsers are the current and previous versions of Chrome, Firefox, Safari and Edge, plus iOS Safari and Android Chrome; the build targets `es2022`, which all of them support. Automated verification is narrower and engine-level only: every end-to-end test runs in Chromium, Firefox and WebKit plus touch-enabled Android and iPhone emulations. Testing specific browser versions or real devices is not performed; the QA report lists it as human follow-up. | MUST | intent.constraints (browser support, verification) |
 
=== END DRAFT ===

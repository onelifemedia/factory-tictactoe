# Design System: factory-tictactoe

_Traces to: `.factory/prd.md` (users, flows), `intent.constraints.quality_standards`, `intent.design` (plain, high-contrast, system fonts, no brand). Tokens live in `tokens.json`; this file explains them. Status: draft_

## 1. Principles

- **Nothing between the player and the first move.** The primary persona has two minutes, so the page is one centred column: title, status line, board, action area. No tagline, chrome, nav or footer links. (R-002, persona)
- **The board never moves.** The status line and the action area below the board reserve their height, so a tap never lands on something that just shifted. (R-010, UX review)
- **Plain and high-contrast, not decorative.** Near-black on white, one dark blue for actions and focus, all text at 7:1 or more. No brand, no web fonts, no shadows, no animation. (R-013, intent.design)
- **Every state is visible, sayable and reachable.** Whatever happens (whose turn, where the computer just played, a taken square, the result, the winning line) is shown in the visible status, spoken by the announcer, and reachable by keyboard. (R-005, R-007, R-008)
- **Marks are letters, not colours.** X and O use the same colour and differ by shape, and the winning line is shown by border weight and a strike line, not by colour alone. (R-005, WCAG 1.4.1)

## 2. Color

Light only: themes and dark mode are out of scope (PRD non-goals), so there are no dark values. Ratios were computed with the WCAG relative-luminance formula; the R-013 unit test recomputes them from `tokens.json`.

| Role | Light | Dark | Used for | Contrast vs surface |
|---|---|---|---|---|
| surface | #ffffff | n/a (out of scope) | page background, active squares | — |
| surface-sunken | #f2f2f2 | n/a | disabled squares (before choice, after game over) | — |
| text | #111111 | n/a | title, status, marks X/O | 18.88:1 on surface; 16.87:1 on surface-sunken; 16.81:1 on win-surface |
| text-muted | #3d3d3d | n/a | keyboard hint | 10.86:1 on surface |
| primary | #0b3d91 | n/a | button fill | on-primary text 10.04:1; fill vs surface 10.04:1 |
| on-primary | #ffffff | n/a | button labels | 10.04:1 on primary |
| border | #3d3d3d | n/a | active square outline (2px) | 10.86:1 on surface (≥ 3:1 non-text) |
| border-disabled | #595959 | n/a | disabled square outline (2px) | 6.26:1 on surface-sunken; 7.00:1 on surface |
| focus | #0b3d91 | n/a | focus ring (3px, 2px offset) | 10.04:1 on surface; 8.97:1 on surface-sunken |
| win-surface | #fff3b0 | n/a | winning squares background (supporting cue only) | text 16.81:1 on it |
| win-marker | #111111 | n/a | winning border (4px) and strike line (6px) | 16.81:1 on win-surface (≥ 3:1 non-text) |

There are no success/warning/danger colours. The game has no error styling: a taken square is reported in the status line in normal text. Rule: screens use roles only, never raw hex.

## 3. Typography

| Token | Size / line | Weight | Used for |
|---|---|---|---|
| display | 1.75rem / 1.2 | 700 | page title "Tic-tac-toe" (the one `h1`) |
| status | 1.125rem / 1.4 | 700 | status line: whose turn, taken square, result |
| body | 1rem / 1.5 | 400 | button labels (700) |
| small | 0.875rem / 1.4 | 400 | keyboard hint under the board |
| mark | clamp(2rem, 18cqi, 4rem) / 1 | 700 | X and O inside squares (cqi of the board container) |

Font stack: `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. Nothing is loaded from the network (R-012, R-013). Sizes are in `rem`, so browser text zoom works; the layout reflows at 200% zoom and at 320 px wide (WCAG 1.4.4, 1.4.10).

## 4. Spacing, radius, elevation, motion

- **Spacing** (4-based): 4 / 8 / 12 / 16 / 24 px. Page padding is 16 px on phones and 24 px from 480 px up. Title, status, board and action area are 16 px apart. The gap between squares is 8 px.
- **Radius:** 4 px on squares and 8 px on buttons, only enough to avoid harshness.
- **Elevation:** none. Everything is flat. The only `box-shadow` is the 2 px inset hover ring on empty squares, which acts as a border, not elevation.
- **Motion:** none. State changes are instant (PRD open question 2: instant reply; animations beyond basics are a non-goal), so reduced-motion needs no special handling.
- **Sizes:** the page column is at most 28rem wide. The board is `min(100%, 360px, 50svh)` square, so at 320 px wide each square is about 90 px (smaller on short phones, never below 44 px), and on desktop 114 px. The status line reserves 3 lines below 480 px and 2 above. The action area reserves 100 px below 480 px (two stacked buttons) and 44 px above. So title, status, board and "Play again" fit on a 320 × 568 phone without the board moving. The minimum target is 44 × 44 px (R-010).

## 5. Components

### Choice button ("You go first" / "Computer goes first")
- **Purpose:** start a game and pick who moves first (R-002).
- **Variants:** one style; both choices are equal, so neither is visually preferred. They sit in the action area **below the board**, side by side, or stacked if they don't fit at 320 px.
- **States:** default (primary fill, on-primary label) · hover (underlined label) · focus-visible (3px focus ring, 2px offset) · active (same as hover). There are no disabled or loading states: the buttons only exist while choosing.
- **Anatomy:** native `<button type="button">` with a visible text label, at least 44 px tall, inside `div role="group" aria-label="Who goes first"`.
- **Do / Don't:** do keep the wording exact (tests assert it). Don't add icons or a symbol picker (a non-goal).

### Play again button
- **Purpose:** return to the choice after a game ends (R-006).
- **States:** as the choice button. It exists only in the game-over state and receives focus when it appears.
- **Do / Don't:** do place it in the action area under the board, full action-area width. Don't show it during play (PRD open question 1: no).

### Board square
- **Purpose:** show a cell and accept a move (R-001, R-007).
- **Variants:** empty · X · O.
- **States:**
  - *disabled* (before choice and after game over): `disabled` attribute, surface-sunken fill, border-disabled outline, out of the Tab order; marks stay in text colour.
  - *active empty* (during play): surface fill, border, pointer cursor.
  - *occupied during play*: `aria-disabled="true"`, same look as active but no pointer cursor; still focusable.
  - *hover* (active empty only): 2px inset ring in text colour (drawn with an inset box-shadow).
  - *focus-visible*: 3px focus ring, 2px offset. Exactly one square has `tabindex="0"`.
  - *winning*: `data-winning="true"`, win-surface fill, 4px win-marker border, plus a 6px strike line through the square's centre in the line's direction (`data-line="row|column|diagonal-down|diagonal-up"`), so the three squares form one continuous strike. The mark has a win-surface patch behind it so the O stays legible over the line.
- **Anatomy:** native `<button>` with accessible name `Row R, column C, empty|X|O`. The visible mark is `aria-hidden` because the name already carries it.
- **Do / Don't:** do keep X and O the same colour. Don't show the winning line by colour only.

### Board
- **Purpose:** the 3 × 3 grid (R-001).
- **Anatomy:** `div role="group" aria-label="Board"`, a CSS grid of 3 × 3 with 8 px gaps and a square aspect ratio. It is a size container (`container-type: inline-size`) so the marks scale with it. During play it has `aria-describedby="hint"`.
- **Keyboard:** roving tabindex; arrow keys move one square and stop at the edges; Enter/Space activate (ADR-012).

### Status line
- **Purpose:** visible text for the current state (R-004, R-005, R-008).
- **Content:**
  - choosing: "Who goes first?"
  - playing, you went first: "Your turn. You are X."
  - playing, computer went first: "Computer placed O in row R, column C. Your turn. You are X."
  - playing, after a move: "Computer placed O in row R, column C. Your turn."
  - taken square: "Row R, column C is taken. Choose an empty square." (It stays until the next valid move; moving focus does not clear it.)
  - over: "Computer wins with {LINE}." / "It's a draw." / "You win with {LINE}." (the last is unreachable)
- **Anatomy:** a `<p id="status">` in status type, with a reserved height of 3 lines below 480 px and 2 above. It is **not** a live region; the separate announcer is (below), which prevents double announcements.

### Keyboard hint
- **Purpose:** make the arrow-key model discoverable (R-007; Codex design review C2).
- **Content:** "Arrow keys move between squares. Enter or Space places X."
- **Anatomy:** `<p id="hint">` in small, text-muted type in the action area during play only. The board references it with `aria-describedby`.

### Announcer (visually hidden)
- **Purpose:** the exact spoken texts A1–A8 (R-008).
- **Anatomy:** `div role="status"` with the `visually-hidden` utility (clip-path pattern, not `display:none`), present in the page from load (included in every mockup). It is written once per action: cleared, then set on the next frame, so a repeated message (A8 twice) is spoken again.
- **Mockups:** shown as a dashed annotation box labelled "Screen reader hears", which is not part of the real UI.

### Fallback message
- **Purpose:** explain a failed load (R-001 unhappy paths).
- **Variants:**
  - `<noscript>`: "This game needs JavaScript, which is turned off in this browser. Turn it on and reload the page."
  - Load error: "The game didn't load. Try reloading the page." It is in `index.html` with `hidden`. It is revealed by a tiny inline capture-phase `error` listener in `index.html` (independent of the bundle, and it survives the Vite build) when the script fails to load, or by `main.ts` if it throws while starting (architecture §2). It never flashes on a normal load and never shows next to the `<noscript>` message.
- **Anatomy:** a `<p>` in status type (text colour, bold), in place of the board and action area.

## 6. Patterns

- **Forms & validation:** there are none. The only "invalid input" is a taken square, handled as a status message. There is no error colour and no dialog.
- **Empty state:** the empty disabled board under the choice shows what the game is before it starts.
- **Loading:** none in normal use; the bundle is tiny and the computer replies instantly. Nothing is shown while loading (no false error); the load-error message appears only on an actual failure.
- **Destructive actions:** none. "Play again" appears only after a game ends, so nothing is lost and no confirmation is needed.
- **Navigation:** none; a single page.
- **Responsive:** one fluid column from 320 px up, with one breakpoint at 480 px: page padding 16 → 24 px, status reserve 3 → 2 lines, action-area reserve 100 → 44 px. The board is `min(100%, 360px, 50svh)`. Choice buttons wrap to a column when they don't fit side by side.
- **Layout order:** title → status → board → action area (choice / keyboard hint / Play again). The mockups use `@container` on the frame to simulate the 480 px breakpoint; the implementation uses `@media (min-width: 480px)`.

## 7. Accessibility

- **Standard:** WCAG 2.2 AA (hard constraint). Text contrast is at least 7:1 and non-text at least 3:1, as a house rule above AA (R-013).
- **Keyboard model:** Tab reaches the board's one roving square during play (the disabled board is skipped otherwise), then the action area (the choice buttons, or "Play again"). Arrow keys work within the board; Enter/Space place a mark. The visible keyboard hint explains this.
- **Focus rules:**
  - after a choice → the first empty square in reading order (row 1, column 1 if you went first; row 1, column 2 if the computer opened there)
  - after a move → stays on the square played
  - on game over → "Play again"
  - after "Play again" → "You go first"
  - focus is never lost to `body`
- **Focus visibility:** 3px `focus` ring with a 2px offset on every interactive element. It is never removed (WCAG 2.4.7) and never obscured (2.4.11); nothing overlaps the board.
- **Target size:** at least 44 × 44 px for squares and buttons (R-010; above the 2.5.8 minimum).
- **Colour independence:** marks are letters; winning is a border weight plus a strike line plus text; disabled is also conveyed by the attribute and status text.
- **Reduced motion:** there is no motion, so nothing to reduce.
- **Language and structure:** `lang="en"`, `<title>Tic-tac-toe: play against a computer that never loses</title>`, one `h1`, and a `main` landmark. (The mockup pages have an extra heading for the mockup chrome; the product has only one `h1`.)

## 8. Second-opinion summary

UX reviewer: REQUEST-CHANGES (1 high, 6 medium, 9 low), all fixed except two lows where no change is needed. Codex: first pass AGREE with 2 medium findings (both fixed); second pass AGREE with no findings and 2 missing items (both addressed). Details: `.factory/reviews/design-reconciliation.md`.

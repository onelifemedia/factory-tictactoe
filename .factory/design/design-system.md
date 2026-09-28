# Design System: factory-tictactoe

_Traces to: `.factory/prd.md` (users, flows), `intent.constraints.quality_standards`, `intent.design` (personality: playful, tactile, confident; references: "a chalkboard at a game night", "classic arcade cabinets"; avoid: generic web-app blue, flat grey admin look). Tokens live in `tokens.json`; this file explains them. Direction boards: `directions/`. Status: reviewed_

## 1. Direction and principles

**Chosen direction: C, Tabletop Tiles** (`directions/c-tabletop-tiles.html`). The approver chose it on 2026-09-28 as shown: chunky cream tiles on a warm table, tomato-red X and teal O pieces, tiles that sink when pressed, pieces that drop in with a small bounce, gold lifted winning tiles, and a teal pill button. C takes the game-night warmth of the chalkboard reference but not its dark slate, and the chunky, press-me buttons of the arcade reference but not its neon. There is one light scheme only; dark mode is a PRD non-goal, meaning no second or switchable theme.

- **Rejected:** A, Chalkboard Night (hand-drawn chalk on a dark slate), and B, Arcade Cabinet (pixel marks, neon on ink). Nothing from them is combined into C.
- **Why C:** it is the most *tactile* of the three. Every square reads as a physical piece you press, which suits the touch-first primary persona. It is *playful* through its shapes and bounce, not through decoration, and *confident* through big, saturated pieces and a heavy rounded title. It avoids both things the intent rules out: tomato and teal instead of web-app blue, and a warm wooden table instead of a flat grey panel. It is also the only light direction, so it stays calm and easy to read in daylight on a phone.

**Who and what.** The game is for a casual player with a couple of minutes, often on a phone, who wants to play at once. It should feel like pulling a sturdy wooden game off the shelf: warm, solid and a little bouncy. It is deliberately not a skeuomorphic toy with textures or images; the whole look comes from colour, radius and hard offset shadows drawn in CSS and inline SVG (R-013).

- **Nothing between the player and the first move.** One centred column: title, status line, board, action area. No tagline, nav or footer. (R-002, persona)
- **Pieces you can press.** Tiles and buttons have a visible wooden edge underneath and sink into it when pressed. The feedback is physical, not a colour flash. (intent.design.personality: tactile)
- **The board never moves.** The status line and the action area reserve their height, and tile motion (press, drop, lift) happens inside the board's box, never changing its size or position. (R-010)
- **Every state is visible, sayable and reachable.** Turn, the computer's last move, a taken square, the result and the winning line are all shown in the status, spoken by the announcer, and reachable by keyboard. (R-005, R-007, R-008)
- **Shape first, colour second.** X is a cross and O is a ring, so they differ by shape; their colours (tomato and teal) only reinforce that. The winning line is shown by a thick border, a continuous dark bar and the status text, with the gold fill as a supporting cue. (R-005, WCAG 1.4.1)
- **Motion is a garnish.** Game state, the status text and announcements change instantly. Press, drop and lift are short decoration on top, and all of it is removed under reduced motion. (PRD non-goal: animations beyond basics; PRD open question 2: instant reply)

## 2. Color

One light scheme: themes and dark mode are out of scope (PRD non-goals), so there are no dark values. Ratios were computed with the WCAG relative-luminance formula (by `.factory/checkpoints/gen_directions.py`'s `contrast`); the R-013 unit test recomputes them from `tokens.json`. The house rule is text at least 7:1 and non-text at least 3:1.

| Role | Light | Dark | Used for | Class | Contrast |
|---|---|---|---|---|---|
| surface | #f3e8d4 | n/a (out of scope) | page background (the table) | background | — |
| surface-tile | #fffaf0 | n/a | active tile face | background | — |
| surface-sunken | #ecdfc6 | n/a | disabled tile face (before a choice, after game over); darker than an active tile and closer to the tray, so a disabled tile reads as settled | background | — |
| board-well | #e3cfae | n/a | the tray the tiles sit in (decorative; tiles carry their own border) | background | — |
| tile-edge | #c6a57b | n/a | the 6 px wooden edge under each tile (decorative) | decorative | — |
| text | #2b1d13 | n/a | title, status | text (7:1) | 13.44:1 on surface; 15.67:1 on surface-tile; 12.37:1 on surface-sunken; 11.77:1 on win-surface |
| text-muted | #4f3b2b | n/a | keyboard hint | text (7:1) | 8.68:1 on surface |
| primary | #0b5b62 | n/a | button fill (teal pill) | non-text (3:1) | 6.44:1 vs surface (non-text) |
| primary-hover | #08494f | n/a | button fill on hover | background | on-primary 9.72:1 on it |
| primary-edge | #06363a | n/a | the 5 px button edge (decorative) | decorative | — |
| on-primary | #fffaf0 | n/a | button labels | text (7:1) | 7.51:1 on primary |
| border | #7a5f44 | n/a | tile outline (2 px) | non-text (3:1) | 3.89:1 on board-well; 5.69:1 on surface-tile; 2.56:1 on tile-edge (bottom side only; the other three sides and the edge itself mark the tile's boundary) |
| border-disabled | #7a5f44 | n/a | disabled tile outline (2 px); a separate role so the disabled look can change without touching the active one | non-text (3:1) | 3.89:1 on board-well; 4.49:1 on surface-sunken |
| focus | #2b1d13 | n/a | focus ring (3 px, 3 px offset) | non-text (3:1) | 13.44:1 on surface; 10.72:1 on board-well (a tile's ring lands on the tray); a button's ring sits 6 px out, clear of its 5 px edge |
| mark-x | #b3261e | n/a | X piece (tomato) | non-text (3:1): SVG graphic | 6.28:1 on surface-tile; 4.96:1 on surface-sunken; 4.72:1 on win-surface |
| mark-o | #0b5b62 | n/a | O piece (teal) | non-text (3:1): SVG graphic | 7.51:1 on surface-tile; 5.93:1 on surface-sunken; 5.64:1 on win-surface |
| win-surface | #ffd766 | n/a | winning tile face (gold; supporting cue only) | background | text 11.77:1 on it |
| win-edge | #b98d1c | n/a | the deeper edge under a lifted winning tile (decorative) | decorative | — |
| win-marker | #2b1d13 | n/a | winning border (4 px) and bar (12 px) | non-text (3:1) | 11.77:1 on win-surface; 10.72:1 on board-well; 5.35:1 on win-edge |

X and O are SVG graphics, not text, so they are held to the non-text 3:1 rule; each is also identified by shape and by the square's accessible name. There are no success, warning or danger colours; a taken square is reported in the status line in normal text. Rule: screens use roles only, never raw hex. The rgba shadow blurs in `tokens.json` are decorative and carry no information.

## 3. Typography

| Token | Size / line | Weight | Family | Used for |
|---|---|---|---|---|
| display | 2.25rem / 1.1 (1.75rem below 480 px) | 800 | display | page title "Tic-tac-toe" (the one `h1`) |
| status | 1.125rem / 1.4 | 600 | body | status line |
| button | 1.125rem / 1.4 | 700 | body | button labels |
| body | 1rem / 1.5 | 400 | body | default |
| small | 0.875rem / 1.4 | 400 | body | keyboard hint |

- **Body stack:** `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` (the `body` computed `font-family` begins with `system-ui`, R-013).
- **Display stack:** `ui-rounded, system-ui, …`: the rounded system face on Apple platforms, the normal system face elsewhere. Both are installed fonts; no font file is ever requested (R-012, R-013).
- X and O are not type. They are inline SVG pieces (§5 Board square), so they no longer depend on a font's glyphs.
- Sizes are in `rem`, so text zoom works; the layout reflows at 200% zoom and at 320 px wide (WCAG 1.4.4, 1.4.10).

## 4. Spacing, radius, elevation, motion

- **Spacing** (4-based): 4 / 8 / 12 / 16 / 24 px. Page padding is 16 px on phones and 24 px from 480 px up. Title, status, board and action area are 16 px apart. The tray has 12 px padding and 12 px gaps between tiles.
- **Radius:** tiles 18 px, the tray 26 px, buttons fully rounded (pill). Rounded everywhere; nothing is sharp.
- **Elevation:** hard offset "wooden edge" shadows, not soft floating cards.
  - `tile`: a 6 px edge plus a soft contact shadow; active tiles.
  - `tile-resting`: a 2 px edge; with the darker surface-sunken face, disabled tiles look settled into the tray, not ready to press.
  - `tile-pressed`: a 2 px edge while pressed; the tile moves down 4 px, so its top meets where the edge was.
  - `tile-win`: a 9 px gold edge; winning tiles are lifted 3 px.
  - `tray`: an inset shadow, so the tray reads as a recess in the table.
  - `button` / `button-pressed`: a 5 px teal edge that shrinks to 1 px as the button moves down 4 px.
  - `mark`: a 2 px drop shadow under each piece.
- **Motion** (all inside `@media (prefers-reduced-motion: no-preference)`):
  - *press*: 80 ms ease-out. A tile or button moves down 4 px as its edge shrinks; an empty tile rises 1 px on hover.
  - *drop*: every piece placed by the last action (your X and the computer's reply) drops in from 22 px above at 1.15× scale with a small overshoot (280 ms, `cubic-bezier(0.3, 1.6, 0.5, 1)`). The piece is fully opaque from the first frame, so a taken square never looks empty. The board state, status and announcement are already final; this is decoration only.
  - *lift*: on a win, the three winning tiles and the bar rise 3 px and the tiles' edge deepens (240 ms, starting at 280 ms when the last piece has landed). The whole sequence settles by 520 ms; no single animation exceeds 280 ms.
  - *reduced motion*: no transitions, no animations, no hover or press movement. Pieces simply appear, and winning tiles are shown lifted without moving. A press is shown by the edge shrinking in place.
  - *refinement from the board*: the direction board used a 200 ms drop delay, a 250 ms lift delay and a 3 px sink. The design system starts the drop at once, lifts when the drop ends, and sinks 4 px so the tile meets its edge. It drops the board's X-then-O stagger, because a delayed piece looked like an empty square (UX review).
- **Sizes:**
  - **Column and board:** the page column is at most 28rem. The board (the tray) is `max(180px, min(100%, 360px, 45svh))` square.
    - 180 px is the floor, 3 × 44 px tiles plus 2 gaps and 2 paddings, so tiles never fall below 44 px or spill out of the tray on short screens (phone landscape, 400% zoom); the page scrolls instead.
    - 45svh keeps both stacked choice buttons on screen on a 320 × 568 phone.
    - Tiles are about 69 px on a 320 × 568 phone, 44 px in phone landscape and 104 px on desktop.
  - **Reserved heights:** the status reserves 3 lines below 480 px and 2 above. The action area reserves `2 × 44 + 12 + 5` px below 480 px and `44 + 5` px above. Buttons are exactly 44 px tall at default text size (a minimum height with no vertical padding), and the 5 px is the button edge. The title drops to 1.75rem below 480 px to leave room.
  - **Minimum target:** 44 × 44 px (R-010).

## 5. Components

### Choice button ("You go first" / "Computer goes first")
- **Purpose:** start a game and pick who moves first (R-002).
- **Variants:** one style, the teal pill. Both choices are equal, so neither is visually preferred. They sit in the action area below the board, side by side, or stacked when they don't fit at 320 px.
- **States:**
  - *default*: primary fill, on-primary label, `button` edge.
  - *hover*: primary-hover fill.
  - *active/pressed*: the edge shrinks to `button-pressed` and the button moves down 4 px (no movement under reduced motion).
  - *focus-visible*: 3 px focus ring with a 6 px offset, clear of the 5 px edge.
  - No disabled or loading states: the buttons only exist while choosing.
- **Anatomy:** native `<button type="button">` with a visible text label, at least 44 px tall (22 px side padding; 16 px for the two choice buttons, which size to their labels so both fit on one row at the 360 px board width and stack on phones), inside `div role="group" aria-label="Who goes first"`.
- **Do / Don't:** do keep the wording exact (tests assert it). Don't add icons or a symbol picker (a non-goal).

### Play again button
- **Purpose:** return to the choice after a game ends (R-006).
- **States:** as the choice button. It exists only in the game-over state and receives focus when it appears.
- **Do / Don't:** do make it the full width of the action area. Don't show it during play.

### Board (the tray)
- **Purpose:** the 3 × 3 grid (R-001).
- **Anatomy:** `div role="group" aria-label="Board"`, a CSS grid of 3 × 3 with 12 px gaps and padding, board-well fill, `tray` inset shadow, 26 px radius and a square aspect ratio. During play it has `aria-describedby="hint"`. It is `position: relative` so the win line (below) can overlay it.
- **Keyboard:** roving tabindex; arrow keys move one square and stop at the edges; Enter/Space activate (ADR-012).

### Board square (tile)
- **Purpose:** show a cell and accept a move (R-001, R-007).
- **Variants:** empty · X · O.
- **States:**
  - *disabled* (before a choice and after game over): `disabled` attribute, surface-sunken face, border-disabled outline, `tile-resting` edge, out of the Tab order. The darker face and low edge make it read as not pressable. Marks keep their colours.
  - *active empty* (during play): surface-tile face, border outline, `tile` edge, pointer cursor.
  - *occupied during play*: `aria-disabled="true"`. Same look as active but no pointer cursor and no press movement; still focusable.
  - *hover* (active empty only): rises 1 px (no movement under reduced motion).
  - *pressed* (active empty only): the `tile-pressed` edge, moving down 4 px (the edge change only, under reduced motion). iOS Safari applies `:active` only when the page has a `touchstart` listener; the implementation adds a passive one on `document`.
  - *focus-visible*: 3 px focus ring, 3 px offset; it lands on the tray colour. Exactly one tile has `tabindex="0"`.
  - *winning*: `data-winning="true"`, win-surface face, 4 px win-marker border, `tile-win` edge, lifted 3 px (with `top`, not `transform`, so the piece above the bar keeps its stacking order). The padding shrinks by the extra 2 px of border, so the piece keeps its size.
- **Mark (piece):** an inline `<svg viewBox="0 0 100 100" aria-hidden="true">` inset 14% inside the tile, using `<use href="#mark-x">` or `#mark-o` from one hidden `<svg><defs>` block in the page (same-document fragments, not files; R-013).
  - X: two 18 × 76 rounded bars (rx 9) crossed at ±45°, in mark-x.
  - O: a ring with radius 28 and a 17-unit stroke, in mark-o.
  - Both symbols start with a backing circle whose fill is `var(--mark-backing, none)`: transparent normally, win-surface on winning tiles (custom properties inherit into `<use>`).
  - Each piece has the `mark` drop shadow.
- **Anatomy:** native `<button>` with accessible name `Row R, column C, empty|X|O`. The piece is `aria-hidden` because the name already carries it.
- **Do / Don't:** do keep X and O different in shape. Don't show the winning line by colour only, and don't put text glyphs in the tile.

### Win line
- **Purpose:** a single continuous bar through the three winning tiles (R-005).
- **Anatomy:** one `<svg class="win-line" aria-hidden="true" viewBox="0 0 300 300" preserveAspectRatio="none">` absolutely covering the board, with one `<path>` in win-marker, 12 px round-capped stroke (`vector-effect: non-scaling-stroke`). It is drawn from the centre of the first winning tile to the centre of the third, extended 18 units at each end:
  - rows: y = 50, 150 or 250, from x = 32 to 268;
  - columns: the same with x and y swapped;
  - the diagonal from top left to bottom right: (32, 32) to (268, 268);
  - the diagonal from top right to bottom left: (268, 32) to (32, 268).
  The overlay is inset by `tray-padding − gap / 2` (6 px), which puts tile centres exactly at 1/6, 1/2 and 5/6 of it, and it rises 3 px with the winning tiles. In the mockups, every one of the 8 lines was measured through the lifted tile centres at both board sizes (worst error 0.01 px).
- **Layering:** the bar sits above the tile faces and below the pieces (bar `z-index: 1`, piece `z-index: 2`). On winning tiles each piece has a win-surface backing disc (radius 37 in the 100-unit piece box), so the bar visibly passes *under* the piece: the O's centre stays clear instead of looking slashed, and the piece never sits directly on the dark bar. It never overlaps the action area.

### Status line
- **Purpose:** visible text for the current state (R-004, R-005, R-008).
- **Content:**
  - choosing: "Who goes first?"
  - playing, you went first: "Your turn. You are X."
  - playing, computer went first: "Computer placed O in row R, column C. Your turn. You are X."
  - playing, after a move: "Computer placed O in row R, column C. Your turn."
  - taken square: "Row R, column C is taken. Choose an empty square." It stays until the next valid move; moving focus does not clear it.
  - over: "Computer wins with {LINE}." / "It's a draw." / "You win with {LINE}." (the last is unreachable)
- **Anatomy:** `<p id="status">` in status type, reserving 3 lines below 480 px and 2 above. It is not a live region; the announcer is.

### Keyboard hint
- **Purpose:** make the arrow-key model discoverable (R-007).
- **Content:** "Arrow keys move between squares. Enter or Space places X."
- **Anatomy:** `<p id="hint">` in small, text-muted type, centred in the action area during play only. The board references it with `aria-describedby`.

### Announcer (visually hidden)
- **Purpose:** the exact spoken texts A1–A8 (R-008).
- **Anatomy:** `div role="status"` with the `visually-hidden` utility, present from load. It is cleared, then set on the next frame, so a repeated message is spoken again.
- **Mockups:** shown as a dashed "Screen reader hears" box, which is not part of the real UI.

### Fallback message
- **Purpose:** explain a failed load (R-001 unhappy paths).
- **Variants:**
  - `<noscript>`: "This game needs JavaScript, which is turned off in this browser. Turn it on and reload the page."
  - Load error: "The game didn't load. Try reloading the page." It sits in `index.html` with `hidden` and is revealed only on a real failure (architecture §2).
- **Anatomy:** a `<p>` in status type (text colour, semibold) on a surface-tile card with a 2 px border, 18 px radius and the `tile` edge, in place of the board and action area. The card keeps the table look even when the game can't start.

## 6. Patterns

- **Forms & validation:** there are none. The only "invalid input" is a taken square, handled as a status message: no error colour, no shake, no dialog.
- **Empty state:** the empty disabled tray of settled tiles under the choice shows what the game is before it starts.
- **Loading:** none in normal use; the bundle is tiny and the computer replies instantly. The load-error message appears only on an actual failure.
- **Destructive actions:** none. "Play again" appears only after a game ends.
- **Navigation:** none; a single page.
- **Responsive:** one fluid column from 320 px up, with one breakpoint at 480 px. Across it, page padding goes 16 → 24 px, the status reserve 3 → 2 lines, and the action reserve from two stacked buttons to one row. The board is `max(180px, min(100%, 360px, 45svh))`, and the choice buttons wrap to a column when they don't fit. The mockups use `@container` on the frame to simulate the breakpoint; the implementation uses `@media (min-width: 480px)`.
- **Layout order:** title → status → board → action area (choice / keyboard hint / Play again).

## 7. Accessibility

- **Standard:** WCAG 2.2 AA (hard constraint). House rule: text at least 7:1 and non-text at least 3:1 (R-013).
- **Keyboard model:** Tab reaches the board's one roving tile during play (the disabled board is skipped otherwise), then the action area. Arrow keys move within the board; Enter/Space place a mark. The visible hint explains this.
- **Focus rules:**
  - after a choice → the first empty square in reading order;
  - after a move → stays on the square played;
  - on game over → "Play again";
  - after "Play again" → "You go first";
  - focus is never lost to `body`.
- **Focus visibility:** 3 px ring in focus colour with a 3 px offset on every interactive element. It is never removed (WCAG 2.4.7) or obscured (2.4.11). A pressed or lifted tile moves at most 4 px, so the ring still clears the neighbouring tiles across the 12 px gap. Buttons use a 6 px offset so the ring isn't lost against the dark button edge.
- **Target size:** at least 44 × 44 px for tiles and buttons (R-010).
- **Colour independence:**
  - marks differ by shape (cross vs ring);
  - winning is shown by a 4 px border, the bar and the result text, with gold as a supporting cue;
  - disabled is also conveyed by the attribute and the status text.
- **Reduced motion:** `prefers-reduced-motion: reduce` removes every transition and animation (§4). Nothing flashes or repeats; no single animation exceeds 280 ms and a move settles by 520 ms.
- **Language and structure:** `lang="en"`, `<title>Tic-tac-toe: play against a computer that never loses</title>`, one `h1` and a `main` landmark.

## 8. Second-opinion summary

The UX reviewer asked for changes (1 high, 6 medium, 8 low). Codex agreed in two passes (3 medium, 1 low). Every finding was fixed, and none were rejected. Details and measurements are in `.factory/reviews/20260928-032800-design-rework-reconciled.md` and the rework section of `.factory/reviews/design-reconciliation.md`.

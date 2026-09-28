# Design rework reconciliation: direction C, Tabletop Tiles (2026-09-28)

Reviewers:
- UX reviewer (factory-ux-reviewer agent): REQUEST-CHANGES (0 critical, 1 high, 6 medium, 8 low).
- Codex pass 1 on screens.md (`20260928-031421-screens.md-codex.md`): AGREE (2 medium, 2 missing).
- Codex pass 2 on design-system.md after the fixes (`20260928-032510-design-system.md-codex.md`): AGREE (1 medium, 1 low).
- Ollama was not run for this rework (its output was non-conforming in earlier phases).

## Accepted

| Finding | Change |
|---|---|
| UX HIGH: board has no floor; tiles spill out of the tray on short viewports (phone landscape, 400% zoom) | Board `max(180px, min(100%, 360px, 45svh))`; 180 = 3 × 44 + 2 gaps + 2 paddings. Measured at 844 × 390: 44 px tiles, none outside the tray |
| UX MEDIUM and Codex 1 C1: press/hover transforms apply under reduced motion | All movement moved into `prefers-reduced-motion: no-preference`; under reduce, only the edge shrinks |
| UX MEDIUM: drop hides pieces (opacity 0, 120 ms stagger), so a taken square looks empty | Opacity removed; the stagger dropped; pieces are visible from the first frame. The lift starts at 280 ms, and a move settles by 520 ms |
| UX MEDIUM: win-line maths off by 4 px, and the bar is not lifted with the tiles | Overlay inset `tray-padding − gap/2`, rising 3 px with the tiles. All 8 lines measured through the lifted tile centres at both sizes: worst error 0.01 px |
| UX MEDIUM: token names and values drift from the mockup CSS | Mockup `:root` is now generated from tokens.json with the same flatten as `tokens.test.ts`, and every product value uses a token. Added `font.line.button`, `size.button-edge`, the button padding tokens, `size.win-line-inset`, `font.size.display-narrow` and `a11y.focus-offset-button` |
| UX MEDIUM: X/O contrast class is ambiguous | §2 has a Class column. X and O are non-text SVG graphics (3:1); screens.md tells the contrast test to class them that way |
| UX MEDIUM: disabled vs active tiles are barely distinguishable; the second choice button is below the fold at 320 × 568 | surface-sunken darkened to #ecdfc6 and the resting edge lowered to 2 px. The board uses 45svh, buttons are exactly 44 px, and the title is 1.75rem below 480 px. Checked on a product page on its own at 320 × 568: the second button's edge ends at 536 px |
| UX LOW: button focus ring lost on the dark button edge | Buttons use a 6 px ring offset |
| UX LOW: tile outline vs tile-edge is 2.56:1 on the bottom side | Documented in §2; the other three sides and the edge mark the boundary |
| UX LOW: winning pieces shrink under the 4 px border | Winning padding reduced by the extra 2 px |
| UX LOW: iOS `:active` needs a `touchstart` listener | In design-system §5 and the screens.md implementation impact |
| UX LOW: 44 px button reserve arithmetic is off | Buttons are exactly 44 px (min-height, no vertical padding). Choice buttons size to their labels, so they fit side by side at 360 px and stack on phones |
| UX LOW: "no motion over 400 ms" is inconsistent; timings differ from the board | Reworded (no animation over 280 ms; settles by 520 ms), and the changes from the board are recorded as a deliberate refinement |
| UX LOW: intent references misquoted | Quoted exactly; §1 says what C takes from each reference |
| UX LOW: `.is-focused` in the product block; duplicate ids | `.is-focused` moved to the mockup chrome, and ids are suffixed per state and frame |
| Codex 1 C2: `tokens.test.ts` asserts `--motion-fast` = `0ms` and excludes shadows | In the screens.md implementation impact |
| Codex 1 Missing: motion verification | The implementation impact lists three assertions: reduced motion is stationary, only the last move's pieces animate, and status, announcement and focus update in the landing frame |
| Codex 1 Missing: board stability for the new styles | Measured: the board box is identical in all 8 board states per frame size, and in all 3 screens on the product page on its own at 320 × 568 |
| Codex 2 C1: the bar shows through the O ("slashed O"), 2.09:1 where the ring crosses the bar | A win-surface backing disc (r 37) sits behind pieces on winning tiles, so the bar passes under the piece |
| Codex 2 C2: phone frames can't prove the fold fix, because svh uses the browser viewport | Verified on the product page on its own at an actual 320 × 568 viewport (see above) |

## Rejected

None.

## For the human

- **Implementation follows approval.** This design changes presentation only, but the built app still has the old flat look. Approving it means a planning rework adds a restyle feature (screens.md "Implementation impact").
- **CI breaks if the tokens are committed alone.** `tokens.test.ts` and `contrast.test.ts` read `tokens.json`, so committing the new tokens without the restyle fails CI. I recommend the design approval commit goes on a branch or in the same pull request as the restyle feature, not straight to main.
- **Two refinements from the board as shown.** The X-then-O stagger was dropped, because a delayed piece looked like an empty square. Disabled tiles are a little darker and flatter than on the board, so they don't look pressable before a choice.

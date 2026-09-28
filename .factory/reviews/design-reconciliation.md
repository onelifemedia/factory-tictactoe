# Design reconciliation (2026-09-27)

Artifacts: `design/design-system.md`, `design/tokens.json`, `design/screens.md`, `design/screens/game-01..03-*.html`.

## Reviewers
| Reviewer | Verdict | Critical/High | Top finding |
|---|---|---|---|
| factory-ux-reviewer (Claude agent) | REQUEST-CHANGES | 0 / 1 | The load-error fallback flashed on every load |
| Codex, pass 1 | AGREE (0 critical/high, 2 medium) | 0 / 0 | Sample board showed the computer making a losing reply |
| Codex, pass 2 (after fixes) | AGREE (no findings, 2 missing) | 0 / 0 | Load-error handler must not depend on the bundle |
| Ollama | Disabled by approver 2026-09-27 | — | — |

Plugin note: `second-opinion.sh` labelled both Codex outputs NONCONFORMING. That was a parser bug (verdict and justification on the same line were rejected), which the approver reports as fixed in the plugin on 2026-09-27. Both Codex design replies are recorded as **AGREE**, as their raw output states. Kept for the retro.

## Accepted (changed)
| Finding | Change |
|---|---|
| UX HIGH: the load-error fallback is visible by default and flashes on load | Hidden by default. Revealed by the script tag's `onerror` in `index.html` (independent of the bundle, per Codex pass 2) or by a `main.ts` start failure. New wording |
| UX MEDIUM: the 1b and 1c messages show together when JavaScript is off; jargon | Fixed by hidden-by-default; 1b is now "The game didn't load. Try reloading the page." |
| UX MEDIUM and Codex C1: the sample reply r1c3 is a losing move | All sample games regenerated from an ADR-010 minimax; listed in screens.md |
| UX MEDIUM: sighted players can't see where the computer moved | The visible status now says "Computer placed O in row R, column C. Your turn." |
| UX MEDIUM: focus after the choice lands on the occupied r1c1 in Flow B | Focus goes to the first empty square in reading order |
| UX MEDIUM: status and choice cause layout shift at 320 px | Reserved status height (3/2 lines); choice, hint and Play again moved to a fixed-height action area below the board; board never moves (verification added to screens.md) |
| UX MEDIUM: Play again below the fold at 320×568 | Tagline removed, board capped at 50svh, action area under the board |
| Codex C2: arrow-key model not discoverable | Visible keyboard hint during play, linked via `aria-describedby` |
| UX LOW: repeated identical announcement | Documented: clear, then set, on every action |
| UX LOW: when the taken message clears | Documented: at the next valid move; focus movement does not clear it |
| UX LOW: no real announcer in the mockups | `role="status"` element added to every mockup |
| UX LOW: strike line makes O read as Ø | Win-surface patch behind the mark |
| UX LOW: fallback used the lowest-emphasis style | Uses status style |
| UX LOW: tagline untraced; R-007 missing on screens 1 and 3 | Tagline removed; R-007 added |
| UX LOW: token and CSS drift (vw vs cqi, hover "no shadows", literals, unused tokens) | Mark uses cqi of the board; hover documented as an inset ring; CSS uses token variables; space-6 removed, small now used |
| Codex pass 2 Missing: verify "board never moves" | Added to screens.md "Verification to carry into the plan" |

## Rejected / no change
- UX LOW: tapping the disabled board before choosing gives no feedback. The reviewer said no change is required, and the PRD specifies disabled squares.
- UX LOW: the focus ring reads as a thin double border on buttons. The reviewer rated it acceptable (10:1, 3 px), so it is kept.

No Codex findings were rejected, so no rebuttal round was needed.

## Resolved by the approver (2026-09-27)
- Option (a) chosen: specification reopened; architecture §2/§5 updated; board-stability check added to acceptance R-010 (plus a focus-after-choice criterion in R-007 and exact load-error copy in R-001). Design approved as shown.

## Originally put to the human
- Two design refinements conflict with the approved **architecture** text: §5 (focus after a choice goes to r1c1) and §2 (static fallback removed on start). The "board never moves" check is not yet an acceptance criterion. Options: (a) reopen specification to update architecture §2/§5 and add the check to acceptance R-010, then re-approve the specification together with the design (recommended; no shortcuts); (b) leave the refinements recorded in screens.md only.

## Rework 2026-09-28: direction C, Tabletop Tiles

The approver chose direction C from three boards (`design/directions/`). The design system, tokens and the three screens were rebuilt from it.

Reviews: UX reviewer REQUEST-CHANGES (1 high, 6 medium, 8 low), Codex pass 1 AGREE (2 medium), Codex pass 2 AGREE (1 medium, 1 low). Every finding was accepted and fixed; none were rejected. Details and measurements: `reviews/20260928-032800-design-rework-reconciled.md`.

For the human:
- Approval leads to a planning rework (a restyle feature).
- Committing `tokens.json` alone breaks `tokens.test.ts` and `contrast.test.ts`.
- The stagger was dropped and disabled tiles darkened relative to the board.

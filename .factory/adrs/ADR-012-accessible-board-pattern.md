# ADR-012: Native buttons, roving tabindex and a single polite status region

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** R-005, R-007–R-010

## Context
The board must be fully keyboard- and screen-reader-operable with exact announcements and zero axe violations.

## Decision
We will render the board as `role="group"` containing nine native `<button>`s with names `Row R, column C, empty|X|O`, use a roving tabindex with arrow keys stopping at the edges, mark occupied squares `aria-disabled` (still focusable) during play and `disabled` otherwise, and announce through one visually hidden `role="status"` region written once per action (cleared, then set on the next frame so repeated messages are read again).

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| ARIA `grid` role | Semantic 2D widget | More ARIA to get right; inconsistent screen-reader support | Buttons are simpler and robust |
| All nine squares in the Tab order | No custom key handling | Nine Tab stops per pass | Worse keyboard experience; intent asks for arrow navigation |

## Consequences
Positive: native activation for touch, mouse and keyboard; predictable semantics. Negative: the real screen-reader experience is not verified by the factory (human follow-up). No new dependencies.

## Second opinion
Codex C7 (MEDIUM): `<noscript>` does not cover a failed bundle download. Accepted: a static fallback message is removed by `main.ts` on start (architecture §2). See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

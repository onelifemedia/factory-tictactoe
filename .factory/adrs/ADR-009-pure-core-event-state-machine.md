# ADR-009: Pure game core returning state and events, with a synchronous computer reply

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** R-001–R-004, R-006, R-008

## Context
Correctness must be verified exhaustively without a DOM, and announcements must be exact and testable.

## Decision
We will implement the game as pure functions `startGame` and `playHumanMove` returning `{ state, events }`, applying the computer's reply synchronously in the same call, and derive all announcement text from events in a pure `messages.ts`.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Mutable game class tied to the DOM | Less code | Hard to test exhaustively | Blocks R-003 verification |
| Asynchronous computer turn with a delay | Feels more human | Races with input, timers in tests | Open question 2 defaults to instant |

## Consequences
Positive: the exhaustive test and message tests need no browser; an at-rest `playing` state is always the human's turn, so out-of-turn input cannot happen. Negative: adding a delay later would need a pending state. No new dependencies.

## Second opinion
See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

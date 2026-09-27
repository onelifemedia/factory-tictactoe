# ADR-010: Full-depth memoized minimax with deterministic tie-break, verified by exhaustive enumeration

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** R-003

## Context
The computer must never lose from any reachable position. The state space is at most 3⁹ = 19,683 boards, so a full search is cheap.

## Decision
We will choose O's move by full-depth minimax with node-relative values (`10 − plies to the end` for an O win, `plies to the end − 10` for an X win, 0 for a draw), memoized by board plus side to move so cached values are valid across searches and starters, breaking ties by the lowest square index. We will verify it with a test that enumerates every legal human move at every human turn for both starting sides and asserts that no finished game is an X win.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Hand-coded strategy rules | No search | Easy to get subtly wrong | Correctness is the product |
| Precomputed lookup table | Constant time | Generated artifact to maintain | Unnecessary given tiny search cost |

## Consequences
Positive: provably perfect play and a deterministic, repeatable test. Negative: the computer always plays the same opening (square 1 when it starts), which is acceptable because variety is not a requirement. No new dependencies.

## Second opinion
Codex C4 (MEDIUM): a board-only memo key with root-relative depth would be wrong across starters (for example `OX.......` with X to move or O to move). Accepted: the key now includes side to move and values are node-relative. See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

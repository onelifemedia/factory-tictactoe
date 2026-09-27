# ADR-001: Vanilla TypeScript and Vite, no UI framework

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** R-001–R-011, intent.technology.decisions[0]

## Context
The UI is nine squares, two choice buttons and a result area. The bundle must stay under 50 KB gzipped (R-011). The game logic must be pure so it can be verified exhaustively (R-003).

## Decision
We will write the game in strict TypeScript without a UI framework, bundled by Vite, keeping the rules in a DOM-free core and a thin hand-written DOM layer.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Preact + Vite | Component model, small | About 4 KB runtime, extra abstraction | Not needed for 9 cells |
| Svelte + Vite | Small compiled output | Compiler step, extra lint and typecheck plumbing | Adds tooling for no user benefit |

## Consequences
Positive: tiny bundle and no framework upgrades. Negative: DOM updates and focus handling are written by hand, which the e2e tests have to cover. Licenses: typescript Apache-2.0, vite MIT. Both are dev-only; none ships in the bundle.

## Second opinion
See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

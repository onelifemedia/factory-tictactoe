# ADR-006: Type-check with tsc in strict mode

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** intent.technology.decisions[5]

## Context
Vite strips types without checking them.

## Decision
We will run `tsc --noEmit` with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` as a separate CI step and pre-push hook.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Rely on the editor only | No CI step | Errors can merge | Unsafe |

## Consequences
Positive: board indexing errors are caught at compile time. No new dependencies beyond typescript (ADR-001).

## Second opinion
See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

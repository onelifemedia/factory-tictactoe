# ADR-007: Vitest for unit and exhaustive tests

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** R-003, R-004, R-008, intent.technology.decisions[6]

## Context
The core needs fast unit tests and an exhaustive never-lose test that runs on every push.

## Decision
We will use Vitest for all DOM-free tests, including `tests/unit/never-loses.test.ts`.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Jest | Mature | Needs TypeScript/ESM configuration | Extra setup |
| node:test | No dependency | Weaker TypeScript support | Friction |

## Consequences
Positive: shares the Vite config; zero-config TypeScript. Licenses: vitest MIT, dev-only.

## Second opinion
See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

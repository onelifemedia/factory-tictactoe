# ADR-003: npm with Node 22 pinned

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** intent.technology.decisions[2]

## Context
Local and CI builds must be reproducible, and the human chose npm and Node 22.

## Decision
We will use npm with a committed `package-lock.json`, pin Node 22 in `.nvmrc` and `package.json` `engines`, and have CI read `.nvmrc` through `actions/setup-node`.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| pnpm | Faster, stricter | Another tool to install | Human chose npm |
| Node 24 | Newer | Human chose 22 | Human's choice |

## Consequences
Positive: one toolchain, identical local and CI builds. Negative: Node 22 reaches end of life in April 2027, so upgrade then. No new dependencies.

## Second opinion
See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

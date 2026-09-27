# ADR-004: Prettier for formatting

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** intent.technology.decisions[3], standards §3

## Context
Formatting must be checked in the pre-commit hook and in CI.

## Decision
We will format all TypeScript, CSS, HTML, JSON, YAML and Markdown with Prettier defaults, checked by `prettier --check .`.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Biome | Fast, one tool | Doesn't carry the factory naming recipe | Kept separate from linting |
| dprint | Fast | Less common | No benefit here |

## Consequences
Positive: no formatting debates. Licenses: prettier MIT, dev-only.

## Second opinion
See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

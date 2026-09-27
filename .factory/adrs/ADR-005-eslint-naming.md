# ADR-005: ESLint with typescript-eslint and unicorn, using the factory naming rules

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** intent.technology.decisions[4], standards §6

## Context
The factory requires enforced naming rules. Standards §6 gives the recipe for TypeScript.

## Decision
We will use ESLint flat config with `@eslint/js`, `typescript-eslint` (recommendedTypeChecked) and `eslint-plugin-unicorn` 76 or later, applying the standards §6 naming rules verbatim, with kebab-case filenames.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Biome lint | Fast | No equivalent of the naming recipe | Would need a waiver ADR |
| oxlint | Very fast | Incomplete type-aware rules | Same |

## Consequences
Positive: naming is checked mechanically. Negative: type-aware linting is slower, which is acceptable at this size. Licenses: eslint, @eslint/js, typescript-eslint and eslint-plugin-unicorn are all MIT and dev-only.

## Second opinion
See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

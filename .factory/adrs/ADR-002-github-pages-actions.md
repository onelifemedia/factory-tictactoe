# ADR-002: Host on GitHub Pages, deployed by GitHub Actions

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** R-014, intent.technology.decisions[1]

## Context
The site is static with no server (complexity ceiling). The human committed to GitHub Pages. The repo is already on GitHub.

## Decision
We will deploy `dist/` to GitHub Pages using `actions/upload-pages-artifact` and `actions/deploy-pages` from a workflow triggered by a successful CI run on main.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Netlify | Preview deploys | Extra account and secret | Human committed to Pages |
| Vercel | Preview deploys | Extra account; built for server features | Same |

## Consequences
Positive: free, no extra accounts. Negative: no preview deploys per PR; the path prefix `/factory-tictactoe/` requires a relative Vite `base`. Uptime is GitHub's, with no SLA. No new dependencies.

## Second opinion
See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

# ADR-008: Playwright and axe-core for end-to-end, keyboard and accessibility tests, in five projects

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** R-007–R-010, R-012, R-015, intent.technology.decisions[7]

## Context
Keyboard play, exact live-region text, layout, network and storage checks, and axe audits need real browser engines. Version-specific and real-device testing is out of scope.

## Decision
We will use Playwright with projects `chromium`, `firefox`, `webkit`, `mobile-android` (Pixel device, Chromium, touch) and `mobile-iphone` (iPhone device, WebKit, touch), run against `vite preview` of the production build, with @axe-core/playwright for audits.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Cypress + cypress-axe | Popular | WebKit experimental, weaker multi-engine support | Needs WebKit for Safari coverage |
| Vitest browser mode | One runner | Less mature for full-page flows | Risky for e2e |

## Consequences
Positive: engine-level coverage of all supported browsers. Negative: browser downloads slow CI down (cache them). Licenses: @playwright/test Apache-2.0; @axe-core/playwright and axe-core MPL-2.0 (file-level copyleft, used unmodified at test time only, never shipped).

## Second opinion
See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

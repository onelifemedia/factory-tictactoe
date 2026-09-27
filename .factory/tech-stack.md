# Tech stack — factory-tictactoe

Static browser game hosted on GitHub Pages. No backend, database, auth, analytics or external services.

## Decisions

| Area | Choice | Alternatives considered | Why |
|---|---|---|---|
| Language / UI | Vanilla TypeScript (strict) + Vite | Preact + Vite; Svelte + Vite | Smallest bundle (well under the 50 KB gzipped budget), no framework churn; pure game logic kept separate from a thin DOM layer. |
| Hosting | GitHub Pages, deployed by GitHub Actions | Netlify; Vercel | Committed by the human; free static hosting beside the repo. |
| Runtime / package manager | Node 22 (`.nvmrc` + `engines`), npm | Node 24; pnpm | Human's choice; reproducible local and CI builds. |
| Formatter | Prettier | Biome; dprint | Standard, zero-config. |
| Linter | ESLint + typescript-eslint + eslint-plugin-unicorn (factory naming recipe, standards §6) | Biome lint; oxlint | Carries the factory TypeScript naming rules. |
| Type checker | `tsc --noEmit` with `strict` | — | Built in. |
| Unit tests | Vitest (includes exhaustive never-lose test over every reachable position) | Jest; node:test | Vite-native, fast, zero-config TypeScript. |
| E2E / accessibility | Playwright + @axe-core/playwright | Cypress + cypress-axe; Vitest browser mode | Real-browser keyboard/touch flows; zero axe-core violations gate. |
| CI/CD | GitHub Actions | — | Same platform as repo and Pages. |

## Excluded

Analytics/tracking, ads, database, auth, external APIs, any server-side code or storage.

## License report

All dependencies are development-time only; the shipped bundle contains only project code.
Checked with `validate.sh licenses --proposed` on 2026-09-27: 11 packages, 0 findings.

| Package | License |
|---|---|
| typescript | Apache-2.0 |
| vite | MIT |
| vitest | MIT |
| eslint | MIT |
| @eslint/js | MIT |
| typescript-eslint | MIT |
| eslint-plugin-unicorn | MIT |
| prettier | MIT |
| @playwright/test | Apache-2.0 |
| @axe-core/playwright | MPL-2.0 |
| axe-core | MPL-2.0 (injected into the page only during tests, never shipped) |

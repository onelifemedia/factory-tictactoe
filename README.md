# Tic-tac-toe

A browser tic-tac-toe game with an unbeatable computer opponent, built end to end by the Software Factory plugin as a live test.

No install, no sign-up, no ads, no tracking. Plays by touch, mouse, keyboard and screen reader.

## Develop

Requires Node 22 (see `.nvmrc`; `nvm use`).

```sh
npm ci              # also activates the git hooks in .githooks
npm run dev         # local dev server
npm run build       # production build into dist/
```

## Checks

The same commands run in the git hooks and in CI (`.factory/config.json` → `standards.commands`):

| Command                | What                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run format:check` | Prettier                                                                                                   |
| `npm run lint`         | ESLint with the naming rules (`docs/engineering-standards.md`)                                             |
| `npm run typecheck`    | `tsc --noEmit`, strict                                                                                     |
| `npm test`             | Vitest unit tests                                                                                          |
| `npm run test:e2e`     | Playwright in Chromium, Firefox, WebKit and Android/iPhone emulation (first run: `npx playwright install`) |

Product and design documents live in `.factory/` (PRD, acceptance criteria, architecture, ADRs, design system, plan).

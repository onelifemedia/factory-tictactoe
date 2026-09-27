# Integrations (MCP servers)

_Setup snapshot from `mcp-setup.sh`. Updated 2026-09-27T16:16. Run `/factory:integrations check` for current status (read-only)._

| Service | Auth | Used by phases | Status |
|---|---|---|---|

## How to finish setup

- **OAuth servers** (Supabase, Vercel, Linear, Sentry): start `claude` in this repo, approve the project servers when prompted, run `/mcp`, pick the server, choose *Authenticate*. Or from the shell: `claude mcp login <id>`.
- **PAT servers** (GitHub): export the variable in your shell profile (`~/.zshrc`), e.g. `export GITHUB_PAT=github_pat_…`, then open a new terminal. `.mcp.json` references it as `${VAR}` and never stores it.
- **App keys**: copy `.env.example` to `.env` and fill the values. `.env` is git-ignored.
- No restart is needed after `.mcp.json` changes; Claude Code reloads and asks for approval on next use.

## GitHub: gh CLI instead of MCP (2026-09-27)

At the human's direction, all GitHub work (PRs, Actions, Pages) goes through the `gh` CLI, which is already authenticated here (account `onelifemedia`, repo + workflow scopes). The GitHub MCP server was removed from `.mcp.json`. It is optional: re-add it with `/factory:integrations add github` once `GITHUB_PAT` is exported.

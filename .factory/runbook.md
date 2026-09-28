# Runbook: factory-tictactoe

_Static browser game on GitHub Pages. No servers, data or secrets. Traces to: R-014, ADR-011, `intent.operations` (uptime: whatever GitHub Pages provides; on call: nobody, acknowledged; alerting: the GitHub Actions failure email to the repo owner)._

## Status (2026-09-28, updated after the Tabletop Tiles restyle): published to Pages, not reachable; accepted

| What | State | Evidence |
|---|---|---|
| Pipeline builds and publishes to GitHub Pages | **Works** | Run [36365983395](https://github.com/onelifemedia/factory-tictactoe/actions/runs/36365983395): `prepare`, `build`, `deploy` succeeded for `9a81c23`. Same result for every later merge: [36399401175](https://github.com/onelifemedia/factory-tictactoe/actions/runs/36399401175) (F-014, `7a90928`), [36400631269](https://github.com/onelifemedia/factory-tictactoe/actions/runs/36400631269) (F-015, `661b82e`) and [36407314972](https://github.com/onelifemedia/factory-tictactoe/actions/runs/36407314972) (QA round 2, `a1ba815`) |
| Every Deploy run | **Fails at the smoke test** | The account's user site redirects to `onelifemedia.com` (next row), so the smoke test's 3-minute wait for the new `build-id` times out (Playwright 240 s test timeout). Rollback then fails because no earlier run has both deploy and smoke succeeded. The Actions failure email goes to the repo owner each time. Re-checked 2026-09-28 10:08 UTC |
| Site reachable | **No** | The account's user site `onelifemedia.github.io` has custom domain `onelifemedia.com`, so GitHub 301-redirects `https://onelifemedia.github.io/factory-tictactoe/` to `http://onelifemedia.com/factory-tictactoe/`. `onelifemedia.com` resolves to `104.247.81.99`, which is not GitHub Pages, and returns **410 Gone**; HTTPS there fails. Re-checked 2026-09-28: unchanged (301 → 410; Pages `html_url` `http://onelifemedia.com/factory-tictactoe/`, repository `cname` none) |
| Live smoke test (build-id wait + one move) | **Unverified** | It timed out in run 36365983395 and in every run since, because the site is unreachable |
| Automatic rollback (redeploy the last good build) | **Unverified** | No earlier run has both deploy and smoke succeeded, so there is nothing to roll back to. In run 36365983395 the rollback correctly logged "No earlier successful deploy to roll back to" and failed. The forced-failure run (`force_smoke_failure=true`) was **not** run, by decision. |
| Stale-commit skip | **Verified live** | A full re-run (attempt 2) of run [36362932541](https://github.com/onelifemedia/factory-tictactoe/actions/runs/36362932541) for `87bb290`: `prepare` logged "no longer the latest commit on main (9a81c23…)"; build, deploy, smoke and rollback were skipped; the run succeeded with nothing published |
| Pages settings | Enabled, source "GitHub Actions" | `gh api repos/onelifemedia/factory-tictactoe/pages` |
| `github-pages` environment | No required reviewers; deployment branches `main` only | Checked through the API (protection rule: branch policy only), again on 2026-09-28; no change was needed |

**Decision D-71851f1132844a86b5bd7a803399b03c:** Jim chose to leave the site undeployed. No DNS, user-site or account setting was changed, and the forced rollback was not run. Reconfirmed for the restyle release on 2026-09-28 (Claude, test operator, authorized by Jim Gibbs): the same decision and the same limits. Nothing was deployed by hand; the automatic runs above are the pipeline reacting to merges.

## Accepted risks

1. **The game is not publicly reachable.** Every deploy run will publish successfully, then fail its smoke test and email the owner, until the domain is fixed. The options, all outside this repository:
   - point `onelifemedia.com` at GitHub Pages
   - give this repository its own custom domain (a scope change)
   - remove the user site's custom domain
   - move the repository to another account
2. **The live smoke test and the automatic rollback are unverified in production.** They are covered by unit and harness tests only: `tests/unit/smoke-harness.test.ts`, `deploy-decisions.test.ts`, `deploy-workflow.test.ts`, `require-latest-main.test.ts` and `find-rollback-run-cli.test.ts`. Once the site is reachable, verify them with a normal deploy, then `gh workflow run deploy.yml --ref main -f force_smoke_failure=true`.
3. **The human follow-ups from QA stay open:**
   - a real VoiceOver pass;
   - a real-device check on iOS Safari and Android Chrome, now also covering the Tabletop Tiles look and reduced motion;
   - new with F-015: on a real iPhone, pressing a tile or button visibly sinks it (`:active` via the passive `touchstart` listener).

   See `.factory/qa-report.md` (round 2).
4. **Failure emails on every merge.** Until the domain is fixed, each merge to `main` produces a failed Deploy run and an email. This is expected, not an incident: check that `prepare`, `build` and `deploy` succeeded and that the smoke test timed out, rather than failing an assertion.

## Where things are

| What | Where |
|---|---|
| Repository | https://github.com/onelifemedia/factory-tictactoe |
| Pages URL reported by GitHub | http://onelifemedia.com/factory-tictactoe/. The `onelifemedia.github.io` user site's custom domain applies to project sites, so `https://onelifemedia.github.io/factory-tictactoe/` 301-redirects there. See "Known failure modes" (1). |
| CI workflow | `.github/workflows/ci.yml` (pull requests and pushes to `main`) |
| Deploy workflow | `.github/workflows/deploy.yml` → https://github.com/onelifemedia/factory-tictactoe/actions/workflows/deploy.yml |
| Freshness guard | `.github/actions/require-latest-main/action.yml` |
| Deploy decision scripts | `scripts/deploy/*.mjs` |
| Smoke test | `tests/smoke/smoke.spec.ts`, `playwright.smoke.config.ts` |
| Logs | Actions run logs (each run page), retained by GitHub. There are no application logs: the game has no backend. |
| Settings | Settings → Pages (source: GitHub Actions). Settings → Environments → `github-pages`: no required reviewers; deployment branches: `main` only. |

## How a deploy happens

1. A pull request merges to `main`. CI runs on the push.
2. When CI succeeds for a **push to `main` in this repository**, `Deploy` starts through `workflow_run`. Runs are queued first in, first out (`concurrency: pages`, `queue: max`), and none is cancelled.
3. `prepare` deploys only if the commit is **still the latest on `main`**; otherwise it skips, and the newer commit's queued run deploys it.
4. `build` builds that exact commit with `BUILD_ID=<sha>`, which becomes `<meta name="build-id">`. `upload-pages-artifact` stores the site for 90 days.
5. `deploy` re-checks freshness, then publishes to Pages.
6. `smoke` re-checks freshness, then waits up to 180 s for the live page's `build-id` to equal the commit, and plays one move.
7. If `smoke` fails, `rollback` redeploys the newest earlier run whose `deploy` and `smoke` both succeeded, then fails the run. The owner gets the Actions failure email.

Every job that touches the site checks "still main's latest commit?" right before acting, so "Re-run failed jobs" on an old run can never publish over a newer release.

## Manual commands

Deploy main's latest commit again (it refuses unless CI succeeded for that exact commit on `main`):
```sh
gh workflow run deploy.yml --ref main -f force_smoke_failure=false
gh run list --workflow deploy.yml --limit 1        # then: gh run watch <id>
```

Check what is live (the build id is the deployed commit):
```sh
curl -sL http://onelifemedia.com/factory-tictactoe/ | grep -o '<meta name="build-id"[^>]*>'
```

Exercise the automatic rollback. This fails the run on purpose and emails the owner:
```sh
gh workflow run deploy.yml --ref main -f force_smoke_failure=true
```

## How to roll back

- **Automatic:** a failed smoke test redeploys the last good build (see step 7). It needs at least one earlier run whose deploy and smoke both succeeded, with its artifact still inside the 90-day retention.
- **Manual (preferred for a bad change):** revert the offending merge on `main` (`gh pr create` for a revert PR, or `git revert -m 1 <merge-sha>` via a PR). Merging it triggers CI and then Deploy for the reverted commit.
- **Manual (no merge):** re-run the Deploy workflow of the last good run, only while its commit is still main's latest. Older runs refuse by design (the freshness guard).

## 3 a.m. checklist

1. Open the failed run from the failure email. Which job failed?
   - `prepare`: CI or API problem. Read the log; for a manual dispatch, check that CI passed on main's latest commit.
   - `build`: the same failure would appear in CI; fix it through a pull request.
   - `deploy`: Pages or permissions. Check Settings → Pages, and whether the error says "Ensure GitHub Pages has been enabled".
   - `smoke`: did the live page show the new `build-id`? Check with the `curl` command above. If it's unreachable, see failure mode 1.
   - `rollback`: "No earlier successful deploy" means there was nothing to restore (first deploy, or the artifact expired). An exit code of 2 means a GitHub API error, so retry later.
2. Is the live site working? Load it and play one move.
3. If not, revert the last merge (see "How to roll back"), or wait for the automatic rollback's result.
4. Fill in the incident template below.

## Known failure modes

1. **The site is unreachable at the account's custom domain** (seen on the first deploy, 2026-09-28; accepted, see "Accepted risks"):
   - The `onelifemedia.github.io` user site has custom domain `onelifemedia.com`, so Pages redirects this project there.
   - `onelifemedia.com` resolves to `104.247.81.99` (not GitHub Pages), which returns **410 Gone**, and HTTPS fails.
   - The smoke test times out and the run fails (run 36365983395, and every run since, most recently 36407314972 for `a1ba815`).
   - Fix at the account or DNS level. Decision D-71851f1132844a86b5bd7a803399b03c: left undeployed for now.
2. **Pages disabled:** `deploy` fails with "Ensure GitHub Pages has been enabled" (404).
3. **Artifact expired:** the rollback target's artifact is older than 90 days, so rollback logs it and fails. Revert manually.
4. **Stale rerun refused:** a rerun of an old run's `deploy`, `smoke` or `rollback` stops with "no longer the latest commit on main; a newer run owns the site". This is intended.
5. **GitHub API errors:** `gh api` calls time out after 30 s and retry once. Rollback exits 2 with "GitHub API request failed". Retry later.
6. **More than 100 pending deploy runs:** GitHub cancels the overflow. Re-run the deploy for main's latest commit.
7. **actionlint and `queue`:** actionlint 1.7.12 doesn't know `concurrency.queue`. CI ignores exactly that diagnostic.
8. **`check:visuals` fails in CI** (F-014, R-013): the build contains a font or image file, an `@font-face`/`@import`/`image-set()`, a file `url()`, an image element or attribute, an icon or preload link to a file, or a `<use>` pointing outside the page. The log names the file and the reference. The fix is to draw the visual in CSS or inline SVG; the empty `data:,` icon in `index.html` is the only allowed icon link.
9. **Firefox e2e flake under local load** (QA-1): an `expect.poll` 5 s timeout, usually in `announcements.spec.ts`, fails about 1 run in 3 locally and passes on rerun; CI has been green. It is not a product failure. Rerun it, and see the retro for the tooling fix.

## Incident template

```
Title:
Date/time (UTC) detected:        Resolved:
Impact: (site down? wrong build live? since when?)
Timeline:
  - hh:mm  what happened / what was done
Cause:
Fix:
Follow-ups (issues/PRs):
```

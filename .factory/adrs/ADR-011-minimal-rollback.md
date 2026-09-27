# ADR-011: Minimal automatic rollback: redeploy the last successful Pages artifact

- **Status:** proposed (accepted when the specification bundle is approved)
- **Date:** 2026-09-27
- **Deciders:** Claude (test operator, authorized by Jim Gibbs)
- **Traces to:** R-014, intent.operations

## Context
The human requires automatic rollback when the post-deploy smoke test fails, kept minimal. Pages has no built-in rollback. By default `upload-pages-artifact` keeps artifacts for 1 day.

## Decision
We will upload each Pages artifact with 90-day retention. When the smoke test fails, a rollback job finds the latest `deploy.yml` run on main that concluded successfully (`gh run list --status success`), downloads its `github-pages` artifact (`actions/download-artifact` with `run-id` and `github-token`), re-uploads the `artifact.tar` unchanged under the distinct name `github-pages-rollback`, deploys it with `actions/deploy-pages` (`artifact_name: github-pages-rollback`), and fails the run. If there is no such run, or its artifact has expired (the 90-day retention limit), it logs that and fails. The smoke test waits for the deployed build-id before playing, and every deploy builds `workflow_run.head_sha` and only when it is still the tip of main.

## Alternatives considered
| Option | Pros | Cons | Why not |
|---|---|---|---|
| Rebuild the previous commit | No artifact retention needed | Not the same bytes; slower | Human asked for the previous artifact |
| Manual rollback only | No custom logic | Site stays broken until a human acts | Human chose automatic |

## Consequences
Positive: a bad deploy is replaced within minutes. Negative: custom workflow logic that is only verifiable in the deploy phase (a `force_smoke_failure` dispatch input exists for that). A rolled-back run concludes failed, so it is never chosen later. No new dependencies (first-party GitHub actions).

## Second opinion
Codex raised C1 (HIGH, reusing the `github-pages` name clashes), C2 (HIGH, `workflow_run` builds the wrong SHA), C3 (HIGH, artifacts expire after 90 days), C5 (MEDIUM, the smoke test could pass against the old deployment) and C6 (MEDIUM, a pending run can be replaced). C1, C2, C5 and C6 are accepted and applied. For C3, the approver accepted the 90-day expiry limit on 2026-09-27: after expiry, rollback logs and fails, and R-014 now says so. The approver also accepted "latest commit on main" wording for C6. See `.factory/reviews/specification-reconciliation.md` (architecture review, with ADRs as context).

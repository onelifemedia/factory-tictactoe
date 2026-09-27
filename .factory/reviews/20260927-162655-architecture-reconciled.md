# Reconciliation: architecture + ADRs (2026-09-27)

Reviewers: Codex (AGREE-WITH-CONCERNS; 3 high, 4 medium, 1 missing). Ollama qwen2.5:14b again returned a prose summary instead of the required format, so its verdict is unknown and it raised no findings (non-conforming, not treated as agreement).

## Accepted
- **C1 (HIGH), rollback artifact name clash:** the rollback re-uploads the downloaded `artifact.tar` unchanged as `github-pages-rollback` and deploys it with `artifact_name`, with no nesting. (architecture §6, ADR-011, acceptance R-014)
- **C2 (HIGH), `workflow_run` builds the wrong commit:** deploy checks out `workflow_run.head_sha`. Manual dispatch deploys the tip of main only if CI succeeded for that SHA. (§6, ADR-011)
- **C4 (MEDIUM), memo key:** the key is board plus side to move, with node-relative values; a test covers successive games with alternating starters. (§2, ADR-010, acceptance R-003)
- **C5 (MEDIUM), smoke test could see the old deployment:** a `build-id` meta tag carries the SHA, and the smoke test waits for it before playing. (§2, §6, acceptance R-014)
- **C6 (MEDIUM), concurrency drops pending runs:** each run deploys only if its SHA is still the tip of main, otherwise it skips. A replaced pending run is harmless because the tip contains every earlier merge. (§6) *This changes R-014's "every merge" wording; see "For the human".*
- **C7 (MEDIUM), failed bundle download shows nothing:** a static fallback message is removed by `main.ts` on start and tested by aborting the bundle request. (§2, ADR-012, acceptance R-001)
- **Missing, A4 unreachable in the browser:** `game.ts` takes the opponent as a parameter; unit tests inject a losing opponent to check A4 exactly, and Playwright covers A1–A3 and A5–A8. Nothing is injectable in production. (§2, §8, acceptance R-008)

## Rejected
- None.

## For the human
- **C3 (HIGH), artifact expiry:** Pages artifacts can be kept for at most 90 days. If more than 90 days pass between successful deploys, the rollback target has expired, so the rollback logs that and fails. Options: (a) accept this limit in R-014 (recommended: minimal, as intended); (b) keep last-good bytes durably, e.g. on a branch, which is more machinery than "nothing more".
- **C6 wording, R-014:** replace "every merge to main whose CI passes is deployed" with "the tip of main is deployed whenever its CI passes; an older merge whose CI finishes after a newer merge is deployed as part of that newer tip". Recommended.

## Human decisions (2026-09-27)
- C3: option (a) accepted. Artifact expiry after 90 days is acceptable; the rollback logs it and fails. R-014 was updated.
- C6 wording: accepted. R-014 now says "latest commit on main".

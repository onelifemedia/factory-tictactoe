<!-- reviewer: codex | kind: codex | model: default | phase: architecture | artifact: .factory/adrs/ADR-011-minimal-rollback.md | at: 20260927-165657 -->

## Verdict
AGREE — no CRITICAL or HIGH findings.
The revised rules resolve the stated overlap and stale-run rollback failures, but deployment delivery remains conditional on queue capacity.

## Findings
- [C1] [MEDIUM] Decision, `queue: max` — Queue overflow can still permanently lose the latest commit’s deployment — GitHub [documents](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) that additional runs are canceled when 100 are pending: with A running and 100 older runs waiting, latest commit C’s run is canceled; the older runs subsequently skip because C is main’s tip, leaving C undeployed despite passing CI — Add a reconciliation trigger that retries an undeployed, CI-approved main tip, or explicitly qualify R-014’s delivery guarantee with an approved queue-capacity limit.

## Missing
- State explicitly that “latest” is evaluated at slot acquisition. Main can advance during build/deployment; the concurrency lock serializes deployment workflows, not merges. This matches the revised acceptance criterion but does not guarantee that the published SHA remains main’s tip throughout deployment.

## Alternative
None

## Questions for the human

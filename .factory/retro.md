# Retrospective: factory-tictactoe

_Live end-to-end test of the Software Factory plugin (0.7.x → 0.8.5 during the run). Idea to approved deploy phase on 2026-09-27/28. Sources: `metrics.sh` (and `--json`), `.factory/state.json` events, `.factory/reviews/`, the QA report, the runbook, and git history._

## 1. Metrics

`metrics.sh` report:

| Measure | Actual | Target | Met? |
|---|---|---|---|
| First-run pass rate | **0.69** (9 of 13 features without a failed run-fix cycle) | 0.5 | yes |
| Average attempts per feature | **0.38** (F-005 1, F-008 2, F-011 1, F-012 1) | 1.0 | yes |
| Interventions per feature | **0.15** (2 decisions) | 1.0 | yes, but undercounted (see below) |
| Features | 13 planned, 13 done, 0 deferred | — | — |
| Rework | 2 (two specification reopens) | — | — |
| Cost | **$67.97**, $5.23 per feature (an average, not measured per feature) | budget $150 | 45 % used |

Phase hours: inception 0.13, specification 0.29, design 0.28, planning 0.08, **implementation 3.59**, QA 0.55, CI 0.30, **deploy 1.08**, improve 0.

What `metrics.sh` cannot see, or gets wrong:
- **Security:** the QA security reviewer found 0 critical and 0 high issues (2 low, fixed); `npm audit` found 0 vulnerabilities. Codex found **16 high issues across the run and 0 critical**. None of that appears in the metrics.
- **Interventions are undercounted.** Only the two recorded decisions are counted. The human also:
  - reopened the specification twice
  - approved 9 gates
  - made **six plugin fixes mid-run** (0.7.5 naming recipe; the parser, retry, restack-valid reviews and size rules; 0.8.x dev-dependency license audit, small whole-change diffs and QA-unit review events; 0.8.5 CI evidence)
  - made two scope decisions: leave the site undeployed, and don't run the forced rollback

  A truer count is about 20, or 1.5 per feature. That would miss the 1.0 target.
- **The reviewer scorecard counts only recorded events:** 22 of 31 real Codex runs. Specification, design, plan and QA-phase reviews were never turned into events.
- **One attempt went unrecorded.** F-010's CI-found clipping bug (Linux fonts at 200 % text) happened after the feature was `done`, and `feature attempt` refuses done features.
- **Cost trend:** the ledger only updates at session end, so every mid-session report lagged by $2–$7. Per-phase cost isn't attributable.
- **Product outcome:**
  - The **primary metric is met**: 0 computer losses across 642 games (exhaustive).
  - The **30-day done checklist is not met**: the live URL doesn't load. The site is unreachable because of the account's custom domain, and it was left undeployed by decision.

## 2. What worked / what didn't

**Worked**
- **Test first, then review, caught real bugs before merge.** Codex's 16 high findings were all accepted, and several would have broken production:
  - the smoke test dropping the Pages project path (F-013)
  - partial reruns publishing a stale build (QA rounds 1 and 2)
  - Vite stripping `onerror` from the load-error script (specification rework)
  - the concurrency queue dropping the latest deploy (plan)
- **Reviewing the spec before coding paid off every time** (F-001, F-006, F-008, F-013). Each review found 3–9 accepted items, which were cheaper to fix in prose.
- **Mutation checks** (breaking the code on purpose to confirm a test fails) proved tests weren't vacuous: blanked marks, a swallowed Tab, opacity 0, a clipped status line, an inverted guard, an external font in a real build. At least 3 test suites were strengthened after a mutation passed when it shouldn't have.
- **Exhaustive correctness:** the never-lose enumeration runs in 20 ms, and Codex's independent oracle agreed on all 4,520 positions.
- **Honest gates:** the CI and deploy gates refused to pass on wrong evidence twice. Both times the human fixed the plugin or made a decision rather than being worked around.

**Didn't**
- **Deploy found the one thing no test could.** The account's user site has custom domain `onelifemedia.com`, which redirects the project site to a host that returns 410. No phase asked about the hosting account or domain until the first real deploy, which cost about 1 hour of the deploy phase and leaves the product unreachable.
- **Platform differences surfaced late, one at a time:**
  - Safari skips buttons on Tab (F-008).
  - The Linux system font is wider than macOS's (F-010, found by CI after the pull request).
  - Headless Firefox wraps Tab (F-008).
  - Playwright ignores `<noscript>` text (F-011).
  - Each cost an attempt or a CI round.
- **Upstream edits needed full reopens.** Twice, design and planning findings needed architecture changes, so the specification was reopened (clearing downstream approvals). QA then left accepted architecture-text drift because another reopen was too costly.
- **Too much time went into tooling failures:**
  - 3 Codex runs failed because my `nvm use 22` removed Node 24's `codex` from the PATH, which I only diagnosed at F-012.
  - 3 correct Codex verdicts were mislabelled NONCONFORMING by the old parser.
  - Several of my Python edit scripts silently missed Prettier-reformatted text.
- **Ollama (qwen2.5:14b) contributed nothing.** It returned summaries instead of the review format in both runs, and was disabled by the approver after specification.

## 3. Reviewer scorecard

| Reviewer | Runs | Verdicts | Accepted | Rejected | Critical | High | Acceptance rate | Worth its latency? |
|---|---|---|---|---|---|---|---|---|
| Codex (`metrics.sh`, recorded events) | 22 | AGREE 15, AGREE-WITH-CONCERNS 7 | 59 | 0 | 0 | — | 1.0 | — |
| Codex (all review files) | 31 real runs, plus 3 failures (a PATH problem on my side) | AGREE 16, AGREE-WITH-CONCERNS 12, 3 mislabelled NONCONFORMING (actually AGREE) | all findings accepted | 0 | 0 | 16 | 1.0 | **Yes.** Typical latency 1–5 min per run. Every high finding was real, and at least 5 would have caused production failures or a false rollback. It also did independent verification: a 19,683-board check, a 4,520-position oracle, and reproducing `ENOBUFS`. |
| Ollama qwen2.5:14b | 2 | both unusable (prose summary) | 0 | — | 0 | 0 | — | **No.** Disabled after specification. |
| factory-ux-reviewer (agent) | 1 | REQUEST-CHANGES | 16 of 16 fixed, apart from 2 lows it said needed no change | 0 | 0 | 1 | ~1.0 | **Yes.** It caught a losing sample move, a load-error flash and layout shift. |
| factory-code-reviewer (QA agent) | 1 | REQUEST-CHANGES | 20 of 22 (2 accepted as risks) | 0 | 0 | 2 (naming) | 0.91 | Partly: mostly naming and structure; no behaviour bugs |
| factory-security-reviewer (QA agent) | 1 | CLEAN | 2 of 2 low | 0 | 0 | 0 | 1.0 | Yes, cheap: about 1 min, with a useful hardening list |
| factory-focus-validator (agent) | 1 | NEEDS-TRIM | 5 challenges, all adopted | 0 | — | — | 1.0 | Yes. It found the first-mover contradiction and forced a measurable "done" checklist. |

A 1.0 acceptance rate is partly a sign the reviewers were good, and partly that the author never pushed back. No finding was ever disputed, so the rebuttal round was never exercised.

## 4. Skill gaps

1. **`factory:hosting-preflight`** (run at the end of inception, and again at the start of deploy). For the chosen host, it discovers what the live URL will actually be and whether it resolves to that host.
   - For GitHub Pages: read the owner's user-site `cname`, check whether the project site will inherit a custom domain, check DNS for the resulting host (A/CNAME records against the host's published addresses), check HTTPS, and check the environment's protection rules.
   - It outputs a short "the site will live at X; reachable: yes/no; action needed" line that is recorded in `intent.operations` and the tech stack.
   - This would have surfaced the `onelifemedia.com` → 410 problem at inception, not at the first deploy.
2. **`factory:platform-probe`** (at design approval and at F-001). A small Playwright probe suite run across the configured projects before features rely on platform behaviour:
   - Tab order over buttons (the Safari default)
   - `<noscript>` handling
   - headless Tab wrap
   - system-font metrics against wide fallbacks (Linux)
   - `prefers-reduced-motion`
   - touch availability

   The results go into `tech-stack.md` as "platform facts", which the test-writer and implement skills read.
3. **`factory:mutation-check`** (in implement, after green). It applies 1–3 targeted mutations derived from the acceptance criteria (a removed attribute, a blanked text, an inverted comparison) and asserts that the tests fail. It records the result in the feature file and PR body. I did this by hand about 10 times, and it strengthened 3 test suites.
4. **`factory:visual-check`** (in implement, for UI features). It screenshots the built page at the design's viewports and compares it against the mockup screenshots, flagging layout drift for a human or model look. I did this by hand for F-006, F-007 and F-008; it caught the wrapped-label problem.
5. **`factory:docs-amend`** (after design, planning or QA). A lightweight path to update the *descriptive* parts of approved artifacts: module names, job graphs, file locations. It works from a small diff that the human approves, without a full `reopen` clearing downstream approvals. Normative text (requirements, acceptance criteria) still requires a reopen. This would have removed one reopen and the accepted architecture drift.

## 5. Proposed changes to this plugin (not applied; for the maintainer)

Items already fixed during the run are listed last for completeness.

```
skills/inception/SKILL.md
  + In "technology": after hosting is chosen, run the hosting preflight (see
    factory:hosting-preflight) and record the resolved live URL and its
    reachability in intent.operations.live_url / .live_url_reachable.
  + Reviewer setup: probe each enabled reviewer with a tiny fixed review prompt
    and require a parseable verdict before leaving it enabled (Ollama
    qwen2.5:14b failed format twice).

skills/deploy/SKILL.md
  + Step 0: run the hosting preflight before any deploy; if the live URL does
    not resolve to the host, stop with a decision (DNS / domain / account).
  + Add a "static host" variant: no staging/canary; health = post-deploy
    smoke test; rollback = redeploy the previous artifact. Say so instead of
    asking the agent to invent staging for GitHub Pages.

skills/implement/SKILL.md
  + Always run the spec second opinion for features that touch CI/deploy
    workflows, not only size M (every such spec review found HIGH items).
  + After green: run factory:mutation-check (or: "prove at least one
    acceptance criterion's test fails under a targeted mutation").
  + UI features: screenshot at the design viewports (factory:visual-check).
  + Before the red commit, run the lint command too; the pre-commit hook only
    runs format_check, so a lint-failing red commit slipped through (866db27).

agents/factory-test-writer.md
  + Hard rule: never create or modify production files, even temporarily
    (one run wrote and deleted a reference game.ts).
  + Know the runner: no Vitest matchers in Playwright specs (toSatisfy);
    Playwright's text engine skips <noscript>; headless Firefox wraps Tab.
  + Read "platform facts" from tech-stack.md (factory:platform-probe).

scripts/second-opinion.sh
  + Resolve each reviewer binary once (config reviewers[].command as an
    absolute path, captured at inception) instead of relying on PATH; a
    project's `nvm use` removed Node 24's codex from PATH and every run
    "failed" (F-006, F-012). Report "reviewer binary not found" distinctly.
  + Record a review-result event automatically after each run (reviewer,
    verdict, severities, artifact, revision) so metrics sees phase reviews
    too (22 recorded vs 31 real runs).

scripts/pr_stack.py
  + `restack` should also rebase children onto an *updated* open parent, and
    `open` should push rebased branches with --force-with-lease (F-011 had
    to be rebased and force-pushed by hand after F-010 changed).
  + `evidence` should be allowed after the ci phase for follow-up pull
    requests (it refused in deploy for the runbook PR #16).

scripts/factory_state.py (feature attempt)
  + Allow `feature attempt F-nnn --after-merge "<fingerprint>"` on done
    features so CI-found failures after the PR count (F-010).

scripts/merge_route.py
  + Size rule: count test files separately (or at half weight); F-008 and
    F-013 were "careful" only because of large test suites.

scripts/cost_ledger.py
  + `--report` should add the current session's transcript so mid-session
    reports are not $2-7 stale.

scripts/metrics.py
  + Interventions: include phase reopens, approvals with limits, plugin
    changes requested by the human, and scope decisions.

scripts/standards.py
  + `install --refresh-docs` to update an already-seeded
    docs/engineering-standards.md when the recipe changes (0.7.5 recipe had
    to be copied by hand).

templates/standards.md (TypeScript recipe)
  + name-replacements: add `dist: false` (a conventional folder name) next
    to the repository/configuration/application overrides; the rule forced
    check-dist-origins -> check-build-origins.

templates/intent.json
  + operations.live_url and operations.live_url_reachable fields.

skills/review/SKILL.md
  + Add a "docs-amend" path for descriptive architecture drift found in QA
    (see factory:docs-amend) instead of accepting drift to avoid a reopen.

Already fixed during the run (0.7.5 -> 0.8.5), listed for the changelog:
  - pr-stack.sh base --branch (bare branch name)
  - corrected naming recipe (repository/configuration/application)
  - second-opinion: verdict after a blank line; retry a failed reviewer once
  - merge routing: reviews valid across restacks; .factory excluded from
    size; test-only follow-ups and moved helpers routed correctly
  - licenses: dev dependencies audited by default
  - whole-change QA review diffs kept small
  - review results accepted for the QA unit
  - CI evidence counts only push-triggered workflow runs (Deploy excluded)
```

## Outcome

- **Product:** the game is complete and verified to specification in 5 engine and device configurations. The primary metric is met (0 losses), accessibility is automated-clean (0 axe violations, keyboard-only play) and the bundle is 3.3 KB. **It is not publicly reachable**, by decision; see `runbook.md` "Accepted risks".
- **Open human follow-ups:**
  - a real VoiceOver pass
  - a real-device iOS/Android check
  - a fix for the domain (then a normal deploy plus a forced-rollback run)
  - the architecture text drift

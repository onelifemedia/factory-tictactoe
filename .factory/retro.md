# Retrospective 2: factory-tictactoe, redesign cycle (2026-09-28)

_A test of the plugin's updated design phase (0.9.0) on the finished project. The cycle ran from reopening design (02:33 UTC) to the deploy approval (10:11 UTC). It covered the design personality, a specification amendment, three direction boards, direction C "Tabletop Tiles", a planning rework, F-014 and F-015, QA round 2, CI and deploy. Sources: `metrics.sh` (whole project), cycle-scoped events in `.factory/state.json` (from 06:58), the cost ledger, `.factory/reviews/20260928-*`, the QA report, git history (#18, #19, #20, #21), and this session's transcript. The first build's retro follows below._

## 1. Metrics

**Whole project** (`metrics.sh`, targets from `config.json`):

| Measure | Actual | Target | Met? |
|---|---|---|---|
| First-run pass rate | **0.60** (9 of 15 without a failed run-fix cycle; F-014 and F-015 both had one) | 0.5 | yes |
| Average attempts per feature | **0.53** (F-014 2, F-015 1, plus the first build's 5) | 1.0 | yes |
| Interventions per feature | **0.53** (8 recorded) | 1.0 | yes, but undercounted again (see below) |
| Rework | 5 (3 of them in this cycle: reopen design, reopen specification, reopen inception) | — | — |
| Cost | **$108.97**, $7.26 per feature (an average) | budget $150 | 73 % used |

**The redesign cycle alone** (from the ledger's cost checkpoints; each phase is the difference between the stops around it):

| Step | Cost | Notes |
|---|---|---|
| Design reopen, personality interview, conflict detected (previous session) | $8.62 | $70.69 → $79.31; stopped on decision D-4ff09b26 |
| Specification amendment, Codex, re-approval of intent and specification | ~$0.51 | 1 Codex run; 2 medium (1 accepted, 1 deferred to design) |
| **Three direction boards** | **$1.18** | a generator with a built-in contrast check; screenshots checked before presenting |
| Design system, tokens v2, 3 screens, UX review and 2 Codex passes | $4.31 | UX review found 1 high (no board floor) that the boards didn't show |
| Planning rework (F-014, F-015) and Codex plan review | $1.31 | 2 high findings, both accepted |
| Implementation of F-014 and F-015 (spec reviews, TDD, diff reviews, PRs, CI waits) | $10.38 | 3 failed fix cycles, all engine-specific CSS behaviour |
| QA round 2 (3 reviewers, fixes, Codex on the fixes, report) | $10.39 | about as much as implementation; includes a 7-command safety-check stall |
| CI gate and deploy phase | $1.58 | evidence for 16 units; runbook status |
| **Cycle total** | **≈ $38.28** | 35 % of the project's cost for 2 of its 15 features |

**What the metrics can't see, or get wrong:**
- **Interventions:** only 8 are recorded. In this cycle the human also:
  - approved 7 gates (intent, PRD and architecture together, design, plan, QA, deploy) plus the direction choice;
  - reviewed screenshots and merged 3 pull requests;
  - answered "continue" after the safety-check stall;
  - reconfirmed the undeployed-site decision.

  A truer count for the cycle is about 14 across 2 features.
- **Phase hours** are wall-clock time between transitions, idle time included. "improve 4.46 h" is mostly the idle gap after the first retro, and "design 0.75 h" includes the overnight wait for the decision. They are not effort.
- **The reviewer scorecard misses most of this cycle's reviews.** Only 3 of this cycle's review-result events exist (the F-014 diff, the F-015 diff and the QA fixes). The spec amendment, screens, design system, plan, both feature specs and the whole-change QA review were never recorded. So the scorecard says "rejected 0", although one Codex finding was rejected (the design-system wording, spec amendment C2).
- **Security:** QA round 2 found 0 critical and 0 high issues.
  - 1 medium (bypasses of the R-013 visuals checker) and 1 low (the favicon request), both fixed.
  - Codex's review of those fixes found 4 more medium issues and 1 low, all fixed.
  - `npm audit`: 0 vulnerabilities.
- **Product outcome:**
  - The primary metric (0 computer losses) and every automated accessibility check still hold after the restyle.
  - The live URL still doesn't load: every Deploy run fails at the smoke test because of the account's custom domain. The site was left undeployed by decision.

## 2. What worked / what didn't

**Worked**
- **The direction-exploration step paid for itself.** It cost $1.18, was chosen on the first round ("C, as shown"), and produced three distinct directions. That makes it the cheapest design phase in either cycle. Contrast was validated in the generator, so no board shipped with a failing pair, and each board was screenshotted and fixed before being shown (the bar covering the O pieces, labels touching the frame).
- **The design entry gate caught the "plain" conflict before any drawing.** The new personality contradicted approved text (R-013 "plain", PRD §1, the intent). The gate blocked, and a decision with a recommended option resolved it in one message. The amendment kept every testable constraint and added one ("CSS or inline SVG only"), which Codex then tightened (C1).
- **Pre-code spec reviews caught what diff reviews would have missed.**
  - F-014 spec: 3 findings, among them "hiding ≠ no piece" and the stale overlay after Play again.
  - F-015 spec: 8 findings, among them the transition that traps the piece, the lift that didn't deepen the edge, and a timing harness.
  - Diff reviews then found only test-quality or scanner issues (3 medium). This matches the first build's lesson.
- **Every accessibility and behaviour guarantee survived a full visual rewrite.** The existing announcement, keyboard, focus, axe, layout, load-error and never-lose suites kept passing, with only the mark-reading and strike helpers changed, and the browser suite grew to 645 tests. Board stability, contrast by class, the win-line geometry within 1 px, and pixel checks of layering all became executable acceptance criteria.
- **Committing the design approval on the restyle branch avoided breaking main.** tokens.json v2 would have failed the token and contrast tests on main; carrying the approval on F-014's branch kept main green.

**Didn't**
- **The amendment path needed three reopens for one conceptual change.** Design, then specification, then inception, because `gate approve intent` requires phase inception even when the intent changed as part of an authorized specification rework. Nothing was lost, but it's confusing and adds a step (see §5).
- **The boards couldn't show what the design review later found.** The UX review of the rebuilt design found 1 high issue (no board floor, so tiles spilled on short screens) and 6 medium: disabled vs active, the fold at 320×568, and drop opacity hiding pieces. None showed on a single desktop screenshot of each board. Boards are for choosing a direction, not for validating it, and the design system review did its job; but a phone-size frame on the board would have surfaced the fold earlier.
- **QA cost as much as implementation ($10.39 vs $10.38).**
  - A regex-based build scanner (the R-013 check) drew two rounds of bypass findings (security, then Codex on the fixes).
  - A local Firefox flake (QA-1) cost several full-suite reruns plus a check on unchanged main.
  - A 7-command stall of the auto-mode safety check stopped the session once.
- **Engine-specific CSS behaviour caused all 3 failed fix cycles.**
  - WebKit doesn't resolve a percentage height inside `<button>`: the pieces were small and off-centre.
  - A disabled square falls back to `transition-property: all`, so browsers don't cancel a running transition.
  - Verdana at 200 % text clipped a 1.1 line height.

  Each was caught by an existing or new test, so the suite worked. The mockups were rendered only in Chromium.
- **Agents hit their turn limits.** The F-014 test writer stopped at 25 turns and the QA code reviewer at 20; both had to be resumed to deliver their reports. Also, the plugin's proposal from the first retro (to scope phase metrics and record review events for every phase) is still unimplemented, which is why this cycle's metrics needed manual work.

## 3. Reviewer scorecard

`metrics.sh` (whole project): Codex 44 runs (AGREE 25, AGREE-WITH-CONCERNS 13, NONCONFORMING 3, SKIPPED 3), 67 accepted, 0 rejected, 0 critical; Ollama 2 runs, unusable output (disabled since the first build).

This cycle, counted from the review files, because most weren't recorded as events:

| Reviewer | Runs | Verdicts | Findings (critical / high / medium / low / missing) | Accepted | Rejected | Worth it? |
|---|---|---|---|---|---|---|
| Codex | 10 (spec amendment, screens, design system, plan, F-014 spec and diff, F-015 spec and diff, QA whole change, QA fixes) | 9 AGREE, 1 AGREE-WITH-CONCERNS (plan) | 0 / 2 / 19 / 2 / 9 | 31 | 1 (design wording, deferred to the design rework) | **Yes.** Each run took a few minutes (not measured). The plan's 2 highs (contrast exception, unit test before the build) would have broken CI. The whole-change review found nothing, which is itself useful confirmation after four per-unit reviews |
| factory-ux-reviewer | 1 | REQUEST-CHANGES | 0 / 1 / 6 / 8 / 0 | 15 | 0 | **Yes.** The board floor (high) and the drop-opacity delay were real usability defects that no board or screenshot showed |
| factory-code-reviewer (QA) | 1 (resumed once) | APPROVE | 0 / 0 / 5 / 9 / 0 | 11 fixed, 1 accepted, 2 for the human | 1 partial (CSS class rename) | **Moderate.** Mostly naming. Its thin-margin warning (CR-12) was right and flaked the same day. Its architecture-drift list is the most complete record of that drift |
| factory-security-reviewer (QA) | 1 | FINDINGS (non-blocking) | 0 / 0 / 1 / 1 / 0 | 2 | 0 | **Yes, briefly.** It showed nine concrete checker bypasses in a scratch build within about a minute |

## 4. Skill gaps

- **`factory:screenshots`: visual evidence for UI pull requests.** The human merged #18 and #19 "after reviewing screenshots of the built app", but the factory attaches none; I took screenshots ad hoc to check boards and screens. The proposed skill would:
  - build the app and capture every state in `design/screens.md` at the phone and desktop frames, in Chromium and WebKit;
  - put the images in the pull request, as a comment or artifact, next to the matching mockup;
  - flag pixel-level divergence from the mockup's key regions (tray, pieces, win line) as a review hint, not a gate.

  It would have caught the WebKit piece-sizing bug before the tests did, and it saves the reviewer from building locally.
- **`factory:rework`: one entry point for a change to a finished project.** This cycle chained design reopen → decision → specification reopen → inception reopen → design → planning rework → implementation → QA round 2 → CI → deploy, by hand, with the skill for each step. The proposed skill would:
  - take the requested change;
  - find the earliest affected artifact by diffing the request against approved text (the "plain" conflict was found only at the design entry gate);
  - propose the exact reopen chain and which approvals go stale;
  - estimate cost from this project's history (a UI restyle of 2 features ≈ $38 here);
  - scope the QA round to the change (`--base` the last QA merge);
  - scope metrics to the cycle.
- **Cycle-scoped metrics (`metrics.sh --since <event-id|timestamp>`).** Per-cycle cost, attempts, interventions and reviewer results currently need hand-written queries over `state.json`. The proposed option would filter events and cost checkpoints from a given point and report the same table plus cost per phase, computed from the cost checkpoints at phase transitions.

## 5. Proposed changes to this plugin (not applied; for the maintainer)

```
scripts/factory_state.py / gates.py
  + Allow `gate approve intent` while the phase is specification when the
    reopen reason or a resolved decision authorized an intent change (or add
    `reopen specification --with-intent`), instead of requiring a separate
    `reopen inception`. Today one amendment needed three reopens.

scripts/second-opinion.sh (and skills/second-opinion/SKILL.md)
  + Emit a review-result event for every phase (prd, architecture, design
    screens/system, plan, feature spec, diff, QA), not only diffs. The
    scorecard missed 7 of 10 Codex runs in this cycle and reports 0 rejected
    although 1 was rejected.

scripts/metrics.sh
  + `--since <timestamp|event-id>` for cycle-scoped metrics and cost per phase
    (from cost.recorded totals at phase.changed boundaries).
  + Label phase hours "elapsed (includes idle)" or compute active time from
    event density; "improve 4.46 h" was an overnight gap.

skills/design/SKILL.md
  + directions: render each board at phone width (320×568) as well as the
    desktop moment; the fold and board-floor issues found later were
    phone-only.
  + directions: ship a contrast-checked board generator or at least require
    the ratios on the board to be computed (as gen_directions.py did), and
    require screenshotting each board before presenting.
  + Rework on a built product: detect artifacts consumed by tests (tokens.json
    read by tokens.test/contrast.test) and say up front that the design
    approval must travel on the implementing feature's branch, and that
    planning needs a restyle feature. Record the tokens version bump.
  + Mockups: render in Chromium and WebKit when checking them; note known
    engine traps in the design system (percentage heights inside <button>,
    transition-property fallback on disabled elements).

skills/implement/SKILL.md
  + For M-sized UI features, tell the test-writer to batch writes and allow a
    higher turn budget, or split red into unit and e2e passes; the F-014
    test-writer and the QA code-reviewer both stopped at their turn limits
    with no report.
  + Visual guards: prefer a runtime assertion (network requests by resource
    type) as the primary check, and keep regex scans of build output as
    defence in depth with fixture tests for each bypass class; the R-013
    scanner drew 1 medium + 4 medium + 1 low across two reviews.

skills/review/SKILL.md
  + Run the second opinion on the QA-fixes range before presenting QA (merge
    routing flagged "no second opinion" and Codex then found 5 issues).
  + Flake protocol: on an intermittent failure, rerun the test alone
    (--repeat-each), run the same project on unchanged main in a worktree to
    classify it, record it as a QA finding with its rate, and never loosen
    timeouts silently.
  + Scope option: QA "since the last QA merge" as a first-class base
    (artifacts.change.base stays the project start for traceability).

skills/deploy/SKILL.md
  + When the site is knowingly unreachable and the human keeps it undeployed,
    offer to gate the smoke/rollback jobs behind a repository variable (for
    example `PAGES_REACHABLE`) so every merge does not produce a failed run
    and an email; record the choice in the runbook. (Not done here, by
    decision.)

skills/factory-core/SKILL.md
  + Finishing a turn: if the tool safety check returns no verdict repeatedly,
    stop before the hard limit, list uncommitted work and the exact resume
    point, and do not retry blindly (what happened at 7 consecutive no-verdict
    responses).
  + When a report cites a commit, take the hash from `git log` after the
    commit, never predict it (a guessed hash had to be corrected in the QA
    report).

config.json (template)
  + metrics.targets: add cycle_cost_usd and qa_to_implementation_cost_ratio
    (this cycle 1.0) so rework cost is judged, not just pass rates.
```

## Outcome

- **Tabletop Tiles is merged** (#18, #19, #20): SVG pieces, a single win line, and tactile motion that is removed under reduced motion. All 645 browser tests pass, the bundle is 3.8 KB gzipped, and every accessibility guarantee still holds.
- **The design phase's direction exploration worked on the first round** and was the cheapest step in the cycle.
- **Human follow-ups are still open:** a VoiceOver pass, real iOS and Android device checks, and the new real-iPhone press check.
- **The site stays unreachable** until `onelifemedia.com` or the user site's custom domain changes (decision D-71851f11).
- **The deploy approval and runbook** are in #21. This retro is its own pull request.

---

# Retrospective 1: factory-tictactoe, first build (2026-09-27/28)

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

# Tasks: visible cycle, single door, cold review

Spec: `spec.md`. Plan: `plan.md`. One branch and PR per stage, `[minor]` each. A task is ticked when its self-tests were seen red first and `bash scripts/gates.sh` is green; the tick carries `evidence:`.

## Stage 1: status on demand

- [x] 1 Probe `!` expansion and `${CLAUDE_PLUGIN_ROOT}` in a scratch plugin command, desktop app and `claude -p`; record it — evidence: `docs/ci-red-runs.md` "Task 1: probe the command's shell expansion"; expansion ran in both, desktop reply verbatim with no tool call
- [x] 2 `where.js --status`: block, no-cycle, outside-git and deadline lines; self-tests first — evidence: `node where.self-test.js` 41 passed (7 new, 6 seen red; the 7th red for the wrong reason, noted); `docs/ci-red-runs.md` "Task 2"
- [x] 3 `commands/status.md` and plugin README paragraph — evidence: `plugins/sdlc-assist/commands/status.md`; both READMEs; `bash scripts/gates.sh` all gates ok
- [x] 4 `/sdlc-assist:status` run in the desktop app pasted in `docs/ci-red-runs.md`; gates; `SKILL.md` words — evidence: `docs/ci-red-runs.md` "Task 4" (temporary project command, block verbatim, no tool call); installed command pending the release; gates all ok; SKILL.md 2567 words, unchanged

## Stage 2: own spec and plan skills

- [x] 5 `sdlc-spec/SKILL.md`, route first, header, sizes, approval rule, under 6 KB — evidence: `check-skill-sections.js` 5 skills OK (self-test seen red, 3 failed); 5211 bytes; `docs/ci-red-runs.md` "Stage 2 ... tasks 5 and 6"
- [x] 6 `sdlc-plan/SKILL.md`, route first, cycle paths, stages, approval rule, under 6 KB — evidence: same check; 4616 bytes; stage claims run against `lib/stages.js`
- [x] 7 Remove the spec, plan and context-engineering vendored copies and their `sync-vendored.js` entries; self-tests first — evidence: `sync-vendored.js --check` reported the 3 leftovers, then "vendored skills in sync"; `docs/ci-red-runs.md` "Task 7"
- [x] 8 Rewire names: sheets, `check-sheets`, `which` TDD order, hook `FAMILY`, SKILL.md, references, release script, constitution, CI, manifests, docs; self-tests first — evidence: which 17/0, check-sheets 12/0, hook 18/0, each seen red; `docs/ci-red-runs.md` "Task 8"
- [x] 9 ADR 0011 — evidence: `docs/adr/0011-own-spec-and-plan-skills.md` (proposed)
- [x] 10 Replay #35 with a `Read` of `sdlc-spec/SKILL.md` in a scratch repo; grep for old names; gates; `SKILL.md` words — evidence: `docs/ci-red-runs.md` "Task 10" (router ran first, header and cycle path on disk); grep leaves records only; all gates ok; 2567 to 2548 words

## Stage 3: cold review, offered

- [x] 11 Probe plugin agents with read-only tools and `omitClaudeMd`; record it — evidence: `docs/ci-red-runs.md` "Task 11, run" (2.1.332: tools only `Read, Grep, Glob`, write refused; in this repo the control got user and project `CLAUDE.md`, the `omitClaudeMd` agent neither, 4816 vs 16834 tokens)
- [x] 12 Seeded fixture, reviewed with no reviewer, recorded red — evidence: `docs/ci-red-runs.md` "Task 12" (`check-acceptance` 0 not EARS, `Ledger` and `src/pricing.js` unreported)
- [x] 13 Reviewer agents: comprehension, code-check, design, readiness — evidence: `docs/ci-red-runs.md` "Task 13" (`claude plugin validate` passed; `check-agents` self-test 1/7 then 8/0; "4 agents OK")
- [x] 14 Offer and loop in `sdlc-spec` and `sdlc-plan`; not-run rule; no subagents means no review — evidence: `skills/sdlc/references/cold-review.md`; `docs/ci-red-runs.md` "Task 14" (replay offered in one line before approval, 7 tool uses, no `Agent` call, nothing about the review on disk)
- [x] 15 ADR 0012, README, `docs/sdlc-flow.md` — evidence: `docs/adr/0012-cold-review-offered.md`, README "Cold review, on request", plugin README, `docs/sdlc-flow.md`
- [x] 16 Fixture review finds every seeded gap; tokens of one medium review measured; gates; `SKILL.md` words — evidence: `docs/ci-red-runs.md` "Task 16, run" (`sdlc-assist:comprehension`, two runs: G1, G2, G3 at Major or above in both; 11,091 and 11,483 tokens; one finding outside the key in run 2); offer figure changed to about 12,000; all gates ok; `SKILL.md` 2548 words

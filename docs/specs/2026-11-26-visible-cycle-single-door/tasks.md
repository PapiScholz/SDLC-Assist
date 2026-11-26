# Tasks: visible cycle, single door, cold review

Spec: `spec.md`. Plan: `plan.md`. One branch and PR per stage, `[minor]` each. A task is ticked when its self-tests were seen red first and `bash scripts/gates.sh` is green; the tick carries `evidence:`.

## Stage 1: status on demand

- [x] 1 Probe `!` expansion and `${CLAUDE_PLUGIN_ROOT}` in a scratch plugin command, desktop app and `claude -p`; record it — evidence: `docs/ci-red-runs.md` "Task 1: probe the command's shell expansion"; expansion ran in both, desktop reply verbatim with no tool call
- [x] 2 `where.js --status`: block, no-cycle, outside-git and deadline lines; self-tests first — evidence: `node where.self-test.js` 41 passed (7 new, 6 seen red; the 7th red for the wrong reason, noted); `docs/ci-red-runs.md` "Task 2"
- [x] 3 `commands/status.md` and plugin README paragraph — evidence: `plugins/sdlc-assist/commands/status.md`; both READMEs; `bash scripts/gates.sh` all gates ok
- [x] 4 `/sdlc-assist:status` run in the desktop app pasted in `docs/ci-red-runs.md`; gates; `SKILL.md` words — evidence: `docs/ci-red-runs.md` "Task 4" (temporary project command, block verbatim, no tool call); installed command pending the release; gates all ok; SKILL.md 2567 words, unchanged

## Stage 2: own spec and plan skills

- [ ] 5 `sdlc-spec/SKILL.md`, route first, header, sizes, approval rule, under 6 KB
- [ ] 6 `sdlc-plan/SKILL.md`, route first, cycle paths, stages, approval rule, under 6 KB
- [ ] 7 Remove the spec, plan and context-engineering vendored copies and their `sync-vendored.js` entries; self-tests first
- [ ] 8 Rewire names: sheets, `check-sheets`, `which` TDD order, hook `FAMILY`, SKILL.md, references, release script, constitution, CI, manifests, docs; self-tests first
- [ ] 9 ADR 0011
- [ ] 10 Replay #35 with a `Read` of `sdlc-spec/SKILL.md` in a scratch repo; grep for old names; gates; `SKILL.md` words

## Stage 3: cold review, offered

- [ ] 11 Probe plugin agents with read-only tools and `omitClaudeMd`; record it
- [ ] 12 Seeded fixture, reviewed with no reviewer, recorded red
- [ ] 13 Reviewer agents: comprehension, code-check, design, readiness
- [ ] 14 Offer and loop in `sdlc-spec` and `sdlc-plan`; not-run rule; no subagents means no review
- [ ] 15 ADR 0012, README, `docs/sdlc-flow.md`
- [ ] 16 Fixture review finds every seeded gap; tokens of one medium review measured; gates; `SKILL.md` words

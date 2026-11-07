# Tasks: cycle confidence (#21, #20)

Spec: `spec.md`. Plan: `plan.md`. Branch `cycle-confidence`, one PR, `[minor]`. A task is ticked when its self-tests were seen red first and `bash scripts/gates.sh` is green.

- [x] 1 Discovery in `signals.js`: map folders, module-only folders, `PLAN.md`/`TASKS.md` in any case; modules from map folders; self-test cases first
- [x] 2 `lastActivity` per cycle (one git batch) and `rankCycles` by it, larger path wins a tie; ADR 0006; self-test cases first
- [x] 3 `orphanSpecs` under `docs/` (depth 3, regex rejects inspection/respect/spectrum); self-test cases first
- [x] 4 `lib/confidence.js` (orphan, stale 7d+10 commits, contested 24h, released) wired into `infer`; `signals.now` and `signals.activity`; inference unchanged; self-tests first
- [x] 5 `briefLine` prefix `cycle <short> (<age>)`, low line without step/next; hook and `where.js` pass `now`; #21 and macritex fixtures in the hook self-test
- [x] 6 Docs: `SKILL.md` (reading `confidence`), `spec-header.md`, `README.md`, `ARCHITECTURE.md`, `ROADMAP.md` (tie-break out, #20 proposals 5 and 6 in), ADR 0006; `docs/plans/plan-layout.md` left as the historical v1.5 plan it is
- [x] 7a Gates, `where.js --brief` on scratch repos (not macritex, at the owner's request), timing against v0.12.4, record in `docs/ci-red-runs.md`
- [x] 7b Commit (`[minor]`), push and PR with the owner's verb

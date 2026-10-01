# Todo

Cycle: v1.5 SDD alignment (spec: docs/specs/2026-09-30-v1-5-sdd-alignment.md, plan: tasks/plan.md → docs/plans/plan-*.md)

## Plan 1 — positioning (`docs/plans/plan-positioning.md`)
- [x] 1.1 README "Who this is for": taxonomy paragraph, spec-anchored, what the router adds
- [x] 1.2 Plugin README: one spec-anchored sentence
- [x] 1.3 README Roadmap: v1.5 list
- [x] 1.4 Dogfood (a) in ci-red-runs; PR #5 merged (cec383e, released as v0.5.1 by mistake: merge commit without the marker); Re-validate pending

## Plan 2 — EARS and spec template (`docs/plans/plan-ears.md`)
- [x] 2.1 `references/spec-template.md` (header, Clarifications, Open Questions, Acceptance in EARS)
- [x] 2.2 `check-acceptance.self-test.js` red, then `check-acceptance.js` green (five shapes, prose warns, missing section warns, `--strict`)
- [x] 2.3 Open-questions report in the same check, with tests
- [x] 2.4 `gates.sh` and CONTRIBUTING name the check (warn-only)
- [x] 2.5 SKILL.md close rule for analysis; spec-header.md row; analysis sheet names the template
- [x] 2.6 qa-gate functional row reads Acceptance bullets; check-skill-sections still ok
- [x] 2.7 Dogfood (b); PR #6 merged (332e419), released as v0.6.0; portal Re-validate pending (owner)

## Plan 3 — per-cycle layout (`docs/plans/plan-layout.md`)
- [x] 3.1 `findSpecs` discovers `docs/specs/<dir>/spec.md` (tests first)
- [x] 3.2 Per-cycle `plan`/`todo` resolution; `signals.plan`/`todo` follow the active cycle; `countTasks` ignores fences
- [x] 3.3 infer.js evidence strings name the resolved paths; infer tests
- [x] 3.4 Headerless folder spec is a draft cycle, not a module
- [x] 3.5 planning/development sheets, SKILL.md step 6, README example, spec-header.md wording
- [x] 3.6 Template note on where to save; check-acceptance test for a folder spec
- [x] 3.7 CI install-smoke: folder-cycle fixture; README Development note
- [ ] 3.8 Dogfood (c) with a scratch folder cycle; PR with `[minor]`, merge, Re-validate

## Plan 4 — constitution (`docs/plans/plan-constitution.md`)
- [ ] 4.1 `constitution` signal in signals.js with tests; where.self-test assertion
- [ ] 4.2 `references/constitution-template.md`
- [ ] 4.3 initial/analysis/planning/development sheets cite it; check-sheets ok
- [ ] 4.4 SKILL.md: `Constitution:` evidence line when present
- [ ] 4.5 qa-gate regression row lists checkable principles
- [ ] 4.6 This repo's `docs/constitution.md` from CLAUDE.md; CLAUDE.md links it
- [ ] 4.7 README step 0, sdlc-flow.md node (Mermaid validated)
- [ ] 4.8 Dogfood (d) before/after; PR with `[minor]`, merge, Re-validate

## Close
- [ ] Close testing on the qa-gate table of plan 4; close deployment on the last release; `Status: closed` with `[skip release]`

Previous cycle: v1.4 plugin in a subfolder (spec: docs/specs/2026-09-30-v1-4-plugin-subfolder.md), closed on v0.5.0, all three tasks done.

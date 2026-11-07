# Tasks: proportional cycles

Spec: `spec.md`. Plan: `plan.md`. Branch `proportional-cycles`, one PR, `[minor]`. A task is ticked when its self-tests were seen red first and `bash scripts/gates.sh` is green; the tick carries `evidence:`.

- [x] 1 Feature cycles in `signals.js` (`feature.md` record, same-file pair, `kind`); self-test cases first — evidence: `node lib/signals.self-test.js` 60 passed (3 new, seen red)
- [x] 2 `todo.js` `firstOpen` and `withoutEvidence`; `todo.next` and `todo.withoutEvidence` in signals; self-tests first — evidence: `node lib/todo.self-test.js` 10 passed (4 new, seen red)
- [x] 3 `infer` (feature header `planning` read as development + warning) and `brief` (`next: <task>`); hook and `where.js` pass `todo`; self-tests first — evidence: infer 50, brief 13, hook 11, where 34 passed
- [x] 4 `check-acceptance` reads `## Specs` of `feature.md`; new `check-evidence.js` with self-test, in `gates.sh` and `CONTRIBUTING.md` — evidence: check-acceptance 16, check-evidence 4 passed (7 new, seen red); `gates.sh --quick` all gates ok; CI step simulated locally (GREP-OK x2)
- [x] 5 `SKILL.md` and references (feature template, phase sheets, spec template, header, entry points) — evidence: `gates.sh --quick` (check-sheets, check-skill-sections, check-frontmatter ok); `references/feature-template.md` new
- [x] 6 Constitution amendment, ADR 0007, ROADMAP, README, `docs/sdlc-flow.md` — evidence: `docs/adr/0007-proportional-cycles.md`; check-adr 7 ADRs
- [x] 7a Gates, scratch-repo smoke, regression against v0.13.0, hook line, record in `docs/ci-red-runs.md` — evidence: `docs/ci-red-runs.md` section "2026-11-07 — proportional cycles"; gates all ok; 13 repos same as v0.13.0
- [x] 7b Commit (`[minor]`), push and PR with the owner's verb — evidence: PR #24 merged (30271b0), v0.14.0 released 2026-11-07

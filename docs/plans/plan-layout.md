# Plan 3/4 — Per-cycle layout: `docs/specs/<date>-<slug>/{spec,plan,tasks}.md`

Spec: `docs/specs/2026-09-30-v1-5-sdd-alignment.md` (deliverable 4). PR 3 of v1.5. Branch `v1.5-layout`. Bump marker: `[minor]`.

## Why

`tasks/plan.md` and `tasks/todo.md` are one per repository, so the planning sheet warns "one planned cycle at a time" and `infer.js` has to guess whether the plan belongs to the active spec by comparing dates (`PLAN_STALE`, `NO_PLAN_CYCLE`). With the plan and the task list beside their spec, the question disappears: the plan of a cycle is the file next to it.

## Shape

```
docs/specs/
├── 2026-09-30-v1-5-sdd-alignment.md      # flat spec (legacy, still a cycle; plan = tasks/plan.md)
└── 2026-10-02-v1-6-something/
    ├── spec.md                           # header: Phase: / Status:
    ├── plan.md
    └── tasks.md                          # - [ ] / - [x], same counting as tasks/todo.md
```

Resolution per cycle: a folder spec takes `plan.md` and `tasks.md` from its folder (missing files mean "no plan" / "no tasks" for that cycle, never a fallback to the global files). A flat spec keeps `tasks/plan.md` and `tasks/todo.md`. The `active` cycle's plan and todo are what `signals.plan` and `signals.todo` report, so `infer.js` needs no change beyond the evidence strings.

## Tasks

1. **Discovery, test first.** `lib/signals.js` `findSpecs`: also list `docs/specs/<dir>/spec.md`. New self-test cases in `signals.self-test.js`: a folder cycle is found with `path: docs/specs/<dir>/spec.md`; a folder without `spec.md` is ignored; a flat spec and a folder spec coexist.
2. **Per-cycle plan and todo.** `lib/signals.js`: each spec record gains `plan` and `todo` (same shapes as the global ones) resolved by the rule above; `signals.plan`/`signals.todo` become the active cycle's (computed after `active` is chosen; today `active` is picked in `where.js`, so either move the pick into signals or have `where.js` select the pair after picking; choose the smaller diff after reading `where.js`). Global `tasks/plan.md` and `tasks/todo.md` remain the pair for flat specs and for the "no active cycle" case. Self-tests: folder cycle with 2 open tasks → `development`; folder cycle with all tasks done → `testing`; two folder cycles, both planned, no warning.
3. **Inference text.** `lib/infer.js`: `NO_TODO` message names the resolved path instead of the literal `tasks/todo.md`; `NO_PLAN_CYCLE` and `PLAN_STALE` keep working for flat specs. `infer.self-test.js` updated for the message.
4. **Capability map proxy.** `signals.js` lines 140-145 treat root `SPEC-*.md` without a header as modules; a folder with `spec.md` and no header is a draft cycle, not a module (headerless spec gets the header at the first close, per `spec-header.md`). One self-test case.
5. **Planning sheet and router.** `references/phases/planning.md`: `Produces:` → "`plan.md` and `tasks.md` beside the spec (legacy: `tasks/plan.md`, `tasks/todo.md` for a flat spec)"; `Warns when:` drops the one-cycle rule for folder cycles and keeps it for flat ones. `references/phases/development.md` governance line: same path wording. `SKILL.md` step 6 and the "What the router sees" example in `README.md`: show a folder cycle. `references/spec-header.md`: "A cycle is a spec file … or `docs/specs/<dir>/spec.md`".
6. **Clarifications and template follow the layout.** `references/spec-template.md` (from plan 2): header note "save as `docs/specs/<date>-<slug>/spec.md`; `plan.md` and `tasks.md` go beside it". `check-acceptance.js` already uses `findSpecs`, so it covers folder specs; add one self-test case to prove it.
7. **Install smoke and fixtures.** `.github/workflows/ci.yml` install-smoke step 2 builds a flat-spec fixture; add a second fixture with a folder cycle and assert `inferred` for it (two open tasks → `development`). `README.md` "Development" section: how to run that fixture locally.
8. **Dogfood.** Open the *next* cycle (v1.6, whatever it is) in the folder layout; for this PR, a scratch repo run pasted into `docs/ci-red-runs.md` "v1.5 dogfood (c)": `where.js` on a folder cycle with the fields `active.path`, `signals.plan.path`, `signals.todo.path`, `inferred`.

## Files

- edit (under `plugins/sdlc-assist/skills/sdlc/`): `bin/lib/signals.js`, `bin/lib/signals.self-test.js`, `bin/lib/infer.js`, `bin/lib/infer.self-test.js`, `bin/where.js` (if the pair selection lives there), `bin/where.self-test.js`, `bin/check-acceptance.self-test.js`, `SKILL.md`, `references/spec-header.md`, `references/spec-template.md`, `references/phases/planning.md`, `references/phases/development.md`
- edit: `README.md`, `.github/workflows/ci.yml`, `docs/ci-red-runs.md`

## Verification

```
bash scripts/gates.sh                                   # all gates ok (signals, infer, where self-tests include the new cases)
# scratch repo
mkdir -p t/docs/specs/2026-10-01-x && cd t && git init -q
printf '# X\n\nPhase: planning\nStatus: approved\n' > docs/specs/2026-10-01-x/spec.md
printf '# plan\n' > docs/specs/2026-10-01-x/plan.md
printf -- '- [ ] a\n- [ ] b\n' > docs/specs/2026-10-01-x/tasks.md
git add -A && git commit -qm init
node <repo>/plugins/sdlc-assist/skills/sdlc/bin/where.js --root . --message "continue" | grep -E '"inferred"|"path": "docs/specs/2026-10-01-x/(plan|tasks).md"'
# expect: inferred "development", plan.path and todo.path inside the folder
```

## Risks

- `where.js` and `signals.js` share the `active` selection; moving it changes `where.self-test.js` expectations. Read both before task 2 and pick the direction with fewer edits; record it in the dogfood block.
- `countTasks` on `tasks.md` must ignore fenced code (reuse `lib/unfenced.js`) so a plan with sample checklists does not count as tasks; add a self-test for that.

## Done when

Folder cycles are discovered, planned and inferred like flat ones; flat ones behave exactly as before (all existing self-tests pass unchanged except the two message strings); sheets and README describe the layout; install-smoke covers it; PR merged with `[minor]`.

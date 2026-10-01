---
slug: planning
title: Planning
recommends: [planning-and-task-breakdown]
alternatives: []
design: in the plan, component boundaries and interfaces
---
# Planning

**Enters when:** the active spec is approved and there is no current plan, or the plan's todo has no tasks. A plan older than the spec's first commit belongs to a closed cycle and counts as absent.
**Produces:** `plan.md` and `tasks.md` beside the spec (`docs/specs/<date>-<slug>/`). Legacy: a flat spec (`docs/specs/<name>.md`, root `spec.md`, `SPEC-*.md`) keeps `tasks/plan.md` and `tasks/todo.md`.
**Do now:** run `planning-and-task-breakdown`; keep component boundaries and interfaces in the plan. Point it at the cycle's folder when the spec lives in one.
**Next phase:** development (`sdlc close` writes `Phase: development`).
**Warns when:** the active spec is flat and another flat cycle is still active, since `tasks/plan.md` and `tasks/todo.md` are shared: one planned flat cycle at a time. Folder cycles each own their pair and do not trigger this.
**Governance:** design review happens before code exists; the plan file is committed and approved before implementation (plan mode holds edits until then). When `constitution.exists`, the plan is checked against its principles and lists the ones the qa-gate can verify (a gate, a test, a lint).
**Measure:** leading: time from plan approval to merged PR; lagging: rework cycles per change and how far the merged diff departs from the committed plan.

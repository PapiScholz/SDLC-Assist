---
slug: planning
title: Planning
recommends: [planning-and-task-breakdown]
alternatives: []
design: in the plan, component boundaries and interfaces
---
# Planning

**Enters when:** the active spec is approved and there is no current plan, or the plan's todo has no tasks. A plan older than the spec's first commit belongs to a closed cycle and counts as absent.
**Produces:** `tasks/plan.md` and `tasks/todo.md`.
**Do now:** run `planning-and-task-breakdown`; keep component boundaries and interfaces in the plan.
**Next phase:** development (`sdlc close` writes `Phase: development`).
**Warns when:** another cycle is still active, since `tasks/plan.md` and `tasks/todo.md` are shared: one planned cycle at a time.
**Governance:** design review happens before code exists; `tasks/plan.md` is committed and approved before implementation (plan mode holds edits until then).
**Measure:** leading: time from plan approval to merged PR; lagging: rework cycles per change and how far the merged diff departs from the committed plan.

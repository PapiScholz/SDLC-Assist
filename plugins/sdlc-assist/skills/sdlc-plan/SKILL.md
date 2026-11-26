---
name: sdlc-plan
version: 0.19.0
description: Writes the plan and task list of an approved spec on a code repository, beside the spec, split into stages when the work is long, with acceptance and a verification line per task. Use when the sdlc router reports step 3 (plan), when an approved spec has no plan or its stage has no tasks, when work feels too large to start, or when asked to break a spec into tasks or stages.
---

# sdlc-plan: write the plan and the tasks

## Overview

Route first: when the sdlc router has not run in this context (the `sdlc` skill or its `where.js`), run it and follow its route before anything below. The `sdlc:` status line alone does not count.

The plan says how the approved spec gets built: order, boundaries, risks. The task list is what the router reads to say where the work stands and what comes next (its first open task). Medium work has no plan step: its tasks live in the `## Tasks` of its `feature.md`. Write no code while planning.

## Where it goes

- Folder cycle (`docs/specs/<date>-<slug>/spec.md`): `plan.md` and `tasks.md` in that same folder, beside the spec.
- Flat spec (`docs/specs/<name>.md`, root `spec.md`, `SPEC-*.md`): `tasks/plan.md` and `tasks/todo.md`, shared by every flat cycle, so one planned flat cycle at a time.
- A spec header that names its plan (`Plan: docs/plans/x.md`) wins.
- Use the paths the router reported (`signals.plan.path`, `signals.todo.path`). Never `docs/superpowers/`, a root `PLAN.md` or a second copy elsewhere.
- Before writing, check the target. If it holds open tasks of other work, stop and ask: finish, discard (the developer says so) or place the new plan elsewhere. Replanning the same work edits the files in place.

## Stages

A plan longer than one focused sitting splits into stages, each one shippable on its own (its own branch or PR when the project works that way). The router reads stages from `plan.md` in one of two forms:

- one heading per stage: `### Stage 1: <name>`, `### Stage 2: <name>` (also `Etapa`, `Phase`, `Fase`);
- or a table under a heading named `Stages` with one row per stage: `| 1 | <name> | ... |`.

A stage is closed only by `[x]` and the date on its own heading or row (`### Stage 1: <name> [x] 2026-11-02`), written by close mode; ticked tasks under it never close it. The router follows stages only when one is closed or when the H1 of `tasks.md` names the stage being built (`# Tasks: Stage 2 <name>`); with neither, it reads the plan as single-pass. So: when the task list holds one stage at a time, name it in the H1; when it holds every stage under `## Stage n: <name>` sections with a neutral H1, the router reports the stage only from the first close on (`/sdlc-assist:status` shows the first open stage meanwhile).

## Tasks

One line per task in `tasks.md`, in build order, foundations first, each leaving the system working:

```
- [ ] 3 <what changes, where> — check: <the test or command that proves it>
```

- A task fits one focused session and one subsystem; a title with "and" is usually two tasks.
- Tests come first in the task that adds behavior: the check fails before the change.
- The plan lists, per task, the files likely touched and the acceptance bullets of the spec it covers; every acceptance bullet is covered by some task.
- A task that implements a `proposed` ADR names it; a plan checked against `docs/constitution.md` lists the principles a gate can verify.
- Risks and open decisions go in `plan.md` as a table (risk, impact, mitigation). A design decision left to the implementer is a gap: decide it or ask.
- When the developer ticks or you tick a task, the proof goes on the same line: `- [x] 3 ... — evidence: <command, test or file>`.

## Approval

1. Offer the cold review in one line and run it only on a yes (`../sdlc/references/cold-review.md`: reviewers, rounds, how to resolve findings).
2. Show the developer the plan (path, stages, tasks of the first stage, risks) and ask for approval in one line.
3. A go-ahead counts as approval only of a plan the developer has already seen in an earlier message. A go-ahead given before the plan existed approves nothing written after it: show the plan and say it is not yet approved.
4. On approval, close mode writes `Phase: development`; implementation starts at the first open task.
5. When you go ahead without an approval (allowed by the router's plan rule on some models), say so in the same message; never present an unapproved plan as approved.

## Never

- Write `plan.md` or `tasks.md` anywhere but beside the spec (or the flat `tasks/` pair).
- Overwrite or delete another cycle's open tasks.
- Close a stage by ticking its tasks, or write a stage's `[x]` outside close mode.
- Write code while planning.
- Write an emoji.

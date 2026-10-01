# 0005. A folder cycle owns its `plan.md` and `tasks.md`; the legacy flat layout is read but never migrated

Status: accepted
Date: 2026-10-01

## Context

Before v1.5 every cycle shared `tasks/plan.md` and `tasks/todo.md`, so only one planned cycle could exist at a time and a new cycle's plan overwrote the previous one's history. Spec: `docs/specs/2026-09-30-v1-5-sdd-alignment.md`, plan 3. Implemented in `f67a282`.

## Decision

A cycle may be `docs/specs/<date>-<slug>/` with `spec.md`, `plan.md` and `tasks.md`. For a folder cycle the router reads the pair beside the spec and never falls back to `tasks/`: the plan beside `spec.md` belongs to that cycle by construction. A flat spec (`docs/specs/<name>.md`, root `spec.md`, `SPEC-*.md`) keeps reading `tasks/plan.md` and `tasks/todo.md`. Closed cycles are not migrated; the folder layout is the default from the first cycle opened after v1.5 (this one, v1.6, is the first).

## Consequences

Several folder cycles can be in flight, each with its own plan and task list. The planning sheet warns only when two flat cycles are active, since they share the pair. Legacy files stay readable forever and carry a one-line pointer to the current cycle instead of being rewritten.

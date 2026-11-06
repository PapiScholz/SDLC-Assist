# 0006. Cycles rank by last activity; a tie goes to the larger path

Status: accepted
Date: 2026-11-06

## Context

ADR 0004 ranks cycles by the spec file's effective date. In issue #21 the work in progress was a folder with a capability map, module specs and a `PLAN.md` being implemented: its spec files were older than a finished cycle's, so the finished one stayed active. A folder cycle's work shows in its plan and task list, not only in its spec. ADR 0004 also left a tie-break to fix: the smaller path won, so an older date-prefixed slug beat a newer one. Spec: `docs/specs/2026-11-06-cycle-confidence/spec.md`.

## Decision

`signals.js` gives each cycle a `lastActivity`: the newest effective date among all its files (document of record, map, module specs, plan, task list) for a folder cycle, and the spec alone for a flat one. Folding the shared `tasks/plan.md` into flat specs would rerank the legacy cycles ADR 0005 reads and never migrates. `rankCycles` orders by `lastActivity` (falling back to the spec's effective date when the field is absent) and, on a tie, puts the larger path first.

## Consequences

Touching a cycle's plan or task list makes it active again, which matches how work happens. The same last activity feeds the confidence reasons (`stale`, `contested`, `orphan`), so ranking and confidence never disagree on dates. ADR 0004 stays accepted for everything else: one ranking, computed in `lib/infer.js`, shared by every caller.

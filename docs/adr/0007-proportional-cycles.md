# 0007. Cycles are proportional to the work: small, medium (one feature.md), large

Status: accepted
Date: 2026-11-07

## Context

Every change above the hotfix threshold (at most 20 lines in 2 files) ran the full flow: spec, approval, plan, approval, then tasks in a third file. The owner named two pains: paperwork on medium changes, and lost context between sessions. Agent workflows outside this repository moved the same way in 2026: Organic Driven Development (Gentle AI v3.0.0 made it default and v4.0.0 retired its SDD; others adopted it) keeps small work small, gives substantial work one recoverable feature document and judges size by whether the work could be resumed from the request plus the diff; Outcome-Driven Development writes each requirement as an observable outcome with a check that can fail and treats "done" as verified. Neither drops specs or ADRs; both shrink and refocus them. Spec: `docs/specs/2026-11-07-proportional-cycles/spec.md`.

## Decision

Three sizes replace the hotfix threshold, judged by the agent, stated in one sentence and overridable by the developer. File and line counts never decide.

- Small: unambiguous, contained risk, no new dependency, no public contract change, resumable from the request plus `git diff`. Straight to development, no cycle.
- Medium: one `docs/specs/<date>-<slug>/feature.md` with `## Specs` (`S#` entries with `Quote:`, `Outcome:`, `Check:`), `## Decisions`, `## Open Questions` and `## Tasks`. The router treats it as a cycle whose spec, plan and task list are that file (`kind: 'feature'`). One approval: closing `analysis` writes `Status: approved` and `Phase: development`.
- Large or ambiguous: `spec.md`, `plan.md` and `tasks.md`, two approvals and stages, as before.

Closed tasks carry `evidence:`; the router names the first open task as the next action. Session state stays out of cycle documents: it belongs to the project's handoff file (`HANDOFF.md`, handoff-ledger), which links the cycle.

## Consequences

Medium work drops from three files and two approvals to one file and one approval, and the hook tells a resumed session which task is next. The size call is a judgment and can be wrong in either direction; the rule "when unsure, pick the larger" and the developer's override bound that. Existing cycles are not migrated: a folder with `spec.md` keeps reading as before even if a `feature.md` sits beside it. The constitution's "Spec first" principle becomes "Spec proportional to the work".

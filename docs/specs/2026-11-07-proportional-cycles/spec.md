# Spec: cycles proportional to the work (what applies of the ODD trend)

Phase: development
Status: approved
Date: 2026-11-07
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.13.0)
Parent: `docs/specs/2026-11-06-cycle-confidence/spec.md` (closed)

## Objective

Agent workflows are moving from "spec everything" to process proportional to the work. Two currents share the name
ODD and converge:

- **Organic Driven Development** (Gentle AI v3.0.0 made it default, v4.0.0 retired its SDD; adopted by telmoDev/hat
  and others): a question does not authorize a change; small work stays small; substantial work gets one recoverable
  feature document; size is judged by "could this be resumed from the request plus `git diff`", not by line counts.
- **Outcome-Driven Development** (CodeBazzar, Outcome Engineering, goal-driven agents): a spec states an observable
  result and a check that can fail; "done" means verified with evidence; acceptance is never delegated. ADRs stay.

The owner's pains with the plugin today are paperwork on medium changes and lost context between sessions; the two
approvals and agent drift are not pains, so approvals, ADRs, the constitution and staged plans stay. Session state
belongs to handoff-ledger (`HANDOFF.md`), which links the spec instead of copying it: cycle documents gain no log.

Deliverables:

1. **Three sizes** replace the hotfix threshold: small (no spec), medium (one `feature.md`, one approval), large or
   ambiguous (spec, plan and tasks, as today).
2. **Feature cycles**: `docs/specs/<dir>/feature.md` is a cycle whose spec, plan and task list are that one file.
3. **Next task in the status line**: in development the router names the first open task instead of a generic action.
4. **Evidence on closed tasks**: a `[x]` task without `evidence:` is reported (never blocking).
5. **Read-only by default**: explaining, investigating, comparing or proposing writes nothing and opens no cycle.
6. Templates, phase sheets, constitution amendment and ADR 0007.

## Decisions

1. **Size rule.** Small: the requirement is unambiguous and self-contained, the risk is contained, no new dependency,
   no public contract changes, and the work could be resumed from the request plus `git diff`. Medium: authorized and
   understood but not resumable from the diff alone, with no architectural decision open. Large or ambiguous:
   otherwise, or when the developer asks for the full flow. File and line counts never decide. The agent states the
   size in one sentence; the developer can override it. `[ADR]`
2. **Feature document of record.** In a folder cycle the record is `spec.md`, else `feature.md`, else the map, else
   the first `SPEC-*.md`. A folder holding both `spec.md` and `feature.md` is a full cycle and `feature.md` is ignored
   as a record. For a feature cycle `plan` and `todo` both resolve to `feature.md`; the cycle carries `kind: 'feature'`
   (other cycles `kind: 'spec'`).
3. **One approval.** Closing `analysis` on a feature cycle writes `Status: approved` and `Phase: development`; planning
   is folded into `## Tasks`. A feature cycle whose header says `planning` is read as development with a plain-words
   warning. Large cycles keep both approvals and stages.
4. **Feature document shape**: H1, header, `## Objective` (one or two lines), `## Specs` (numbered `S1.`, each with
   `Quote:` the developer's exact words, `Outcome:` observable behavior, `Check:` a command or test that fails before
   the change), `## Decisions`, `## Open Questions`, `## Tasks` (checkboxes). No `## Log`: session state is
   `HANDOFF.md`'s.
5. **Evidence convention**: a closed task carries `evidence:` followed by the command, test name or file that proves it
   (`- [x] T3 add the flag — evidence: node bin/x.self-test.js`). Missing evidence is a warning in close mode before
   `development` closes and in `check-evidence.js`; it never blocks.
6. **Next task**: `nextAction` in development returns `next: <first open task text>`, passed through `safe()` with the
   same 160-character cap; without an open task it keeps today's text.
7. **Read-only step**: a new Protocol step 0 in `SKILL.md`. Classifier changes in `keywords.js` stay deferred
   (ROADMAP already tracks it).
8. **Constitution**: "Spec first" becomes "Spec proportional to the work", citing the three sizes. `[ADR]`
9. **Vendored skills untouched**: the rules live in `sdlc`, as the header rule already does.

## Scope

In: `bin/lib/{signals,todo,brief,infer}.js`, `bin/check-acceptance.js`, new `bin/check-evidence.js`, their
self-tests, `hooks/sdlc-status.self-test.js`, `SKILL.md`, `references/{feature-template,spec-template,spec-header,
entry-points}.md`, `references/phases/{analysis,planning,development}.md`, `docs/constitution.md`,
`docs/adr/0007-proportional-cycles.md`, `ROADMAP.md`, `README.md` where it describes the four steps.
Out: vendored skills, the request classifier, any write to `HANDOFF.md`, migration of existing cycles, Engram-style
memory.

## Clarifications

- 2026-11-07 — Q: Adopt ODD fully, partially, or only the size rule? A: three sizes plus continuity, keeping
  approvals and ADRs (owner, after naming paperwork and lost context as the pains).
- 2026-11-07 — Q: Does the feature document carry a session log and next step? A: no; handoff-ledger owns session
  state, the cycle keeps the durable record and the router derives the next task (owner).
- 2026-11-07 — Q: Acceptance said "the same `where.js` output as v0.13.0" for spec-only repos, but the plan adds
  JSON fields and names the next task on the brief line. A: regression is judged on `inferred`, `step`, `stage` and
  `warnings`; added fields and the next-task text are intended (agent, during development; bullet reworded).

## Open Questions

(none)

## Acceptance

- WHEN a folder `docs/specs/<dir>/` holds `feature.md` and no `spec.md`, `where.js` SHALL report that folder as a cycle whose `active.path`, `plan.path` and `todo.path` are `docs/specs/<dir>/feature.md`.
- WHEN a folder holds both `spec.md` and `feature.md`, `where.js` SHALL use `spec.md` as the record and the folder's `plan.md` and `tasks.md` as the pair.
- WHEN the active cycle is a feature cycle in `analysis`, the brief line SHALL say step 2 and name `feature.md` in the next action.
- WHEN the active cycle is in development and its task list has an open task, the brief line SHALL end its next action with that task's text.
- IF the active cycle is a feature cycle whose header says `planning`, THEN `where.js` SHALL infer development and add a warning.
- WHEN a task list holds a `[x]` task without `evidence:`, `check-evidence.js` SHALL print its path and line number and exit 0.
- WHEN `check-evidence.js` runs with `--strict` and finds such a task, THE SYSTEM SHALL exit 1.
- THE SYSTEM SHALL produce the same `inferred`, `step`, `stage` and `warnings` as v0.13.0 on a repository with only spec, plan and tasks cycles; the JSON only gains fields (`kind`, `nextTask`, `todo.next`, `todo.withoutEvidence`).
- THE SYSTEM SHALL count no checkbox inside a code fence of `feature.md` as a task.

## Verification record

`docs/ci-red-runs.md`, section `2026-11-07 — proportional cycles`.

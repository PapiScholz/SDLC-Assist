# Spec: the router knows how sure it is of the active cycle

Phase: deployment
Status: closed
Date: 2026-11-06
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.12.4)
Parent: `docs/specs/2026-10-12-router-suggest-close/spec.md` (closed)
Issues: #21, #20 (proposals 1, 2, 3 and 7; proposal 4 shipped in `7985492`)

## Objective

The `UserPromptSubmit` hook injects one status line on every prompt, and the agent reads it as a statement about the
work in progress. Two field reports show that line naming the wrong cycle with full confidence:

- **#21.** A repo with `docs/specs/01-…/` (`SPEC.md`, `PLAN.md`), `02-…/` and `03-…/` (each `MAPA.md`, `PLAN.md` and
  several `SPEC-<module>.md`). `findSpecs` accepts a folder only when it holds `spec.md`, so `02-` and `03-` are not
  cycles and the finished `01-` is "active" forever: `step 2/4 spec · next: finish docs/specs/01-…/spec.md`. The plan
  pair is built as lowercase `plan.md` / `tasks.md`, so `PLAN.md` is likely missed in the git lookup too.
- **#20 (macritex).** The active cycle had no commit in 12 days while 30 commits landed elsewhere, and the spec being
  written that day lived in `docs/spec-issues-….md`, which the router cannot see. For about 15 prompts the hook said
  `step 4/4 implement (test) · next: test the change`, and the agent proposed implementing without a plan.

The root problem is the same in both: the router picks a cycle and never asks itself whether the pick is credible.
This cycle adds that question. `infer` returns a **confidence** on the active cycle, `high` or `low`, with the reasons
that lowered it. With `low`, the hook stops giving a phase and a next action and says which cycle it means, why it
doubts it, and to run `/sdlc`. Discovery is widened so the two layouts above stop producing false picks in the first
place.

## Decisions

### Discovery (#21)

- A folder `docs/specs/<dir>/` is a cycle when it holds, matched case-insensitively, any of: `spec.md`, a capability
  map (`MAPA.md`, `MAP.md` or `CAPABILITY-MAP.md`), or one or more `SPEC-*.md`.
- The cycle's document of record (its `path`, and the file whose `Phase:`/`Status:` header is read and that close mode
  writes) is `spec.md`, else the map. A folder with only `SPEC-*.md` files has as `path` the alphabetically first of
  them, and its header is read from that file. In a folder with a map, the `SPEC-*.md` files are module specs: listed
  in `modules`, never ranked as cycles of their own, same as root `SPEC-*.md` today.
- Without a header, the phase comes from the artifacts (plan and tasks), as it already does for a headerless spec.
- The plan pair beside a folder cycle is resolved case-insensitively from the folder listing (`plan.md`, `PLAN.md`,
  `Plan.md`; `tasks.md`, `TASKS.md`), and the real on-disk name is what goes to the git lookup and to `signals`.
- The discovery stays in one place (`findSpecs`), so `check-acceptance.js` and every other caller see the same cycles.

### Activity and ranking

- A cycle's **last activity** is the newest effective date (`effectiveDate`, unchanged) among all its files: the
  document of record, the map, its module specs, the plan and the task list. For a flat spec it is the spec and
  nothing else: its last activity is `effectiveDate(spec)`, as today. Folding the shared `tasks/plan.md` in would
  rerank the legacy flat cycles, which ADR 0005 reads and never migrates.
- `rankCycles` orders cycles by last activity instead of by the spec file alone, so the folder touched most recently
  wins (#21's expected behavior). This supersedes the ranking date in ADR 0004; a new ADR records it.
- Tie-break (ROADMAP deferred item, due in the first cycle that touches `lib/infer.js`): on equal last activity, the
  larger path wins, so a newer date-prefixed slug beats an older one.

### Orphan specs (#20 proposal 1)

- `signals.orphanSpecs`: `*.md` files under `docs/` (depth 3, same `EXCLUDED_DIRS`, `docs/specs/` excluded) whose
  basename matches `/(^|[-_.])specs?([-_.]|$)/i`, each as `{ path, lastActivity, hasHeader }`, newest first, capped at
  20 entries plus a `total` count. They are never added to `specs` or `cycles`.
- Root `spec.md` and `SPEC-*.md` are already cycles or modules and are not orphans.

### Confidence

- `infer` returns `confidence: { level: 'high' | 'low', reasons: [{ kind, detail }] }`. With no active cycle it is
  `{ level: 'high', reasons: [] }`, since there is no pick to doubt.
- The level is `low` when at least one reason holds; reasons are listed in this order:
  1. `orphan`: the newest orphan spec's last activity is later than the active cycle's last activity.
  2. `stale`: the active cycle's last activity is at least **7 days** old **and** at least **10 commits** reachable
     from `HEAD` were made after it without touching any of the cycle's files.
  3. `contested`: another non-closed cycle's last activity is within **24 hours** of the active one's.
  4. `released`: the existing condition "a semver tag newer than the cycle's first commit, header phase
     `development`/`testing`/`deployment`". Its warning stays as today; it now also counts as a reason.
- Thresholds are constants in one module, not configuration.
- `inferred`, `step` and `stage` are computed exactly as today whatever the level: confidence describes the pick,
  it does not change the inference. The full `/sdlc` output keeps everything, plus `confidence`.
- Each reason also goes to `warnings` (first, ahead of the existing ones) with a plain sentence naming the cycle,
  e.g. `cycle docs/specs/2026-10-05-x untouched for 12 days and 30 commits: is it still the current work?`.

### The hook line (#20 proposals 3 and 7)

- Every line starts with the cycle and its age: `sdlc: cycle <short> (<N> days ago)`, where `<short>` is the folder
  name for a folder cycle and the path for a flat one, passed through `safe()`. Under one day it says `today`.
- With `high`, the rest of the line stays as today (stage, step, next, new-topic hint, first note).
- With `low`, the line carries no step and no `next:`: `sdlc: cycle <short> (<N> days ago) · not sure this is the
  current work: <first reason> · run /sdlc for the detail`.
- The hook stays silent without an active cycle, keeps exiting 0 on every path, and keeps printing only when the line
  changes within a session (`7985492`).

## Scope

In: `plugins/sdlc-assist/skills/sdlc/bin/lib/signals.js`, `lib/infer.js`, `lib/brief.js`, a new `lib/confidence.js`
if the reasons outgrow `infer.js`, `hooks/sdlc-status.js`, their self-tests, `skills/sdlc/SKILL.md` (how to read
`confidence` and what to do on `low`), a new ADR superseding the ranking date of 0004, `ROADMAP.md` (tie-break item
removed; backlog items below added), `docs/ci-red-runs.md`.

Out, to `ROADMAP.md ## Deferred Backlog`: #20 proposal 5 (request classifier ignores quoted lines and questions about
the tool), #20 proposal 6 (`PostToolUse` hook on `Write` for specs outside `docs/specs/`). Also out: migrating any
repo's legacy specs, closing a cycle automatically, a per-repo config file (`.sdlc.json`).

## Clarifications

- 2026-11-06 — Q: Which of #20's proposals enter this cycle? A: #21 plus #20 proposals 1, 2, 3 and 7; 5 and 6 go to
  the backlog (owner).
- 2026-11-06 — Q: In a folder with a map and several `SPEC-*.md`, where does the header come from? A: the map; without
  a map or without a header, from the artifacts (owner).
- 2026-11-06 — Q: Fix the silence rule first? A: No: first make the router determine its confidence, then let the hook
  act on it. Two levels with enumerated reasons (owner).
- 2026-11-06 — Q: When is a cycle stale? A: 7 days and 10 commits, both required (owner).
- 2026-11-06 — Q: Does a flat spec's last activity include `tasks/plan.md`? A: No, found while planning: it would
  rerank this repo's legacy flat cycles. Flat specs keep `effectiveDate(spec)`; recorded under Decisions (plan
  approved by the owner).

## Open Questions

(none)

## Acceptance

- WHEN a folder under `docs/specs/` holds `MAPA.md` and one or more `SPEC-*.md` and no `spec.md`, `findSpecs` SHALL
  return it as a cycle whose path is the map, and SHALL list its `SPEC-*.md` files as modules.
- WHEN a folder under `docs/specs/` holds only `SPEC-*.md` files, `findSpecs` SHALL return it as one cycle whose path
  is the alphabetically first of them.
- WHEN a folder cycle holds `PLAN.md` and `TASKS.md` in uppercase, `collectSignals` SHALL report the plan and task list
  as existing, with their on-disk names and their git dates.
- WHEN two folder cycles are not closed, `where.js` SHALL mark as active the one whose newest file has the latest
  effective date, even if its spec file is older than the other's.
- IF two cycles have the same last activity, THEN `rankCycles` SHALL rank the larger path first.
- WHEN a `docs/spec-x.md` file exists, `collectSignals` SHALL list it in `orphanSpecs` and SHALL NOT add it to `specs`.
- WHEN the newest orphan spec is newer than the active cycle's last activity, `infer` SHALL return confidence `low`
  with an `orphan` reason naming that file first.
- WHEN the active cycle's last activity is 12 days old and 30 later commits touch none of its files, `infer` SHALL
  return confidence `low` with a `stale` reason.
- IF the active cycle's last activity is 12 days old and fewer than 10 later commits exist, THEN `infer` SHALL NOT add
  a `stale` reason.
- WHEN another non-closed cycle's last activity is within 24 hours of the active one's, `infer` SHALL return
  confidence `low` with a `contested` reason.
- WHEN no reason holds, `infer` SHALL return confidence `high` with no reasons.
- THE SYSTEM SHALL compute `inferred`, `step` and `stage` identically whatever the confidence level.
- WHEN confidence is `high`, the hook SHALL print a line that starts with the cycle's short name and age and then
  carries the step and `next:` as today.
- WHEN confidence is `low`, the hook SHALL print a line naming the cycle, its age and the first reason, ending with
  `run /sdlc`, and SHALL NOT print a step or a `next:` action.
- THE SYSTEM SHALL keep the hook's exit code 0 on every path and its output empty without an active cycle.
- WHEN run on the #21 fixture, the hook SHALL name `03-` as the cycle. The fixture: folder `01-` with `SPEC.md` and
  `PLAN.md`; folder `03-` with `MAPA.md`, `PLAN.md` and two `SPEC-*.md`; `03-` touched last.
- WHEN run on the macritex fixture, the hook SHALL print a `low` line whose first reason is the orphan. The fixture: a
  folder cycle last committed 12 days earlier; 30 later commits elsewhere; a headerless `docs/spec-new.md` from today.
- THE SYSTEM SHALL keep the existing self-test fixtures' `inferred`, `step` and `stage` unchanged.
- THE SYSTEM SHALL add no more than 50 ms to the hook on a repository of 5000 files, measured against v0.12.4.

## Verification record

Pasted command and stdout in `docs/ci-red-runs.md`: the self-tests, `bash scripts/gates.sh`, the hook on the #21 and
macritex fixtures, and the timing comparison against v0.12.4.

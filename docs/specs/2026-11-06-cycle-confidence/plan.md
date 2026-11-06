# Cycle confidence (#21, #20): implementation plan

> Read `spec.md` beside this file first. Commits, pushes and the PR need the owner's explicit verb in the current turn (`CLAUDE.md`); never add co-authorship trailers.

**Spec:** [`spec.md`](spec.md). **Branch:** `cycle-confidence`. One PR, `[minor]` in a branch commit, v0.13.0 after merge.

## Global constraints

- Node, zero dependencies; each change in `bin/lib/` ships its cases in the existing `*.self-test.js`, written
  **before** the code (TDD) and seen red.
- Files are LF, UTF-8 without BOM. `bash scripts/gates.sh` green before each commit. No emoji.
- Every JSON field `where.js` prints today stays; the new ones are `orphanSpecs`, per-spec `lastActivity`,
  `confidence`, and `now` in signals.
- Existing self-test fixtures keep their `inferred`/`step`/`stage` (regression).
- Version: `[minor]` in a branch commit → v0.13.0 when merged. One PR. Commit, push and PR only with the owner's verb.

## Tasks

### 1. Discovery: map folders, module-only folders, plan pair in any case — `lib/signals.js`
- `findSpecs`: a folder in `docs/specs/` is a cycle if it has (case-insensitive) `spec.md`, a map
  (`/^(mapa|map|capability-map)\.md$/i`) or `SPEC-*.md`. Document of record: `spec.md` > map > first `SPEC-*.md`
  in alphabetical order. Returns the real on-disk name (e.g. `docs/specs/01-x/SPEC.md`).
- `FOLDER_SPEC` stops being a regex on `spec.md`: layout `folder` = any path under `docs/specs/<dir>/`.
- `pairOf`: resolves `plan.md`/`tasks.md` against the folder listing, case-insensitive, and returns the real name.
  This fixes the git lookup for `PLAN.md` (`fileDatesBatch` matches the path exactly).
- The `SPEC-*.md` files in a folder that has a map → `modules` (alongside the root ones, existing logic in
  `collectSignals`).
- `check-acceptance.js` inherits the discovery through `findSpecs` (no change; its self-test gets a map-folder case).
- Tests (`signals.self-test.js`): MAPA + 2 SPEC → 1 cycle with path MAPA.md and 2 modules; SPEC-* only → first one;
  `PLAN.md`/`TASKS.md` uppercase with git dates; the existing case "folder without spec.md is ignored" (plan.md + notes)
  still holds.

### 2. Last activity and ranking — `lib/signals.js`, `lib/infer.js`
- `collectSignals` puts all the `.md` files of each folder cycle (record, map, modules, plan, tasks) into the single
  `fileDatesBatch` call (still 3 git spawns) and adds `spec.lastActivity` = max `effectiveDate` over them. A flat
  spec gets `effectiveDate(spec)`. `effectiveDate` stays in `infer.js` and is reused.
- `rankCycles`: sorts by `s.lastActivity ?? effectiveDate(s)` (the `??` keeps the infer fixtures that lack the field);
  tie-break → larger path first. Remove the ROADMAP item.
- New ADR `docs/adr/0006-rank-cycles-by-last-activity.md` (amends 0004; 0004 keeps `accepted` plus a pointer line).
- Tests: two folder cycles, the one with the older spec but the newer PLAN wins; a tie → larger path.

### 3. Orphan specs — `lib/signals.js`
- `findOrphanSpecs(root)`: walks `docs/` to depth 3 with `listDir` + `EXCLUDED_DIRS`, skips `docs/specs/`, keeps
  basenames matching `/(^|[-_.])specs?([-_.]|$)/i` with a `.md` extension. Its dates join the same batch.
  `signals.orphanSpecs = { total, list: [{ path, lastActivity, hasHeader }] }`, newest first, at most 20 entries
  (`hasHeaderLine` from `lib/header.js`).
- Tests: `docs/spec-x.md` and `docs/notes/specs-old.md` are orphans; `docs/specs/a.md`, `docs/inspection.md` and
  `docs/respect.md` are not; none of them end up in `specs`.

### 4. Confidence — new `lib/confidence.js` + `infer.js`
- `signals.now` (seconds, captured once in `collectSignals`) and, for the active cycle only, when it is ≥7 days old:
  `signals.activity = { commitsElsewhere }` = `rev-list --count --since=@<lastActivity> HEAD` minus the same count
  restricted to the cycle's files (2 spawns, only when the cycle is old; in all other cases `null`, so it costs nothing).
- `assessConfidence({ active, cycles, orphanSpecs, activity, now, released })` is pure and returns
  `{ level, reasons: [{ kind, detail }] }` in the order orphan → stale → contested → released. Constants
  `STALE_DAYS = 7`, `STALE_COMMITS = 10`, `CONTESTED_SECONDS = 86400` exported from the module.
- `infer` calls it after computing `active`. `released` reuses the existing condition (same `if`). Each reason adds
  a warning **in front** (`warnings.unshift`, in reverse order so the first reason ends up first) naming the cycle.
  `inferred`/`step`/`stage` are untouched. Without an active cycle → `high`, `[]`.
- Tests (`confidence.self-test.js` new + cases in `infer.self-test.js`): each reason on its own; 12 days with 9
  commits → no stale; 6 days with 30 → no stale; contested 23 h yes / 25 h no; no reason → high; regression:
  every existing fixture yields `high` or keeps its output.

### 5. The hook line — `lib/brief.js`, `hooks/sdlc-status.js`
- `briefLine` starts with `cycle <short> (<N> days ago | today)`; `<short>` = folder name, or the path for a flat
  spec, passed through `safe()`. It needs `now`: `where.js` and the hook pass it into the result (`r.now`).
- `low` → `sdlc: cycle X (N days ago) · not sure this is the current work: <reasons[0].detail> · run /sdlc for the
  detail`. `high` → as today, after the prefix.
- The hook changes nothing else: silent without an active cycle, exit 0, dedup per session.
- Tests: `brief.self-test.js` (high, low, today, long or quoted name trimmed); `sdlc-status.self-test.js`: update the
  `^sdlc: stage 4` regex to the new prefix, plus the **#21 fixture** (01- with `SPEC.md`+`PLAN.md`, 03- with
  `MAPA.md`+`PLAN.md`+2 `SPEC-*.md` touched last → names `03-…`) and the **macritex fixture** (folder cycle committed
  with `GIT_COMMITTER_DATE` 12 days ago, 30 later commits in `src/`, headerless `docs/spec-new.md` → `low` line,
  first reason orphan, no `next:`).

### 6. Docs
- `skills/sdlc/SKILL.md`: under `## Protocol`, how to read `confidence`. On `low`, do not act on `next`; show the
  developer the reasons and ask which cycle is the current one (orphan → suggest moving it to
  `docs/specs/<date>-<slug>/spec.md`; stale → `sdlc close` or open a new cycle). Gates `check-skill-sections` and
  `check-sheets` stay green.
- `references/spec-header.md`, `docs/plans/plan-layout.md`, `README.md`: folder layouts (map + modules) and
  case-insensitive `PLAN.md`. `ARCHITECTURE.md` if it describes the discovery.
- `ROADMAP.md`: remove the tie-break item; add #20 proposals 5 and 6 under `### Product`.

### 7. Verification and close
- `bash scripts/gates.sh` green; `where.js --brief` on this repo and on the two fixtures; record the commands and real
  stdout in `docs/ci-red-runs.md`.
- Timing: the hook on a scratch repo with 5000 files, v0.12.4 (`git worktree` on the tag) against the branch, 10
  runs each, compare medians; budget +50 ms.
- Dogfood on a real repo with the #21 layout, if the owner says which one, and on macritex.
- Commit (`[minor]` in a branch commit), push, PR: each with the owner's explicit verb.

## Critical files

`plugins/sdlc-assist/skills/sdlc/bin/lib/{signals,infer,brief}.js`, new `lib/confidence.js`,
`plugins/sdlc-assist/hooks/sdlc-status.js`, `bin/where.js` (passes `now`), their `*.self-test.js`,
`skills/sdlc/SKILL.md`, `docs/adr/0006-…`, `ROADMAP.md`.

Reused: `effectiveDate`/`rankCycles` (`lib/infer.js`), `fileDatesBatch`, `listDir`, `EXCLUDED_DIRS`
(`lib/signals.js`), `hasHeaderLine`/`parseHeader` (`lib/header.js`), `safe()` (`lib/brief.js`), helpers
`tmpDir`/`write`/`git` from the existing self-tests.

## Review focus (the risks)

- Legacy layout: this repo, with 6 flat specs + `tasks/plan.md`, has to give the same `where.js` as today (task 2,
  regression).
- A folder with `plan.md` + notes and no spec/map/SPEC-* is still not a cycle (task 1).
- `--since` uses committer date; fixtures set `GIT_COMMITTER_DATE` and `GIT_AUTHOR_DATE` (task 5).
- The orphan regex must not catch `inspection`, `respect`, `spectrum` (task 3).
- Hook cost: the stale spawns only run with a cycle ≥7 days old (task 4).

## Verification

`bash scripts/gates.sh` (all self-tests + doc gates) · `node plugins/sdlc-assist/skills/sdlc/bin/where.js --brief` on
this repo · hook on the #21 and macritex fixtures (inside `sdlc-status.self-test.js`) · timing comparison against
v0.12.4 · record in `docs/ci-red-runs.md`.

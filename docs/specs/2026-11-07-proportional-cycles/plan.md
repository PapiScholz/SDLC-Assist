# Proportional cycles: implementation plan

> Read `spec.md` beside this file first. Commits, pushes and the PR need the owner's explicit verb in the current turn (`CLAUDE.md`); never add co-authorship trailers.

**Spec:** [`spec.md`](spec.md). **Branch:** `proportional-cycles`. One PR, `[minor]` in a branch commit, v0.14.0 after merge.

## Global constraints

- Node, zero dependencies; each change in `bin/` ships its cases in the existing `*.self-test.js`, written **before**
  the code (TDD) and seen red.
- Files are LF, UTF-8 without BOM. `bash scripts/gates.sh` green before each commit. No emoji.
- Every JSON field `where.js` prints today stays; the new ones are per-spec `kind`, `todo.next` and
  `todo.withoutEvidence`.
- Existing self-test fixtures keep their `inferred`/`step`/`stage`/brief line (regression, Acceptance bullet 8).

## Tasks

### 1. Feature cycles in discovery: `lib/signals.js`
- `FEATURE_FILE = /^feature\.md$/i`. `folderCycle`: record = `spec.md` > `feature.md` > map > first `SPEC-*.md`.
  When the record is `feature.md`, `plan` and `todo` are that same path and `kind: 'feature'`; else `kind: 'spec'`.
- `specs[]` gain `kind` (`'flat'` layout cycles are `kind: 'spec'`). `filesOf` deduplicates, so a feature cycle's
  last activity is the file once.
- Tests: feature-only folder → one cycle, `plan.path` = `todo.path` = `feature.md`; spec.md + feature.md → spec.md
  record with its own pair; a feature folder never pulls `tasks/plan.md`.

### 2. Task helpers: `lib/todo.js`
- `firstOpen(markdown)` → text of the first open checkbox outside fences, marker stripped (`- [ ] T2 foo` → `T2 foo`),
  or null.
- `withoutEvidence(markdown)` → 1-based line numbers of `[x]` tasks lacking `/\bevidence:/i`, outside fences.
- `todoInfo` in `signals.js` adds `next` and `withoutEvidence` (count) to the todo object.
- Tests: fenced checkbox ignored; `[~]`/`[-]` count as open as today; evidence match is case-insensitive.

### 3. Inference and brief: `lib/infer.js`, `lib/brief.js`
- `infer`: when the active cycle is `kind: 'feature'` and its header says `planning`, inferred = the artifact fallback
  when that is development or testing, else development, plus warning
  `feature cycles have no planning step: read as development`. `active` carries `kind`.
- `nextAction`: `analysis` on a feature cycle → `finish <path> and get it approved` (already true by path; assert it);
  `development` with `r.todo.next` → `<task text>` (through `safe`); otherwise today's text. `where.js` and the hook
  pass `todo` from signals into the brief input.
- Tests in `infer.self-test.js`, `brief.self-test.js`, `hooks/sdlc-status.self-test.js` (feature fixture in
  development prints `next: T2 …`).

### 4. Checks: `bin/check-acceptance.js`, new `bin/check-evidence.js`
- `check-acceptance`: for a `feature.md` record, read `## Specs` instead of `## Acceptance`: each `S<n>.` entry must
  have `Quote:`, `Outcome:` and `Check:` lines, else `warn <path>:<line> S<n> missing <field>`. Open Questions as today.
- `check-evidence.js [--root] [--strict] [--all]`: for each non-closed cycle's task list, `warn <path>:<line> done
  without evidence`; summary line `check-evidence: <n> task lists, <m> done tasks, <k> without evidence`; exit 0,
  `--strict` exits 1. Self-test beside it. Added to `scripts/gates.sh` as advisory (like check-adr) and to
  `CONTRIBUTING.md`'s list.

### 5. Skill and references
- `SKILL.md`: Overview (three sizes), Protocol step 0 (read-only) and size statement, Close mode row for feature
  cycles (`analysis` → `Status: approved`, `Phase: development`) and the evidence warning before `development`
  closes, "Hotfix threshold" → "Size", "Never" allows `feature.md`, new "Continuity" section (HANDOFF.md owns
  session state; the cycle owns specs, decisions, tasks and evidence).
- New `references/feature-template.md`; `spec-template.md` (Acceptance may cite a Check), `spec-header.md`,
  `entry-points.md`, `phases/analysis.md`, `phases/planning.md` (feature cycles skip it), `phases/development.md`
  (evidence on ticks). `check-sheets` and `check-skill-sections` stay green.

### 6. Product docs
- `docs/constitution.md`: "Spec first" → "Spec proportional to the work"; amendment line dated 2026-11-07.
- `docs/adr/0007-proportional-cycles.md` (Nygard, Status: accepted) covering Decisions 1, 3 and 8.
- `ROADMAP.md`: request classifier for questions stays deferred, cross-referenced. `README.md` where it describes the
  four steps.

### 7. Verification and delivery
- 7a Gates; smoke on scratch repos (feature in analysis, feature in development with `T2`, `[x]` without evidence,
  a v0.13.0-style repo for regression, compared with the output of a `git worktree` at tag v0.13.0); hook line;
  record in `docs/ci-red-runs.md`.
- 7b Commit (`[minor]`), push and PR with the owner's verb.

# Spec: `sdlc` — SDLC phase router skill

Phase: deployment
Status: closed
Date: 2026-09-29
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist`
License: MIT

## Objective

A portable agent skill named `sdlc` that, given any work request (new idea,
customer complaint, bug, feature, patch), identifies which phase of the
software development life cycle the work is in, shows the evidence, asks
the user to confirm, and recommends the concrete next step together with
the skill that performs it.

Problems it solves (owner's words):

- Coding starts before the work is framed: no spec, no plan, straight to
  implementation.
- Every customer request is handled differently; there is no repeatable
  entry protocol.

Users: the owner first; public developers after publication. Docs in
English; the skill replies in the user's language.

Success looks like: on the reference scenarios (below) the inferred phase
and the recommendation match what the owner would say.

## Phase model

Six phases. **Design is not a phase**: it is an activity that may appear
inside the spec (Analysis), inside the plan (Planning), or in both; each
phase sheet says where design happens in that phase. **Maintenance is not
a phase**: it is the project context "software in production", detected
from signals, which changes the default entry point. Every request on a
production project starts its own small cycle, and **the spec is the
identity of a cycle**.

Two sources are always evaluated: the `Phase:` header of the active spec,
and the fallback conditions below computed from artifacts. When a header
exists, `inferred` is the header's phase and the fallback result goes into
`evidence`; a disagreement is a warning and the fallback phase is offered
as an alternative. Without a header, `inferred` is the fallback result.

| Phase | Slug | Fallback condition (no header) | Produces | Recommended skill |
|---|---|---|---|---|
| Initial planning | `initial` | No source files (only config, lockfiles, scaffolding) and no spec | First spec | `spec-driven-development` |
| Requirements analysis | `analysis` | No active spec with `Status: approved` (a draft spec means: review and approve it) | Spec (full, or short from a request card) | `spec-driven-development`, plus a debugging skill when the request is a bug; both apply, the spec is always produced |
| Planning | `planning` | Approved active spec, and no current plan, or a plan whose todo has no tasks | `tasks/plan.md` + `tasks/todo.md` | `planning-and-task-breakdown` |
| Development | `development` | Current plan and todo with open tasks | Code with unit tests (TDD) | `incremental-implementation`, `test-driven-development` |
| Testing | `testing` | Current plan, todo with at least one task and none open | Green suite, smoke, pre-push QA | a QA skill (see Missing-skill protocol) |
| Deployment | `deployment` | (header only; without it the tie goes to `testing` and the evidence says so) | Release, tag, CHANGELOG | a release skill; never initiated by `sdlc` |

Rules that close the gaps:

- **Current plan**: `tasks/plan.md` whose last commit is not older than the
  active spec's first commit (untracked files use mtime). An older plan
  belongs to a closed cycle and is treated as absent, together with its
  todo. This is how leftovers from previous cycles are ignored without any
  write.
- **No row holds** (should not happen; kept as a guard): `inferred` is
  `analysis` and the evidence says "no rule matched".
- **External task tracker** (upstream SDD allows one): without
  `tasks/todo.md` the fallback cannot distinguish planning, development
  and testing; the evidence says so and the header is the only reliable
  source. Assumption for v1: projects use the default `tasks/todo.md`.
- When a semver tag points at HEAD and the header says `deployment`, the
  recommendation is to close the cycle.

Entry points by request type (`references/entry-points.md`):

- New idea, no source files → `initial`.
- New idea on existing code → `analysis` (new cycle).
- Complaint, bug or feature → `analysis`. Complaints (someone else
  reporting a problem) go through the request card whether or not the
  project is in production; `inProduction` only adds the "keep the
  running version safe" note to the recommendation.
- Hotfix → `development` directly, with no spec and no cycle. Threshold,
  judged by the agent from the request as described (a heuristic accepted
  by the owner): the requirement is unambiguous and self-contained, and it
  is a typo or documentation fix or a change the user describes as at most
  20 lines in at most 2 files with no new dependency. Otherwise
  `analysis`. The skill states which phase it skipped and which condition
  allowed it. Close mode within the same context, after a hotfix, updates
  nothing and recommends the QA step; in a later context a hotfix leaves
  no trace by design.

Transitions: **none are blocked**. Development without an approved spec,
or Deployment without Testing, produce a warning line with the evidence
inside the confirmation question. A header that disagrees with the
fallback evidence is also a warning, never silently resolved.

## Cycle identity and header

- A cycle is a spec file: `docs/specs/*.md`, root `spec.md`, or root
  `SPEC-*.md` (upstream SDD Phase 0 convention). With two or more root
  `SPEC-*.md` (a capability map), v1 uses a proxy for the map's parent:
  only those with a `Phase:` or `Status:` header line are cycles; the
  headerless ones are module specs, listed in `signals.modules` and
  excluded from active-cycle ranking.
- Header lines: `Phase: <slug>` and `Status: draft | approved | closed`,
  placed immediately after the H1 title (or at the top when there is no
  H1), scanned within the first 15 lines after any YAML frontmatter.
  First token after the colon, case-insensitive; the rest of the line is
  ignored. A spec without `Status:` counts as `draft`.
- The **active cycle** is the most recent spec whose `Status:` is not
  `closed`, ranked by git commit date, or by mtime when the file is
  untracked or has uncommitted edits newer than its last commit.
- `tasks/plan.md` and `tasks/todo.md` are shared files: **one planned
  cycle at a time**. A new request while a cycle is active gets its own
  spec in `analysis`; its planning waits until the active cycle closes or
  the user says to switch, and the confirmation question offers that
  choice. Trade-off accepted for v1.

Who writes what. The skill writes into the user's repo in exactly two
categories, both performed by the agent with its edit tool (the scripts
only read):

1. Spec files created through the SDD flow while `sdlc` is loaded, full or
   short (request card), always with the header `Phase: analysis`,
   `Status: draft`. The vendored `spec-driven-development` is not
   modified; the header rule lives in `SKILL.md`.
2. Header updates on a confirmed close. Close mode runs the inference
   first, uses the phase the user confirmed in that question, and advances
   from it: closing `analysis` means the user approved the spec and
   writes `Status: approved` + `Phase: planning`; closing `planning`
   writes `development`; then `testing`, then `deployment`; closing
   `deployment` writes `Phase: deployment` + `Status: closed`, so a closed spec never keeps a stale phase. A headerless spec gets the header
   with the phase that follows the confirmed one.

## Inference protocol

1. **Collect and infer.** `bin/where.js --message-file <temp file>`
   (also `--message "<text>"` or `--message -` for stdin; Node, zero
   dependencies) runs at the user's repo root and prints JSON:
   `{ signals, cycles, active, inferred, evidence, alternatives, warnings, request }`.
   - Artifacts: every spec with `Phase:`/`Status:`, plan present and
     current, todo counts (`[ ]`, `[-]`, `[~]` open; `[x]` or `[X]` done;
     bullets `-`, `*` or `1.`; nested checkboxes count; zero checkbox
     lines means "no tasks").
   - Git, read-only queries only: repo present, branch, last 10 commits
     with paths, last semver tag, whether it points at HEAD, `CHANGELOG.md`
     has a published version, commit dates and dirty state of specs and
     plan.
   - Tests: runner detected from `package.json`, `pyproject.toml`,
     `Cargo.toml`, `go.mod`. Suite runs only with `--run-tests`, which the
     agent passes only when the user asked for it in the current turn;
     otherwise `tests.status` is `unknown` and the evidence says so.
   - Production: `inProduction` true only when a semver tag exists **and**
     (`CHANGELOG.md` has a published version **or** a release workflow
     exists).
   - Message: `request.type` in `complaint | bug | feature | idea | hotfix
     | unknown`, from a bilingual (English, Spanish) keyword list in
     `bin/lib/keywords.js`, extensible per language. `unknown` makes the
     question ask for the request type.
   The decision table lives in `bin/lib/infer.js`. `SKILL.md` does not
   restate it; it says "run the script and read `inferred`, `evidence`
   and `alternatives`".
2. **Decision rule.** Every fallback row whose condition holds is a
   candidate; the earliest phase in the cycle wins; the evidence lists all
   candidates. Exactly two agent-side rules sit on top, both stated in
   `SKILL.md`: (a) if `request.type` is `complaint`, `bug` or `feature`
   and an active cycle exists, the question offers "continue active
   cycle" and "new cycle in analysis"; (b) if `request.type` is `hotfix`,
   the agent applies the threshold above and downgrades to `analysis`
   when it fails, saying which condition failed.
3. **Confirm.** One question: inferred phase, two or three lines of
   evidence, warnings, and up to three alternatives (other candidates,
   "new cycle"). A second question is asked only when the recommended
   skill is not installed (see Missing-skill protocol); this is the single
   refinement of the one-question rule, chosen so that a missing skill is
   never silent. Hosts with a structured question tool use it; the skill
   detects the tool by name in its tool list, otherwise asks in prose.
4. **Recommend.** Read `references/phases/<slug>.md`: what it produces,
   which skill, the concrete next step, where design happens.

**Locating the script.** `bin/` is always next to the `SKILL.md` the host
loaded: `${CLAUDE_PLUGIN_ROOT}/skills/sdlc/bin` in the plugin, otherwise
the directory the host reported for this skill. If the host does not
report it, try in order `~/.agents/skills/sdlc/bin`,
`~/.claude/skills/sdlc/bin`, `~/.config/opencode/skills/sdlc/bin`,
`~/.codex/skills/sdlc/bin`, `~/.cursor/skills/sdlc/bin`, then
`<repo>/.agents/skills/sdlc/bin` and `<repo>/.claude/skills/sdlc/bin`.

## Request card and close mode

- **Request card** (`references/request-card.md`): five lines (who asks,
  what happens, what was expected, where it happens, how urgent). The skill
  fills it from the complaint and the SDD flow turns it into the short
  spec with the header.
- **Close mode** (`/sdlc-assist:phase close` (plugin id `sdlc` until v1.3), or "sdlc close" by intent): runs
  the inference, asks whether the confirmed phase is finished and what it
  produced, advances the header as defined above, and names the next
  phase and its skill. Designed to be called from session-closure or
  handoff workflows. It never touches CHANGELOG; that belongs to the
  release skill.

## Dependencies: bundled skills

Without the SDD family the router has nothing to route to, so the repo
ships them.

- Vendored verbatim from `addyosmani/agent-skills` at pinned commit
  `bc97fd46` (MIT). Each skill dir adds `LICENSE` and `VENDORED.md`, which
  `sync-vendored.js` excludes from the comparison. Source is upstream,
  never the owner's local copy (verified stale on 2026-09-29).
  `--check` runs in CI; `--fix` updates to the pin; bumping the pin is a
  reviewed change. Relative links inside upstream text are left as is:
  agents resolve skills by name. Vendored: `spec-driven-development`,
  `planning-and-task-breakdown`, `incremental-implementation`,
  `test-driven-development`, `context-engineering`.
- Own skills `sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release`:
  **deferred to v1.1.**

**Missing-skill protocol** (`references/missing-skill.md`). The
recommended skill and the known alternatives per phase live only in the
frontmatter of `references/phases/<slug>.md` (`recommends:`,
`alternatives:`); `bin/which.js` reads them from there, so there is one
source. `which.js` scans `~/.agents/skills`, `~/.claude/skills`,
`~/.config/opencode/skills`, `~/.codex/skills`, `~/.cursor/skills`, the
project-level equivalents, and Claude Code plugin caches, and normalises
names so that `spec-driven-development`, `sdlc:spec-driven-development`
and `superpowers:systematic-debugging` resolve to their bare name while
the recommendation prints the form invocable on the current host. v1
alternatives: `superpowers:systematic-debugging`, `debugging-strategies`,
`release-engineer`, `qa-push`. When nothing is installed for a phase, the
second question offers: install a known one (exact command when a public
source exists), search (`npx skills find <term>` or the `find-skills`
skill), create it along the way, or continue without it. "Continue" is
announced once and not asked again for that skill within the current
context; after a context reset it is asked again. Trade-off chosen by the
owner.

## Tech stack

- Markdown skills with YAML frontmatter (`name`, `description` minimum:
  OpenCode's requirement).
- Node 20 or newer scripts, zero runtime dependencies, LF line endings.
- Claude Code plugin manifest + self-referencing marketplace.
- OpenCode command file.

## Commands

```
Self-test:      node bin/where.self-test.js
                node bin/which.self-test.js
                node bin/sync-vendored.self-test.js
Infer:          node bin/where.js --message-file <temp file> [--run-tests] [--root <dir>]
Vendor check:   node bin/sync-vendored.js --check
Vendor update:  node bin/sync-vendored.js --fix
Installed?:     node bin/which.js [--verbose]
Manifest check: node bin/check-manifest.js
Sheet parity:   node bin/check-sheets.js     (slug <-> sheet, recommends resolvable)
Line endings:   node bin/check-eol.js        (working tree bytes, not blobs)
```

## Project structure

```
SDLC-Assist/
  README.md, LICENSE, CHANGELOG.md, .gitignore, .gitattributes
  .claude-plugin/plugin.json, .claude-plugin/marketplace.json
  commands/phase.md                       -> /sdlc-assist:phase [close]   (id `sdlc` until v1.3)
  .opencode/command/sdlc-phase.md         -> /sdlc-phase [close]
  .github/workflows/ci.yml
  docs/specs/2026-09-29-sdlc-skill-design.md
  docs/ideas/sdlc-skill.md
  docs/ci-red-runs.md
  tasks/plan.md, tasks/todo.md            (this project's own plan, dogfooded)
  skills/
    sdlc/
      SKILL.md
      bin/where.js, bin/which.js, bin/sync-vendored.js,
      bin/check-manifest.js, bin/check-sheets.js, bin/check-eol.js, bin/check-frontmatter.js
      bin/lib/header.js, todo.js, keywords.js, signals.js, infer.js, skilldirs.js
      bin/*.self-test.js (one per script), bin/lib/*.self-test.js (one per lib)
      references/phases/{initial,analysis,planning,development,testing,deployment}.md
      references/entry-points.md, request-card.md, spec-header.md, missing-skill.md
    spec-driven-development/SKILL.md, LICENSE, VENDORED.md
    planning-and-task-breakdown/…  incremental-implementation/…
    test-driven-development/…      context-engineering/…
```

Structural decision (2026-09-29, planning research): the router lives in
`skills/sdlc/`, not at the repo root. The `skills` CLI fast path installs
only `SKILL.md` for a root skill and lets a root skill shadow nested
`skills/*`; a subfolder skill is installed with all its files. Every
install path therefore yields `<skill dir>/bin`.

The phase table in this spec is design-time; at runtime it exists only in
`references/phases/*.md` and `bin/lib/infer.js`, and `check-sheets.js`
asserts they agree on slugs and that every `recommends:` names a skill the
repo ships or lists as an alternative.

## Distribution

What each path gives, and what it overwrites:

| Path | Command | Skill by intent | Explicit command | Notes |
|---|---|---|---|---|
| skills.sh | `cd ~ && npx skills add PapiScholz/SDLC-Assist` | Claude Code, OpenCode, Codex, Cursor | none | Installs the six skills (router + five vendored) with all files; `--skill sdlc` installs only the router (flag verified). Overwrites same-named skills in `~/.agents/skills` |
| Claude Code plugin | `claude plugin marketplace add PapiScholz/SDLC-Assist` + `claude plugin install sdlc-assist@papischolz` | Claude Code | `/sdlc-assist:phase` | Also registers the five vendored skills; duplicates with user-scope copies are reported by `which.js --verbose` |
| Manual | `cp -r skills/* ~/.claude/skills/` | Claude Code, OpenCode | `/sdlc` (user-scope) | Copies the router and the five vendored skills |
| OpenCode command | `cp .opencode/command/sdlc-phase.md ~/.config/opencode/command/` | (any of the above) | `/sdlc-phase` | Manual step on every path; documented in README |

On Codex and Cursor the accepted delivery is intent only: the README says
so, and adding native command files there is a v1.1 item once their
formats are verified.

Verified on 2026-09-29 from OpenCode docs: it loads `~/.agents/skills`,
`~/.claude/skills` and `~/.config/opencode/skills`.

Verified 2026-09-29: the CLI links each skill into the Claude, Codex, Cursor
and OpenCode global dirs.

## Code style

Same conventions as `doc-governance-skill`: CommonJS, no build step,
guarded helpers, one self-test file next to each script. Example:

```js
// bin/lib/todo.js
const OPEN = /^\s*(?:[-*]|\d+\.)\s+\[[ \-~]\]/gm;
const DONE = /^\s*(?:[-*]|\d+\.)\s+\[x\]/gim;
function countTasks(markdown) {
  const open = (markdown.match(OPEN) || []).length;
  const done = (markdown.match(DONE) || []).length;
  return { open, done, total: open + done };
}
module.exports = { countTasks };
```

## Testing strategy

Fixtures are temporary repos built by `bin/where.self-test.js`. Each
asserts `inferred` and the recommended skill, and each has a named
inversion that must fail.

| # | Fixture | Message | Expected | Inversion |
|---|---|---|---|---|
| 1 | empty dir, no git | "I have an idea for X" | `initial` | add a source file → `analysis` |
| 2 | source files, git, tag `v1.2.0`, versioned CHANGELOG, no spec | "customer complains about X" | `analysis`, `complaint`, `inProduction: true` | add approved spec + current plan → not `analysis` |
| 3 | spec `Phase: development`, `Status: approved`, current plan, todo 3/7 | "continue" | `development`, next open task | close all tasks → fallback `testing` in evidence, warning |
| 4 | same as 3 without the `Phase:` line (`Status: approved` kept) | "continue" | `development` via fallback | close all tasks → `testing` |
| 5 | fixture 3 | "el login se rompe cuando X" | `development` active, alternative "new cycle: analysis", `bug` | message "continue" → no alternative |
| 6 | source files, no SDD artifacts, no tags | "add feature X" | `analysis` | remove source files → `initial` |
| 7 | source files, CHANGELOG `## 0.1.0`, no tags | "I have an idea" | `analysis`, `inProduction: false` | add tag `v0.1.0` → `inProduction: true` |
| 8 | fixture 3 with header `Phase: analysis` (stale) | "continue" | `analysis` (header), alternative `development`, warning | fix header → no warning |
| 9 | approved spec, current plan, todo with no checkbox lines | "continue" | `planning`, evidence "no tasks" | add an open task → `development` |
| 10 | closed spec with old plan and todo 7/7, new draft spec | "continue" | `analysis`, evidence "plan belongs to a closed cycle" | approve the new spec, rewrite `tasks/plan.md` and an empty `tasks/todo.md`, commit after the spec → `planning` |

`fallback` and `candidates` are internal to `infer()`; `where.js` exposes them through `evidence`.

CI gates, each with one red run recorded in `docs/ci-red-runs.md`
(recorded locally where CI cannot reproduce it, and the note says so):
self-tests (inversions); `sync-vendored --check` (one vendored line
edited); manifest check (`name` removed); sheet parity (a sheet renamed);
frontmatter check on all six `SKILL.md` (description removed);
`check-eol.js` on working tree bytes (a CRLF file written locally; blobs
are normalised by `.gitattributes`, so in CI this gate only catches
pre-existing CRLF blobs). `claude plugin validate .` runs locally before
each release; in CI only if planning confirms the CLI installs on the
runner.

Manual before publishing (ceiling: needs a native TTY): install from
another directory via each path; confirm `/sdlc-assist:phase` in Claude Code and
`/sdlc-phase` in OpenCode after the manual command copy.

## Boundaries

- Always: infer before asking; show evidence; state which phase was
  skipped and why; reply in the user's language.
- Ask first: installing anything; creating a new skill (both inside the
  missing-skill question).
- Never: pass `--run-tests` unless the user asked in the current turn;
  write into the user's repo beyond the two write categories above; block
  a transition; run `git add`, `commit`, `push`, `reset`, `checkout` or
  any state-changing git command (read-only queries such as `log`, `tag`,
  `status` are allowed); initiate or execute a release (only when the user
  asks in the current turn, and then through the release skill).

## Success criteria

- The ten fixtures pass and each inversion fails.
- Fixture diff shows the scripts wrote nothing into the fixture repos.
- Every phase with no installed skill produces the four-option question.
- All install paths work from a clean machine (manual check).
- Vendored skills match the pinned upstream commit in CI.

## Out of scope (v1)

- Own skills `sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release` (v1.1).
- Native command files for Codex and Cursor (v1.1).
- Any phase state outside the spec header.
- More than one planned cycle at a time.
- External task trackers (fallback degrades to header-only).
- Automatic per-turn inference hook (possible later, Claude Code only).
- Maintenance reminders (dependencies, logs, backups).

## Open questions

None. Resolved in planning on 2026-09-29: `npx skills add` copies whole
subfolder skills and `--skill` exists; `claude plugin validate` runs
headless and is tried in CI as a non-blocking job; Codex/Cursor receive
links from the CLI, so their native dirs are irrelevant.

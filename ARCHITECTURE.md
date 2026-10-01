# Architecture: SDLC-Assist

## Overview

SDLC-Assist is a Claude Code plugin (`sdlc-assist`) whose core is one skill, `sdlc`: a router that reads a repository, infers which of six phases a work request is in (initial, analysis, planning, development, testing, deployment), asks one confirmation and hands off to the skill for that phase. Everything the router decides comes from read-only signals (files, headers, git metadata); it never writes into the user's repo beyond spec headers on a confirmed close. The repository around the plugin holds the specs, records, gates and release pipeline that develop it. Product rules: `docs/constitution.md`. Agent working rules for this checkout: `CLAUDE.md`.

## Structure

| Folder | Purpose |
|---|---|
| `plugins/sdlc-assist/` | What ships: `.claude-plugin/` manifest, `commands/phase.md`, `skills/`, plugin README and LICENSE. The plugin directory scans only this folder (ADR 0001). |
| `plugins/sdlc-assist/skills/sdlc/` | The router: `SKILL.md` (protocol), `bin/` (scripts and self-tests), `references/` (phase sheets, templates, entry rules). |
| `plugins/sdlc-assist/skills/sdlc/bin/lib/` | Pure modules: `signals.js` (repo facts), `infer.js` (phase and active cycle), `header.js`, `keywords.js`, `todo.js`, `unfenced.js`, `skilldirs.js`. |
| `plugins/sdlc-assist/skills/sdlc-*` | Own skills for the phases: `sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release`. |
| `plugins/sdlc-assist/skills/<vendored>` | Vendored skills pinned by `bin/sync-vendored.js` (`spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`, `context-engineering`). Never edited here. |
| `scripts/` | `gates.sh` (the single verification target CI runs) and `hooks/` (git hooks for this checkout: EOL guard, git authorization). |
| `docs/specs/` | One cycle per spec; folder cycles carry `plan.md` and `tasks.md` beside `spec.md` (ADR 0005). |
| `docs/adr/` | Decisions that outlive a cycle, Nygard format, numbered, never deleted. |
| `docs/` (rest) | `constitution.md`, `ci-red-runs.md` (append-only pasted records), `sdlc-flow.md` (diagrams), `distribution.md`, `plans/` and `intents/` and `ideas/` (legacy locations, read-only). |
| `tasks/` | Legacy `plan.md` and `todo.md` of the flat cycles; pointer to the current folder cycle, not updated. |
| `.github/` | `workflows/ci.yml` (tests on Ubuntu and Windows, plugin validate, install smoke) and `workflows/release.yml` with `scripts/release.sh` (ADR 0002). |

## Components and boundaries

- `where.js`: entry point. Takes `--root` and a message (`--message` or `--message-file`), calls `collectSignals` and `infer`, prints one JSON. No network, no environment read, no writes.
- `lib/signals.js`: every fact about the repo (specs and their headers, plan and todo pair, constitution, architecture, ADRs, source files, test runner, git tags and dates, changelog). Read-only; git through `execFileSync` only for metadata. Depends on the other `lib/` modules, never on `where.js` or `which.js`.
- `lib/infer.js`: ranks cycles and picks the active one (ADR 0004), infers the phase from signals and the request type, lists warnings. Pure functions over the signals object.
- `which.js`: which skills are installed for a phase and where (`lib/skilldirs.js`); reads the phase sheets' frontmatter for `recommends` and `alternatives`.
- `check-*.js`: gates on this repo's own artifacts (manifest, sheets, frontmatter, skill sections, EOL, acceptance bullets, ADRs). Each ships with a `*.self-test.js`; advisory ones exit 0 and take `--strict`.
- `references/phases/<slug>.md`: one sheet per phase with a fixed set of labels (`check-sheets.js` enforces them); the only place a phase's behavior is described, so "never nag" is a property of which sheet mentions a signal.
- Own and vendored skills: invoked by the router by name through the host's skill mechanism; the router never reads their bodies.

## Data flow

A request arrives as text. `where.js` writes nothing: it reads the repo into `signals`, classifies the request (`lib/keywords.js`), ranks the cycles and picks the active spec, infers the phase and prints JSON with `inferred`, `active`, `signals`, `warnings`. `SKILL.md` tells the agent to show the evidence, ask one question, run `which.js` for the confirmed phase, read that phase's sheet and state the next step with the skill to invoke. Close mode is the only write: it advances the active spec's `Phase:` / `Status:` header. Releases run from `main` pushes through `release.yml`, which reads bump markers from the commits since the last tag.

## Decisions

- ADR 0001: the plugin lives in `plugins/sdlc-assist/`; the rest of the repo is never scanned by the directory.
- ADR 0002: the release bump comes from `[minor]` / `[major]` markers, never from the commit prefix.
- ADR 0003: cross-cycle artifacts (constitution, ADRs, this file) are detected and cited, never required, never written by the router.
- ADR 0004: the active cycle is the newest non-closed spec by effective date, computed once in `lib/infer.js`.
- ADR 0005: a folder cycle owns its `plan.md` and `tasks.md`; the legacy flat layout is read but never migrated.

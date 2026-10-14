---
name: sdlc
version: 0.12.3
description: Tells the agent where work on a code repository stands, in four steps (situation, spec, plan, implement) and per stage of a staged plan, and what comes next; routes to spec-driven-development and its family. Use when working on a repository that has specs under docs/specs, when asked "where are we", or "sdlc close". Not for research, browsing, or non-code tasks.
---

# sdlc: SDLC phase router

## Overview

Given any work request (new idea, customer complaint, bug, feature, patch), this skill identifies which phase of the software development life cycle the work is in, tells the developer where the work is in one plain sentence, and recommends the concrete next step together with the skill that performs it.

The developer's workflow has four steps: (1) state the situation, (2) the agent writes the spec and the developer approves it, (3) the agent writes the plan and the developer approves it, (4) implement, test and ship. A large plan splits into stages; each stage repeats steps 3 and 4. The six internal phases map onto those steps (`initial` 1, `analysis` 2, `planning` 3, `development`/`testing`/`deployment` 4). The skill informs the agent; the agent tells the developer in one plain sentence, in their language, and proceeds. In Claude Code the plugin's hook runs this on every prompt inside a repository with an active cycle; elsewhere invoke it by name. It never blocks a transition. The docs are in English.

## Locate bin/

`bin/` is next to this SKILL.md. Resolve it in this order and use the first that exists:

1. `${CLAUDE_PLUGIN_ROOT}/skills/sdlc/bin` when that variable is set.
2. The directory of this SKILL.md, as reported by the host.
3. `~/.agents/skills/sdlc/bin`, `~/.claude/skills/sdlc/bin`, `~/.config/opencode/skills/sdlc/bin`, `~/.codex/skills/sdlc/bin`, `~/.cursor/skills/sdlc/bin`, then `<repo>/.agents/skills/sdlc/bin` and `<repo>/.claude/skills/sdlc/bin`.

If none exists, say so, and read the artifacts by hand with the same rules (spec headers, the cycle's `plan.md`/`tasks.md` or the legacy `tasks/plan.md`/`tasks/todo.md`, read-only git queries, tests only if asked).

Run from the user's repo root, or pass `--root "$(git rev-parse --show-toplevel)"`; from a subdirectory the git signals are off and `warnings` says so:

```
node "<dir>/bin/where.js" --message-file "<temp file>"
node "<dir>/bin/which.js" --phase <slug>
```

Pass the request through a file: write the user's text with your file tool to the OS temp dir (`$TMPDIR` or `/tmp`; `%TEMP%` on Windows), never inside the analysed repo, and pass `--message-file <path>`. Never put the request text on the command line, quoted or not. If `where.js` exits non-zero, or Node is missing or older than 20, report that in one line and continue by hand with the same rules; never block.

## Protocol

1. **Run** `where.js` with the request text. Add `--run-tests` only if the user asked to run the tests in the current turn; otherwise `tests.status` stays `unknown` and the evidence says so.
2. **Read** `inferred`, `evidence`, `alternatives` (`{phase, kind: fallback|candidate|new-cycle, reason}`) and `warnings`. Do not restate the decision table; it lives in `bin/lib/infer.js`. `request.type` is `complaint | bug | feature | idea | hotfix | unknown`; `unknown` means the agent judges the request type from the text.
3. **Say where the work is, in one sentence, and proceed.** Use `step` and `stage` (or the hook's `sdlc:` line): "Stage 4 of 9, Catálogo y contenido: step 3, the plan. Next: I write the plan for this stage." Never name the internal phases, the fallback, candidates or evidence to the developer. Do not ask for confirmation. Warnings (a header that disagrees with the artifacts, development without an approved spec, deployment without testing, `intent without spec: <path>` when `docs/intents/` holds a committed intent no spec names) go in the same sentence in plain words and never block. For `request.type` `hotfix`, apply the Hotfix threshold below and fall back to step 2 when it fails, saying which condition failed.
4. **Ask only for a new topic.** When `alternatives` holds a `new-cycle` entry (a complaint, bug or feature while a cycle is active), ask one plain question: keep it apart as a new cycle, or fold it into the current stage. A new cycle opens as `docs/specs/<date>-<slug>/spec.md` with its own `plan.md` and `tasks.md`; only when the active cycle is a flat spec are `tasks/plan.md` and `tasks/todo.md` shared, and then the new cycle's planning waits until the active one closes or the developer says to switch. A request card still applies to complaints (`references/request-card.md`).
5. **Missing skills are one line, not a question.** Run `which.js --phase <slug>`; when nothing in `recommends` or `alternatives` is installed, say which skill would help and how to get it (`references/missing-skill.md`), then continue. Print the skill name in the `form` that is invocable on this host.
6. **Read** `references/phases/<slug>.md` and state the next step: what the phase produces, which skill, the concrete action, where design happens. Sheets: `initial`, `analysis`, `planning`, `development`, `testing`, `deployment`. Name the plan and task files the way `signals.plan.path` and `signals.todo.path` report them (`docs/specs/<dir>/plan.md` for a folder cycle, `tasks/plan.md` for a flat one). Entry rules by request type: `references/entry-points.md`. When the active spec carries an `Intent:` line, read that file too and quote its `Desired outcome` in the next-step statement. When `signals.constitution.exists`, the evidence, when the developer asks for it, gains the line `Constitution: <path> (<n> sections)` and the next step cites the principles the phase sheet names; when it does not exist, say nothing about it (no nag). Template: `references/constitution-template.md`. When `signals.adr.exists`, the evidence block gains `ADRs: <dir> (<n> accepted, <m> proposed)` from `adr.byStatus`; when it does not exist, nothing. Template and the rule for which `## Decisions` bullets become ADRs: `references/adr-template.md`. When `signals.architecture.exists`, the evidence block gains `Architecture: <path> (<n> sections)`; when it does not exist, nothing. Template: `references/architecture-template.md`. When `signals.hygiene.missing` is not empty, the line `Repo hygiene: missing <list>` appears only on `initial`, and on `deployment` only when `signals.inProduction` is false; every other phase and a production repo say nothing (reference: `references/repo-hygiene.md`). Entry sheet for production signals: `references/maintain.md`.

## Complaints and the request card

A complaint (someone else reporting a problem) goes through `references/request-card.md` (five lines: who asks, what happens, expected, where, urgency), whether or not the project is in production. Ask for any line the user did not give; never invent it. The spec-driven-development flow turns the card into a short spec that carries the header. `inProduction` only adds the note "keep the running version safe".

## Header rule

When writing any spec in this session (full or short), prepend right after the H1:

```
Phase: analysis
Status: draft
Intent: docs/intents/<file>   (only when the cycle opens from an intent.md)
```

Specs always start in `analysis`, including the first spec of a project. `initial` has no header of its own and ends the moment the first spec exists. The vendored `spec-driven-development` is not modified; this rule lives here. Format and slugs: `references/spec-header.md`.

## Close mode

Triggered by `/sdlc-assist:phase close` or "sdlc close" by intent (also from session-closure or handoff workflows). Run the inference, ask whether the confirmed phase is finished and what it produced, then advance from the phase the user confirmed:

| Confirmed phase | Writes |
|---|---|
| initial | nothing (the spec is already `analysis`) |
| analysis | `Status: approved`, `Phase: planning` |
| planning | `Phase: development` |
| development | `Phase: testing` |
| testing | `Phase: deployment` |
| deployment | `Phase: deployment`, `Status: closed` |

Before writing the `analysis` row, run `node <script dir>/check-acceptance.js --root <root>` and read its lines for `active.path`: when it reports `N open questions`, do not write the header; list each bullet left under `## Open Questions` and ask, per bullet, whether it is answered now (the author moves it to `## Clarifications` with the date) or deferred (a dated line with an owner under `## Decisions`); close again once the section reads `(none)`. When it reports `not EARS` bullets, say so once with the line numbers and continue: the shape is recommended, not required. When `signals.adr.exists` and a `## Decisions` bullet marked `[ADR]` has no file in `adr.dir` (grep the bullet's number or slug), print one warning line per bullet and continue: it never blocks the close. The template with both sections is `references/spec-template.md`.

Staged plans: closing a stage that is not the last one writes `[x]` and the date on that stage's row or heading in the cycle's `plan.md` (for example `| 4 | **Catálogo** [x] 2026-11-02 |`) and leaves the spec header alone. Closing the last stage applies the table above. Never write an emoji; plans that carry the legacy check emoji are read as closed and left as they are.

Edit the active spec only (`active.path` in the `where.js` output), advancing from the phase the user confirmed even when its header said otherwise: when the confirmed phase is ahead of the header (closes were skipped), write the row of the confirmed phase, never the header's, so a closed spec never keeps a stale `Phase:`. When there is no spec (`active` is null), write nothing and say so. A headerless spec gets the header with the phase that follows the confirmed one. After a hotfix in the same context, update nothing and recommend the QA step. Name the next phase and its skill. Never touch CHANGELOG; that belongs to the release skill.

## Hotfix threshold

Judged by the agent from the request as described (a heuristic accepted by the owner): the requirement is unambiguous and self-contained, and it is a typo or documentation fix or a change the user describes as at most 20 lines in at most 2 files with no new dependency. Otherwise `analysis`. State which phase was skipped and which condition allowed it. A hotfix enters at `development` with no spec and no cycle and leaves no trace by design.

## Never

- Pass `--run-tests` unless the user asked in the current turn.
- Write into the user's repo beyond three categories: spec files created through the SDD flow with the header, header updates on a confirmed close, and the `[x]` and date that close a stage in `plan.md`.
- Write an emoji anywhere.
- Block a transition.
- Run `git add`, `commit`, `push`, `reset`, `checkout` or any state-changing git command. Read-only queries (`log`, `tag`, `status`) are fine.
- Initiate or execute a release; only when the user asks in the current turn, and then through the release skill.
- Install anything or create a new skill unless the developer asks after the missing-skill line.

Always: infer before asking, state which step was skipped and why, reply in the user's language.

## Hosts

Works in Claude Code, OpenCode, Codex and Cursor. If a structured question tool exists in your tool list (detect it by name, e.g. `AskUserQuestion`), use it for the new-topic question and the close-mode questions; otherwise ask in prose with the same options. The scripts are Node with zero dependencies and only read.

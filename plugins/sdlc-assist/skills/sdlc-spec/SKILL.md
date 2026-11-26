---
name: sdlc-spec
version: 0.18.0
description: Writes the spec of a piece of work on a code repository, sized to it (none for small, one feature.md for medium, spec.md for large), with the cycle folder, the Phase/Status header, clarifications and EARS acceptance. Use when the sdlc router reports step 2 (spec), when a feature, bug, complaint or idea needs a spec before code, when requirements are vague or bundle several capabilities, or when asked to write or revise a spec under docs/specs.
---

# sdlc-spec: write the spec

## Overview

Route first: when the sdlc router has not run in this context (the `sdlc` skill or its `where.js`), run it and follow its route before anything below. The `sdlc:` status line alone does not count.

The spec is the record of what the developer asked for and what was decided. It is written before code, approved by the developer, and kept: the code is not generated from it. Paths and headers below are what the router reads; a spec written anywhere else is invisible to it.

## Size

Take the size the router stated (`sdlc` skill, Size). When it stated none, judge it from the code the request touches and say it in one sentence; the developer may override it.

| Size | Writes |
|---|---|
| Small | nothing; go to implementation and say which condition made it small |
| Medium | one `feature.md` from `../sdlc/references/feature-template.md`: specs and tasks together, one approval |
| Large or ambiguous | `spec.md` from `../sdlc/references/spec-template.md`; the plan comes after its approval (`sdlc-plan`) |

## Where it goes

- Folder: `docs/specs/<YYYY-MM-DD>-<slug>/` at the repository root, today's date, a short kebab-case slug. Never a root `SPEC.md`, `tasks/`, or another tool's folder.
- Header, right after the H1, in English whatever the conversation language:

```
Phase: analysis
Status: draft
Intent: docs/intents/<file>   (only when the cycle opens from an intent.md)
```

Every new spec starts in `analysis`, the first one of a project too. Format and slugs: `../sdlc/references/spec-header.md`. Only close mode (`sdlc close`) advances the header; never write `approved` yourself.

- A complaint or bug starts from the request card (`../sdlc/references/request-card.md`); a bug runs `sdlc-debugging` first and the spec quotes its `Cause:` and `Evidence:` lines.
- When the repository has `docs/constitution.md`, `ARCHITECTURE.md` or ADRs, read them before drafting. A decision that contradicts a principle, moves a boundary, adds or removes a technology or changes a public contract carries `[ADR]` in `## Decisions` (`../sdlc/references/adr-template.md`).

## Clarify

Before writing, list what the request leaves open: who uses it, what counts as done, limits, what must not change. Ask the questions whose answers change the spec; infer the rest from the code and say what you inferred. Record each question and its answer as a dated bullet under `## Clarifications` (`- <date> — Q: ... A: ... (owner)`). A question still open goes under `## Open Questions`; close mode will not approve while that section is not `(none)`.

When one request bundles several capabilities that could be built, tested or dropped independently (their own users or data), propose a capability map first: a short table of modules, what each owns, dependency direction and build order. Write module specs (`SPEC-<module>.md` in the cycle folder) only after the developer approves the map.

## Acceptance

One bullet per observable behavior under `## Acceptance`, in EARS:

- `THE <system> SHALL <response>.`
- `WHEN <trigger>, THE <system> SHALL <response>.`
- `WHILE <state>, THE <system> SHALL <response>.`
- `IF <unwanted condition>, THEN THE <system> SHALL <response>.`
- `WHERE <feature is present>, THE <system> SHALL <response>.`

A comma ends the trigger, state or condition, exactly as in the shapes above (`WHEN x, THE ...`); no other comma goes inside it. Each bullet must be checkable by a test or a command. In a `feature.md`, each `S#` entry carries `Quote:` (the developer's words), `Outcome:` and `Check:` (fails before the change). `node <sdlc bin>/check-acceptance.js --root <repo>` reports what is missing.

## Approval

1. Show the developer the spec (path and a short summary of objective, decisions and acceptance) and ask for approval in one line.
2. A go-ahead counts as approval only of a document the developer has already seen in an earlier message. A go-ahead given before the spec existed approves nothing written after it: show the spec and say it is not yet approved.
3. On approval, close mode writes the header (`Status: approved`, then `Phase: planning`, or `Phase: development` for a `feature.md`). Then large work goes to `sdlc-plan`; medium work goes to implementation.
4. When you go ahead without an approval (allowed by the router's plan rule on some models), say so in the same message; never present unapproved work as approved.

## Never

- Write a spec outside `docs/specs/<date>-<slug>/`, or without the header.
- Write `Status: approved` without the developer's approval in this conversation.
- Write code while the spec is being drafted.
- Copy session notes, logs or "next step" lines into the spec.
- Write an emoji.

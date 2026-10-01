# Architecture template

`ARCHITECTURE.md` is the current shape of the repository: what each folder is for, where the boundaries are, how data moves. It is the document a newcomer (or an agent on its first turn) reads before the first spec. The router detects it (`ARCHITECTURE.md` at the root, or `docs/architecture.md` when the root has none), reports it as `signals.architecture` (`exists`, `path`, `sections`) and the phase sheets cite it. It is optional: without one the router says nothing. The router never writes it; the author does.

Keep it short and current. What changes often does not belong here: a decision goes to an ADR, a behavior goes to a spec. `ARCHITECTURE.md` is the current state; `docs/adr/` is how it got there.

Required: a title and at least one `## ` section. Suggested sections, each with one example line from this repository:

```markdown
# Architecture: <project>

## Overview

<Two or three sentences: what the system is, what it is not, what runs where.>

## Structure

| Folder | Purpose |
|---|---|
| `plugins/sdlc-assist/` | what ships: manifest, skills, vendored skills |
| `scripts/` | gates and git hooks for this checkout |
| `docs/` | specs, plans, ADRs, records |

## Components and boundaries

- <component>: <responsibility>; depends on <what>; never touches <what>.

## Data flow

<How a request moves through the components, in order. One paragraph or a short list.>

## Decisions

- ADR 0001: <one line>. (accepted ADRs by number; the list is the index into `docs/adr/`)
```

How the phases use it:

- **initial**: when the repo has no `ARCHITECTURE.md`, offer this template next to the constitution (optional; the first spec is what ends `initial`).
- **analysis**: read `architecture.path` before drafting; a spec that moves a boundary or changes `## Structure` says so in `## Decisions` with a `[ADR]` mark.
- **development**: a diff that changes `## Structure` or a boundary updates `ARCHITECTURE.md` in the same PR.

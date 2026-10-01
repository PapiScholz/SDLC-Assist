# ADR template

An Architecture Decision Record (ADR) is one decision that outlives the spec that made it: why the repo is shaped the way it is, written once, never edited into something else. The router detects the directory (`docs/adr/`, or `docs/decisions/` when `docs/adr/` is absent), reports it as `signals.adr` (`exists`, `dir`, `count`, `byStatus`, `latest`) and the phase sheets cite it. It is optional: without the directory the router says nothing. The router never writes an ADR; the author does.

Format is Nygard's, four sections. File name `NNNN-slug.md`, four digits, numbered in creation order; gaps are fine because an ADR is deprecated or superseded, never deleted. Only files that match the name count; a `README.md` or `template.md` in the directory is ignored.

```markdown
# NNNN. <Decision in one line>

Status: proposed
Date: <YYYY-MM-DD>

## Context

<What forced a decision: the constraint, the alternatives that were on the table, the spec that raised it.>

## Decision

<What was decided, in the present tense. One decision per file.>

## Consequences

<What becomes easier, what becomes harder, what has to be done because of it.>
```

`Status:` is one line outside code fences, one of:

| Status | Meaning |
|---|---|
| `proposed` | created in `analysis`, not yet implemented |
| `accepted` | set in the commit that implements it |
| `deprecated` | no longer applies and nothing replaces it |
| `superseded by NNNN` | replaced by another ADR; the new one's Context names this one |

`check-adr.js` warns (and never fails, unless `--strict`) on a duplicate number, a `Status:` outside this table, and a `superseded by` that names a number with no file.

## When a `## Decisions` bullet becomes an ADR

Most decisions stay in the spec's `## Decisions`. A bullet becomes an ADR, and gets the mark `[ADR]` at the start of the bullet, when it does at least one of:

- (a) contradicts or amends a constitution principle;
- (b) adds or removes a dependency, a runtime or a technology;
- (c) changes a public contract or interface (CLI flags, JSON shape, file layout other tools read).

The ADR is created as `proposed` in the same change as the spec, with the spec's path in its Context. The bullet keeps its one-line reason; the ADR carries the long form.

## How the phases use it

- **analysis**: mark the qualifying bullets with `[ADR]` and create them as `proposed`. Close mode warns on a `[ADR]` bullet with no file; it never blocks.
- **planning**: the plan references ADRs by number where a task implements one.
- **development**: an ADR goes `accepted` in the commit that implements it.
- **deployment**: ADRs still `proposed` are listed at cycle close; they are either accepted, deprecated or carried to the next cycle's spec.

`ARCHITECTURE.md` is the current state; `docs/adr/` is how it got there.

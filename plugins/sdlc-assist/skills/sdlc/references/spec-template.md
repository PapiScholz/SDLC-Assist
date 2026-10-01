# Spec template

What the router reads from a spec: the header (`spec-header.md`), `## Clarifications`, `## Open Questions` and `## Acceptance`. Body sections beyond these (tech stack, boundaries, success criteria, open design) follow the vendored `spec-driven-development` template; this file adds only what the router and the qa-gate consume. Save as `docs/specs/<date>-<slug>.md` (or, from v1.5's layout plan, `docs/specs/<date>-<slug>/spec.md`).

```markdown
# Spec: <cycle name>

Phase: analysis
Status: draft
Date: <YYYY-MM-DD>
Owner: <name>
Repo: `<owner>/<repo>` (<in production, vX.Y.Z | not yet released>)
Parent: <previous spec path, or none>

## Objective

<What changes and why, in one or two paragraphs. Number the deliverables.>

## Decisions

- <decision> — <reason, one line>

## Scope

In: <files, modules, behaviors>
Out: <what this cycle will not touch>

## Clarifications

- <YYYY-MM-DD> — Q: <question that was open> A: <answer, and who gave it when it matters>

## Open Questions

(none)

## Acceptance

- THE SYSTEM SHALL <behavior that always holds>.
- WHEN <trigger>, THE SYSTEM SHALL <response>.
- WHILE <state>, THE SYSTEM SHALL <behavior during that state>.
- IF <unwanted condition>, THEN THE SYSTEM SHALL <handling>.
- WHERE <optional feature is present>, THE SYSTEM SHALL <behavior>.

## Verification record

<Where the pasted output goes (for this repository: `docs/ci-red-runs.md`).>
```

## Rules the router applies

- **Clarifications** is the written outcome of the clarify step: every question that was open while the spec was drafted, with its answer and date. It is never emptied; a reversed answer is a new line.
- **Open Questions** must read `(none)` before `analysis` closes. Close mode lists what is left and offers two destinations per item: answered now (moves to Clarifications) or deferred (moves to `## Decisions` as a dated line with an owner). It writes neither; the author does.
- **Acceptance** holds one requirement per bullet in one of the five EARS shapes (Easy Approach to Requirements Syntax). "THE SYSTEM" may be any named component (`where.js`, THE ROUTER, the plugin directory). One sentence is one behavior; a bullet that needs interpretation is two bullets. `check-acceptance.js` prints the bullets that match no shape and the open questions left; it warns and exits 0 (`--strict` exits 1). The qa-gate's functional layer takes these bullets as its probes, one per bullet.

| Shape | Starts with | Use for |
|---|---|---|
| Ubiquitous | `THE SYSTEM SHALL` | invariants |
| Event-driven | `WHEN <trigger>, THE SYSTEM SHALL` | responses to an input or event |
| State-driven | `WHILE <state>, THE SYSTEM SHALL` | behavior that holds during a mode |
| Unwanted behavior | `IF <condition>, THEN THE SYSTEM SHALL` | errors, limits, abuse; the shape agents forget |
| Optional feature | `WHERE <feature>, THE SYSTEM SHALL` | behavior present only with a feature or config |

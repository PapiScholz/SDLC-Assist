# Spec header

A cycle is a spec file: `docs/specs/<date>-<slug>/spec.md` (its `plan.md` and `tasks.md` live beside it), a flat `docs/specs/*.md`, root `spec.md`, or root `SPEC-*.md` (flat and root specs share `tasks/plan.md` and `tasks/todo.md`). A folder under `docs/specs/` is also a cycle when it holds a capability map (`MAPA.md`, `MAP.md` or `CAPABILITY-MAP.md`) or `SPEC-*.md` module specs: its header lives in `spec.md`, else the map, else the first `SPEC-*.md`, and the other `SPEC-*.md` are modules. A folder holding `feature.md` and no `spec.md` is a feature cycle (medium work): the header lives in `feature.md`, which is also its plan and task list. File names match in any case (`PLAN.md`, `TASKS.md`). A folder with only a plan or notes is not a cycle. Spec-like files elsewhere under `docs/` (`docs/spec-x.md`) are reported as orphans and lower the router's confidence when newer than the active cycle; they are never cycles.

## Format

```
# Title

Phase: <slug>
Status: draft | approved | closed
Intent: docs/intents/<file>   (only when the cycle opens from an intent.md)
```

- The header is the first three lines under the H1: `Phase:`, `Status:`, then the optional `Intent:`. `header.js` reads only the first 15 lines after the frontmatter, so nothing goes above them.
- Placed immediately after the H1 (or at the top when there is no H1), within the first 15 lines after any YAML frontmatter.
- First token after the colon, case-insensitive; the rest of the line is ignored.
- Slugs: `initial`, `analysis`, `planning`, `development`, `testing`, `deployment`.
- A spec without `Status:` counts as `draft`.
- Reading is wider than writing (ADR 0008): `Estado:`/`Fase:` count as `Status:`/`Phase:`, also inside a `>` quote, after a `·` separator or after a sentence; values are matched on their first word with accents removed (`aprobada`/`accepted` approved, `implementado`/`implemented`/`done` closed, `borrador`/`sin empezar` draft; `Phase: plan`, `specification`, `done`). An unrecognised value is skipped. An approved status whose own text says it was done (`aprobada (...) e implementada`) reads as closed; `sin implementar` and `no implementado` do not. A flat spec may name its plan (`Plan: docs/plans/x.md`); that file is then its plan and task list. Write only the English form above.
- Specs always start with `Phase: analysis` / `Status: draft`, including the first spec of a project. `initial` is a phase without a header: it ends the moment the first spec exists.

## Close-mode transitions

Close mode runs the inference, uses the phase the user confirmed, and advances from it. The agent writes the header with its edit tool; the scripts only read.

| Confirmed phase | Writes |
|---|---|
| initial | nothing (the produced spec already reads `Phase: analysis`) |
| analysis | `Status: approved`, `Phase: planning`; only when `## Open Questions` reads `(none)` (see `spec-template.md`). A feature cycle writes `Phase: development` instead: its tasks are its plan |
| planning | `Phase: development` |
| development | `Phase: testing` |
| testing | `Phase: deployment` |
| deployment | `Phase: deployment`, `Status: closed` |

A headerless spec gets the header with the phase that follows the confirmed one. Close mode never touches CHANGELOG; that belongs to the release skill.

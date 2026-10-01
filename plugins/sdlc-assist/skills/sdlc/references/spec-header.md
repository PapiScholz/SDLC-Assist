# Spec header

A cycle is a spec file: `docs/specs/*.md`, root `spec.md`, or root `SPEC-*.md`.

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
- Specs always start with `Phase: analysis` / `Status: draft`, including the first spec of a project. `initial` is a phase without a header: it ends the moment the first spec exists.

## Close-mode transitions

Close mode runs the inference, uses the phase the user confirmed, and advances from it. The agent writes the header with its edit tool; the scripts only read.

| Confirmed phase | Writes |
|---|---|
| initial | nothing (the produced spec already reads `Phase: analysis`) |
| analysis | `Status: approved`, `Phase: planning`; only when `## Open Questions` reads `(none)` (see `spec-template.md`) |
| planning | `Phase: development` |
| development | `Phase: testing` |
| testing | `Phase: deployment` |
| deployment | `Phase: deployment`, `Status: closed` |

A headerless spec gets the header with the phase that follows the confirmed one. Close mode never touches CHANGELOG; that belongs to the release skill.

# Feature template

For medium work (`SKILL.md`, Size): authorized and understood, not resumable from the request plus `git diff` alone, with no architectural decision open. One file holds the specs, the decisions and the tasks; it is approved once and goes straight to development. Save as `docs/specs/<date>-<slug>/feature.md`, with no `spec.md`, `plan.md` or `tasks.md` beside it. Session state (what is half-done, environment traps) does not go here: it belongs to the project's handoff file when there is one.

```markdown
# Feature: <name>

Phase: analysis
Status: draft
Date: <YYYY-MM-DD>
Owner: <name>

## Objective

<What changes and for whom, in one or two lines.>

## Specs

S1. <short name>
   Quote: "<the developer's exact words that asked for it>"
   Outcome: <observable behavior once done: what a user, a test or a command sees>
   Check: <command or test that fails before the change and passes after>

S2. <short name>
   Quote: "..."
   Outcome: ...
   Check: ...

## Decisions

- <decision> — <reason, one line>; mark `[ADR]` when it amends a principle, adds a technology or changes a public contract

## Open Questions

(none)

## Tasks

- [ ] T1 <first task, small and verifiable>
- [ ] T2 <...>
```

## Rules

- **Quote** is literal. It keeps the agent on what was asked; if the words are ambiguous, the question goes under `## Open Questions` and the quote stays as said.
- **Outcome** is behavior someone can observe, not an implementation ("the export button downloads a CSV with `;` separators", not "add a CsvWriter class").
- **Check** fails today. Write it first when it is a test (TDD); when it is a manual probe, state the exact steps and the expected result.
- **Tasks** close with their proof on the same line: `- [x] T2 <text> — evidence: <command, test or file>`. The separator before `evidence:` (`—`, `–`, `-`, `--`, `;` or `|`) and something after it are required: the word inside the task's text, or an empty `evidence:`, is not a proof. `check-evidence.js` lists the ticks without one; it warns and never blocks.
- **Specs shape**: `check-acceptance.js` reads entries that start `S1.` (or `S1)`); fields count plain, bulleted or bold, on the entry line or below it. A `## Specs` with text but no such entry warns.
- `check-acceptance.js` reports each `S#` entry missing `Quote:`, `Outcome:` or `Check:`, and the open questions left, before close mode approves the file.
- **Close mode** on `analysis` writes `Status: approved` and `Phase: development`; there is no planning step. From there the phases are the same as any cycle.
- **Growing out of it.** When a decision turns architectural or the tasks outgrow one file, write `spec.md` beside it from this content and continue as a large cycle; the folder's record becomes `spec.md`.

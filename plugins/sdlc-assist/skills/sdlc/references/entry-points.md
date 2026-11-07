# Entry points by request type

| Request | Enters at | Notes | Artifact |
|---|---|---|---|
| New idea, no source files | `initial` | First spec. | `intent.md` |
| New idea on existing code | `analysis` | New cycle. | `intent.md` |
| Complaint, bug or feature | `analysis` | Complaints (someone else reporting a problem) go through the request card (`request-card.md`) whether or not the project is in production. `inProduction` only adds the note "keep the running version safe". | `request card` |
| Production signal (alert, finding, ticket) | `analysis` as a new cycle | Through `maintain.md`: writes an `intent.md` first. | `intent.md` |
| Small work (hotfix, typo, contained change) | `development` | No spec and no cycle. | `none` |
| Medium work | `analysis` | One `feature.md`, one approval, then `development`. | `feature.md` |
| Question, investigation, review, proposal | none | Read-only: answers, writes nothing. | `none` |

## Size

The three sizes and their conditions live in `SKILL.md` (Size): small when it could be resumed from the request plus `git diff`, medium when it needs a written record but no open architectural decision, large or ambiguous otherwise. File and line counts never decide. State the size and which condition set it; the developer may override it.

Close mode in the same context after small work updates nothing and recommends the QA step; in a later context small work leaves no trace by design.

## Transitions

None are blocked. Development without an approved spec, or deployment without testing, produce a warning in the status sentence, in plain words. A header that disagrees with the fallback evidence is also a warning, never silently resolved.

## Staged plans

A plan with two or more stages (a table under a Stages/Etapas/Phases/Fases heading, or one `Stage|Etapa|Phase|Fase N` heading per stage) is read per stage once a stage is closed with `[x]` or `tasks.md` names its stage in its H1 (`# Etapa 3 — ...`). Then: open tasks, build that stage; all done and the stage not closed, test it; the stage closed and others open, plan the next open one. Task checkboxes under a stage heading never close it.

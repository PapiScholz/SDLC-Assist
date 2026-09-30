# Entry points by request type

| Request | Enters at | Notes | Artifact |
|---|---|---|---|
| New idea, no source files | `initial` | First spec. | `intent.md` |
| New idea on existing code | `analysis` | New cycle. | `intent.md` |
| Complaint, bug or feature | `analysis` | Complaints (someone else reporting a problem) go through the request card (`request-card.md`) whether or not the project is in production. `inProduction` only adds the note "keep the running version safe". | `request card` |
| Production signal (alert, finding, ticket) | `analysis` as a new cycle | Through `maintain.md`: writes an `intent.md` first. | `intent.md` |
| Hotfix | `development` | No spec and no cycle. | `none` |

## Hotfix threshold

Judged by the agent from the request as described (a heuristic accepted by the owner): the requirement is unambiguous and self-contained, and it is a typo or documentation fix or a change the user describes as at most 20 lines in at most 2 files with no new dependency. Otherwise `analysis`.

State which phase was skipped and which condition allowed it. Close mode in the same context after a hotfix updates nothing and recommends the QA step; in a later context a hotfix leaves no trace by design.

## Transitions

None are blocked. Development without an approved spec, or deployment without testing, produce a warning line with the evidence inside the confirmation question. A header that disagrees with the fallback evidence is also a warning, never silently resolved.

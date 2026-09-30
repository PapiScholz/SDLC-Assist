# intent.md

The artifact that opens a cycle for an idea or a feature (Plan stage). Written in the originator's own words; the agent asks and transcribes, it does not rewrite. Complaints and bugs use the request card instead (`request-card.md`).

Path by convention: `docs/intents/<YYYY-MM-DD>-<slug>.md`, committed. Ask before creating `docs/intents/` in a repo that has none.

## Template

```
# Intent: <one line>

Who:              <originator, role>
Problem:          <what hurts today, in the originator's words>
Desired outcome:  <what is true when this is done>
Constraints:      <policy, deadline, budget, systems that must not change>
Open questions:   <what the originator does not know yet>
```

## Rules

- No `Phase:` header: an intent is not a cycle. The spec that consumes it carries `Intent: <path>` right under its `Status:` line (`spec-header.md`).
- The originator corrects the intent; the agent does not restate it in its own words.
- An intent committed with no spec naming it is a warning in the `sdlc` question ("intent without spec: <path>"), found with the read-only `git ls-files docs/intents` and a grep for `Intent:` in `docs/specs/`.
- A production signal (alert, scan finding, ticket) becomes an intent through `maintain.md`.

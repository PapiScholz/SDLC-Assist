# Plan 4/4 — Constitution: detected, cited, never required

Spec: `docs/specs/2026-09-30-v1-5-sdd-alignment.md` (deliverable 5). PR 4 of v1.5. Branch `v1.5-constitution`. Bump marker: `[minor]`.

## Why

Spec Kit's first step is a constitution: the handful of rules every spec, plan and implementation in the project obeys (testing policy, what never changes, how releases happen). This repo has those rules, scattered through `CLAUDE.md`, and the router never reads them. A constitution the router detects and the sheets cite gives every cycle the same first input without blocking anyone who does not have one.

## Shape

`docs/constitution.md`, Markdown, short. Required: a title and at least one `## ` section. Suggested sections in the template: `## Principles` (3 to 7 one-line rules, each testable or at least checkable in review), `## Never` (hard limits), `## Testing`, `## Release`, `## Amendments` (date, what changed, why). Alternate location accepted: root `CONSTITUTION.md`. Not a `CLAUDE.md` replacement: `CLAUDE.md` is agent working rules for this checkout; the constitution is product rules that outlive any tool.

## Tasks

1. **Signal, test first.** `lib/signals.js`: `constitution: { exists, path, sections: [...] }` with `path` one of `docs/constitution.md` or `CONSTITUTION.md` (first found), `sections` the `## ` headings. `signals.self-test.js`: absent → `exists: false`; present in `docs/` → path and sections; root variant found when `docs/` is missing. `where.js` output already serializes `signals`, so nothing else changes there; `where.self-test.js` gets one assertion on the field.
2. **Template.** New `plugins/sdlc-assist/skills/sdlc/references/constitution-template.md` with the sections above, each with one example line taken from this repository's rules (spec first, gates before commit, vendored intact, pasted records, every push to main releases).
3. **Sheets cite it.** `references/phases/analysis.md` `Do now:`: "read `constitution.path` when `constitution.exists`; a spec that contradicts a principle names the amendment in `## Decisions`". `references/phases/planning.md` and `development.md` `Governance:`: the plan and the implementation are checked against the principles; the qa-gate's regression layer lists the principles it could check. `references/phases/initial.md`: offer the template as the first artifact when the repo has none ("optional; the first spec is the one that ends `initial`"). `check-sheets.js` must still pass (it validates frontmatter and labels, not body text; confirm).
4. **Router protocol.** `SKILL.md` step 6: when `constitution.exists`, the one question's evidence block gains a line `Constitution: <path> (<n> sections)`; when it does not, nothing is said (no nag). Close mode is unchanged.
5. **qa-gate.** `sdlc-qa-gate/SKILL.md` regression row: "principles from `docs/constitution.md` that have a check (a gate, a test, a lint) are run; the rest are listed as not verified". `check-skill-sections.js` still passes.
6. **Dogfood: this repository's constitution.** Write `docs/constitution.md` from `CLAUDE.md`: Principles (spec first; dogfood first; records are pasted output; bump markers, not prefixes; gates before any commit), Never (edit vendored skills here; push to `main` without a release intent or `[skip release]`; co-authorship trailers), Testing (gates list, install-smoke), Release (every push to `main` publishes; version sources), Amendments (2026-09-30, created from `CLAUDE.md`). `CLAUDE.md` keeps the agent-specific rules and opens with one line: "Product rules live in `docs/constitution.md`; this file is how agents work in this checkout." Remove from `CLAUDE.md` only what moved verbatim; keep anything that is tooling behavior.
7. **Docs.** `README.md` "How to use": step 0 "optional: a constitution, template in `references/constitution-template.md`, read by every phase". `docs/sdlc-flow.md`: the constitution as an input to the cycle diagram (one node, dashed). `plugins/sdlc-assist/README.md`: no change (it stays short).
8. **Dogfood record.** `docs/ci-red-runs.md` "v1.5 dogfood (d)": `where.js` on this repo before and after `docs/constitution.md` exists, showing the `constitution` field flip; the router's question block with the `Constitution:` line.

## Files

- new: `docs/constitution.md`, `plugins/sdlc-assist/skills/sdlc/references/constitution-template.md`
- edit (under `plugins/sdlc-assist/skills/sdlc/`): `bin/lib/signals.js`, `bin/lib/signals.self-test.js`, `bin/where.self-test.js`, `SKILL.md`, `references/phases/{initial,analysis,planning,development}.md`
- edit: `plugins/sdlc-assist/skills/sdlc-qa-gate/SKILL.md`, `CLAUDE.md`, `README.md`, `docs/sdlc-flow.md`, `docs/ci-red-runs.md`

## Verification

```
bash scripts/gates.sh                                                  # all gates ok
node plugins/sdlc-assist/skills/sdlc/bin/where.js --message "where are we" | grep -A3 '"constitution"'
# expect: "exists": true, "path": "docs/constitution.md", sections listed
node plugins/sdlc-assist/skills/sdlc/bin/check-sheets.js              # ok after the sheet edits
node plugins/sdlc-assist/skills/sdlc/bin/check-skill-sections.js      # ok after the qa-gate edit
```

Behavioral: on a scratch repo without a constitution, the router's question has no `Constitution:` line; after copying the template in, it has one. The Mermaid in `docs/sdlc-flow.md` renders (validate with the Mermaid MCP as in v1.3, reading `valid` from the saved output).

## Done when

The signal exists and is tested; the template ships; four sheets and the qa-gate cite it; this repo has its constitution and `CLAUDE.md` links it; README and flow diagram mention it; dogfood pasted; PR merged with `[minor]`.

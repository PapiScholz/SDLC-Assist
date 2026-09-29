# sdlc: SDLC phase router skill

## Problem Statement
How might we make an agent know which phase of the life cycle a work request is in before it touches code, without the developer having to remember to ask?

## Recommended Direction
The cycle lives in artifacts that already exist, not in a separate state file. A five-line request card is the entry door for complaints and requests on production software. The spec that spec-driven-development already writes carries two header lines, `Phase:` and `Status:`, which become the only persisted state. A close mode asks whether the phase finished, updates that header, and names the next phase and its skill.

A zero-dependency script collects signals (spec header first; git, todo checkboxes and test runner as fallback) and the skill infers the phase from an ordered decision table, shows the evidence, asks one confirmation question, and recommends the next step. Nothing is blocked; warnings only. The five MIT skills of the SDD family ship inside the repo with a vendor-sync check so the router always has something to route to. Own phase skills for debugging, QA and release come in v1.1; until then the missing-skill protocol asks the user to install, create, or continue without them.

## Key Assumptions to Validate
- [ ] Developers who never call the command still end up with `Phase:` in their specs, because `sdlc` injects the header when it invokes SDD. Test: fixture without the header must still infer via fallback.
- [ ] Five lines are enough to turn a real complaint into a short spec. Test: two real Almacén complaints through the request card.
- [ ] Vendoring five skills with a pinned commit does not rot. Test: `sync-vendored --check` in CI.
- [ ] Repos that do not use `tasks/` do not get a wrong phase. Test: fixture with no SDD artifacts must report "no artifacts found", not a phase.

## MVP Scope (v1)
In: `SKILL.md`, `where.js` + self-test with four fixtures, six phase sheets, entry-points, request card, spec header, missing-skill protocol, close mode, five vendored skills with sync, plugin + marketplace + OpenCode command, README with three install paths, CI.
Out: own phase skills, hooks, persisted state beyond the header, maintenance reminders, parallel work tracking.

## Not Doing (and Why)
- Automatic per-turn hook: Claude Code only; breaks the portability requirement. Possible later as an optional layer.
- Own skills `sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release` in v1: 40% of the writing effort for phases the missing-skill protocol already covers. v1.1.
- Blocking transitions: owner chose warn-only; a blocked hotfix is worse than a warned one.
- State file in the repo: owner chose stateless; the spec header gives the same benefit without a new file.
- Running the test suite by default: cost and side effects vary per repo; opt-in flag only.

## Open Questions
- Which phase sheet owns the "hotfix under threshold" path: Analysis (says "skipped") or Development (says "entered directly")? Proposal: Development, with the skip stated aloud.
- Does `sdlc close` also append a line to CHANGELOG when closing Deployment, or leave that to the release skill? Proposal: leave it to the release skill.

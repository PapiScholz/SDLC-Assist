# Tasks: router entry and autonomous topics

Spec: `spec.md`. Plan: `plan.md`. Branch `router-entry`, one PR, `[minor]`. A task is ticked when its self-tests were seen red first and `bash scripts/gates.sh` is green; the tick carries `evidence:`.

- [x] 1 Probe a real `PreToolUse` `Skill` payload and whether `additionalContext` reaches the agent; record it — evidence: `docs/ci-red-runs.md` "Task 1: probe"; field `tool_input.skill`, context reached the agent with no decision
- [x] 2 `brief.js`: new-topic text carries the route, low confidence keeps the marker; self-tests first — evidence: `node lib/brief.self-test.js` 18 passed (2 new seen red)
- [x] 3 `sdlc-status.js` + `hooks.json`: `Skill` event, family set, JSON context once per session; self-tests first — evidence: `node hooks/sdlc-status.self-test.js` 17 passed (5 new seen red); live PreToolUse call in `docs/ci-red-runs.md`
- [x] 4 Size rule eval: owner-labeled real requests, fresh agent, table in `docs/ci-red-runs.md` — evidence: `docs/ci-red-runs.md` "Task 4: Size rule eval": FAIL, 2 of 12 sized smaller; brake keeps asking on Opus/Fable
- [x] 5a `SKILL.md` step 5 decide-and-announce, own skills route first, phase sheets — evidence: `gates.sh` all ok (check-skill-sections); SKILL.md 2568 words
- [x] 5b Plan brake decides by size (only if 4 passed); self-tests first — evidence: eval failed, so no change for Opus/Fable; Decision 9 added to SKILL.md step 4 (Sonnet/Haiku plan and wait); `gates.sh` all ok
- [x] 6 ADR 0010, `docs/sdlc-flow.md`, README, `SKILL.md` size before and after — evidence: `docs/adr/0010-route-without-asking.md`; `docs/sdlc-flow.md`, README; SKILL.md 2563 words (2569 at v0.15.0)
- [x] 7a Gates, Almacén replay in a scratch repo, records in `docs/ci-red-runs.md` — evidence: `docs/ci-red-runs.md` "Task 5b and 7a": run 3 announced before the first edit; `gates.sh` all ok
- [x] 7c Classifier: voseo imperatives for removals and fixes (Decision 11); self-tests first — evidence: `node lib/keywords.self-test.js` 44 passed (6 new seen red)
- [x] 7b Commit (`[minor]`), push and PR with the owner's verb — evidence: PR #28 merged (767e065), v0.16.0 released 2026-11-11, plugin 0.16.0 installed

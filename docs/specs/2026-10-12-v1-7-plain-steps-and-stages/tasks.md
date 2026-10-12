# Tasks — v1.7 four plain steps, staged plans, and a router that runs on its own

Spec: `spec.md`. Plan: `plan.md`. One branch (`v1-7-plain-steps-and-stages`), one PR, `[minor]` → v0.12.0. A task is ticked when its gates are green.

- [x] 1 `lib/stages.js`: parse stages (table or headings), `[x]` or legacy marker closes, `stageOfTasks` from the H1; self-test first
- [x] 2 `stages` signal for the active cycle in `signals.js`; self-test cases first
- [x] 3 `lib/steps.js` and the staged view in `infer.js` (`step`, `stage`, no header warning in staged mode, single-pass plans unchanged); self-test cases first
- [x] 4 `lib/brief.js` and `where.js --brief`; JSON keeps v0.11.1 fields; self-tests first
- [x] 5 Hook: `hooks/hooks.json`, `hooks/sdlc-status.js` (silent, exit 0, subdirectory, new-topic note); self-test; gates loop and `CONTRIBUTING.md`
- [x] 6 `SKILL.md` (description, overview, protocol without the default question, close mode for a stage, Never), six sheets with a Step line, `entry-points.md`, `plugin.json`; doc gates green
- [x] 7 Both READMEs, `docs/sdlc-flow.md` loop, install-smoke staged repo
- [ ] 8 Dogfood on Sr-Lievito, NANDI, Almacén and the hook in a real session; record in `docs/ci-red-runs.md`; commit and PR with the owner's verb

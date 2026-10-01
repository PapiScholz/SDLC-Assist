# Tasks — v1.6 repo artifacts the router detects and cites

Spec: `spec.md`. Plan: `plan.md`. One PR per plan; a task is ticked when its PR is merged.

## Step 0 — open the cycle (`v1.6-spec`, docs-only, `[skip release]`)
- [x] 0.1 Folder spec, plan, tasks; pointers in `tasks/plan.md` and `tasks/todo.md`; README roadmap names v1.6
- [x] 0.2 Dogfood (a) pasted in `docs/ci-red-runs.md` "v1.6 dogfood"; PR merged; `sdlc close` on analysis → `Status: approved`, `Phase: planning`

## Plan A — ADRs (`v1.6-adr`, `[minor]` → v0.9.0)
- [x] A.1 `findAdrs(root)` signal, self-test cases first (no dir, two ADRs, decisions fallback, precedence, ignored name, superseded)
- [x] A.2 `references/adr-template.md` (Nygard, naming, Status values, when a bullet becomes an ADR)
- [x] A.3 Sheets: analysis, planning, development, deployment mention ADRs; `check-sheets.js` green
- [x] A.4 `SKILL.md` step 6 line; close mode on analysis warns on `[ADR]` without file
- [x] A.5 `check-adr.js` + self-test; `gates.sh` advisory line; `CONTRIBUTING.md` gate list
- [x] A.6 Five retroactive ADRs in `docs/adr/`; constitution amendment line; install-smoke assertions; dogfood (b)

## Plan B — ARCHITECTURE.md (`v1.6-architecture`, `[minor]` → v0.10.0)
- [x] B.1 `findDoc(root, paths)` shared by constitution and architecture; self-test cases first
- [x] B.2 `references/architecture-template.md`
- [x] B.3 Sheets: initial offers it, analysis reads it, development keeps it current
- [x] B.4 `SKILL.md` step 6 line
- [x] B.5 This repo's `ARCHITECTURE.md`; install-smoke assertion; dogfood (c)

## Plan C — repo hygiene (`v1.6-hygiene`, `[minor]` → v0.11.0)
- [x] C.1 `hygiene` signal over the closed list of nine; self-test cases first
- [x] C.2 `references/repo-hygiene.md` (why + canonical source per file; item 14 line)
- [x] C.3 Sheets: initial lists missing, deployment warns when `!inProduction`; no other sheet
- [x] C.4 `SKILL.md` step 6 line in initial and deployment only
- [x] C.5 This repo's `.editorconfig`; `hygiene.missing` empty; install-smoke assertions
- [x] C.6 `docs/sdlc-flow.md` dashed node (Mermaid validated); README day-one step and ADR mention

## Close (`v1.6-close`, docs-only, `[skip release]`)
- [ ] Z.1 qa-gate table in `## Verification record`; header `Phase: deployment` / `Status: closed`; dogfood (d); reinstall `~/.agents/skills`; handoff and memory updated

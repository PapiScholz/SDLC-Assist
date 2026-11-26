# Visible cycle, single door, cold review: implementation plan

> Read `spec.md` beside this file first. Commits, pushes and PRs need the owner's explicit verb in the current turn
> (`CLAUDE.md`); never add co-authorship trailers.

**Spec:** [`spec.md`](spec.md). One branch and one PR per stage, each with `[minor]` in a branch commit; the owner
approves each stage's tasks before they start (spec, Clarifications: one cycle, three stages delivered apart).

## Global constraints

- Nothing blocks (spec Decision 1): no `permissionDecision` `deny` or `ask`, no exit 2, no new hook event.
- Node, zero dependencies. Every change in `bin/` or `hooks/` ships its cases in the existing `*.self-test.js`,
  written **before** the code and seen red; the red run is pasted in `docs/ci-red-runs.md`.
- `incremental-implementation` and `test-driven-development` stay vendored and untouched. LF, UTF-8 without BOM.
  `bash scripts/gates.sh` green before each commit.
- `sdlc/SKILL.md` does not grow over the cycle (Decision 12): 2563 words at v0.16.1; measured at the end of each stage.
- Every claim about Claude Code behavior is probed in the owner's desktop app or quoted from the official docs, never
  assumed (the `statusLine` was assumed and did not run there).

## Stages

### Stage 1: status on demand (#35) [x] 2026-11-26

1. **Probe the command expansion (fail fast).** A scratch plugin command (scratchpad, loaded with `--plugin-dir`,
   never the owner's settings) whose body runs `node` through the command file's `!` shell expansion with
   `${CLAUDE_PLUGIN_ROOT}` in the path, and `allowed-tools` limited to that command. Run it in the desktop app and in
   `claude -p`. Records: whether the expansion ran, whether `${CLAUDE_PLUGIN_ROOT}` resolved, whether the `sdlc` skill
   was loaded. If the expansion does not run in the desktop app, stage 1 stops and the owner chooses (fallback: the
   command tells the agent to run `where.js --status` with the Bash tool and paste its output).
2. **`where.js --status`.** A third output mode beside JSON and `--brief`, built from the same `infer` result: a
   fenced block of at most eight lines (cycle folder, spec path and `Phase`/`Status`, plan and tasks present or not,
   stage `n of m` and its name, next open task, tasks done over total, warnings in one line). No active cycle: one
   line. Outside git: one line, exit 0. Git deadline hit: one line saying the status is incomplete. Repo text passes
   through `brief.js`'s `safe()`. Tests first in `where.self-test.js`: one fixture per acceptance bullet of stage 1.
3. **`commands/status.md`.** Runs `where.js --status` through the expansion task 1 proved and tells the agent to reply
   with the block verbatim and nothing else. `commands/phase.md` unchanged. Plugin README: one paragraph.
4. **Record and gates.** `/sdlc-assist:status` run in the owner's desktop app on this repository, pasted in
   `docs/ci-red-runs.md`; `gates.sh` green; `SKILL.md` word count.

### Stage 2: own spec and plan skills (#34, the `Read` door of #35) [x] 2026-11-26

5. **`sdlc-spec`.** `plugins/sdlc-assist/skills/sdlc-spec/SKILL.md`, written fresh (Decision 4), `version:` line like
   the other own skills. First line: route through `sdlc` when it has not run in this context (same sentence as
   `sdlc-qa-gate`). Body: size check (small skips the spec; medium writes `feature.md` from
   `references/feature-template.md`; large writes `spec.md` from `references/spec-template.md`), the header, the
   clarify step and its `## Clarifications`, EARS acceptance, capability map for several independent capabilities,
   and the approval rule of Decision 6. Target under 6 KB.
6. **`sdlc-plan`.** Same shape: route first; `plan.md` and `tasks.md` beside the spec (flat specs keep `tasks/`);
   never overwrite another cycle's open tasks; stages as `### Stage n: name` headings that `lib/stages.js` reads;
   tasks with acceptance and a verification line; approval rule of Decision 6. Target under 6 KB.
7. **Remove three vendored copies.** `spec-driven-development`, `planning-and-task-breakdown`, `context-engineering`:
   directories, `NAMES` in `sync-vendored.js`, its self-test fixture (moves to `incremental-implementation`). Tests
   first: `sync-vendored.js --check` with the shorter list passes and a leftover directory is reported.
8. **Rewire names.** Phase sheets (`initial`, `analysis` → `sdlc-spec`; `planning` → `sdlc-plan`; `development` →
   `[superpowers:test-driven-development, incremental-implementation, test-driven-development]`), `check-sheets.js`
   known list and self-test, `which.self-test.js` (the TDD order with and without superpowers in a scratch home,
   test first), `sdlc-status.js` `FAMILY` and self-test, `sdlc/SKILL.md` (the "vendored `spec-driven-development` is
   not modified; this rule lives here" lines move into `sdlc-spec`), `sdlc-debugging/SKILL.md`, references
   (`missing-skill.md`, `request-card.md`, `spec-template.md`), `.github/scripts/release.sh` (own-skill list and
   `git add`), constitution (vendored list, version sources), CI install-smoke (`sdlc-spec` replaces
   `spec-driven-development`), `plugin.json`, `marketplace.json`, both READMEs, `docs/distribution.md`,
   `ARCHITECTURE.md`, `docs/sdlc-flow.md`. Closed specs and `CHANGELOG.md` keep the old names.
9. **ADR 0011** (Decisions 3 and 4): own spec and plan skills, `addyosmani/agent-skills` credited as origin.
10. **Replay #35 and gates.** Scratch repo with a cycle: an agent told to open `sdlc-spec/SKILL.md` with `Read` and
    write a spec; pasted excerpt shows it ran the router and wrote the header and the cycle path. `grep -rn` of the
    three removed names outside closed specs and `CHANGELOG.md` prints nothing. `gates.sh` green; `SKILL.md` words.

### Stage 3: cold review, offered (#30) [x] 2026-11-26

11. **Probe plugin agents (fail fast).** A scratch plugin with `agents/probe.md` declaring `tools: Read, Grep, Glob`
    and `omitClaudeMd: true`: confirm in the official docs and by a run that it loads, cannot write, and does not see
    `CLAUDE.md`. If `omitClaudeMd` is not honored, the reviewer prompt says to ignore project rules and the record
    says the isolation is partial.
12. **Seeded fixture, red first.** `plugins/sdlc-assist/skills/sdlc-spec/references/review-fixture/` (or the test
    tree): a `feature.md` with an undefined project term, a file cited as existing that does not exist, and a task
    that leaves a design decision open. Run with no reviewer: recorded as not found.
13. **Reviewer agents.** `plugins/sdlc-assist/agents/`: `comprehension` (paraphrase first, then gaps), `code-check`
    (claims about current behavior against the code; proposed files are not findings), `design` (risks, rejected
    alternatives, YAGNI, reuse), `readiness` (no design decision left to the implementer, `Create`/`Modify`/`Delete`
    marks, a check per task). Profiles in this repository's words (#30, licence note). Severity Blocker, Major, Nit.
14. **The offer and the loop.** `sdlc-spec` and `sdlc-plan` gain one step before asking for approval: offer the
    review in one line; on yes, run the reviewers of Decision 8 for the size, retry a silent one once then report it
    "not run", resolve findings with the four labels of Decision 11, up to three rounds for large stopping at the
    first clean one. No subagents: say the review did not run. Nothing written to the repository.
15. **ADR 0012** (Decisions 7 and 8), README, `docs/sdlc-flow.md`.
16. **Fixture green, cost measured, gates.** The fixture reviewed with the reviewers: each seeded gap found. The
    tokens of one medium review read from the subagent's usage and pasted. `gates.sh` green; `SKILL.md` words.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `!` expansion does not run in the desktop app | Stage 1 shape | Task 1 probes first; fallback named there |
| The agent paraphrases the status block instead of pasting it | The owner sees a retelling | Command says verbatim; the record shows a real run |
| Removing three skills breaks someone who invokes them by name | Old name not found | Release notes name the new skills; minor bump |
| `omitClaudeMd` not honored | Reviewer sees project rules | Task 11 probes; partial isolation is recorded, not hidden |
| Reviewer cost is high | Tokens per review | Offered only (Clarifications); task 16 measures it |

## Open questions

(none)

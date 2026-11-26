# Spec: visible cycle, single door, cold review (issues #35, #34, #30)

Phase: development
Status: approved
Date: 2026-11-26
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.16.1)
Parent: `docs/specs/2026-11-11-router-entry-and-autonomous-topics/spec.md`

## Objective

Issue #35 (2026-11-26): the agent opened the vendored `spec-driven-development/SKILL.md` with `Read`, wrote a spec
with no header, turned a go-ahead given before any plan existed into an approval, wrote `plan.md` and `tasks.md`, set
its own header to `Phase: development` and edited code in another repository. The owner found out only by asking.
Cycle #27 already added the route at the `Skill` door; a `Read` of the file goes around it, and the vendored skill,
read alone, sends the plan to `tasks/plan.md` and never mentions the router or the header.

The owner's constraints, in their words (2026-11-26):

- No more hooks that stop the agent: "estoy harto de tus hooks". Stopping is not the goal.
- Visibility is the goal: "al menos yo tengo que saber si hizo o no un plan, si hizo o no un spec, en dónde está, qué
  es lo que se encuentra haciendo".
- Going ahead without asking is acceptable sometimes; ignoring the skill is not: "el problema es que no lea la skill
  y no obedezca la skill".

Issue #34: with `superpowers` installed, the listing carries two skills per job. Checked on 2026-11-26: the two
spec/plan pairs save where the router does not look.

| Step | Vendored skill saves to | superpowers saves to | The router reads |
|---|---|---|---|
| Spec | `SPEC.md` at the root | `docs/superpowers/specs/` | `docs/specs/<cycle>/spec.md` |
| Plan | `tasks/plan.md`, `tasks/todo.md` | `docs/superpowers/plans/` | `docs/specs/<cycle>/plan.md`, `tasks.md` |

Issue #30: the agent that writes the spec and the plan is the one that reviews them before asking for approval; a
reader with none of the conversation finds what the author takes for granted.

Deliverables, one stage each:

1. **Status on demand (#35).** A command, `/sdlc-assist:status`, that shows the developer the active cycle's folder,
   whether its spec and plan exist and their status, the stage, the next open task and the tasks done over total. A
   script computes the block from files and git like the router; the command does not load the `sdlc` skill.
2. **Own spec and plan skills (#34, and the `Read` door of #35).** Two own skills replace the vendored
   `spec-driven-development` and `planning-and-task-breakdown`. Their first line routes through `sdlc`; they carry the
   header rule, the cycle paths and the rule that an approval counts only for an artifact the developer has seen. The
   development phase names `superpowers:test-driven-development` when it is installed and the bundled copy otherwise.
3. **Cold review (#30).** Before the agent asks for an approval, reviewers with no conversation read the spec or the
   plan and report findings in the chat. The agent offers the review and runs it only when the developer accepts, in
   medium and large work alike: the developer pays for it only when asking for it. Nothing blocks.

## Decisions

1. **No new blocking.** No `permissionDecision` `deny` or `ask`, no exit 2, in anything this cycle adds. The status
   command and the review inform; the developer decides. Keeps ADR 0009 and `sdlc-flow.md` "Warnings never block".
2. **A script computes, the agent pastes.** The status block is computed from the repository by a script, so it is
   right whether or not the agent obeys. The command runs the script through the command file's shell expansion and
   tells the agent to reply with the block verbatim and nothing else. It shows file state, not intent: "next task" is
   the first open task in `tasks.md`, not what the agent is typing. A header the agent wrote ahead of the developer
   shows as such. No hook changes: the desktop app shows hook notices collapsed, which the owner rejected.
3. **One library, two outputs.** The script reuses `bin/lib` (`collectSignals`, `infer`) with the same deadline and
   git cache as `sdlc-status.js`; no second inference. `[ADR]`
4. **Own skills, written fresh.** The two replacements, `sdlc-spec` and `sdlc-plan`, are written in this repository's words, shorter than the
   vendored copies, with the cycle paths and the header; the vendored text is not copied. `addyosmani/agent-skills`
   is credited as the origin in the ADR and the plugin README. The vendored copies, their `VENDORED.md` and their
   entries in `sync-vendored.js` leave the plugin. `[ADR]`
5. **TDD by presence.** `test-driven-development` stays bundled. The development sheet lists
   `superpowers:test-driven-development` first, so `which.js` names it when it is installed and the bundled one when
   it is not. `incremental-implementation` stays vendored and unchanged (no counterpart). `context-engineering`,
   which no phase sheet recommends, leaves the plugin with its `sync-vendored.js` entry.
6. **Approval follows the artifact.** The own skills state that a go-ahead counts as approval only of an artifact the
   developer has seen in a previous message; a plan written after the go-ahead is shown and waits. On Opus and Fable
   the agent may still go ahead without a plan by the plan brake of ADR 0009 (owner: "a veces, sin preguntarme");
   the rule is that it says so, not that it stops.
7. **Review in the chat only.** Findings go to the chat. Nothing is written to the user's repository (`SKILL.md`,
   Never: three categories). `[ADR]`
8. **Review offered, proportional to size.** Never runs without the developer's yes; offered in one line before each
   approval. Small: not offered. Medium (`feature.md`): one reviewer, comprehension with a paraphrase first plus the
   check against the code when `## Specs` describes current behavior, one round. Large: on `spec.md` comprehension, design critique and zoom-out; on `plan.md` and
   `tasks.md` readiness (no design decision left to the implementer) and the check against the code. Up to three
   rounds, stopping at the first round with no Blocker or Major left open. `[ADR]`
9. **A reviewer that did not run is "not run".** Retried once, then reported as not run, never as zero findings; a
   round with a reviewer not run is not clean.
10. **Isolation.** In Claude Code the reviewers are plugin agents with read-only tools (`Read`, `Grep`, `Glob`) and no
    `CLAUDE.md`; they receive only the document, their profile and the file list. Hosts without subagents get no
    review, and the agent says so; the review is never simulated in the same context.
11. **Resolution rules from #30.** Each finding is resolved as `PROPOSE FIX`, `CONTEST` (citing a file and symbol or a
    written decision), `ESCALATE` (the refutation is not written anywhere: the developer decides) or `DECLINE` (Nits
    only). A comprehension gap is never contested.
12. **Net size.** `sdlc/SKILL.md` does not grow: rules that move into the own skills leave it.

## Scope

In: stage 1, `commands/status.md`, a status script under `skills/sdlc/bin/` with its self-test, the plugin README; stage 2, `sdlc-spec` and `sdlc-plan`, removal of three vendored copies (the spec, plan and
`context-engineering` skills), `sync-vendored.js` and its self-test,
`sdlc-status.js` `FAMILY`, phase sheets (`initial`, `analysis`, `planning`, `development`), `which.js` self-test,
`check-sheets.js`, `sdlc/SKILL.md`, `sdlc-debugging/SKILL.md`, references that name the vendored skills, constitution
(vendored list, version sources), release script version sources, `marketplace.json`, `plugin.json`, CI, README,
`docs/distribution.md`, `ARCHITECTURE.md`, `docs/sdlc-flow.md`, ADR 0011; stage 3, reviewer agents under
`plugins/sdlc-assist/agents/`, the review step in the two own skills, a seeded fixture, ADR 0012. Records in
`docs/ci-red-runs.md` for every stage.
Out: new hooks or any blocking; transcript reading; detecting writes in another repository; editing
`incremental-implementation` or `test-driven-development`; EGM's five-stage pipeline,
synthesizer, style reviewer, TRIZ and A/B reviewers (#30, "Qué NO conviene adoptar"); closed cycles' specs.

## Clarifications

- 2026-11-26 — Q: block the agent until the plan is approved? A: no; the owner wants to see the state, not to be
  stopped (owner).
- 2026-11-26 — Q: how does the owner see the state? A: a script-computed status, not a line the agent writes (owner); the surface, below.
- 2026-11-26 — Q: does a `statusLine` render in the desktop app? A: no. It can only be set in user or project
  settings (https://code.claude.com/docs/en/statusline; `plugin.json` has no field for it,
  https://code.claude.com/docs/en/plugins-reference), and a `statusLine` in `.claude/settings.local.json` that logs
  each run was never executed by the desktop app (Claude Code 2.1.332), in the running session or a new one.
- 2026-11-26 — Q: a hook notice instead? A: a `UserPromptSubmit` hook printing `{"systemMessage": ...}` ran (logged)
  and the desktop app drew it collapsed as an "Aviso de Claude Code" row that opens on click (owner's screenshot).
  The owner rejected a collapsed notice ("no me sirve plegado") and chose the command on demand.
- 2026-11-26 — Q: what to do with the vendored spec and plan skills? A: replace them with own skills (option 1 of #34),
  after the comparison of save paths above (owner).
- 2026-11-26 — Q: and TDD without superpowers? A: the bundled copy, as today (owner).
- 2026-11-26 — Q: when does the cold review run? A: on its own for medium work, offered for large work (owner).
- 2026-11-26 — Q: after the token estimate (a subagent run measured at 153k tokens today; the reviewer unmeasured),
  does medium still run on its own? A: no; offered in every size, paid only when asked (owner). Reverses the line above.
- 2026-11-26 — Q: one cycle or three? A: one large cycle in three stages, #35 then #34 then #30 (owner).
- 2026-11-26 — Q: why did the agent read the file instead of invoking the skill? A: the owner's global `arranque`
  skill accepted only a `Read` of a `SKILL.md` as proof of reading; fixed outside this repository the same day
  (`~/.claude/hooks/arranque-guard.ps1` now also accepts a `Skill` invocation, 60 of 60 tests pass). Stage 2 still
  covers any other path to the file.
- 2026-11-26 — Q: names of the two own skills? A: `sdlc-spec` and `sdlc-plan` (owner).
- 2026-11-26 — Q: `context-engineering` is recommended by no phase sheet; keep it? A: drop it from the plugin (owner).

## Open Questions

(none)

## Acceptance

- WHILE a repository has an active cycle, THE STATUS SCRIPT SHALL print the cycle folder, the spec status, whether `plan.md` exists, the stage when the plan has stages, the next open task and the tasks done over total.
- WHILE the repository has no active cycle, THE STATUS SCRIPT SHALL print one line saying so.
- IF the working directory is outside a git repository, THEN THE STATUS SCRIPT SHALL print one line saying so and exit 0.
- IF the git queries exceed the deadline, THEN THE STATUS SCRIPT SHALL say the status is incomplete instead of printing a partial block.
- WHEN the developer runs `/sdlc-assist:status`, THE COMMAND SHALL run the status script without loading the `sdlc` skill.
- WHEN the agent reads the spec skill or the plan skill by any route, THE SKILL SHALL tell it in its first line to run the `sdlc` router first.
- THE SPEC SKILL SHALL write the spec under `docs/specs/<date>-<slug>/` with the header `Phase: analysis` / `Status: draft`.
- THE PLAN SKILL SHALL write `plan.md` and `tasks.md` beside the cycle's spec.
- IF the developer's go-ahead came before the plan existed, THEN THE PLAN SKILL SHALL tell the agent to show the plan and say it is not yet approved.
- THE PLUGIN SHALL ship no copy of `spec-driven-development`, `planning-and-task-breakdown` or `context-engineering`.
- WHERE `superpowers:test-driven-development` is installed, `which.js` SHALL name it first for the development phase.
- IF `superpowers` is not installed, THEN `which.js` SHALL name the bundled `test-driven-development` for the development phase.
- WHEN the agent is about to ask for approval of a cycle document, THE AGENT SHALL offer the cold review in one line.
- IF the developer has not accepted the offer, THEN THE AGENT SHALL NOT run any reviewer.
- WHEN the developer accepts the review of a `feature.md`, THE AGENT SHALL run one cold reviewer and show its paraphrase and its Blocker and Major findings before asking for approval.
- IF a reviewer returns no report after one retry, THEN THE AGENT SHALL report it as not run.
- IF the host has no subagents, THEN THE AGENT SHALL say the review did not run and SHALL NOT review in the same context.
- THE COLD REVIEW SHALL write nothing to the user's repository.
- WHEN the seeded fixture is reviewed, THE COLD REVIEW SHALL report each seeded gap (an undefined project term, a file cited as existing that does not exist, a task that leaves a design decision open).

## Verification record

`docs/ci-red-runs.md`: the status script's self-test output and `/sdlc-assist:status` run in the owner's desktop app; the
`which.js` output for the development phase with and without `superpowers` in a scratch home; `sync-vendored.js
--check` after the removal; the replayed #35 scenario (spec skill opened with `Read`) as pasted excerpts; the
fixture review before and after each reviewer exists, red first.

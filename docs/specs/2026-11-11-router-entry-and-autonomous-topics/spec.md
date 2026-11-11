# Spec: router as the only entry, autonomous routing of new topics (issue #27)

Phase: deployment
Status: closed
Date: 2026-11-11
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.15.0)
Parent: `docs/specs/2026-11-09-read-real-headers-and-plan-brake/feature.md`

## Objective

Issue #27 (Almacén, 2026-11-10): with a cycle in progress, the agent never ran the router. It invoked
`spec-driven-development` directly, and when a side request arrived ("quitá el plan anual del Worker") it ignored the
hook's `this request may be a new topic: ask whether to keep it apart` and implemented it in another repository with no
cycle, spec or plan. The owner found out only by asking "¿usaste sdlc?".

Two causes: the hook only informs, and the signal it gives is a task (decide, then ask) that a hurried agent skips;
the family skills can be entered directly and nothing routes the agent back.

The owner's constraints, in their words:

- No blocking: "si me bloqueas me cortas la sesión a la mitad y me dejas a pata"; cutting costs time, money and tokens.
- No shepherding: "no puedo estar como un pastor guiando ovejas"; agents must know where to go without asking.
- Inferring is fine when the inference is right; going off somewhere else is not.

Deliverables:

1. **Signal that carries the route.** The new-topic signal states what to do (decide the size by the Size rule,
   announce it in one line, proceed) instead of asking the agent to ask the developer.
2. **Autonomous new topics.** Protocol step 5 changes from "ask one question" to "decide by size and announce":
   small → loose change outside the cycle, said in one line; medium → new `feature.md` cycle; large → new `spec.md`
   cycle; same subject as the active cycle → fold into it. The developer may override; nothing waits for an answer.
3. **The route again at the family-skill door.** The existing status hook (`sdlc-status.js`) gains one more event: a
   `PreToolUse` on the `Skill` tool. When the skill is one of the family, it emits the same `sdlc:` line it already
   computes as `hookSpecificOutput.additionalContext`, once per session. Same script, no new file, no transcript reading, no repository detection.
4. **Own skills route first.** `sdlc-debugging`, `sdlc-qa-gate` and `sdlc-release` open with one line: run the router
   if it has not run in this context, then follow it. Vendored skills are not edited (constitution, Never); item 3
   covers them.
5. Phase sheets, `sdlc-flow.md`, README, ADR 0010.

## Decisions

1. **Never block, never wait.** The hook exits 0 on every event and emits only context; no `permissionDecision`
   `deny` or `ask`, no exit 2. Keeps `sdlc-flow.md` "Warnings never block". `[ADR]`
2. **Ask only when the inference is impossible.** The agent asks the developer only when the target repository or the
   size cannot be inferred from the request and the repository (for example, the request names no repo and two fit).
   Everything else is decided and announced. `[ADR]`
3. **Simpler over complete.** The plugin must not grow to fix this (owner, 2026-11-11). No new hook script, no
   transcript parsing, no detection of writes in another repository: the side-request case is covered by the signal
   of deliverable 1, which tells the agent what to do with any new topic.
4. **Once per session at the door.** The `Skill` event prints the line at most once per session, keyed by
   `session_id` with the same temp-dir state `sdlc-status.js` already keeps. It does not check whether the router ran:
   showing the route once costs one line, checking would cost a transcript parser.
5. **Family skills**: `spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`,
   `test-driven-development`, `context-engineering`, `sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release`, with or without
   the `sdlc-assist:` prefix. `sdlc` itself prints nothing (it is the router).
6. **Low confidence keeps the new-topic signal.** Today `briefLine` returns early on low confidence and drops the
   new-topic marker; the marker is appended on that path too.
7. **Net size.** Step 5's question and its two branches leave `SKILL.md`; the hook gains one event branch. The plugin
   ends the cycle with fewer instructions than it starts with, or this cycle is reworked.

8. **Size rule eval gates the plan brake change.** Before step 4 changes, an eval runs: real requests taken from the
   owner's sessions (this repo and Almacén), each labeled by the owner with the size they expect, sized by a fresh
   agent that has only `SKILL.md` and the repository. Pass: zero cases sized smaller than the owner's label (the
   direction that skips a plan) and every disagreement explained in the record. A fail keeps step 4 asking, and the
   rest of the cycle ships without it. "100%" is claimed only over that labeled set, never in general.
9. **The plan brake depends on the model.** On Sonnet or Haiku (or any smaller tier) the agent writes a plan for
   every change, small included, and waits for the developer's approval before implementing; Size never exempts it.
   On Opus or Fable the brake follows Decision 8. The agent reads its own model from the session; the hook does not
   need it. `[ADR]`
10. **Deferred, 2026-11-11, owner Ezequiel Scholz: Size rule by signals and a 60% cut.** The eval failed on A12 and
    S3 with the agent confident; a felt confidence would not have caught them. Next cycle: risk signals cap the
    confidence below 60%, below 60% goes one size up; text only, at most 60 words more in `SKILL.md`, rerun on 15+ new
    requests. Tracked in `ROADMAP.md`, Deferred Backlog.
11. **Classifier gap folded in (same subject).** The replay showed "quitá", "eliminá", "sacá", "cambiá", "arreglalo"
    and "corregí" give no request type, so no new-topic hint: the Spanish lists in `keywords.js` gain them.

## Scope

In: `plugins/sdlc-assist/hooks/` (`sdlc-status.js`, `hooks.json`, self-test), `bin/lib/brief.js`, `sdlc/SKILL.md`
(Protocol steps 3 and 5), the three own skills' first step, phase sheets, `docs/sdlc-flow.md`, README, ADR 0010,
`docs/ci-red-runs.md` records.
Out: vendored skills; new hook scripts; transcript reading; detecting writes in other repositories; the plan brake of
step 4 (ADR 0009) unless the Decision 8 eval passes.

## Clarifications

- 2026-11-11 — Q: may the plugin block the first write without router? A: no; blocking cuts the session and costs
  time, money and tokens (owner).
- 2026-11-11 — Q: should the agent ask the developer whether a side request goes apart? A: no; it decides by size,
  announces and proceeds; the developer is not a shepherd (owner).
- 2026-11-11 — Q: full correction hook (transcript reading, foreign-repo writes) or the simple version? A: the simple
  version; the update must simplify the plugin (owner).
- 2026-11-11 — Q: does the plan brake (step 4, ADR 0009) keep asking "plan first or go ahead"? A: option A, the agent
  decides by the Size rule and announces, but only if the Size rule is proven to work with evidence (owner). Today
  there is none: the rule is judgment text in `SKILL.md` with no test and no record. See Decision 8.
- 2026-11-11 — Q: does the plan brake depend on the model? A: yes; with Sonnet the owner always asks to plan first,
  Haiku is not used or runs as an orchestrated subagent or always with a plan; Opus and Fable "ahí vemos". With Sonnet
  or Haiku the plan covers small changes too and waits for approval (owner).
- 2026-11-11 — Q: does a `PreToolUse` hook on the `Skill` tool reach the agent without denying the call? A: yes, per
  https://code.claude.com/docs/en/hooks: a `Skill` matcher fires when the agent calls the tool (not when the user types
  `/skill`); `hookSpecificOutput.additionalContext` is "String added to Claude's context"; plain stdout reaches the
  model only on `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart` and `PostModelSwitch`, so the `Skill` branch
  must print JSON, not plain text. `session_id` and `cwd` are common input fields; plugin `hooks/hooks.json` takes
  `PreToolUse` matchers like `settings.json`. Not documented: the `tool_input` field naming the skill (the tool's
  schema in this session shows `skill` and `args`) and whether `additionalContext` works with no `permissionDecision`;
  the first plan task confirms both by logging a real payload.

## Open Questions

(none)

## Acceptance

- WHEN the request carries a `new-cycle` alternative, THE STATUS LINE SHALL state the route to take (decide the size, announce it, proceed) and SHALL NOT tell the agent to ask the developer.
- WHILE confidence is low, THE STATUS LINE SHALL keep the new-topic marker when the request carries a `new-cycle` alternative.
- WHEN a family skill is invoked through the Skill tool in a repository with an active cycle, THE STATUS HOOK SHALL print the `sdlc:` line once per session.
- WHEN the Skill tool invokes a skill outside the family, THE STATUS HOOK SHALL print nothing.
- THE STATUS HOOK SHALL exit 0 and emit no `deny` or `ask` decision on every event and path, including malformed input.
- THE SDLC SKILL SHALL tell the agent to decide a new topic by size and announce it, asking only when the repository or the size cannot be inferred.
- WHEN one of the own skills (sdlc-debugging or sdlc-qa-gate or sdlc-release) starts in a context where the router has not run, THE SKILL SHALL run the router first.
- IF the Size rule eval sizes any labeled request smaller than the owner's label, THEN THE CYCLE SHALL keep the plan brake question unchanged.
- WHEN the Size rule eval passes, THE SDLC SKILL SHALL tell the agent to size unplanned work and announce it instead of asking whether to plan.
- WHILE the agent runs on Sonnet or Haiku, THE SDLC SKILL SHALL require a plan approved by the developer before any implementation, small work included.
- WHEN the Almacén scenario is replayed with an active cycle and a direct spec-driven-development entry and a side request in another repository, THE AGENT SHALL announce a route for the side request before its first write without the session being stopped.

## Verification record

`docs/ci-red-runs.md`: self-test output of the `Skill` event (family skill, other skill, second call in the same
session, malformed stdin), the status line with and without low confidence, the line count of `SKILL.md` before and
after, the Size rule eval table (request, owner label, agent size, reason), and the replayed Almacén scenario as pasted transcript excerpts.

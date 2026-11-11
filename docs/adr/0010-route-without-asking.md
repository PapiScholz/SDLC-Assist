# 0010. The agent routes by itself: the route is repeated at the skill door, never enforced

Status: accepted
Date: 2026-11-11

## Context

Issue #27 (Almacén, 2026-11-10): with a cycle in progress the agent invoked `spec-driven-development` directly, never ran the router, and implemented a side request in another repository after the status line said "this request may be a new topic: ask whether to keep it apart". The line was a task (decide, then ask the developer) and the agent skipped it. The family skills can be entered without the router and nothing brings the agent back.

The owner set two constraints: blocking is out (it cuts the session and costs time, money and tokens), and so is asking the developer at every fork ("no puedo estar como un pastor guiando ovejas"). The plugin must not grow to fix this.

Options weighed:

1. A new correction hook: read the transcript to know whether the router ran, detect writes in another repository, inject the route at the first deviation. Catches more, but adds a script, a transcript parser and per-kind session state.
2. The existing status hook gains a `PreToolUse` event on the `Skill` tool and re-emits the line it already computes when a family skill is entered, once per session; the line itself carries the route instead of a question.
3. A `PreToolUse` `deny` on the first write without the router: rejected by the constraints (ADR 0009, option 3).

## Decision

Option 2. Verified before building (`docs/ci-red-runs.md`, Task 1): the payload names the skill in `tool_input.skill`, and `hookSpecificOutput.additionalContext` without any `permissionDecision` reaches the agent. Plain stdout does not reach the agent on `PreToolUse`, so the branch prints JSON.

- The new-topic part of the line states the route: say its size before the first edit, then proceed (same subject, fold in; small, do it apart; medium, new `feature.md`; large, new `spec.md`). It is kept on the low-confidence line too.
- SKILL.md Protocol step 5 changes from asking to deciding by Size and announcing. The agent asks only when the repository or the size cannot be inferred.
- The own skills (`sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release`) open by running the router when it has not run. Vendored skills are not edited; the hook covers them.
- The plan brake of ADR 0009 was to change from asking to deciding by Size only if an eval over owner-labeled real requests sized none of them smaller than the owner's label (spec Decision 8). It failed (2 of 12 sized smaller, `docs/ci-red-runs.md`, Task 4), so on Opus and Fable the brake keeps asking.
- On Sonnet, Haiku or a smaller model the brake is stricter: every change, small included, gets a plan that waits for approval (spec Decision 9). The agent reads its own model from the session.

## Consequences

About 50 tokens once per session when a family skill is entered, against one question round-trip less per side request. The route is repeated, not enforced: an agent can still ignore it, and the Almacén replay in `docs/ci-red-runs.md` is how compliance is measured. Writes in another repository are not detected; the line's instruction for any new topic covers that case. If compliance proves insufficient, option 1 is the next step, with its own ADR.

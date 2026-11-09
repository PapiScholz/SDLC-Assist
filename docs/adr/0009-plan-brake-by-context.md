# 0009. The brake on unplanned implementation is context, not a tool gate

Status: accepted
Date: 2026-11-09

## Context

Issue #26: asked to "implement the proposals of SPEC-usabilidad-pasos", the agent wrote code with no approved plan for that module. The status line it had was wrong (it misread the headers, ADR 0008), carried the suffix "(applies only when the request is about this repository's work)", and was deduplicated per session, so it did not come back when the implement request arrived. Three brakes were weighed against the Claude Code hooks documentation (code.claude.com/docs/en/hooks, PreToolUse decision control):

1. Context: the UserPromptSubmit line states the fact and SKILL.md has the agent ask. Works on every host; can be ignored. The docs advise wording injected context as facts, not commands.
2. PreToolUse `ask` on Edit/Write outside `docs/` while the routed work has no approved plan: the developer confirms in a permission prompt (the reason is shown to them). In auto mode an `ask` still reaches the prompt; in `-p` it turns into a deny; behaviour under `bypassPermissions` is not documented.
3. PreToolUse `deny`: cannot be ignored, but blocks small work, which ADR 0007 sends straight to development, and contradicts "never blocks a transition" (README).

## Decision

Option 1, with the router fixed first. The hook line drops the opt-out suffix; when the request classifies as `feature` and the routed work sits at step 2 or 3, the line adds "this request asks to implement and the work has no approved plan: the developer decides whether to plan first" and is printed even when identical to the last one. SKILL.md gains a Protocol step: before editing code for work that is not small and has no approved spec or plan, ask the developer whether to plan first.

Option 2 is deferred, not rejected. Trigger: once the router reads the repo correctly, the agent again implements without a plan while the line said so. It would ship as an opt-in hook with its own ADR, since README says the rules are instructions and not shipped guards. Option 3 is rejected.

## Consequences

No new friction for small work and no new host requirement. The brake is only as strong as the agent's compliance; the trigger above is how that gets measured. Since a wrong line is ignored with reason, the line's accuracy (ADR 0008, module routing, tasks in `plan.md`) is part of the brake.

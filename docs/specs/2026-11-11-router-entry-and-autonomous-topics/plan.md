# Router entry and autonomous topics: implementation plan

> Read `spec.md` beside this file first. Commits, pushes and the PR need the owner's explicit verb in the current turn (`CLAUDE.md`); never add co-authorship trailers.

**Spec:** [`spec.md`](spec.md). **Branch:** `router-entry`. One PR, `[minor]` in a branch commit, v0.16.0 after merge.

## Global constraints

- Simpler, not bigger (spec Decisions 3 and 7): no new hook script, no transcript reading, no repository detection.
  `SKILL.md` ends the cycle with fewer words than it starts with (2569 words, 109 lines at v0.15.0).
- Every hook path exits 0; no `permissionDecision` `deny` or `ask`, no exit 2 (Decision 1).
- Node, zero dependencies; each change in `bin/` or `hooks/` ships its cases in the existing `*.self-test.js`, written
  **before** the code and seen red.
- Vendored skills are not edited. Files are LF, UTF-8 without BOM. `bash scripts/gates.sh` green before each commit.
- Existing self-test fixtures keep their brief line except the new-topic and plan-brake text this cycle changes.

## Tasks

### 1. Probe the `Skill` hook payload (fail fast)
- In a scratch repository (scratchpad, never the user's settings), a temporary `PreToolUse` hook with matcher `Skill`
  dumps stdin to a file and prints `{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"PROBE-<n>"}}`
  with no `permissionDecision`. Run `claude -p` asking it to invoke a skill and to repeat any `PROBE-` text it saw.
- Records: the real payload (field naming the skill, `session_id`, `cwd`) and whether the agent read `PROBE-<n>`.
- If the context does not reach the agent, deliverable 3 falls: tasks 3 is dropped and the spec says so.

### 2. Status line: route instead of question (`lib/brief.js`)
- New-topic text: `new topic: size it (small: do it apart in one line; medium: new feature.md; large: new spec.md;
  same subject: fold in), announce the size and proceed`; within the 160-character `safe()` cap.
- Low confidence keeps the marker: the early return appends it when a `new-cycle` alternative exists.
- Tests first: new-topic text has no "ask"; low-confidence line with `new-cycle` carries the marker; without it, not.

### 3. Status hook at the family-skill door (`hooks/sdlc-status.js`, `hooks/hooks.json`)
- `hooks.json` gains `PreToolUse` with matcher `Skill` on the same script.
- The script reads `hook_event_name`. `UserPromptSubmit` path unchanged. `PreToolUse`: skill name from the field task 1
  found, prefix `sdlc-assist:` stripped; family set from spec Decision 5; `sdlc` prints nothing. On a family skill
  with an active cycle, emit the brief line as `hookSpecificOutput.additionalContext`, once per session (state key
  `<session_id>.skill`, same temp dir as `changed()`).
- Tests first: family skill → JSON once; second call same session → nothing; non-family skill → nothing; malformed
  stdin → nothing, exit 0; no output on any path holds `deny` or `ask`.

### 4. Size rule eval (gates task 5b)
- Collect 15-25 real requests from the owner's sessions (this repo and Almacén), each with the repository state it
  was made against (commit). The owner labels each small, medium or large, in batches of 4 questions.
- A fresh agent with only `sdlc/SKILL.md` and the repository at that commit sizes each one without seeing the label.
- Pass: zero requests sized smaller than the label. Every disagreement gets one line of reason. Table pasted in
  `docs/ci-red-runs.md` (request, label, agent size, reason).

### 5a. Instructions: decide and announce
- `sdlc/SKILL.md` Protocol step 5 rewritten from "ask" to "decide by size and announce" (spec deliverable 2), asking
  only when the repository or the size cannot be inferred; step 3 sentence adjusted to match.
- The three own skills (`sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release`) open with one line: run the router if it has
  not run in this context, then follow it.
- Phase sheets that repeat the question, updated.

### 5b. Plan brake decides by size (only if task 4 passed)
- `SKILL.md` step 4 and `UNPLANNED` in `brief.js`: size the work, announce it, plan first unless small. Tests first.
- If task 4 failed: nothing changes here; the record says why.

### 6. ADR 0010, flow doc, README, size check
- `docs/adr/0010-route-without-asking.md` covering Decisions 1, 2 and 8.
- `docs/sdlc-flow.md` (diagram node "ask only for a new topic", rules list), README where it says the router asks.
- `wc -l -w` of `SKILL.md` before and after; if it grew, rework 5a before closing.

### 7a. Verification
- Gates; hook self-test output; brief lines; replay of the Almacén scenario in a scratch repository with an active
  cycle (direct `spec-driven-development` entry, then a side request in another repository); records in
  `docs/ci-red-runs.md`.

### 7b. Commit (`[minor]`), push and PR with the owner's verb.

## Order and checkpoints

1 → (2, 3 independent) → checkpoint A: hook and line self-tests green, gates green.
4 runs whenever the owner has time to label; 5b waits for it. 5a and 6 after checkpoint A.
Checkpoint B: 7a done, `SKILL.md` not larger, owner reviews before 7b.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `additionalContext` on `PreToolUse` does not reach the agent | High | Task 1 first; deliverable 3 drops, the rest stands |
| Skill name field differs from the tool schema (`skill`) | Low | Task 1 reads the real payload |
| The keyword classifier flags acknowledgements ("dale") as new topics | Med | Out of scope (ROADMAP classifier item); the new text tells the agent to fold same-subject requests in, which makes a false flag harmless |
| Eval set too small to mean anything | Med | 15-25 requests, both repositories; "100%" claimed only over that set |

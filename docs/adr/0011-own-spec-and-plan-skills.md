# 0011. Own spec and plan skills replace the vendored ones

Status: accepted
Date: 2026-11-26

## Context

Issue #34: the vendored `spec-driven-development` and `planning-and-task-breakdown` (from `addyosmani/agent-skills`) are the skills the router names for steps 2 and 3, and the plugin must not edit them (constitution). They save to paths the router does not read (a root `SPEC.md`, `tasks/plan.md`, `tasks/todo.md`), carry no `Phase:`/`Status:` header, and give no pointer back to `sdlc`. Issue #35 showed the cost: an agent opened the vendored spec skill directly, never ran the router, and wrote outside the cycle. ADR 0010 answered with a status line at the `Skill` door; an agent that reads the `SKILL.md` as a file goes through no door. `superpowers` offers the same steps with a third set of paths (`docs/superpowers/...`).

Options weighed (spec `docs/specs/2026-11-26-visible-cycle-single-door/spec.md`, Decisions 4 and 5):

1. Own skills, written fresh in this repository's words, with the cycle paths, the header and a first line that routes through `sdlc`.
2. Keep the vendored copies and propose upstream changes: the paths and the header are this plugin's conventions, not the upstream's, so the change would not land.
3. Defer to `superpowers`: its paths conflict with the router too, and it is not installed everywhere.

## Decision

Option 1, chosen by the owner after the comparison of save paths.

- `sdlc-spec` and `sdlc-plan` live under `plugins/sdlc-assist/skills/`, versioned with the other own skills by the release script. Their first line of text routes through `sdlc`; `check-skill-sections.js` checks it on every own skill.
- `spec-driven-development`, `planning-and-task-breakdown` and `context-engineering` (no phase sheet recommended it) leave the plugin with their `sync-vendored.js` entries. `sync-vendored.js --check` reports a vendored folder whose name left the list.
- `incremental-implementation` and `test-driven-development` stay vendored and unchanged. The development sheet lists `superpowers:test-driven-development` first, so `which.js` names it when installed and the bundled copy otherwise.
- The vendored text is not copied. `addyosmani/agent-skills` is credited as the origin here and in both READMEs.
- The header rule moves out of `sdlc/SKILL.md` into `sdlc-spec`; the router keeps a one-sentence pointer, so it does not grow (spec Decision 12).

## Consequences

Two more own skills to maintain (about 10 KB), against two vendored ones (about 23 KB) plus `context-engineering` (14 KB) gone. Upstream improvements to spec writing and planning no longer arrive by a pin bump; they are read and adopted by hand. Hosts that installed the old names through the skills CLI keep those copies until the user removes them; the router no longer recommends them. The approval rule (a go-ahead counts only for an artifact the developer has seen) now lives in the skills that write the artifacts.

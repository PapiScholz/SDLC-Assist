# Roadmap

Shipped cycles and their specs are listed in the README's `## Roadmap` and under `docs/specs/`. This file holds only what is deferred: nothing here is scheduled. A new cycle starts from one of these items, or from using the skill in another repository, with a spec in `docs/specs/<date>-<slug>/` (`Phase: analysis`, `Status: draft`).

## Deferred Backlog

Listed 2026-10-03, at v0.11.1.

### Product

- **Size rule by signals and a 60% cut.** The eval of 2026-11-11 failed: A12 (changes what an API receives and what is stored) and S3 (a diagram explaining the whole skill) were sized below the owner's label, with the agent sure of itself. Replace "when unsure, pick the larger" with: the agent sizes and states its confidence; any of these signals puts it below 60%: explains or summarises the whole system, read by the product's users, leaves content or design decisions open, changes a public contract or stored data, ambiguous request. At 60% or more its size stands; below, one size up. The percentage is said only when the size goes up, in one line with the reason. Limits (owner): text only, no new step, no question, `SKILL.md` grows at most 60 words. Then rerun the eval on 15 or more new requests, recording the confidence; only if no request comes out smaller does the plan brake stop asking on Opus and Fable. Source: `docs/specs/2026-11-11-router-entry-and-autonomous-topics/spec.md`, Decision 10; `docs/ci-red-runs.md`, Task 4.
- **Native command files for Codex and Cursor.** Today both hosts get the skill by intent only; Claude Code has `/sdlc` and `/sdlc-assist:phase`, OpenCode has `/sdlc-phase`. Deferred until each host's command format is verified. Source: README `## Install` and `## Roadmap` (v1.5), `docs/specs/2026-09-30-v1-2-playbook-alignment.md`.
- **Request classifier reads quotes and questions about the tool.** `classifyRequest` matches single words, so "es un error del skill o tuyo?" and "genera un issue en el repo" come out as `bug` and add the new-topic hint. Strip quoted lines (`> ...`) and reply markers first; do not count `error`/`issue`/`problema` in a question about the tool or the agent, or in a request to file an issue. Source: issue #20 proposal 5, `docs/specs/2026-11-06-cycle-confidence/spec.md` (out of scope). Since v0.14 the skill's Protocol step 0 keeps such requests read-only by rule; the classifier still adds the hint (`docs/specs/2026-11-07-proportional-cycles/spec.md`, Decision 7).
- **`PostToolUse` hook on `Write` for specs outside `docs/specs/`.** When the agent creates a `.md` whose name or first heading says spec outside `docs/specs/`, answer that the router will not see it and where to move it. Source: issue #20 proposal 6, same spec.
- **Legacy root `tasks/plan.md` and `tasks/todo.md`.** Left from the first cycle's flat layout. With no active spec, `where.js` treats the plan as current and falls back to `analysis` with candidates `analysis, testing` on this repository. Decide whether to move them under the first cycle's record or remove them.

### Waiting on others

- **Vendored apostrophe fix.** Upstream `addyosmani/agent-skills#623` is open. When it merges, bump `UPSTREAM_COMMIT` in `plugins/sdlc-assist/skills/sdlc/bin/sync-vendored.js` and run it with `--fix`; never edit the vendored copy.
- **Directory listing links.** The Anthropic directory listing still shows "No value" for support, privacy and terms although `plugin.json` declares them. A refresh request went to Anthropic on 2026-10-02. Details: `docs/distribution.md`.

### Distribution

- **Pending submissions.** `awesome-opencode/awesome-opencode#799`, open since 2026-10-01. `hesreallyhim/awesome-claude-code`, eligible on or after 2026-10-13, through its issue form.
- **Eligible lists not yet sent.** `composio-community/awesome-codex-skills` (verify the Codex install line first), `BehiSecc/awesome-claude-skills`, `heilcheng/awesome-agent-skills`, `karanb192/awesome-claude-skills` (one row in Collaboration & Workflow, title `Add sdlc to Collaboration & Workflow`). Rules per list: `docs/distribution.md`.

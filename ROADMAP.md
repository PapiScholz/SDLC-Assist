# Roadmap

Shipped cycles and their specs are listed in the README's `## Roadmap` and under `docs/specs/`. This file holds only what is deferred: nothing here is scheduled. A new cycle starts from one of these items, or from using the skill in another repository, with a spec in `docs/specs/<date>-<slug>/` (`Phase: analysis`, `Status: draft`).

## Deferred Backlog

Listed 2026-10-03, at v0.11.1.

### Product

- **Native command files for Codex and Cursor.** Today both hosts get the skill by intent only; Claude Code has `/sdlc` and `/sdlc-assist:phase`, OpenCode has `/sdlc-phase`. Deferred until each host's command format is verified. Source: README `## Install` and `## Roadmap` (v1.5), `docs/specs/2026-09-30-v1-2-playbook-alignment.md`.
- **`rankCycles` tie-break.** Two cycles with the same effective date fall back to the smaller path, so the older dated slug can win. Fix it in the first cycle that touches `plugins/sdlc-assist/skills/sdlc/bin/lib/infer.js`. Source: `docs/adr/0004-active-cycle-ranking-in-infer.md`, `docs/specs/2026-10-01-v1-6-repo-artifacts/spec.md`.
- **Legacy root `tasks/plan.md` and `tasks/todo.md`.** Left from the first cycle's flat layout. With no active spec, `where.js` treats the plan as current and falls back to `analysis` with candidates `analysis, testing` on this repository. Decide whether to move them under the first cycle's record or remove them.

### Waiting on others

- **Vendored apostrophe fix.** Upstream `addyosmani/agent-skills#623` is open. When it merges, bump `UPSTREAM_COMMIT` in `plugins/sdlc-assist/skills/sdlc/bin/sync-vendored.js` and run it with `--fix`; never edit the vendored copy.
- **Directory listing links.** The Anthropic directory listing still shows "No value" for support, privacy and terms although `plugin.json` declares them. A refresh request went to Anthropic on 2026-10-02. Details: `docs/distribution.md`.

### Distribution

- **Pending submissions.** `awesome-opencode/awesome-opencode#799`, open since 2026-10-01. `hesreallyhim/awesome-claude-code`, eligible on or after 2026-10-13, through its issue form.
- **Eligible lists not yet sent.** `composio-community/awesome-codex-skills` (verify the Codex install line first), `BehiSecc/awesome-claude-skills`, `heilcheng/awesome-agent-skills`, `karanb192/awesome-claude-skills` (one row in Collaboration & Workflow, title `Add sdlc to Collaboration & Workflow`). Rules per list: `docs/distribution.md`.

# Spec: v1.3 — distribution (plugin id, positioning, directory readiness)

Phase: testing
Status: approved
Date: 2026-09-30
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.3.0)
Parent: `docs/specs/2026-09-30-v1-2-playbook-alignment.md` (v1.2, closed)

## Objective

v0.3.0 is published and reaches nobody: zero weekly installs on skills.sh, no
description or topics on GitHub, no listing in Anthropic's plugin directory,
and a README that never says who the skill is for. Four deliverables:

1. A "Who this is for" block at the top of the README, in English, with a
   short comparison against Superpowers, BMAD Method, Spec Kit and standalone
   spec skills.
2. GitHub repository metadata: description, homepage, topics.
3. Directory readiness: the plugin id becomes `sdlc-assist` (the directory
   holds a name made only of generic words for a reviewer), `plugin.json`
   gains `homepage`, `repository` and `keywords`, and `docs/distribution.md`
   records the pre-submission checks with pasted output and the portal steps
   the owner follows from their own account.
4. Community lists: which ones accept a link-only entry and when to apply.

## Decisions

- The plugin id changes; the skill folder `skills/sdlc/` and its paths do
  not. Slash `/sdlc-assist:phase`, install `sdlc-assist@papischolz`. The
  manifest gate asserts that `plugin.json` and `marketplace.json` agree on the
  id, so the name lives in one place plus one test fixture.
- No pull request to lists that vendor the plugin folder into their own repo
  (`composio-community/awesome-claude-plugins`,
  `GiladShoham/awesome-claude-plugins`): a mirror without a sync check is
  fragile, and this repo's rule requires a sync script, CI and prepublish
  hook for any duplicated tree. `hesreallyhim/awesome-claude-code` accepts
  link-only entries through an issue form, after 14 days of activity or 100
  stars; it is recorded with a date, not done now.
- Submission to the directory happens from the owner's claude.ai account,
  not from an agent session.
- Analysis and planning close in one commit: the plan is the approved plan
  file of this session, five steps, and the task list below.

## Scope

- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- `skills/sdlc/bin/check-manifest.js` and its self-test (one new red case)
- `skills/sdlc/SKILL.md` (close-mode trigger), `README.md`,
  `docs/specs/2026-09-29-sdlc-skill-design.md` (annotated, not rewritten)
- `docs/distribution.md` (new), `CHANGELOG.md` `[Unreleased]`,
  `tasks/todo.md`, `docs/ci-red-runs.md` (`## v1.3 dogfood`)
- GitHub metadata through `gh repo edit`, on the owner's word

Out of scope: renaming the skill, Spanish text in the README, any
submission from this session.

## Tasks

- Task 1: plugin id rename, manifest fields, gate and red run
- Task 2: README "Who this is for" block and `docs/distribution.md`
- Task 3: GitHub metadata, CHANGELOG, dogfood, close the cycle, PR, release

## Verification

`bash scripts/gates.sh` prints `all gates ok` with the new manifest case
red once and then green; `claude plugin validate .` passes; `gh repo view`
shows the description and topics; after the release the installed copy
reads `version: 0.4.0`; the owner's Validate run in the portal reports no
"Blocks" and no "Name may be confused" finding.

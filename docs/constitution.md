# Constitution: SDLC-Assist

Product rules every spec, plan and change in this repository obeys. Agent working rules for this checkout live in `CLAUDE.md`. Template for other projects: `plugins/sdlc-assist/skills/sdlc/references/constitution-template.md`.

## Principles

- Spec first: behavior changes start in `docs/specs/` with the header `Phase: analysis` / `Status: draft`. Hotfixes under the threshold in `SKILL.md` may skip it and must say so.
- Dogfood first: every work request on this repo goes through the skill's own router (`where.js`) before any edit; the active spec's header is the phase of record and advances only through close mode.
- Records are pasted output, not prose: every run recorded in `docs/ci-red-runs.md` shows the exact command and its real stdout, trimmed and marked when trimmed.
- Bump markers, not conventional prefixes: `[minor]`, `[major]` or `BREAKING CHANGE` in a commit since the last tag decide the version; `feat:` alone never bumps.
- Gates before any commit: `bash scripts/gates.sh` runs the same checks CI runs. Files are LF, UTF-8 without BOM.

## Never

- Edit vendored skills here (`plugins/sdlc-assist/skills/<name>/` other than `sdlc*`): propose upstream, then bump the pin in `sync-vendored.js`.
- Push to `main` without a release intent or `[skip release]` in the head commit (the merge commit, for a PR).
- Add co-authorship trailers or AI attribution to commits or PR bodies.

## Testing

- Every script under `plugins/sdlc-assist/skills/sdlc/bin/` ships a `*.self-test.js`; `scripts/gates.sh` runs them with the manifest, sheet, frontmatter, section, EOL and acceptance checks (list in `CONTRIBUTING.md`).
- CI runs the gates on Ubuntu and Windows, then installs the skills from the checkout into a clean home and runs the installed copy on scratch repos (install-smoke).

## Release

- Every push to `main` publishes a release (`.github/workflows/release.yml`); work in progress goes on a branch and a PR, which runs CI only.
- Version sources rewritten by the release script: `plugins/sdlc-assist/.claude-plugin/plugin.json`, the `version:` line in `plugins/sdlc-assist/skills/sdlc/SKILL.md` and the `version:` line of the three own skills.

## Amendments

- 2026-10-01: created from `CLAUDE.md` (v1.5 plan 4). `CLAUDE.md` keeps the agent-specific mechanics and links here.

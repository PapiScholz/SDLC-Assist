# SDLC-Assist — working rules for agents

- **Dogfood first.** Before any work request, run the skill's own protocol: write the request to a temp file and run `node skills/sdlc/bin/where.js --message-file <tmp>` at the repo root. The active spec's `Phase:`/`Status:` header is the phase of record; advance it only through close mode.
- **Every push to `main` publishes a release** (`.github/workflows/release.yml`). Docs-only or CI-only pushes carry `[skip release]` in the commit subject. Work in progress goes on a branch and a PR, which runs CI only.
- **Bump markers, not conventional prefixes.** `release.sh` bumps patch unless a commit since the last tag carries `[minor]` (or `[major]` / `BREAKING CHANGE`); `feat:` alone never bumps. `[skip release]` is read on the head commit only, so merge PRs with a merge commit and put the marker in a branch commit.
- **Dogfood records are pasted output, not prose.** Every run recorded in `docs/ci-red-runs.md` shows the exact command and its real stdout (trimmed and marked when trimmed). Two v1.1 tasks failed review for narrating results.
- **Gates before any commit:** `bash scripts/gates.sh` (what it runs is listed in `CONTRIBUTING.md`). Files are LF, UTF-8 without BOM; the repo sets `core.autocrlf=false`.
- **Vendored skills are never edited here** (`skills/<name>/` other than `sdlc*`): propose upstream, then bump the pin in `sync-vendored.js`.
- **Spec first.** Behavior changes start in `docs/specs/` with the header `Phase: analysis` / `Status: draft`. Hotfixes under the threshold in `SKILL.md` may skip it and must say so.
- **Version sources** rewritten by the release script: `.claude-plugin/plugin.json` and the `version:` line in `skills/sdlc/SKILL.md` and the `version:` line of the three own skills.

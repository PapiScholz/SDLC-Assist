# SDLC-Assist — working rules for agents

Product rules live in `docs/constitution.md`; this file is how agents work in this checkout.

- **Dogfood first.** Before any work request, run the skill's own protocol: write the request to a temp file and run `node plugins/sdlc-assist/skills/sdlc/bin/where.js --message-file <tmp>` at the repo root. The active spec's `Phase:`/`Status:` header is the phase of record; advance it only through close mode.
- **Release mechanics.** `release.sh` bumps patch unless a commit since the last tag carries `[minor]` (or `[major]` / `BREAKING CHANGE`). `[skip release]` is read on the head commit only: for a direct push that is your commit; for a PR it is the **merge commit**, so a docs-only PR is merged with `gh pr merge --merge --subject "Merge pull request #N from <branch> [skip release]"`, or it publishes a patch release (v0.5.1 came out of PR #5 this way). Bump markers go in a branch commit.
- **Gates before any commit:** `bash scripts/gates.sh` (what it runs is listed in `CONTRIBUTING.md`). The repo sets `core.autocrlf=false`.
- **Dogfood records** go in `docs/ci-red-runs.md` as pasted command plus real stdout (trimmed and marked when trimmed); the file is append-only. Two v1.1 tasks failed review for narrating results.
- **Vendored skills:** when the upstream fix lands, bump the pin in `sync-vendored.js` and run it with `--fix`; never edit the vendored copy.
- **Spec first** applies to this repo's own cycles: `docs/specs/` with `Phase: analysis` / `Status: draft`; hotfixes under the threshold in `SKILL.md` may skip it and must say so.

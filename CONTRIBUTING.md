# Contributing Guide

Thanks for contributing to SDLC-Assist.

## What This Repository Accepts
Contributions should improve one or more of the following:
- phase-inference quality in `skills/sdlc/bin/lib/infer.js` and the signals it reads
- the agent protocol in `skills/sdlc/SKILL.md` and the reference sheets under `skills/sdlc/references/`
- request classification (`skills/sdlc/bin/lib/keywords.js`), including new languages
- installed-skill detection for more hosts (`skills/sdlc/bin/lib/skilldirs.js`)
- documentation clarity and correctness

Do not edit the vendored skills under `skills/<name>/` other than `sdlc`: they are byte-identical to upstream and CI rejects drift. Propose changes upstream at `addyosmani/agent-skills`, then bump the pin in `sync-vendored.js`.

## Development Principles
- the spec at `docs/specs/2026-09-29-sdlc-skill-design.md` is the binding authority; change it first when behavior changes
- the decision table lives once, in `infer.js`; `SKILL.md` and the phase sheets point at it, they do not restate it
- scripts stay zero-dependency CommonJS on Node 20 or newer, with no build step
- scripts never write into the analysed repository; keep that property and its test
- every gate must be shown to fail at least once; record the red run in `docs/ci-red-runs.md`
- all files are LF, UTF-8 without BOM; repository-facing docs are in English

## Local Validation Before PR
Run from the repository root:

```bash
for t in skills/sdlc/bin/lib/*.self-test.js skills/sdlc/bin/*.self-test.js; do node "$t" || exit 1; done
node skills/sdlc/bin/sync-vendored.js --check
node skills/sdlc/bin/check-manifest.js
node skills/sdlc/bin/check-sheets.js
node skills/sdlc/bin/check-frontmatter.js
node skills/sdlc/bin/check-eol.js
```

This is exactly what CI runs on Ubuntu and Windows. `node skills/sdlc/bin/where.self-test.js` alone runs the ten phase-inference fixtures with their inversions.

Self-tests are plain Node scripts using `assert` (see `skills/sdlc/bin/lib/header.self-test.js` for the style): write the failing test first, then the implementation.

## Pull Request Expectations
A good PR should include:
- clear summary of the change and why it is needed
- the spec section it implements or amends
- validation steps run and their outcomes
- a new or updated self-test for any behavior change
- updates to `SKILL.md`, the phase sheets or the README when the protocol or the flags change

Dogfood your change: run `node skills/sdlc/bin/where.js --message-file <file>` at this repository's root and confirm the inferred phase still matches the spec header.

## Releases
Every push to `main` runs `.github/workflows/release.yml`, which calls `.github/scripts/release.sh`: it bumps the version in `.claude-plugin/plugin.json` and `skills/sdlc/SKILL.md`, turns the `## [Unreleased]` section of `CHANGELOG.md` into the version entry, commits with `[skip ci]`, tags `vX.Y.Z` and creates the GitHub release. The bump is patch by default; put `[minor]` or `[major]` (or `BREAKING CHANGE`) in a commit subject to change it; put `[skip release]` in the merge commit to hold a release back. A version pinned higher in `plugin.json` wins over the auto-bump. `bash .github/scripts/release.sh --dry-run` shows the plan without changing anything and is the escape hatch when Actions is down.

## Commit and Review Guidance
- keep commits focused and reviewable
- prefer small, incremental changes
- avoid unrelated formatting-only diffs
- link related issues when available

## Security-Sensitive Changes
For changes affecting script execution, git queries, file system reach, network access or trust boundaries:
- include explicit risk notes in the PR description
- update `SECURITY.md` when the "What the Skill Does on Your Machine" section is affected
- report vulnerabilities privately as described in `SECURITY.md`

## Code of Conduct
By participating, you agree to the `CODE_OF_CONDUCT.md`.

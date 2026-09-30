---
name: sdlc-release
version: 0.1.1
description: Decides the next version from the commits since the last tag, updates every version source and the changelog, validates, then tags and publishes through the forge, driving the project's existing release mechanism when there is one. Every state-changing command runs only after the user asks in the current turn. Use for the Deployment phase, when asked to release, tag, bump the version or publish.
---

# sdlc-release: version, validate, publish on request

## Overview

Deployment produces a version decision, updated version files and changelog, a tag and a published release, in that order, stopping at the first failure. Reply in the user's language. Stack facts come from the `sdlc` skill's `where.js` (locate `bin/` as that skill describes):

```
node "<sdlc bin>/where.js" --message-file "<temp file>"
```

Read `signals.releaseWorkflow.files`, `signals.git.lastSemverTag` (`{name, sha}` or null), `signals.git.commitsAfterTag`, `signals.changelog.exists`.

## 1. Detect

Look for a release mechanism already in the repo, in this order:

| Mechanism | Evidence |
|---|---|
| release workflow | `signals.releaseWorkflow.files` non-empty (`.github/workflows/*release*`) |
| release script | `scripts/release*`, `.github/scripts/release*`, a `release` script in `package.json` |
| changesets | `.changeset/` directory |
| semantic-release | `semantic-release` in `package.json` or `.releaserc*` |
| release-please | `release-please-config.json` or a `release-please` workflow |

If one exists, read it and drive it: state what triggers it (a push to `main`, a manual `workflow_dispatch`, a merged PR, a changeset file) and the exact action the user must take. Do not reimplement steps 2 to 6; only report the version it will produce if the mechanism computes one. Only without any mechanism perform steps 2 to 6 yourself.

## 2. Classify

Commits since `lastSemverTag` (read-only `git log <tag>..HEAD --format=%s`; with no tag at all, every commit, and the first version is `0.1.0` unless the version file already pins a higher one). Map subjects: `BREAKING` or `!` → major; `feat` → minor; `fix`, `docs`, `ci`, `chore`, `refactor`, `test` → patch. Mixed classes → propose the safer lower bump, state the higher option it could be, and ask the user before acting. Honour a higher version already pinned in the version file. State the reasoning before acting:

```
last tag: <vX.Y.Z or none>   commits: <n>   classes: <feat n, fix n, ...>   proposed: <vA.B.C> (<major|minor|patch>)
```

## 3. Update

Every version source the project has, all to the same value: `package.json` (and lockfile via the package manager's own `version` command when there is one), `pyproject.toml`, `Cargo.toml` (and `Cargo.lock` through `cargo`), `go` (tag only), plugin manifests (`.claude-plugin/plugin.json`), a `version:` frontmatter in skills. The changelog: consume `## [Unreleased]` into `## [A.B.C] - YYYY-MM-DD` when present; otherwise prepend an entry with the commits grouped Added / Changed / Fixed / CI. Show the diff of these edits.

## 4. Validate

The project's own checks: the test suite (`signals.testRunner.command`), the build or a pack dry run (`npm pack --dry-run`, `python -m build`, `cargo package --no-verify --allow-dirty --list`, `go build ./...`), and version consistency across every source touched in step 3 (`grep` each, all must equal `A.B.C`). Any failure stops the release: report it and go no further.

## 5. Commit tag push publish

List the exact commands first, then wait for the user's words in the current turn:

```
git add <the version files and the changelog, by path>
git commit -m "chore(release): vA.B.C"
git tag -a vA.B.C -m "vA.B.C"
git push origin <branch> --follow-tags
gh release create vA.B.C --title "vA.B.C" --notes-file <changelog entry extracted to a temp file>
```

Run them one by one, stopping at the first non-zero exit. If a guard in the environment blocks a command, report the block and stop; do not look for another way around it.

## 6. Publish guidance

Print the registry command for the ecosystem and run it only if the user asked for the publish too in the current turn:

| Ecosystem | Command |
|---|---|
| npm/pnpm/yarn | `npm publish --access public` (after `npm pack --dry-run` showed the file list) |
| Python | `python -m build && twine upload dist/*` |
| Rust | `cargo publish` |
| Go | nothing to publish; the tag is the release, `GOPROXY` picks it up |
| JVM | `./gradlew publish` or `mvn deploy` with the project's configured repository |

## Never

- Force-push, rewrite or move a tag, or delete a release.
- Publish to a registry without the user asking for it in the current turn.
- Continue after a failed validation.
- Run any command of steps 5 and 6 before listing it and getting the user's words.
- Reimplement a release mechanism the repo already has.

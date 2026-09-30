# Spec: v1.4 — plugin in a subfolder (directory scan scoped to what ships)

Phase: deployment
Status: approved
Date: 2026-09-30
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.4.0)
Parent: `docs/specs/2026-09-30-v1-3-distribution.md` (v1.3, closed)

## Objective

The plugin directory validator scans the folder that `marketplace.json`
names as the plugin `source`. Today that is `./`, the repository root, so
the scan covers development files that never ship: `CLAUDE.md`,
`CHANGELOG.md`, `docs/ci-red-runs.md`, `scripts/hooks/*`. On `main@c4df99e`
it reports 2 policy holds and 6 warnings; 7 of the 8 come from those files
(credential heuristic on the word "token" next to `$…` commands and a
github.com URL in the dogfood log; `iex`/`eval` strings in the git hook,
its self-test and the docs that describe it; `CLAUDE.md` at the plugin
root). The dogfood log is a record of pasted output and is not rewritten.

One deliverable: the plugin lives in `plugins/sdlc-assist/` and the
marketplace entry points there, so the directory validates only what a
user installs. Expected result on re-validation: 0 policy holds, and the
only warning left is the `npx skills add` line in the plugin README if it
keeps one (documentation; the validator says nothing needs to change).

## Decisions

- Layout follows the marketplace docs (`./plugins/<name>`):
  `plugins/sdlc-assist/{.claude-plugin/plugin.json, .claude-plugin/icon.svg,
  skills/, commands/, README.md, LICENSE}`. `git mv` for `skills/`,
  `commands/`, `plugin.json` and `icon.svg`, so history follows the files.
  `.claude-plugin/marketplace.json` stays at the repository root with
  `source: "./plugins/sdlc-assist"`.
- The plugin README is short and user-facing: what it does, the three
  install lines, the slash command, a link to the repository for
  everything else. It does not describe the repository's own hooks.
- `LICENSE` inside the plugin is a byte copy of the root file; the manifest
  gate asserts they are identical, so there is no second source of truth.
- Scripts under `skills/sdlc/bin/` keep resolving the plugin root as
  `__dirname/../../..` (now `plugins/sdlc-assist/`); `check-manifest.js` and
  `check-eol.js` take the repository root (two levels above) because they
  read `marketplace.json` and walk the whole tree. `check-manifest.js`
  follows `plugins[0].source` to find `plugin.json`, asserts the source is
  `./plugins/sdlc-assist`, and asserts `icon.svg` and `LICENSE` exist there.
- `npx skills add PapiScholz/SDLC-Assist` keeps working without flags: the
  skills CLI falls back to a recursive search when no `skills/` sits at the
  root. Verified before this spec on a temporary copy with the new layout:
  nine skills installed, `where.js` present. The CI job `install-smoke`
  runs the same step on every push and is the regression test.
- `commands/phase.md` and `.opencode/command/sdlc-phase.md` do not change:
  the first resolves `${CLAUDE_PLUGIN_ROOT}/skills/sdlc/bin`, which is
  relative to the plugin root; the second names the skill, not a path.
- Closed specs and `docs/ci-red-runs.md` keep their old paths: they
  describe the tree at the time they were written.
- Version bump: `[minor]` in a branch commit. The change is structural and
  visible to anyone who cloned the repo to copy `skills/` by hand.

## Scope

In:

- `git mv skills plugins/sdlc-assist/skills`, `git mv commands
  plugins/sdlc-assist/commands`, `git mv .claude-plugin/plugin.json
  plugins/sdlc-assist/.claude-plugin/plugin.json`, same for `icon.svg`.
- New `plugins/sdlc-assist/README.md` and `plugins/sdlc-assist/LICENSE`.
- `.claude-plugin/marketplace.json`: `source`.
- `skills/sdlc/bin/check-manifest.js` + self-test: repository root, source
  path, icon and LICENSE assertions. `check-eol.js`: default root.
- `scripts/gates.sh` (`B=`), `.github/scripts/release.sh` (version files,
  gate paths, `git add` list), `.github/workflows/ci.yml` (`plugin-validate`
  also validates `plugins/sdlc-assist`).
- Path mentions in `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`,
  `SECURITY.md`, `docs/distribution.md` (portal step: plugin path field =
  `plugins/sdlc-assist`), `docs/sdlc-flow.md`, `tasks/todo.md`.
- `docs/ci-red-runs.md`: one new dogfood block with the pasted output of
  the verification below (appended, never rewriting older runs).

Out:

- Rewriting historical records or closed specs.
- Changing skill contents, hook logic or the release flow.
- Excluding files by any other mechanism (none exists in the plugin format).

## Acceptance

1. `bash scripts/gates.sh` prints `all gates ok` on Ubuntu and Windows (CI).
2. `claude plugin validate .` and `claude plugin validate plugins/sdlc-assist`
   both end in `Validation passed`.
3. CI `install-smoke` passes from the new layout (skills CLI installs nine
   skills from a clean home and the installed `where.js` runs).
4. Portal re-validation on the merged `main`: 0 policy holds; no
   `ROOT_CLAUDE_MD`, no `RUNTIME_FETCH_EXEC` on hook files, no
   `MCP_FORWARDS_CREDENTIAL_ENV`.
5. `claude plugin marketplace add PapiScholz/SDLC-Assist` +
   `claude plugin install sdlc-assist@papischolz` install the plugin from
   the published `main` (owner runs it after the release).

## Verification record

Pasted output goes to `docs/ci-red-runs.md` under "v1.4 dogfood".

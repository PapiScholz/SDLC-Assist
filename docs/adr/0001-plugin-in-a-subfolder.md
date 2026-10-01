# 0001. The plugin lives in `plugins/sdlc-assist/`, not at the repository root

Status: accepted
Date: 2026-09-30

## Context

The plugin directory validator scans the folder `marketplace.json` names as the plugin `source`. With `./` that scan covered files that never ship (`CLAUDE.md`, `CHANGELOG.md`, the dogfood record, the git hooks) and reported holds and warnings that came from them. The dogfood record is pasted output and is not rewritten to please a scanner. Spec: `docs/specs/2026-09-30-v1-4-plugin-subfolder.md`. Implemented in `42ad8bf`.

## Decision

What ships is `plugins/sdlc-assist/`: manifest, skills, vendored skills, plugin README. Everything else (specs, records, gates, hooks, CI, release script) stays at the root and is never scanned. `marketplace.json` points at the subfolder; `sync-vendored.js`, `gates.sh` and CI address the plugin through that path.

## Consequences

Two READMEs (repository and plugin) that must not contradict each other. Scripts carry the `plugins/sdlc-assist/skills/sdlc/bin` prefix. A file is checked by the directory only if it is under the subfolder, so development-only files are free to mention `eval`, tokens and URLs.

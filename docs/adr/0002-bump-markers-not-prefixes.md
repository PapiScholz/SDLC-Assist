# 0002. The release bump comes from `[minor]` / `[major]` markers, never from the commit prefix

Status: accepted
Date: 2026-09-29

## Context

Every push to `main` publishes a release. Something has to decide patch, minor or major. Conventional-commit prefixes (`feat:`, `fix:`) are already used for readability, but using them as the version signal makes every `feat:` a minor bump even when the feature is internal, and a wrongly typed prefix publishes a wrong version. Implemented in `45e6de4` (`.github/scripts/release.sh`).

## Decision

`release.sh` bumps patch unless a commit since the last tag carries `[minor]`, or `[major]` / `BREAKING CHANGE`. `[skip release]` on the head commit skips the release entirely; for a PR the head commit is the merge commit, so the marker goes in the merge subject. The prefix stays a readability convention with no effect on the version.

## Consequences

The bump is an explicit choice made in one commit of the branch. A docs-only PR must be merged with `[skip release]` in its subject or it publishes a patch (v0.5.1 came out of PR #5 this way, recorded in `docs/ci-red-runs.md`). The constitution's Release section states the rule.

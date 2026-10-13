# Spec: the router suggests closing a cycle that already shipped

Phase: deployment
Status: closed
Date: 2026-10-12
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.12.0)
Parent: `docs/specs/2026-10-12-v1-7-plain-steps-and-stages/spec.md` (v1.7, closed)

## Objective

After PR #15 merged and v0.12.0 was tagged, `where.js` still reported "step 4 implement (build)" for the v1.7 cycle, because its spec header said `development` and task 8 was open; nothing told the developer that the cycle had shipped and only needed closing. The router reads headers and task lists, and only close mode writes them, so a shipped cycle that nobody closed looks like work in progress.

The router knows the last semver tag but not when it was cut. With the tag's commit date it can see that a release came out after the active cycle started and say so: "release vX came out after this cycle started: if it shipped, run sdlc close".

## Decisions

- `signals.git.lastSemverTag` gains `date`, the committer timestamp (seconds) of the tag's commit, read with one `git log -1 --format=%ct <tag>`; every existing field stays.
- The suggestion fires only when the active cycle is not closed, its header phase is `development`, `testing` or `deployment`, and the tag's date is later than the spec's first commit (`specStart`, the date the cycle opened); an untracked spec, a repo without tags, or a tag without a date never fires it.
- It is a warning placed first in `warnings`, so the `--brief` line shows it as its note, plus an evidence line; it never changes `inferred`, `step` or `stage` and never writes anything — closing stays a developer decision through close mode.
- The wording says "if it shipped": a patch release cut during a long cycle (a hotfix) also triggers it, and the developer dismisses it by ignoring it.

## Scope

In: `plugins/sdlc-assist/skills/sdlc/bin/lib/signals.js` (`lastSemverTag`), `bin/lib/infer.js`, their self-tests, `docs/ci-red-runs.md`.
Out: close mode itself, `SKILL.md` (the warning reaches the agent through the existing note), any automatic write.

## Clarifications

- 2026-10-12 — Q: Implement now or add to the backlog? A: Now ("hacelo ahora mismo"); this spec was written and approved in the same turn (owner).

## Open Questions

(none)

## Acceptance

- WHEN the active cycle's header phase is `development`, `testing` or `deployment` and the last semver tag's date is later than the spec's first commit, `where.js` SHALL put first in `warnings` a line naming the tag and suggesting `sdlc close`.
- IF the spec is untracked, the repo has no semver tag, or the tag is not later than the spec's first commit, THEN `where.js` SHALL NOT add that warning.
- IF the active cycle's header phase is `initial`, `analysis` or `planning`, THEN `where.js` SHALL NOT add that warning.
- THE SYSTEM SHALL keep `inferred`, `step` and `stage` unchanged when the warning is added.
- THE SYSTEM SHALL keep every field of `signals.git.lastSemverTag` and add `date`.

## Verification record

Pasted command and stdout in `docs/ci-red-runs.md`: the self-tests, `scripts/gates.sh`, and `where.js --brief` on a scratch repo where a tag follows the spec.

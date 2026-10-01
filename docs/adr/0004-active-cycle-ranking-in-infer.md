# 0004. The active cycle is the newest non-closed spec by effective date, computed once in `lib/infer.js`

Status: accepted
Date: 2026-10-01

## Context

Several cycles can be in flight once specs live in folders. The router, the acceptance check and the signals module all need the same answer to "which spec is active", and a header alone cannot say it (a closed spec may be newer than an open one). Implemented in `f67a282` as part of the per-cycle layout.

## Decision

`rankCycles(specs)` in `lib/infer.js` orders specs by effective date (last commit, or mtime when untracked or dirty and newer), newest first; `pickActive` takes the first one whose `Status:` is not `closed`. `signals.js` resolves the active cycle's `plan.md` / `tasks.md` pair with the same ranking, so no caller ranks on its own.

## Consequences

A tie on the effective date falls back to the smaller path, which makes the older dated slug win when two specs land in the same second (deferred in the v1.5 spec's `## Decisions`; to be reversed for date-prefixed slugs in the first cycle that touches `lib/infer.js`). Changing the ranking changes every consumer at once, which is the point.

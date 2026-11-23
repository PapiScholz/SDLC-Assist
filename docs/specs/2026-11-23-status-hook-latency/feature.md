# Feature: status hook latency and repetition (issue #31)

Phase: deployment
Status: closed
Date: 2026-11-23
Owner: Ezequiel Scholz

## Objective

The `sdlc-status.js` hook launches about 16 `git` processes in series on every prompt. On a loaded machine it passes Claude Code's 5 s timeout and gets killed. Its deduplication also reprints the line after every commit, because the line carries day and commit counters. After this change the hook never runs into the timeout, a warm cache costs at most 2 git processes per prompt, and the line repeats only when something real changes.

## Specs

S1. Deadline on git queries
   Quote: "`timeout` (por ejemplo 1500 ms) en cada `execFileSync`/`spawnSync` de `signals.js`"
   Outcome: with `deadlineMs`, every git query in `collectSignals` gets a timeout bounded by the remaining budget, and no query starts once the budget is spent. The result carries `gitTimedOut: true`. The hook then prints nothing and exits 0, because a missing signal can change the inferred step and a wrong line is worse than none. `where.js` passes no deadline and behaves as before.
   Check: `signals.self-test.js`: an already expired `deadlineMs` gives `gitTimedOut: true` with 0 git spawns.

S2. Git query cache between prompts
   Quote: "Cachear el resultado de `collectSignals` en el tmp por sesión (o por repo), con clave `HEAD` + mtime de `.git/index`"
   Outcome: with `gitCache`, git stdout is memoized per repo in the OS temp dir, keyed by the stat of `HEAD`, `index`, `logs/HEAD`, `packed-refs` and `refs/tags`, the plugin version and a 10 min TTL. `status --porcelain` always runs. On a repo with no changes, a second run launches at most 1 git process, and the hook launches at most 2.
   Check: `signals.self-test.js`: second run with `gitCache` gives ≤1 spawn; a new tag invalidates the cache and the result names it.

S3. Dedup without volatile counters
   Quote: "Deduplicar sobre la línea **sin** los contadores volátiles (días, commits)"
   Outcome: within one session, a line that differs from the last printed one only in `(N days ago)` / `(today)` or in `untouched for N days and N commits` is not printed again. A real change, such as a stage, a step or a task, still prints.
   Check: `sdlc-status.self-test.js`: two prompts in the same session in which only the stale counters change print once; closing a task prints again.

## Decisions

- On timeout the hook stays silent instead of printing a partial line: a missing tag or log changes the inferred step.
- The cache memoizes git stdout, not the whole `collectSignals` result: file reads (specs, tasks) stay live and cost no process.
- `status --porcelain` is never cached: the working tree does not move the key.
- The cache applies only to the hook. `where.js` stays uncached and has no deadline, so the CLI stays exact.
- No "silence after N days" for abandoned cycles: with S3 the stale cycle is named once per session, which the issue lists as an acceptable option.
- Out of scope: `classifyRequest` adding `new-cycle` on prompts like "ok" or "push". If it still alternates the line after this change, it goes to its own issue.
- Hook state (git cache and session dedup) lives in a per-user dir created 0700; on POSIX, a dir not owned by the user or open to others is refused (review 1).
- The cache key carries the ref HEAD points to, so it does not depend on the reflog (review 2). A gitDir without HEAD disables the cache (review 3). Outputs over 256 KB are not cached (review 5).
- No millisecond gate in CI (flaky): the budget is asserted as a count of git spawns, which is the measured cause.

## Open Questions

(none)

## Tasks

- [x] T1 Deadline in `git()` and `repoInfo()`, `gitTimedOut` in the result, the hook silent on timeout (S1) — evidence: signals.self-test.js "S1: an already spent deadline"
- [x] T2 Git cache keyed by gitdir stat, a single `rev-parse` in the hook returning toplevel, git-dir and common-dir (S2) — evidence: signals.self-test.js "S2: second run ... at most 1 git"; docs/ci-red-runs.md 2026-11-23 (14 -> 2 spawns)
- [x] T3 `normalize()` in the hook's `changed()` (S3) — evidence: sdlc-status.self-test.js "issue #31 S3"
- [x] T4 Tests for S1-S3, each seen red first — evidence: docs/ci-red-runs.md 2026-11-23 (red runs and injected faults)
- [x] T5 Measurement before and after in `docs/ci-red-runs.md`; `bash scripts/gates.sh` — evidence: docs/ci-red-runs.md 2026-11-23; bash scripts/gates.sh
- [x] T6 Review fixes 1-5: per-user state dir, branch ref in the key, gitDir check, mid-call timeout test, size cap — evidence: signals.self-test.js "review 1"-"review 5"; docs/ci-red-runs.md "Review fixes (2026-11-23)"

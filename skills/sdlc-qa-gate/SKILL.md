---
name: sdlc-qa-gate
version: 0.1.1
description: Runs every applicable verification layer (static, unit, build, runtime, functional, regression) against the built artifact and reports what was verified, what was not, and the residual risk, without ever saying "green". Use for the Testing phase, before a push or a PR, when the plan's tasks are closed, or when asked how sure we are that nothing breaks.
---

# sdlc-qa-gate: verify layers, report risk

## Overview

The Testing phase ends with a table, not a verdict. This skill maps the diff, runs every layer that applies, lists every layer that did not run with its reason, and ends with the next step. Reply in the user's language.

Stack facts come from the `sdlc` skill's `where.js` (locate `bin/` as that skill describes; never re-implement detection):

```
node "<sdlc bin>/where.js" --message-file "<temp file>"
```

Read `signals.testRunner.kind` (`npm`, `pytest`, `cargo`, `go`, or null) and `.command`, `signals.git.commits` (recent commits with paths), `signals.sourceFiles`. Running the suite here is the gate's job: the user asking for the gate is the request to run it.

Parallel agents: when the host can spawn agents, independent layers (static, unit, build) may run in parallel; each agent reports only its own layer's row and raw output, and this skill composes the table. Runtime and functional stay sequential because functional needs the runtime instance.

## Diff map

Before any layer, list the changed files since the base the user names (default: the merge base with the default branch; read-only `git diff --name-only <base>...HEAD`, plus `git status --short` for uncommitted work). For each file record:

| File | Domain | Existing coverage | Nature |
|---|---|---|---|
| `<path>` | logic / API / UI / integration / config / CI / docs | `<test file(s)>` or none | dead-code / refactor / new-logic / ci-infra / config |

Rules: `new-logic` with coverage `none` is a gap; the report names it and proposes the test, and writes it only if the user asks. Docs-only diffs skip unit, build, runtime and functional and say so.

## Layers

Cheapest first. Every layer either runs or appears in the report as not run with the reason. Commands by ecosystem; when `signals.testRunner.kind` is null and no manifest is found, every layer is `not run: no runner detected, verify by hand`.

| Layer | Applies when | Command (npm/pnpm/yarn · Python · Rust · Go · JVM) | Passes when |
|---|---|---|---|
| static | a type checker or linter is configured (`tsconfig.json`, lint script, `ruff`/`mypy` config, `clippy`, `go vet`, Gradle/Maven check) | `npx tsc --noEmit` and the lint script · `ruff check .` / `mypy .` · `cargo clippy` · `go vet ./...` · `./gradlew check` or `mvn -q verify -DskipTests` | exit 0 |
| unit | `signals.testRunner.kind` is set | `signals.testRunner.command` | full suite exit 0, zero unjustified skips (list each skip with its reason) |
| build | a build step exists (`build` script, `pyproject` build backend, `Cargo.toml`, `go build`, Gradle/Maven) | `npm run build` · `python -m build` · `cargo build --release` · `go build ./...` · `./gradlew build -x test` or `mvn -q package -DskipTests` | the artifact exists and its manifests are complete (no missing entry the build was expected to emit) |
| runtime | the diff touches UI, API, config or dependencies | start the built artifact in production mode on a free port the user did not reserve (never dev mode), wait up to 30 s, `curl -sf http://127.0.0.1:<port>/` | answers within the timeout |
| functional | the diff touches UI or API | against the runtime instance: an authenticated health call first (must return 200), then each changed route or endpoint | changed routes answer without errors |
| regression | shared modules changed (utils, stores, schemas, shared types) | the suites of untouched modules that import the changed ones (find importers with `grep -rl`) | they still pass |

Stop the runtime instance you started by its process id, never by pattern. Report the exact command and exit code of every layer that ran.

## Report

Mandatory format, always complete, one row per layer:

```
| Layer | Verified | Not verified | Residual risk |
|---|---|---|---|
| static | <what ran, exit code> | <what did not, why> | <low / medium / high: why> |
| unit | ... | ... | ... |
| build | ... | ... | ... |
| runtime | ... | ... | ... |
| functional | ... | ... | ... |
| regression | ... | ... | ... |
```

Then one line per gap from the diff map (`gap: <file> new-logic without a covering test; proposed: <test name>`).

The words "green", "100%" and "safe" never appear as a verdict. The report ends with the next step: `sdlc close` for Testing when the user accepts the residual risk, otherwise the fix list in order.

## Never

- Run dev mode as a substitute for the built artifact.
- Kill processes by a broad pattern; stop only the process id you started.
- Claim a layer passed that did not run, or shorten the table.
- Write a missing test without asking first.
- Run state-changing git commands; the diff map uses read-only queries only.

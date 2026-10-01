# Constitution template

A constitution is the short list of rules every spec, plan and implementation in the project obeys. The router detects it (`docs/constitution.md`, or root `CONSTITUTION.md` when `docs/` has none), reports it as `signals.constitution` (`exists`, `path`, `sections`) and the phase sheets cite it. It is optional: without one the router says nothing. It is not a `CLAUDE.md`: that file is how agents work in one checkout; the constitution is product rules that outlive any tool.

Required: a title and at least one `## ` section. Suggested sections below, each with one example line taken from this repository's own constitution. Keep every principle short and checkable: in review at least, by a gate, a test or a lint when possible.

```markdown
# Constitution: <project>

## Principles

- Spec first: behavior changes start in `docs/specs/` with the header `Phase: analysis` / `Status: draft`.
- Gates before any commit: `bash scripts/gates.sh` runs the same checks CI runs.
- Records are pasted output: every dogfood run shows the exact command and its real stdout.

## Never

- Edit vendored skills here: propose upstream, then bump the pin.
- Push to `main` without a release intent or `[skip release]` in the head commit.

## Testing

- Every script ships a `*.self-test.js` run by `scripts/gates.sh`; install-smoke runs the installed copy on scratch repos.

## Release

- Every push to `main` publishes a release; bump markers (`[minor]`, `[major]`) decide the version, never the commit prefix.

## Amendments

- <YYYY-MM-DD>: created from <source>.
```

How the phases use it:

- **initial**: when the repo has no constitution, offer this template as the first artifact (optional; the first spec is the one that ends `initial`).
- **analysis**: read `constitution.path`; a spec that contradicts a principle names the amendment in its `## Decisions`.
- **planning** and **development**: the plan and the implementation are checked against the principles.
- **testing** (`sdlc-qa-gate`): principles that have a check (a gate, a test, a lint) are run in the regression layer; the rest are listed as not verified.

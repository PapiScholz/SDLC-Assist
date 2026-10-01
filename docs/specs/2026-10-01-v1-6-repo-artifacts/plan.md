# Plan — v1.6 repo artifacts the router detects and cites

Spec: `spec.md` beside this file. Three plans, one PR each, in this order, each merged with a merge commit before the next starts. `[minor]` goes in a branch commit; this cycle's docs-only PRs (open, close) are merged with `[skip release]` in the merge subject.

| # | Plan | Branch | Bump | Touches scripts |
|---|---|---|---|---|
| A | ADRs: signal, template, sheets, `check-adr.js`, five retroactive ADRs | `v1.6-adr` | `[minor]` → v0.9.0 | yes |
| B | ARCHITECTURE.md: signal via shared `findDoc`, template, sheets, this repo's file | `v1.6-architecture` | `[minor]` → v0.10.0 | yes |
| C | Repo hygiene: signal, reference, sheets, `.editorconfig`, flow diagram, README | `v1.6-hygiene` | `[minor]` → v0.11.0 | yes |

Dependencies: A before B (B's `architecture-template.md` lists accepted ADRs; B's sheet edits sit next to A's). B before C (C's `hygiene` reuses `architecture.exists`; C's README and flow edits name all three).

## Plan A — ADRs (`v1.6-adr`)

Reuse: `findSpecs`/`listDir` pattern and the `parseHeader`-style line regex in `lib/signals.js`; `unfencedLines` in `lib/unfenced.js`; `check-acceptance.js` as the model for `check-adr.js` (arg parsing, `--root`, warn lines, exit 0, `--strict`); the advisory line in `scripts/gates.sh:14`.

- A.1 Signal, tests first. `signals.self-test.js`: no dir → `{ exists:false, dir:null, count:0, byStatus:{}, latest:null }`; `docs/adr/0001-x.md` + `0002-y.md` with `Status:` lines → count 2, `byStatus { accepted:1, proposed:1 }`, `latest { number:2, path, status }`; `docs/decisions/` found when `docs/adr/` is absent, `docs/adr/` wins when both; a file not matching `NNNN-slug.md` is ignored; `Status: superseded by 0001` counts as `superseded`. Then `findAdrs(root)` in `lib/signals.js`, field `adr` in `collectSignals`. One assertion in `where.self-test.js`.
- A.2 `references/adr-template.md`: Nygard (Status, Context, Decision, Consequences), file name `NNNN-slug.md`, `Status:` values `proposed | accepted | deprecated | superseded by NNNN`, and the rule for when a `## Decisions` bullet becomes an ADR: (a) contradicts a constitution principle, (b) adds or removes a dependency or technology, (c) changes a public contract or interface. The bullet gets a `[ADR]` mark.
- A.3 Sheets (`references/phases/`): `analysis.md` Do now: mark the qualifying `## Decisions` bullets with `[ADR]` and create them as `proposed`; `planning.md`: the plan references ADRs by number; `development.md` Governance: an ADR goes `accepted` in the commit that implements it; `deployment.md`: ADRs still `proposed` are listed at cycle close. `check-sheets.js` must stay green (labels only).
- A.4 `SKILL.md` step 6: `ADRs: <dir> (<n> accepted, <m> proposed)` only when `adr.exists`. Close mode on `analysis`: a `[ADR]` bullet with no matching file is a warning line, never a block (stated next to the open-questions rule).
- A.5 `check-adr.js` + `check-adr.self-test.js` (red first): duplicate numbers, invalid `Status`, `superseded by` pointing at a missing number → `warn <path>: <reason>`, summary line, exit 0 (`--strict` exits 1). Added to `gates.sh` as advisory and to `CONTRIBUTING.md`'s gate list.
- A.6 Dogfood: `docs/adr/0001-plugin-in-a-subfolder.md`, `0002-bump-markers-not-prefixes.md`, `0003-constitution-never-required.md`, `0004-active-cycle-ranking-in-infer.md`, `0005-per-cycle-layout-no-fallback.md`, all `accepted`, dated with the commit that implemented each (git log). `docs/constitution.md` `## Amendments`: one line pointing at `docs/adr/`. `where.js` before/after pasted as dogfood (b). Install-smoke (`.github/workflows/ci.yml`): assert `adr.count === 0` on the existing empty fixture and `adr.count === 2` on a new fixture with two ADRs.
- Verify A: `bash scripts/gates.sh` → `all gates ok` incl. `ok check-adr (advisory)`; self-tests signals/where/check-adr green; CI 4/4; PR merged with a merge commit.

## Plan B — ARCHITECTURE.md (`v1.6-architecture`)

Reuse: generalize `findConstitution` into `findDoc(root, paths)` returning `{ exists, path, sections }`; `constitution` and `architecture` both call it (existing constitution self-tests must pass unchanged).

- B.1 Signal, tests first: `architecture` from `ARCHITECTURE.md` (root) or `docs/architecture.md`, same three fixtures as the constitution cases (absent, root, docs fallback and precedence). `where.self-test.js` assertion.
- B.2 `references/architecture-template.md`: Overview, Structure (table folder → purpose), Components and boundaries, Data flow, Decisions (accepted ADRs by number; "ARCHITECTURE.md is the current state, `docs/adr/` is how it got there"). Short; what changes often goes to an ADR.
- B.3 Sheets: `initial.md` offers it with the constitution; `analysis.md` reads it before the spec (a spec that moves a boundary says so in `## Decisions` with `[ADR]`); `development.md`: a diff that changes `## Structure` or a boundary updates `ARCHITECTURE.md` in the same PR.
- B.4 `SKILL.md` step 6: `Architecture: <path> (<n> sections)` only when it exists.
- B.5 Dogfood: this repo's `ARCHITECTURE.md` with the real map (`plugins/sdlc-assist/` = what ships; `scripts/` = gates and hooks; `docs/` = specs, plans, adr, records; `tasks/` = legacy plan/todo; `.github/` = CI and release) and the five ADRs listed. Install-smoke asserts `architecture.exists` on a fixture that has the file. `where.js` before/after as dogfood (c).
- Verify B: gates, self-tests, CI, merge commit.

## Plan C — repo hygiene (`v1.6-hygiene`)

- C.1 Signal, tests first: `hygiene: { present: [...], missing: [...], license: boolean }` over the closed list `LICENSE*` (glob, `license` = any match), `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.gitignore`, `.gitattributes`, `.editorconfig`, `ARCHITECTURE.md` (reuses `architecture.exists`). Read-only, no git. Fixtures: empty dir → 9 missing; full dir → 0 missing; `LICENSE.md` counts as license. `where.self-test.js` assertion.
- C.2 `references/repo-hygiene.md`: per file one "why" line and its canonical source (choosealicense.com, Contributor Covenant, GitHub `gitignore` and SECURITY templates, editorconfig.org; Keep a Changelog not included). No copied content. Last line (item 14): write them by hand from those sources, or with an installed skill found via `npx skills find`; no generator ships here.
- C.3 Sheets: `initial.md` Do now lists `hygiene.missing` before the first spec (`.gitignore` and `.gitattributes` before the first commit); `deployment.md` Warns when: `LICENSE` or `SECURITY.md` missing and `!signals.inProduction`. No other sheet mentions hygiene.
- C.4 `SKILL.md` step 6: `Repo hygiene: missing <list>` only in `initial` and `deployment` (same `!inProduction` condition in deployment).
- C.5 Dogfood: this repo adds `.editorconfig` (LF, UTF-8, 2 spaces for js/json/yml, matching `.gitattributes`); `where.js` shows `hygiene.missing: []`. Install-smoke asserts `hygiene.missing.length === 9` on the empty fixture and `0` on a full one.
- C.6 Transversal: `docs/sdlc-flow.md` replaces the constitution node with one dashed node "cross-cycle artifacts: constitution, ADRs, ARCHITECTURE.md" (validate both Mermaid blocks with the MCP; read `valid` from the saved result with node, never inline); `README.md` "How to use" step 0 becomes "Day one: constitution, architecture, repo hygiene", ADRs mentioned in the analysis step; `plugins/sdlc-assist/README.md` unchanged.
- Verify C: gates, self-tests, CI, merge commit.

## Close

`sdlc-qa-gate` at close (static `node --check`, unit self-tests, functional one probe per `## Acceptance` bullet on throwaway repos via a `.sh` in the scratchpad, regression = constitution principles with a check + the ADR/architecture/hygiene checks), table into the spec's `## Verification record`; header `Phase: deployment` / `Status: closed`; `tasks.md` all ticked; dogfood (d) with the three releases; docs-only PR merged with `[skip release]`. Then reinstall `~/.agents/skills`, update `.claude/handoff.md` and memory.

## Rules that hold for every PR

- TDD: self-test cases red first, then the code; `signals.self-test.js` git helpers (`T1`, `execFileSync`) are defined mid-file, so git-based cases go after them.
- Commits with a fixture need a `.sh` in the scratchpad run with `bash <script>`: the git guard blocks inline `git commit` even on `mktemp` repos.
- Every git state change (commit, push, PR, merge) waits for the owner's typed verb in that turn.
- `docs/ci-red-runs.md` is append-only, pasted output with the command.
- `gates.sh` → `all gates ok` and LF files before any commit; vendored skills untouched.

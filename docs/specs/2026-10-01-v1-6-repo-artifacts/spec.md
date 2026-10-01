# Spec: v1.6 — repo artifacts the router detects and cites (ADRs, ARCHITECTURE.md, hygiene)

Phase: development
Status: approved
Date: 2026-10-01
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.8.0)
Parent: `docs/specs/2026-09-30-v1-5-sdd-alignment.md` (v1.5, closed)

## Objective

v1.5 made the constitution the first artifact that outlives a cycle: the
router detects it and the phase sheets cite it. Two more kinds of knowledge
still die with each cycle or never get written: the decisions that outlive
the spec (`## Decisions` bullets and the plan's architecture notes), and the
current shape of the repository (structure, boundaries, and the hygiene files
a public repo needs from day one). This cycle adds three read-only signals
with the same design rule as the constitution: **detect, cite, offer; never
write those files; never nag** (each signal is mentioned only in the phases
that act on it). It is also the first cycle that dogfoods the per-cycle
layout from v1.5 plan 3 (`spec.md`, `plan.md`, `tasks.md` in this folder).
Three deliverables, one plan and one PR each:

1. ADRs: signal `adr` over `docs/adr/` (or `docs/decisions/`), a Nygard
   template, the rule for when a `## Decisions` bullet becomes an ADR, the
   sheets that read and advance them, and an advisory `check-adr.js`. This
   repository writes its five retroactive ADRs.
2. Architecture: signal `architecture` over `ARCHITECTURE.md` (or
   `docs/architecture.md`), a short template, the sheets that read it and
   keep it current. This repository writes its own.
3. Repo hygiene: signal `hygiene` over a closed list of nine files, a
   reference that says why each exists and where its canonical source is,
   mentioned in `initial` and `deployment` only. This repository adds the
   one it lacks (`.editorconfig`).

## Decisions

- ADR directory: `docs/adr/` is the default; `docs/decisions/` is also detected; `docs/adr/` wins when both exist — one convention, one fallback, no config.
- ADR template is Nygard with four sections (Status, Context, Decision, Consequences), file name `NNNN-slug.md`, `Status:` in `proposed | accepted | deprecated | superseded by NNNN` — the shortest form that is still greppable.
- A `## Decisions` bullet becomes an ADR when it (a) contradicts a constitution principle, (b) adds or removes a dependency or technology, or (c) changes a public contract or interface; the bullet gets a `[ADR]` mark — the rest stay in the spec.
- Three plans A → B → C (ADRs, architecture, hygiene), one PR each, `[minor]` in the branch commit → v0.9.0, v0.10.0, v0.11.0 — each signal is independently useful and independently revertible.
- Hygiene is a closed list of nine: `LICENSE*`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.gitignore`, `.gitattributes`, `.editorconfig`, `ARCHITECTURE.md`; `license` is presence only, never a content check — the router is not a license linter.
- `check-adr.js` is advisory: duplicate numbers, invalid `Status`, `superseded by` pointing at a missing number; numbering gaps are allowed because ADRs are deprecated, never deleted; exit 0, `--strict` exits 1 — same contract as `check-acceptance.js`.
- This repository writes five retroactive ADRs (plugin in a subfolder, bump markers not prefixes, constitution never required, active-cycle ranking in infer, per-cycle layout without fallback), all `accepted`, dated from git log.
- The hygiene warning in `deployment` fires only when `!signals.inProduction` — a repo already in production has shipped without those files; nagging it is noise.
- The "no generator ships here" note (item 14) is one line in `references/repo-hygiene.md`; `which.js` is untouched — the install path stays what v1.4 shipped.
- Deferred from v1.5 (2026-10-01, owner: Ezequiel Scholz): `rankCycles` tie-break by smaller path. Plan A does not touch `lib/infer.js`; fix it in the first cycle that does.
- Signals are read-only and git-free; the skill never writes `docs/adr/`, `ARCHITECTURE.md` or any hygiene file — it detects, cites and offers, like the constitution.

## Scope

In: `plugins/sdlc-assist/skills/sdlc/bin/lib/signals.js` (three new signals, `findDoc` shared by constitution and architecture), `bin/check-adr.js` and its self-test, `references/adr-template.md`, `references/architecture-template.md`, `references/repo-hygiene.md`, `references/phases/{initial,analysis,planning,development,deployment}.md`, `SKILL.md` step 6 and close mode on `analysis`, `scripts/gates.sh` (advisory line), `CONTRIBUTING.md` gate list, `.github/workflows/ci.yml` install-smoke assertions, `docs/sdlc-flow.md` (one dashed node), both `README.md` files as listed per plan, this repository's `docs/adr/`, `ARCHITECTURE.md`, `.editorconfig`, `docs/constitution.md` `## Amendments`.
Out: `which.js`, `lib/infer.js`, the vendored skills, any generator or writer for the detected files, the `testing` sheet, any config key.

## Clarifications

- 2026-10-01 — Q: Which directory holds ADRs? A: `docs/adr/` by default, `docs/decisions/` also detected, `docs/adr/` wins when both exist (owner).
- 2026-10-01 — Q: Which ADR template? A: Nygard, four sections: Status, Context, Decision, Consequences (owner).
- 2026-10-01 — Q: One PR or several? A: Three plans A → B → C, one PR each, `[minor]` each (owner).
- 2026-10-01 — Q: What is the hygiene list and how is a license judged? A: Closed list of nine including `.editorconfig`; `license` is presence only (owner).
- 2026-10-01 — Q: Does `check-adr.js` block? A: Advisory: duplicates, invalid `Status`, invalid `superseded by` target; numbering gaps allowed (owner).
- 2026-10-01 — Q: Which retroactive ADRs does this repo write? A: The five in the proposal: plugin subfolder, bump markers, constitution never required, active-cycle ranking, per-cycle layout (owner).
- 2026-10-01 — Q: When does the deployment sheet warn about hygiene? A: Only when `!signals.inProduction` (owner).
- 2026-10-01 — Q: Does a hygiene generator ship? A: No. Item 14 is one line in `repo-hygiene.md` pointing at hand-written files or an installed skill; `which.js` untouched (owner).

## Open Questions

(none)

## Acceptance

Signals (`lib/signals.js`, read-only, no git):

- WHEN no ADR directory exists, `where.js` SHALL report `adr` as `{ exists: false, dir: null, count: 0, byStatus: {}, latest: null }`.
- WHEN `docs/adr/` holds files named `NNNN-slug.md` with a `Status:` line, `where.js` SHALL report `adr.count`, `adr.byStatus` keyed by status, and `adr.latest` as the highest number with its path and status.
- WHERE only `docs/decisions/` exists, `where.js` SHALL report it as `adr.dir`.
- WHILE both `docs/adr/` and `docs/decisions/` exist, `where.js` SHALL report `docs/adr/` as `adr.dir`.
- IF a file in the ADR directory does not match `NNNN-slug.md`, THEN `where.js` SHALL ignore it.
- WHEN a `Status:` line reads `superseded by NNNN`, `where.js` SHALL count it under `byStatus.superseded`.
- WHEN `ARCHITECTURE.md` exists at the root, `where.js` SHALL report `architecture` as `{ exists: true, path, sections }` with the `##` headings as `sections`.
- WHERE only `docs/architecture.md` exists, `where.js` SHALL report it as `architecture.path`.
- WHILE both `ARCHITECTURE.md` and `docs/architecture.md` exist, `where.js` SHALL report the root file.
- THE SYSTEM SHALL compute `constitution` and `architecture` through one shared `findDoc(root, paths)` so the existing constitution self-tests pass unchanged.
- THE SYSTEM SHALL report `hygiene` as `{ present, missing, license }` over the closed list of nine files.
- WHEN the repository has none of the nine files, `where.js` SHALL report nine entries in `hygiene.missing`.
- WHEN a file matching `LICENSE*` exists, `where.js` SHALL report `hygiene.license` as `true`.
- THE SYSTEM SHALL compute `hygiene` without reading git and without writing any file.

Sheets (`references/phases/`, `check-sheets.js` stays green):

- WHILE in `analysis`, THE ROUTER SHALL tell the author to mark qualifying `## Decisions` bullets with `[ADR]` and create them as `proposed`.
- WHILE in `planning`, THE ROUTER SHALL tell the author to reference ADRs by number in the plan.
- WHILE in `development`, THE ROUTER SHALL state that an ADR goes `accepted` in the commit that implements it.
- WHILE in `deployment`, THE ROUTER SHALL list ADRs still `proposed` at cycle close.
- WHILE in `initial`, THE ROUTER SHALL offer `ARCHITECTURE.md` next to the constitution.
- WHILE in `analysis`, THE ROUTER SHALL read `ARCHITECTURE.md` before the spec and require a `[ADR]` bullet for a spec that moves a boundary.
- WHILE in `development`, THE ROUTER SHALL require a diff that changes `## Structure` or a boundary to update `ARCHITECTURE.md` in the same PR.
- WHILE in `initial`, THE ROUTER SHALL list `hygiene.missing` before the first spec, with `.gitignore` and `.gitattributes` before the first commit.
- WHILE in `deployment` and `signals.inProduction` is false, THE ROUTER SHALL warn when `LICENSE` or `SECURITY.md` is missing.
- IF `signals.inProduction` is true, THEN THE ROUTER SHALL NOT mention hygiene in `deployment`.
- THE SYSTEM SHALL mention hygiene in no sheet other than `initial` and `deployment`.
- THE SYSTEM SHALL mention ADRs in no sheet other than `analysis`, `planning`, `development` and `deployment`.

Router output (`SKILL.md` step 6 and close mode):

- WHERE `adr.exists` is true, THE ROUTER SHALL print `ADRs: <dir> (<n> accepted, <m> proposed)`.
- WHERE `architecture.exists` is true, THE ROUTER SHALL print `Architecture: <path> (<n> sections)`.
- WHILE in `initial` or `deployment`, THE ROUTER SHALL print `Repo hygiene: missing <list>` when `hygiene.missing` is not empty, under the same `!inProduction` condition in `deployment`.
- IF a signal is absent, THEN THE ROUTER SHALL print nothing for it.
- IF a `[ADR]` bullet has no matching ADR file when closing `analysis`, THEN THE ROUTER SHALL print a warning line and SHALL NOT block the close.
- THE SYSTEM SHALL never write `docs/adr/`, `ARCHITECTURE.md` or any hygiene file.

Checks (`bin/check-adr.js`, `scripts/gates.sh`):

- WHEN two ADR files carry the same number, `check-adr.js` SHALL print `warn <path>: duplicate number NNNN`.
- WHEN a `Status:` value is outside `proposed | accepted | deprecated | superseded by NNNN`, `check-adr.js` SHALL print `warn <path>: invalid status`.
- WHEN `superseded by NNNN` names a number with no file, `check-adr.js` SHALL print `warn <path>: superseded by missing NNNN`.
- IF numbering has gaps, THEN `check-adr.js` SHALL NOT warn.
- THE SYSTEM SHALL exit 0 from `check-adr.js` with warnings, and exit 1 only with `--strict`.
- WHEN `scripts/gates.sh` runs, THE SYSTEM SHALL print `ok check-adr (advisory)` and end with `all gates ok`.

References and dogfood:

- THE SYSTEM SHALL ship `references/adr-template.md`, `references/architecture-template.md` and `references/repo-hygiene.md` under the skill, with no copied third-party content.
- THE SYSTEM SHALL hold five `accepted` ADRs in this repository's `docs/adr/`, dated from the commits that implemented them.
- THE SYSTEM SHALL hold an `ARCHITECTURE.md` in this repository that lists the five ADRs by number.
- WHEN `where.js` runs at this repository's root after plan C, THE SYSTEM SHALL report `hygiene.missing` as empty.
- WHEN the install-smoke job runs, THE SYSTEM SHALL assert `adr.count`, `architecture.exists` and `hygiene.missing.length` on fixtures with and without the files.
- THE SYSTEM SHALL keep `which.js`, `lib/infer.js` and the vendored skills unchanged across the three plans.

## Verification record

Pasted output goes to `docs/ci-red-runs.md`, section "v1.6 dogfood": (a) this spec's open (router and `check-acceptance.js`), (b) `where.js` before and after plan A, (c) before and after plan B, (d) the three releases at close. The qa-gate table at close goes here.

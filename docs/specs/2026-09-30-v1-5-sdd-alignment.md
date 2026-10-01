# Spec: v1.5 — SDD alignment (positioning, EARS, clarifications, per-cycle layout, constitution)

Phase: deployment
Status: closed
Date: 2026-09-30
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.8.0; this cycle shipped v0.6.0, v0.7.0 and v0.8.0)
Parent: `docs/specs/2026-09-30-v1-4-plugin-subfolder.md` (v1.4, closed)

## Objective

Spec-driven development as taught today (Spec Kit's seven steps: constitution,
specify, clarify, plan, tasks, implement, validate, loop) has four things this
router does not: a constitution per project, a clarification step with a
written outcome, requirements in a verifiable form (EARS), and one plan and
one task list per feature. The router's six phases and its header stay: they
are what lets it infer where a repo is instead of assuming it. Five
deliverables, one plan file each (constitution and clarifications share the
layout plan's spec template):

1. Positioning: the README says the router is spec-anchored (the spec lives,
   its header advances, behavior changes start there) and not spec-as-source.
2. EARS: the router ships its own spec template whose `## Acceptance` holds
   one requirement per line in one of the five EARS shapes; a form check
   counts the lines that follow none of them and warns, never fails.
3. Clarifications: the template carries `## Clarifications` (date, question,
   answer); close mode refuses to close `analysis` while `## Open Questions`
   still has bullets, and offers to move each one to Clarifications or to a
   dated, owned deferral.
4. Per-cycle layout: a cycle may be a folder `docs/specs/<date>-<slug>/` with
   `spec.md`, `plan.md` and `tasks.md`; the router reads the plan and task
   list beside the active spec and falls back to `tasks/plan.md` and
   `tasks/todo.md`. Several cycles can be in flight.
5. Constitution: `docs/constitution.md` is a signal (`constitution.exists`),
   the planning and development sheets cite it, a template ships, and this
   repository writes its own from the rules in `CLAUDE.md`.

## Decisions

- Deferred (2026-10-01, owner: Ezequiel Scholz): `rankCycles` breaks an effective-date tie by the smaller path, so of two specs committed in the same second the older dated slug is active. Reverse the tie-break for date-prefixed slugs in the next cycle that touches `lib/infer.js`; found by the qa-gate regression probe at close.
- Order of the plans: positioning, EARS, layout (with clarifications),
  constitution. Each lands as its own PR on this spec; the layout plan goes
  before the constitution plan because the sheets that cite the constitution
  are rewritten by the layout plan.
- The six phases and the `Phase:`/`Status:` header do not change. Clarify is
  a rule inside `analysis`, not a seventh phase.
- Checks warn; they do not fail. `gates.sh` stops at the first failure, and
  specs written before v1.5 are not rewritten, so the EARS and open-question
  checks print and exit 0. A later cycle may promote them once every open
  spec passes.
- Closed cycles (v1.0 to v1.4), `tasks/plan.md` and `tasks/todo.md` are not
  migrated. The legacy paths stay readable forever; the folder layout is
  the default from the first cycle opened after v1.5. This cycle itself uses
  the legacy paths (`tasks/plan.md` as index of the four plans), because the
  folder layout does not exist until its plan lands.
- The constitution is detected and cited, never required: a repo without one
  still enters `analysis`. It is a short list of non-negotiable rules, not a
  second README.
- The vendored `spec-driven-development` skill is not edited. Its template
  stays the reference for the body; the router's own template adds the
  header, `## Acceptance` in EARS and `## Clarifications`, and says so.
- Spec-anchored, stated in the README and in the plugin README in one line
  each, with the taxonomy (spec-first, spec-anchored, spec-as-source) named
  so a reader coming from Spec Kit places the tool at once.

## Scope

In: `docs/plans/plan-positioning.md`, `plan-ears.md`, `plan-layout.md`,
`plan-constitution.md`; `tasks/plan.md` (index) and `tasks/todo.md`; the
files each plan names.

Out: migrating old specs; failing gates; a seventh phase; editing vendored
skills; generating code from specs.

## Clarifications

- 2026-09-30 — Q: constitution scope? A: detected and cited, never blocking.
- 2026-09-30 — Q: EARS enforcement? A: form check that warns; template asks for it.
- 2026-09-30 — Q: layout? A: folder per cycle, legacy paths still read, nothing migrated.
- 2026-09-30 — Q: clarification step? A: section in the spec plus a close rule, no new phase.
- 2026-09-30 — Q: packaging? A: one cycle, four plans, one PR per plan, order positioning → EARS → layout → constitution.
- 2026-09-30 — Q: dogfood the constitution here? A: yes, from the rules in `CLAUDE.md`, which then links it.

## Open Questions

(none)

## Acceptance

- THE SYSTEM SHALL report `constitution.exists` and `constitution.path` in `where.js` output for any repo.
- WHEN `docs/specs/<slug>/spec.md` exists with a header, THE SYSTEM SHALL list it as a cycle with `plan` and `todo` taken from `plan.md` and `tasks.md` in the same folder.
- WHEN the active spec is a flat `docs/specs/<name>.md`, THE SYSTEM SHALL keep reading `tasks/plan.md` and `tasks/todo.md`.
- IF a spec's `## Acceptance` has a bullet that matches no EARS shape, THEN the acceptance check SHALL print the file and line and exit 0.
- IF `## Open Questions` has bullets, THEN THE ROUTER SHALL refuse to close `analysis` and list them.
- THE SYSTEM SHALL ship `references/spec-template.md` and `references/constitution-template.md` and name both from the `analysis` and `planning` sheets.
- WHILE two folder cycles are active, THE SYSTEM SHALL not emit the "one planned cycle at a time" warning.
- THE SYSTEM SHALL keep `bash scripts/gates.sh` at `all gates ok` after every plan, with the new checks included.

## Verification record

Pasted output goes to `docs/ci-red-runs.md` under "v1.5 dogfood", one block
per plan: (a) opening run, (b) EARS check, (c) folder cycle, (d) constitution,
(e) qa-gate at close. Releases: v0.6.0 (PR #6), v0.7.0 (PR #7), v0.8.0 (PR #8).

sdlc-qa-gate report at close (2026-10-01, `main` at 3e4dce5):

| Layer | Verified | Not verified | Residual risk |
|---|---|---|---|
| static | `node --check` on the 34 scripts under `bin/`, `bin/lib/` and `scripts/hooks/`, exit 0; `bash scripts/gates.sh` `all gates ok` (manifest, sheets, frontmatter, skill sections, EOL, acceptance advisory) | no linter or type checker is configured | low: the gates are the repo's static layer by design |
| unit | 14 self-test suites, 0 failed (check-acceptance 13, check-eol 6, check-frontmatter 10, check-manifest 16, check-sheets 10, check-skill-sections 7, sync-vendored ok, where 29, which 15, header 13, infer 29, keywords 30, signals 31, todo 6) | nothing | low |
| build | not applicable: no `package.json`, no build step, the artifact is the source tree | — | none |
| runtime | not applicable: no server or UI; the scripts ran on throwaway repos in the functional layer | — | none |
| functional | 8 of 8 `## Acceptance` bullets probed on throwaway repos (`qa-gate-v15.sh`, pasted in `docs/ci-red-runs.md` (e)) | bullet 5 probes the `N open questions` line of `check-acceptance`; the router's refusal to close is agent behavior stated in `SKILL.md`, not runnable | low |
| regression | the 11 suites of untouched modules still pass (unit row); CI install-smoke ran the installed copy on both fixtures (PR #7, #8); constitution principles with a check: gates (run), LF files (check-eol, run), vendored intact (sync-vendored, run) | principles without a check (spec first, dogfood first, pasted records, bump markers, no co-authorship) are review-only; finding: two cycles with the same effective date (same-second commits) rank by smaller path, so the older dated slug wins the tie | low: same-second ties happen only when two specs land in one commit; deferred, see `## Decisions` |

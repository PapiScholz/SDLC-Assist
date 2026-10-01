# Plan 2/4 — EARS acceptance and the router's own spec template

Spec: `docs/specs/2026-09-30-v1-5-sdd-alignment.md` (deliverable 2, and the template half of deliverable 3). PR 2 of v1.5. Branch `v1.5-ears`. Bump marker: `[minor]` (new reference file, new check, new skill behavior).

## Why

Today a spec's acceptance is prose; the qa-gate has to invent what to verify. EARS (Easy Approach to Requirements Syntax) gives five fixed shapes, one sentence per behavior, each of which maps to a test. The router ships no template of its own: the body comes from the vendored `spec-driven-development` skill, which cannot be edited. The router's template adds what the router needs (header, EARS acceptance, clarifications) and points at the vendored skill for the rest.

## EARS shapes (what the check recognizes)

| Shape | Line starts with | Example |
|---|---|---|
| Ubiquitous | `THE SYSTEM SHALL` | THE SYSTEM SHALL report `constitution.exists`. |
| Event-driven | `WHEN <trigger>, THE SYSTEM SHALL` | WHEN `spec.md` exists in a folder, THE SYSTEM SHALL list it as a cycle. |
| State-driven | `WHILE <state>, THE SYSTEM SHALL` | WHILE two folder cycles are active, THE SYSTEM SHALL not warn. |
| Unwanted behavior | `IF <condition>, THEN THE SYSTEM SHALL` | IF a bullet matches no shape, THEN THE SYSTEM SHALL print it. |
| Optional feature | `WHERE <feature>, THE SYSTEM SHALL` | WHERE a constitution exists, THE SYSTEM SHALL cite it. |

"THE SYSTEM" may be replaced by a named component in backticks or capitals (`where.js`, THE ROUTER). Matching is case-insensitive on the keywords and tolerant of a leading `- ` or `1. `. Everything else in the section (a sub-heading, a note line without a bullet) is ignored.

## Tasks

1. **Template.** New `plugins/sdlc-assist/skills/sdlc/references/spec-template.md`: the header block from `spec-header.md`, then `## Objective`, `## Decisions`, `## Scope`, `## Clarifications` (format: `- <date> — Q: … A: …`), `## Open Questions`, `## Acceptance` (EARS, one bullet per behavior, the table above inlined), `## Verification record`. One paragraph at the top: "Body sections beyond these follow the vendored `spec-driven-development` template (tech stack, boundaries, success criteria); this file adds what the router reads."
2. **Check, test first.** New `plugins/sdlc-assist/skills/sdlc/bin/check-acceptance.js [--root <dir>] [--strict]`: for every cycle spec the router would find (reuse `findSpecs` from `lib/signals.js`, so the folder layout from plan 3 is covered for free once it lands), locate `## Acceptance`, take its bullets, classify each against the five shapes, print `warn <file>:<line> not EARS: <first 60 chars>` for the rest, print a summary `check-acceptance: N specs, M bullets, K not EARS`, exit 0; `--strict` exits 1 when K > 0. Specs with no `## Acceptance` section print one `warn <file>: no ## Acceptance` and count as 0 bullets. New `check-acceptance.self-test.js`: fixtures for each shape (pass), a prose bullet (warn), a spec without the section (warn), `--strict` exit 1, legacy flat spec and folder spec both found. Run red first, then implement.
3. **Open questions in the same check.** `check-acceptance.js` also reports `warn <file>: N open questions` when `## Open Questions` has bullets other than `(none)`; exit code unaffected unless `--strict`. Self-test cases: `(none)` passes, one bullet warns.
4. **Gate.** `scripts/gates.sh`: add `check-acceptance` to the check loop (it exits 0, so it never stops the run; its warnings show in the output). `CONTRIBUTING.md` gate list: name it.
5. **Router protocol.** `SKILL.md` close mode: before writing the `analysis` → `planning` transition, run `check-acceptance.js --root <root>` and read the `open questions` and `not EARS` lines for the active spec; when open questions remain, do not write the header, list them and ask whether each moves to `## Clarifications` (answered now) or to `## Decisions` as a dated deferral with an owner; when EARS warnings remain, say so once and continue (warn, not block). `references/spec-header.md`: add the rule to the close-mode table's `analysis` row. `references/phases/analysis.md`: `Produces:` names `spec-template.md`; `Do now:` says to fill `## Acceptance` in EARS.
6. **qa-gate input.** `plugins/sdlc-assist/skills/sdlc-qa-gate/SKILL.md`, functional layer row: the inputs are the `## Acceptance` bullets of the active spec, one probe per bullet, reported as verified / not verified by bullet text. `check-skill-sections.js` must still pass (it checks section names, not row text; confirm by running it).
7. **This cycle's spec** already uses the format; run the check on the repo and paste the output (expect warnings only for the five closed specs, which have no `## Acceptance`).
8. **Dogfood record.** `docs/ci-red-runs.md` "v1.5 dogfood (b)": the red run of the self-test, the green run, the repo-wide check output.

## Files

- new: `skills/sdlc/references/spec-template.md`, `skills/sdlc/bin/check-acceptance.js`, `skills/sdlc/bin/check-acceptance.self-test.js` (all under `plugins/sdlc-assist/`)
- edit: `skills/sdlc/SKILL.md`, `skills/sdlc/references/spec-header.md`, `skills/sdlc/references/phases/analysis.md`, `skills/sdlc-qa-gate/SKILL.md`, `scripts/gates.sh`, `CONTRIBUTING.md`, `docs/ci-red-runs.md`

## Verification

```
node plugins/sdlc-assist/skills/sdlc/bin/check-acceptance.self-test.js      # N passed, 0 failed
node plugins/sdlc-assist/skills/sdlc/bin/check-acceptance.js                 # warns on the 5 closed specs, 0 not-EARS on v1.5, exit 0
node plugins/sdlc-assist/skills/sdlc/bin/check-acceptance.js --strict; echo $?   # 1 (closed specs lack the section)
bash scripts/gates.sh                                                        # all gates ok
node plugins/sdlc-assist/skills/sdlc/bin/check-skill-sections.js            # ok after the qa-gate row edit
```

Behavioral: on a scratch repo with a spec whose `## Open Questions` has one bullet, say "sdlc close" in analysis and confirm the agent refuses, lists the question and offers the two destinations; after moving it, the close writes `Status: approved` / `Phase: planning`.

## Done when

Template shipped, check and self-test green, gate wired (warn-only), close rule in the protocol and the sheet, qa-gate reads Acceptance, dogfood pasted, PR merged with `[minor]` in a branch commit.

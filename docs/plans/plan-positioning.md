# Plan 1/4 — Positioning: spec-anchored, not spec-as-source

Spec: `docs/specs/2026-09-30-v1-5-sdd-alignment.md` (deliverable 1). PR 1 of v1.5. Branch `v1.5-positioning`. Bump marker: none (`[skip release]`, docs only).

## Why

A reader who knows Spec Kit asks "is this spec-first, spec-anchored or spec-as-source?" and the README never answers. The answer is spec-anchored: the spec is kept and its header advances through close mode; behavior changes start in it; code is written by people and agents, not generated from it.

## Tasks

1. `README.md`, section `## Who this is for`: add one paragraph after the comparison table, three sentences: the taxonomy (spec-first / spec-anchored / spec-as-source, one clause each), where this router sits (spec-anchored), and the one thing it adds that Spec Kit does not (it infers the phase from the repo and asks instead of assuming you know which step you are on).
2. `plugins/sdlc-assist/README.md`: one sentence after the first paragraph: "Spec-anchored: the spec stays the source of decisions and its header tracks the phase; code is not generated from it."
3. `README.md`, section `## Roadmap`: replace the v1.2 line with the v1.5 list (EARS acceptance, clarifications, per-cycle layout, constitution) and the date.
4. `docs/ci-red-runs.md`: block "v1.5 dogfood (a)": pasted `where.js` output on the request that opened the cycle (already run: `inferred analysis`, `request.type unknown`, `active null`).

## Files

- `README.md` (two sections)
- `plugins/sdlc-assist/README.md` (one sentence)
- `docs/ci-red-runs.md` (append)

## Verification

```
bash scripts/gates.sh --quick          # all gates ok (check-eol covers the README)
grep -c "spec-anchored" README.md plugins/sdlc-assist/README.md   # 1 and 1
```

Portal: the plugin README is the long description of the listing; after the merge, Re-validate shows the sentence and no new finding (the sentence has no command, no URL, no tool name).

## Done when

Both READMEs name the taxonomy and the position; the roadmap lists v1.5; gates ok; PR merged with a merge commit.

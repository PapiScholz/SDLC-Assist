# Plan — v1.5 SDD alignment

Spec: `docs/specs/2026-09-30-v1-5-sdd-alignment.md`. This file is the index; each plan is its own PR, in this order, each merged before the next starts.

| # | Plan | Branch | Bump | Touches scripts |
|---|---|---|---|---|
| 1 | [`docs/plans/plan-positioning.md`](../docs/plans/plan-positioning.md) — spec-anchored stated in both READMEs, roadmap | `v1.5-positioning` | `[skip release]` (merged as PR #5 → v0.5.1, see note) | no |
| 2 | [`docs/plans/plan-ears.md`](../docs/plans/plan-ears.md) — router's spec template, `check-acceptance.js` (EARS + open questions, warn-only), close rule for analysis, qa-gate reads Acceptance | `v1.5-ears` | `[minor]` | yes |
| 3 | [`docs/plans/plan-layout.md`](../docs/plans/plan-layout.md) — `docs/specs/<slug>/{spec,plan,tasks}.md`, per-cycle plan and todo in signals, sheets and README | `v1.5-layout` | `[minor]` | yes |
| 4 | [`docs/plans/plan-constitution.md`](../docs/plans/plan-constitution.md) — `constitution` signal, template, sheets cite it, this repo's `docs/constitution.md` | `v1.5-constitution` | `[minor]` | yes |

Dependencies: 3 before 4 (the sheets 4 edits are rewritten by 3). 2 before 3 (3 extends `check-acceptance.js` and the template). 1 is independent and goes first because it is the cheapest.

Every PR: spec first (this spec, already in `analysis`), `bash scripts/gates.sh` before each commit, docs-only PRs merged with `--subject "... [skip release]"` (plan 1 forgot it and published v0.5.1), pasted dogfood block in `docs/ci-red-runs.md`, merge with a merge commit, Re-validate in the plugin directory after each merge (expected: still 0 holds; plan 2 adds a script with no network and no environment read).

Previous plan (v1.2 playbook alignment) is in git history at `cc97177:tasks/plan.md`; its spec is closed.

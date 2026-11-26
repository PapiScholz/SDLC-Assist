# Review fixture: seeded gaps

The answer key for `repo/docs/specs/2026-11-26-coupon/feature.md`. Never given to a reviewer: it receives only the document, its profile and the file list of `repo/`.

The fixture stands for spec acceptance "WHEN the seeded fixture is reviewed, THE COLD REVIEW SHALL report each seeded gap" (`docs/specs/2026-11-26-visible-cycle-single-door/spec.md`). A review passes when each gap below is reported, in any wording, at Major or above.

| # | Gap | Where | Expected from |
|---|---|---|---|
| G1 | Undefined project term: "the Ledger" appears nowhere in the repository and is not defined in the document | S1 `Outcome:` | `comprehension` |
| G2 | A file cited as existing does not exist: `src/pricing.js` and its `roundCents()` | S2 `Outcome:` | `code-check` (for a `feature.md`, the comprehension reviewer's check against the code) |
| G3 | A task leaves a design decision open: storage "in a database table or a JSON file, whichever fits better" | T2 | `readiness` on a plan; `comprehension` on a `feature.md` |

Not a gap: `test/coupon.test.js` does not exist yet. The document proposes it (the check fails before the change), and a proposed file is not a finding.

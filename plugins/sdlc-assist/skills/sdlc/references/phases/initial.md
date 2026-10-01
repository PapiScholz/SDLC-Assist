---
slug: initial
title: Initial planning
recommends: [spec-driven-development]
alternatives: []
design: in the spec's Objective and Tech Stack
---
# Initial planning

**Enters when:** there are no source files (only config, lockfiles, scaffolding) and no spec.
**Produces:** the first spec, with the header `Phase: analysis` / `Status: draft` (see `../spec-header.md`). `initial` has no header of its own: it ends the moment that spec exists.
**Do now:** run `spec-driven-development` and write the first spec; design lives in its Objective and Tech Stack. When `constitution.exists` is false, offer `../constitution-template.md` as `docs/constitution.md` first (optional; the first spec is the one that ends `initial`). When `architecture.exists` is false, offer `../architecture-template.md` as `ARCHITECTURE.md` next to it (optional as well). When `hygiene.missing` is not empty, list it once (`../repo-hygiene.md` says why each file exists and where its canonical source is); `.gitignore` and `.gitattributes` go in before the first commit.
**Next phase:** analysis, once the spec exists; close mode on `initial` writes nothing (the spec is already `analysis`; approval happens in analysis).
**Warns when:** source files appear on the branch but no spec exists.
**Governance:** the first spec (and its intent, when one exists) is the audit record: author, timestamp and revision history live in git.
**Measure:** leading: time from the first conversation to the committed intent or spec; lagging: number of intent edits made after the first spec commit.

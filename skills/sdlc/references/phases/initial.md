---
slug: initial
title: Initial planning
recommends: [spec-driven-development]
alternatives: []
design: in the spec's Objective and Tech Stack
---
# Initial planning

**Enters when:** there are no source files (only config, lockfiles, scaffolding) and no spec.
**Produces:** the first spec, with the header `Phase: initial` / `Status: draft` (see `../spec-header.md`).
**Do now:** run `spec-driven-development` and write the first spec; design lives in its Objective and Tech Stack.
**Next phase:** analysis, once the user reviews the spec; `sdlc close` writes `Phase: analysis` (approval happens in analysis).
**Warns when:** source files appear on the branch but no spec exists.

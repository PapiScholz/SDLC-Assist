---
slug: analysis
title: Requirements analysis
recommends: [spec-driven-development]
alternatives: [superpowers:systematic-debugging, debugging-strategies]
design: in the spec, architecture-level decisions
---
# Requirements analysis

**Enters when:** source files exist and no active spec has `Status: approved` (a draft spec means: review and approve it).
**Produces:** a spec with the header `Phase: analysis` / `Status: draft`; a short spec built from the request card for complaints and bugs (see `../request-card.md`).
**Do now:** run `spec-driven-development`; for a bug, run a debugging skill first to localise, then write the short spec. Prepend the header (see `../spec-header.md`).
**Next phase:** planning, after the user approves the spec (`sdlc close` writes `Status: approved` and `Phase: planning`).
**Warns when:** code changes exist on the branch but no spec covers them.

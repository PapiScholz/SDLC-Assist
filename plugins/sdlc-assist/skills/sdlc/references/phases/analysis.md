---
slug: analysis
title: Requirements analysis
recommends: [spec-driven-development, sdlc-debugging]
alternatives: [superpowers:systematic-debugging, debugging-strategies]
design: in the spec, architecture-level decisions
---
# Requirements analysis

**Enters when:** source files exist and no active spec has `Status: approved` (a draft spec means: review and approve it).
**Produces:** a spec with the header `Phase: analysis` / `Status: draft` and the sections in `../spec-template.md` (`## Clarifications`, `## Open Questions`, `## Acceptance` in EARS); a short spec built from the request card for complaints and bugs (see `../request-card.md`).
**Do now:** for a bug or complaint, run `sdlc-debugging` first (reproduce, localise, explain, hand off the `Cause:` and `Evidence:` lines), then `spec-driven-development` for the short spec; for a feature or idea, run `spec-driven-development`. Prepend the header (see `../spec-header.md`), write `## Acceptance` as one EARS bullet per behavior, and record every question asked while drafting under `## Clarifications`; `check-acceptance.js` reports what is left. One of the two recommended skills installed is enough to skip the missing-skill question.
**Next phase:** planning, after the user approves the spec (`sdlc close` writes `Status: approved` and `Phase: planning`).
**Warns when:** code changes exist on the branch but no spec covers them.
**Governance:** the spec is approved by the owner through close mode (`Status: approved` in a commit attributed to them); policy skills apply while it is written, not in a later review.
**Measure:** leading: elapsed time between the intent commit and the spec commit; lagging: spec commits dated after the first plan commit of the same cycle.

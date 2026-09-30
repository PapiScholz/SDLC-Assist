---
slug: deployment
title: Deployment
recommends: [sdlc-release]
alternatives: [release-engineer]
design: none
---
# Deployment

**Enters when:** only via the `Phase: deployment` header; `sdlc` never initiates it. Without a header the tie goes to testing.
**Produces:** a release, a tag and the CHANGELOG entry, all owned by the release skill.
**Do now:** run the release skill. `sdlc-release` does not exist in v1: follow the missing-skill protocol (`../missing-skill.md`), which usually lands on `release-engineer`. Nothing is pushed or tagged without the user's explicit request.
**Next phase:** none. When a semver tag points at HEAD, recommend closing the cycle (`sdlc close` writes `Phase: deployment` and `Status: closed`).
**Warns when:** the header says deployment but testing never ran.

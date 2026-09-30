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
**Do now:** run `sdlc-release`: it detects the repo's release mechanism and drives it, or classifies, updates, validates and publishes step by step. Alternative: `release-engineer`. Nothing is pushed or tagged without the user's explicit request in the current turn.
**Next phase:** none. When a semver tag points at HEAD, recommend closing the cycle (`sdlc close` writes `Phase: deployment` and `Status: closed`).
**Warns when:** the header says deployment but testing never ran.

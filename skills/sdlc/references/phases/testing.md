---
slug: testing
title: Testing
recommends: [sdlc-qa-gate]
alternatives: [qa-push]
design: none
---
# Testing

**Enters when:** a current plan and todo exist with at least one task and none open. It is also the default when the header is absent and the tie cannot be broken.
**Produces:** a green suite, a smoke run and pre-push QA.
**Do now:** run the QA skill. `sdlc-qa-gate` does not exist in v1: follow the missing-skill protocol (`../missing-skill.md`), which usually lands on `qa-push`.
**Next phase:** deployment (`sdlc close` writes `Phase: deployment`).
**Warns when:** the header says deployment but the todo still has open tasks.

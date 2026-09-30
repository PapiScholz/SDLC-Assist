---
slug: testing
title: Testing
recommends: [sdlc-qa-gate]
alternatives: [qa-push]
design: none
---
# Testing

**Enters when:** a current plan and todo exist with at least one task and none open. It is also the default when the header is absent and the tie cannot be broken.
**Produces:** the QA gate report: every applicable layer run or listed as not run, with the residual risk.
**Do now:** run `sdlc-qa-gate`: diff map, every applicable layer, the report table with residual risk. Alternative when it is not installed: `qa-push` (missing-skill protocol in `../missing-skill.md`).
**Next phase:** deployment (`sdlc close` writes `Phase: deployment`).
**Warns when:** the header says deployment but the todo still has open tasks.
**Governance:** verification is part of "done"; the report names what was not run; test files are not edited during a fix; the residual risk is accepted by a named person through close mode.
**Measure:** leading: first-pass CI success rate for agent-written changes; lagging: change failure rate and review time per PR.

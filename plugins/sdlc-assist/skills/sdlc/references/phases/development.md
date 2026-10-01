---
slug: development
title: Development
recommends: [incremental-implementation, test-driven-development]
alternatives: []
design: none new; deviations go back to the spec
---
# Development

**Enters when:** a current plan and todo exist with open tasks. A hotfix enters here directly, with no spec and no cycle.
**Produces:** code with unit tests (TDD), one task at a time.
**Do now:** run `incremental-implementation` and `test-driven-development` against the open tasks. A change that deviates from the spec goes back to the spec first.
**Next phase:** testing, when no task is open (`sdlc close` writes `Phase: testing`).
**Warns when:** there is no spec with `Status: approved` (hotfix excepted: state which condition allowed skipping it).
**Governance:** when the implementation departs from the plan, the cycle's `plan.md` (legacy: `tasks/plan.md`) is updated in the same commit; repeated corrections enter `CLAUDE.md`. When `constitution.exists`, the implementation is checked against its principles before the task is ticked. When `adr.exists`, an ADR goes `accepted` in the commit that implements it.
**Measure:** leading: share of changes merged from the first implementation pass; lagging: rework cycles per change from PR history.

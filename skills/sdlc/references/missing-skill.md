# Missing-skill protocol

The recommended skill and the alternatives per phase live only in the frontmatter of `phases/<slug>.md` (`recommends:`, `alternatives:`). `bin/which.js` reads them and reports what is installed on this host.

When nothing is installed for a phase, ask once, with these options:

1. **Install a known one**, only when the table below has a command for it.
2. **Search**:
   `npx skills find <term>` (or use the `find-skills` skill)
3. **Create it along the way**: write the skill as part of the current work.
4. **Continue without it.**

## Install table

Verified against the `skills` CLI lock file (`~/.agents/.skill-lock.json`, `source` field) on 2026-09-29. A row without a command has no public source known to this skill: do not offer option 1 for it, and never guess a repository.

| Skill | Install command |
|---|---|
| `spec-driven-development` | `npx skills add addyosmani/agent-skills --skill spec-driven-development` (bundled with `sdlc`) |
| `planning-and-task-breakdown` | `npx skills add addyosmani/agent-skills --skill planning-and-task-breakdown` (bundled) |
| `incremental-implementation` | `npx skills add addyosmani/agent-skills --skill incremental-implementation` (bundled) |
| `test-driven-development` | `npx skills add addyosmani/agent-skills --skill test-driven-development` (bundled) |
| `context-engineering` | `npx skills add addyosmani/agent-skills --skill context-engineering` (bundled) |
| `superpowers:systematic-debugging` | Claude Code: `claude plugin install superpowers@claude-plugins-official`; other hosts: `npx skills add obra/superpowers --skill systematic-debugging` |
| `debugging-strategies` | no public source |
| `release-engineer` | no public source |
| `qa-push` | no public source |
| `sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release` | no public source (planned for v1.1) |

Names are normalised: `spec-driven-development`, `sdlc:spec-driven-development` and `superpowers:systematic-debugging` resolve to their bare name; print the form invocable on the current host.

"Continue" is announced once and not asked again for that skill within the current context. After a context reset it is asked again.

In v1, `sdlc-debugging`, `sdlc-qa-gate` and `sdlc-release` do not exist yet (planned for v1.1). Known alternatives: `superpowers:systematic-debugging`, `debugging-strategies`, `release-engineer`, `qa-push`.

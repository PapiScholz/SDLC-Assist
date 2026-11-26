# Missing-skill protocol

The recommended skill and the alternatives per phase live only in the frontmatter of `phases/<slug>.md` (`recommends:`, `alternatives:`). `bin/which.js` reads them and reports what is installed on this host.

When nothing is installed for a phase, say so in one line and continue; when the developer asks what to do, these are the options:

1. **Install a known one**, only when the table below has a command for it.
2. **Search**:
   `npx skills find <term>` (or use the `find-skills` skill)
3. **Create it along the way**: write the skill as part of the current work.
4. **Continue without it.**

## Install table

Verified against the `skills` CLI lock file (`~/.agents/.skill-lock.json`, `source` field) on 2026-09-30. A row without a command has no public source known to this skill: do not offer option 1 for it, and never guess a repository.

| Skill | Install command |
|---|---|
| `incremental-implementation` | `npx skills add addyosmani/agent-skills --skill incremental-implementation` (bundled with `sdlc`) |
| `test-driven-development` | `npx skills add addyosmani/agent-skills --skill test-driven-development` (bundled) |
| `superpowers:test-driven-development` | Claude Code: `claude plugin install superpowers@claude-plugins-official`; other hosts: `npx skills add obra/superpowers --skill test-driven-development`; the bundled `test-driven-development` covers it when absent |
| `superpowers:systematic-debugging` | Claude Code: `claude plugin install superpowers@claude-plugins-official`; other hosts: `npx skills add obra/superpowers --skill systematic-debugging` |
| `debugging-strategies` | no public source |
| `release-engineer` | no public source |
| `qa-push` | no public source |
| `sdlc-spec` | `cd ~ && npx skills add PapiScholz/SDLC-Assist --skill sdlc-spec` (bundled with `sdlc`) |
| `sdlc-plan` | `cd ~ && npx skills add PapiScholz/SDLC-Assist --skill sdlc-plan` (bundled) |
| `sdlc-debugging` | `cd ~ && npx skills add PapiScholz/SDLC-Assist --skill sdlc-debugging` (bundled) |
| `sdlc-qa-gate` | `cd ~ && npx skills add PapiScholz/SDLC-Assist --skill sdlc-qa-gate` (bundled) |
| `sdlc-release` | `cd ~ && npx skills add PapiScholz/SDLC-Assist --skill sdlc-release` (bundled) |

Names are normalised: `sdlc-spec`, `sdlc-assist:sdlc-spec` and `superpowers:systematic-debugging` resolve to their bare name; print the form invocable on the current host.

"Continue" is announced once and not asked again for that skill within the current context. After a context reset it is asked again.

`sdlc-debugging`, `sdlc-qa-gate` and `sdlc-release` ship with this repo since v1.1. Known alternatives: `superpowers:systematic-debugging`, `debugging-strategies`, `release-engineer`, `qa-push`.

# Missing-skill protocol

The recommended skill and the alternatives per phase live only in the frontmatter of `phases/<slug>.md` (`recommends:`, `alternatives:`). `bin/which.js` reads them and reports what is installed on this host.

When nothing is installed for a phase, ask once, with these options:

1. **Install a known one**, when a public source exists:
   `npx skills add <owner/repo> --skill <name>`
2. **Search**:
   `npx skills find <term>` (or use the `find-skills` skill)
3. **Create it along the way**: write the skill as part of the current work.
4. **Continue without it.**

Names are normalised: `spec-driven-development`, `sdlc:spec-driven-development` and `superpowers:systematic-debugging` resolve to their bare name; print the form invocable on the current host.

"Continue" is announced once and not asked again for that skill within the current context. After a context reset it is asked again.

In v1, `sdlc-debugging`, `sdlc-qa-gate` and `sdlc-release` do not exist yet (planned for v1.1). Known alternatives: `superpowers:systematic-debugging`, `debugging-strategies`, `release-engineer`, `qa-push`.

# Repo hygiene

A closed list of nine files a public repository carries from day one. The router checks presence only (`signals.hygiene`: `present`, `missing`, `license`), never content, and never writes any of them. It mentions the list in exactly two phases: `initial` (before the first spec, so `.gitignore` and `.gitattributes` exist before the first commit) and `deployment` (only when the repo is not yet in production: `LICENSE` and `SECURITY.md` missing before a first release is worth one line; after a release it is noise). No other phase mentions it.

| File | Why it exists | Canonical source |
|---|---|---|
| `LICENSE` (any `LICENSE*`) | Without a license nobody may legally use, copy or modify the code, whatever the README says. | choosealicense.com |
| `README.md` | The first thing a person and an agent read: what it is, how to install, how to use. | GitHub docs, "About READMEs" |
| `CONTRIBUTING.md` | How to propose a change: gates to run, branch and PR rules, what a review expects. | GitHub docs, "Setting guidelines for repository contributors" |
| `SECURITY.md` | Where to report a vulnerability privately, and which versions are supported. GitHub surfaces it in the Security tab. | GitHub docs, "Adding a security policy" |
| `CODE_OF_CONDUCT.md` | Expected behavior and how to report a problem; adopting a known one is enough. | Contributor Covenant (contributor-covenant.org) |
| `.gitignore` | Keeps build output, dependencies and local secrets out of the history; impossible to fully undo once committed. | github.com/github/gitignore templates |
| `.gitattributes` | Fixes line endings (`* text=auto eol=lf`) and marks binaries, so Windows and Linux checkouts diff the same. | git-scm.com, gitattributes |
| `.editorconfig` | Indentation, charset and final newline per file type, read by every editor; matches `.gitattributes`. | editorconfig.org |
| `ARCHITECTURE.md` (or `docs/architecture.md`) | The current shape of the repo; see `architecture-template.md`. | this skill |

A `CHANGELOG.md` is not on the list: the release skill owns it, and a repo may generate it from tags.

No generator ships here: write these files by hand from the sources above, or with an installed skill found through `npx skills find <term>` (the missing-skill question offers that search).

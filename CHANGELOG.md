# Changelog

## [Unreleased]

### Added
- Own phase skills `sdlc-debugging` (bug route of analysis), `sdlc-qa-gate` (testing) and `sdlc-release` (deployment); the router recommends them by default and the alternatives stay listed.
- `check-skill-sections.js` gate: section parity with the skill contracts.

### Changed
- `check-frontmatter.js` requires `version` on the own skills, equal to `plugin.json`; the release script rewrites all four.
- `analysis` sheet recommends `sdlc-debugging` beside `spec-driven-development`; the request card gains optional `Cause:` and `Evidence:` lines.

### CI
- `install-smoke` asserts the three own skills are installed and reported by `which.js`.

## [0.1.1] - 2026-09-30

### Fixed
- Close mode: closing `deployment` now writes `Phase: deployment` together with `Status: closed`, and closing from a header that fell behind writes the confirmed phase's row, so a closed spec never keeps a stale `Phase:` (found by running the skill on its own repository).


### Commits

- fix: close mode writes the confirmed phase when closing deployment or a stale header
- spec: close the v1 cycle (deployment closed) [skip release]
- ci: install-smoke installs globally (-g) into the temp home [skip release]

## [0.1.0] - 2026-09-30

### Added
- `sdlc` router skill, five vendored SDD-family skills, plugin and marketplace manifests, CI.

### Commits

- ci: automatic release pipeline and install smoke job
- docs: security policy, contributing guide, code of conduct
- docs: record manual install verification (task 21)
- fix: anchor plugin version regex; repo owner is PapiScholz
- fix: final review wave (deployment tie, plugin versions, batched git, message-file, capability map, docs)
- docs: README and dogfood; spec enters development
- ci: gates and red-run log
- test(where): fixtures 2-10 and --run-tests
- fix: SKILL.md missing-skill trigger and shell robustness
- feat(where): CLI and fixture harness
- feat: sdlc SKILL.md; specs always start in analysis
- fix(where): git queries never take optional locks; quotepath off
- docs: phase sheets and references
- feat: plugin and marketplace manifests, command files
- feat: which.js installed-skill detector
- feat(where): git signals and test runner
- fix(where): header parser accepts bold Phase:/Status: forms
- feat(where): filesystem signals
- feat(where): decision table
- feat(where): request classifier (en, es)
- feat(where): header parser
- chore: repo skeleton
- feat(where): todo counter
- feat: vendor SDD-family skills at bc97fd46 with sync check
- spec: close analysis, move router to skills/sdlc
- docs: approved design spec and ideation one-pager for the sdlc skill

# Changelog

## [Unreleased]

### Changed
- Plugin id `sdlc` becomes `sdlc-assist`: the slash command is `/sdlc-assist:phase` and the install is `claude plugin install sdlc-assist@papischolz`. Users on the plugin path uninstall `sdlc` and install `sdlc-assist`; the skills.sh and manual paths are unchanged. The manifest gate asserts that `plugin.json` and `marketplace.json` agree on the id.
- `plugin.json` carries `homepage`, `repository` and `keywords`.

### Added
- README "Who this is for" block with a comparison against Superpowers, BMAD Method, Spec Kit and standalone spec skills.
- `docs/distribution.md`: pre-submission checks for Anthropic's plugin directory with pasted output, the portal steps, and which community lists accept a link-only entry.

## [0.3.0] - 2026-09-30

### Added
- `intent.md` template and the `Intent:` header line.
- `maintain` entry point (`references/maintain.md`).
- `Governance:` and `Measure:` lines on every phase sheet.
- `scripts/gates.sh`, one entry point for the gate loop (`--quick` skips the network-bound `sync-vendored --check`).
- Versioned hooks in `.claude/settings.json`: git authorization from the user's last message (gates the `Bash` and `PowerShell` tools, including `pwsh -Command`, `cmd /c`, `iex`, `$x = git ...`, Windows paths to `git.exe`, and command words built by quoting, brace expansion or substitution), and an LF/no-BOM guard.

### Changed
- `check-sheets` now enforces the `Governance:` and `Measure:` body lines.
- CI and the docs call `scripts/gates.sh`.
- README gains a "Playbook mapping" section.


### Commits

- Merge pull request #2 from PapiScholz/v1.2-playbook-alignment
- refactor: per-tool normalizer and rescan table in the git hook; shared unfenced-lines helper
- fix: hook gates PowerShell forms and obfuscated command words; review fix wave
- spec: v1.2 testing closed; qa-gate, PowerShell tool gated by the hook [minor]
- docs: v1.2 dogfood (c) reference scenarios [skip release]
- spec: intent link and Node hooks paragraph; v1.2 dogfood (a)(b) [skip release]
- intent: playbook alignment, in the owner's words [skip release]
- docs: playbook mapping, hooks notes, unreleased entry [skip release]
- ci: single gate target scripts/gates.sh; hook self-tests in CI [skip release]
- feat: versioned eol-guard hook and project hook settings
- feat: versioned git-authorization hook (Node, transcript-based, fail-closed)
- feat: governance and measure lines on every phase sheet, enforced by check-sheets
- feat: intent.md template, maintain entry point, Intent: header line
- spec: close v1.1; v1.2 spec approved and planned [skip release]

## [0.2.0] - 2026-09-30

### Added
- Own phase skills `sdlc-debugging` (bug route of analysis), `sdlc-qa-gate` (testing) and `sdlc-release` (deployment); the router recommends them by default and the alternatives stay listed.
- `check-skill-sections.js` gate: section parity with the skill contracts.

### Changed
- `check-frontmatter.js` requires `version` on the own skills, equal to `plugin.json`; the release script rewrites all four.
- `analysis` sheet recommends `sdlc-debugging` beside `spec-driven-development`; the request card gains optional `Cause:` and `Evidence:` lines.

### CI
- `install-smoke` asserts the three own skills are installed and reported by `which.js`.


### Commits

- Merge pull request #1 from PapiScholz/v1.1-own-skills
- spec: v1.1 testing closed; final review fixes [minor]
- docs: v1.1 dogfood runs, reference scenarios and QA gate report; development closed [skip release]
- ci: install-smoke asserts the three own skills and which.js reports them [skip release]
- docs: own skills in README, changelog unreleased entry, gate loop [skip release]
- ci: check-skill-sections gate (section parity for the own skills) with red run
- feat: sheets recommend the own skills; own skills carry the plugin version; release script rewrites all four
- feat: sdlc-qa-gate and sdlc-release skills (testing and deployment phases)
- feat: sdlc-debugging skill (bug route of analysis); close planning for v1.1

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

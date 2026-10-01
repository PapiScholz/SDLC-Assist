# Changelog

## [0.10.0] - 2026-10-01

- Merge pull request #12 from PapiScholz/v1.6-architecture
- feat: ARCHITECTURE.md detected and cited, never required (architecture signal via shared findDoc) [minor]

## [0.9.0] - 2026-10-01

- Merge pull request #11 from PapiScholz/v1.6-adr
- feat: ADRs detected and cited, never required (adr signal, template, sheets, check-adr) [minor]
- spec: v1.6 analysis closed, header planning/approved
- Merge pull request #10 from PapiScholz/v1.6-spec [skip release]
- spec: open v1.6 repo artifacts (ADRs, ARCHITECTURE.md, hygiene) in the per-cycle folder layout
- Merge pull request #9 from PapiScholz/v1.5-close [skip release]
- spec: v1.5 closed on v0.8.0; qa-gate report, dogfood (e), roadmap [skip release]

## [0.8.0] - 2026-10-01

- Merge pull request #8 from PapiScholz/v1.5-constitution
- feat: constitution detected and cited, never required [minor]

## [0.7.0] - 2026-10-01

- Merge pull request #7 from PapiScholz/v1.5-layout
- feat: per-cycle layout docs/specs/<dir>/{spec,plan,tasks}.md [minor]

## [0.6.0] - 2026-10-01

- Merge pull request #6 from PapiScholz/v1.5-ears
- feat: EARS acceptance, spec template, open-questions close rule [minor]
- docs: skip-release marker goes on the merge commit of docs-only PRs; plan 1 done [skip release]

## [0.5.1] - 2026-10-01

- Merge pull request #5 from PapiScholz/v1.5-positioning
- docs: positioning, spec-anchored not spec-as-source; roadmap v1.5 [skip release]
- spec: v1.5 SDD alignment, four plans and the todo [skip release]
- docs: portal validation record, 0 holds on main@59264f8 [skip release]
- fix: signals.js never reads the environment; git settings travel as flags [skip release]
- fix: qa-gate runtime row no longer names curl [skip release]
- fix: git runs with an env allowlist; debugging skill drops the curl mention [skip release]
- spec: v1.4 closed on v0.5.0; Task 3 done [skip release]

## [0.5.0] - 2026-09-30

### Changed
- The plugin lives in `plugins/sdlc-assist/` (manifest, icon, skills, commands, a short README, LICENSE) and `marketplace.json` points there, so Anthropic's plugin directory validates only what ships. Install commands do not change; anyone copying `skills/` by hand now copies `plugins/sdlc-assist/skills/`.
- `check-manifest` runs from the repository root: it follows the marketplace `source`, rejects a plugin at the root and a `plugin.json` `icon` field, and requires `icon.svg`, `README.md` and a `LICENSE` identical to the root one inside the plugin folder.
- `.claude-plugin/icon.svg`: pixel-art waterfall on an amber CRT.


### Commits

- Merge pull request #4 from PapiScholz/v1.4-plugin-subfolder
- feat: plugin in plugins/sdlc-assist so the directory scans only what ships [minor]
- docs: mark eval/iex rescans in the git hook as detection only [skip release]
- fix: drop icon field from plugin.json [skip release]
- chore: plugin icon, credential note, rename PIN [skip release]
- spec: v1.3 closed on v0.4.0; Task 3 done [skip release]

## [0.4.0] - 2026-09-30

### Changed
- Plugin id `sdlc` becomes `sdlc-assist`: the slash command is `/sdlc-assist:phase` and the install is `claude plugin install sdlc-assist@papischolz`. Users on the plugin path uninstall `sdlc` and install `sdlc-assist`; the skills.sh and manual paths are unchanged. The manifest gate asserts that `plugin.json` and `marketplace.json` agree on the id.
- `plugin.json` carries `homepage`, `repository` and `keywords`.

### Added
- README "Who this is for" block with a comparison against Superpowers, BMAD Method, Spec Kit and standalone spec skills.
- `docs/distribution.md`: pre-submission checks for Anthropic's plugin directory with pasted output, the portal steps, and which community lists accept a link-only entry.


### Commits

- Merge pull request #3 from PapiScholz/v1.3-distribution
- feat: plugin id sdlc-assist, README positioning, directory readiness [minor]
- docs: cycle diagram inline in the README quickstart [skip release]
- docs: README quickstart and how-to-use walkthrough; close mode folded in [skip release]
- docs: sdlc flow diagrams (cycle, entry points, protocol), linked from README [skip release]
- spec: v1.2 closed on v0.3.0; Task 7 done [skip release]

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

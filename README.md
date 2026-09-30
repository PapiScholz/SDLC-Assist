# SDLC-Assist

An agent skill, `sdlc`, that works out which phase of the software development life cycle a work request is in, shows the evidence, asks one confirmation, and points to the skill that does the next step.

It reads the repo (spec headers, `tasks/plan.md`, `tasks/todo.md`, read-only git queries) and never blocks a transition. Three own phase skills (sdlc-debugging, sdlc-qa-gate, sdlc-release) and five skills from `addyosmani/agent-skills` (the spec-driven-development family) are bundled so the recommendations work out of the box.

| Slug | Phase | Recommended skill |
|---|---|---|
| `initial` | Initial planning | spec-driven-development |
| `analysis` | Requirements analysis | spec-driven-development; sdlc-debugging on the bug route |
| `planning` | Planning | planning-and-task-breakdown |
| `development` | Development | incremental-implementation, test-driven-development |
| `testing` | Testing | sdlc-qa-gate (alternative: qa-push) |
| `deployment` | Deployment | sdlc-release (alternative: release-engineer) |

## Install

| Path | Command | Skill by intent | Explicit command | Notes |
|---|---|---|---|---|
| skills.sh | `cd ~ && npx skills add PapiScholz/SDLC-Assist` | Claude Code, OpenCode, Codex, Cursor | none | Installs the nine skills (router + three own + five vendored) with all files. `--skill sdlc` (or `-s sdlc`) installs only the router. Overwrites same-named skills in `~/.agents/skills`. |
| Claude Code plugin | `claude plugin marketplace add PapiScholz/SDLC-Assist` then `claude plugin install sdlc@papischolz` | Claude Code | `/sdlc:phase` | Also registers the three own and five vendored skills. Duplicates with user-scope copies are reported by `which.js --verbose`. |
| Manual | `cp -r skills/* ~/.claude/skills/` | Claude Code, OpenCode | `/sdlc` (user-scope) | Copies all nine skills. |
| OpenCode command | `cp .opencode/command/sdlc-phase.md ~/.config/opencode/command/` | (any of the above) | `/sdlc-phase` | Manual step on every path. |

Run the skills.sh command from `~`, not from inside a project: the CLI installs into the current directory's scope when it finds a repo there. The CLI copies each skill folder whole and links it into `~/.claude/skills`, `~/.codex/skills`, `~/.cursor/skills` and `~/.config/opencode/skills`.

Codex and Cursor get the skill by intent only in v1; native command files for them are on the roadmap.

Overwrite and duplicate notes:

- skills.sh overwrites same-named skills already in `~/.agents/skills`. Back up local edits first.
- Installing both the plugin and a user-scope copy registers the same skill twice. Keep one; `which.js --verbose` lists the duplicates (without `--verbose` the JSON has `duplicates: []` and `duplicatesOmitted: true`). Run it from where the skill is installed: `node ~/.agents/skills/sdlc/bin/which.js --verbose` (skills.sh), `node "${CLAUDE_PLUGIN_ROOT}/skills/sdlc/bin/which.js" --verbose` (plugin), or `node ~/.claude/skills/sdlc/bin/which.js --verbose` (manual copy).
- Find other skills with `npx skills find <term>`.
- This checkout ships Claude Code hooks (git authorization, LF/no-BOM guard) in `.claude/settings.json`; they do not travel with the installed skills. See Playbook mapping.

## Usage

Describe the work, or say "where are we". The router writes your request to a temp file and runs `where.js`. A real run on a scratch repo (two source files, `CHANGELOG.md` with `## [1.2.0]`, tag `v1.2.0` on HEAD, no spec), with the request "customer complains about X":

```
$ node skills/sdlc/bin/where.js --root <scratch repo> --message-file <temp file>
```

Output, trimmed to the keys the router reads:

```json
{
  "inferred": "analysis",
  "evidence": [
    "fallback: analysis (candidates: analysis)",
    "tests not run (no --run-tests)",
    "in production: tag v1.2.0"
  ],
  "alternatives": [],
  "warnings": [],
  "request": { "message": "customer complains about X", "type": "complaint" }
}
```

The agent turns that into one question (`Phase: analysis`, the evidence lines, `Warnings: none`, `Options: [confirm analysis]`; no `new cycle` option because there is no active cycle). A complaint then goes through the request card (who asks, what happens, expected, where, urgency) and spec-driven-development turns the card into a short spec with `Phase: analysis`, `Status: draft`. `inProduction` adds the note "keep the running version safe".

Commands: `/sdlc:phase` (plugin), `/sdlc` (user-scope skill), `/sdlc-phase` (OpenCode). Add `close` to run close mode. Entry rules by request type are in `skills/sdlc/references/entry-points.md`.

## Header convention

A cycle is a spec file (`docs/specs/*.md`, root `spec.md` or `SPEC-*.md`). Right after the H1:

```
Phase: analysis
Status: draft
```

Slugs are the six above; `Status` is `draft`, `approved` or `closed`. Specs always start in `analysis`; `initial` ends when the first spec exists. Details: `skills/sdlc/references/spec-header.md`.

## Close mode

`/sdlc:phase close` or "sdlc close": the router infers the phase, asks whether it is finished, and advances the header from the phase you confirm.

| Confirmed phase | Writes |
|---|---|
| initial | nothing |
| analysis | `Status: approved`, `Phase: planning` |
| planning | `Phase: development` |
| development | `Phase: testing` |
| testing | `Phase: deployment` |
| deployment | `Phase: deployment`, `Status: closed` |

It edits only the active spec; with no spec it writes nothing and says so. It never touches the CHANGELOG and never runs state-changing git commands.

## Missing-skill protocol

If none of a phase's recommended skills (or alternatives) is installed, the router asks one extra question: install a known one (only when the install table in `missing-skill.md` has a verified command for it), search (`npx skills find <term>` or the `find-skills` skill), create it along the way, or continue without it. Continuing is announced once and never blocks. See `skills/sdlc/references/missing-skill.md`.

## Playbook mapping

How the router maps to the six stages of the AI-native SDLC playbook (`#sd-c2`):

| Stage | Here | Artifact that ends it |
|---|---|---|
| Plan | `initial`, or an `intent.md` for an idea on existing code (`references/intent.md`). An intent is for an idea or a feature the originator brings; a feature someone else reports as a request goes through the request card | committed `intent.md` |
| Design | `analysis` (spec, with `Intent:` when one exists; request card for bugs) | spec with `Status: approved` |
| Build | `planning` then `development` | `tasks/plan.md`, then the merged PR |
| Test | `testing` (`sdlc-qa-gate`) | the gate report and `Phase: deployment` |
| Deploy | `deployment` (`sdlc-release`) | tag and release |
| Maintain | entry point `references/maintain.md` | a new `intent.md` |

Every sheet carries `Governance:` (what git records) and `Measure:` (one leading, one lagging indicator). Left out on purpose, as the user's infrastructure: the automatic Maintain loop with control bands, evals in CI, AI review with `REVIEW.md`, `.claude/agents/` definitions, scheduled security scans.

This repo's own hooks (`.claude/settings.json`: git authorization from the user's last message, LF/no-BOM guard) apply to Claude Code sessions in this checkout; other hosts rely on CI. The git-authorization hook gates the `Bash` and `PowerShell` tools. It catches careless or lagging commands (wrong verb, stale transcript, wrappers such as `sudo`/`env`/`timeout`/`xargs`, `bash -c`, `pwsh -Command`, `cmd /c`, `eval`/`iex`, substitutions, brace expansion, heredocs) and denies any command word built from `$`, backticks or `{a,b}` when a gated subcommand follows; it does not scan `xargs -I {}` arguments, heredoc bodies fed to `sh`, or `Start-Process git -ArgumentList ...`; a `pwsh -EncodedCommand` line is denied outright; parse ambiguity resolves to a deny. Sessions whose transcript carries no human records (SDK, headless) are denied every gated operation. Set `SDLC_HOOKS_DISABLE=1` in your shell to turn them off.

## Own skills

Written for this repo, generic, English, Markdown only (stack detection stays in `where.js`).

| Skill | Phase | Produces |
|---|---|---|
| `sdlc-debugging` | analysis, bug route | `Cause:` and `Evidence:` lines for the short spec; reproduce, localise, explain, hand off; never edits product code |
| `sdlc-qa-gate` | testing | the `Layer / Verified / Not verified / Residual risk` table plus gaps; never a "green" verdict |
| `sdlc-release` | deployment | version decision, version files and changelog, tag and release; drives an existing release mechanism; every state-changing command only on request |

Section parity with their contracts is enforced by `node skills/sdlc/bin/check-skill-sections.js`.

## Bundled skills

Vendored unmodified from `https://github.com/addyosmani/agent-skills` at commit `bc97fd46fdb294dc3518d0e94edb989a38894f31`, MIT license. Each folder has a `VENDORED.md`; refresh with `node skills/sdlc/bin/sync-vendored.js --fix`.

| Skill | Upstream path |
|---|---|
| spec-driven-development | `skills/spec-driven-development` |
| planning-and-task-breakdown | `skills/planning-and-task-breakdown` |
| incremental-implementation | `skills/incremental-implementation` |
| test-driven-development | `skills/test-driven-development` |
| context-engineering | `skills/context-engineering` |

## Development

Node 20 or newer, no dependencies. One command runs the same gates CI runs (`--quick` skips the network-bound `sync-vendored --check`; the list is in `CONTRIBUTING.md`):

```
bash scripts/gates.sh
```

`node skills/sdlc/bin/where.self-test.js` runs the ten phase-inference fixtures alone. Red CI runs and the dogfood record are in `docs/ci-red-runs.md`.

## Roadmap

v1.2: native command files for Codex and Cursor once their formats are verified.

## Security

Automated skill scanners rate this skill as medium risk because it tells the agent to run scripts. The scripts only read the analysed repository, run read-only git queries, and never install or execute anything on their own; the project's test suite runs only behind an explicit flag. `SECURITY.md` lists exactly what each script touches, the trust boundaries of each install path, and how to report a vulnerability privately.

## Contributing

Contributions are welcome. `CONTRIBUTING.md` describes what the repository accepts, the local validation loop (the same gates CI runs on Ubuntu and Windows), and the spec-first rule: behavior changes start in `docs/specs/`. Vendored skills are not edited here; propose changes upstream. By participating you agree to `CODE_OF_CONDUCT.md`.

## License

MIT, see `LICENSE`. Vendored skills keep their upstream MIT license.

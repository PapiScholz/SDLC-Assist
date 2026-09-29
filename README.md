# SDLC-Assist

An agent skill, `sdlc`, that works out which phase of the software development life cycle a work request is in, shows the evidence, asks one confirmation, and points to the skill that does the next step.

It reads the repo (spec headers, `tasks/plan.md`, `tasks/todo.md`, read-only git queries) and never blocks a transition. Five skills from `addyosmani/agent-skills` (the spec-driven-development family) are bundled so the recommendations work out of the box.

| Slug | Phase | Recommended skill |
|---|---|---|
| `initial` | Initial planning | spec-driven-development |
| `analysis` | Requirements analysis | spec-driven-development |
| `planning` | Planning | planning-and-task-breakdown |
| `development` | Development | incremental-implementation, test-driven-development |
| `testing` | Testing | sdlc-qa-gate (alternative: qa-push) |
| `deployment` | Deployment | sdlc-release (alternative: release-engineer) |

`sdlc-qa-gate` and `sdlc-release` are not shipped in v1; when a recommended skill is missing the router asks what to do (see Missing-skill protocol).

## Install

| Path | Command | Skill by intent | Explicit command | Notes |
|---|---|---|---|---|
| skills.sh | `cd ~ && npx skills add ezescholz/SDLC-Assist` | Claude Code, OpenCode, Codex, Cursor | none | Installs the six skills (router + five vendored) with all files. `--skill sdlc` (or `-s sdlc`) installs only the router. Overwrites same-named skills in `~/.agents/skills`. |
| Claude Code plugin | `claude plugin marketplace add ezescholz/SDLC-Assist` then `claude plugin install sdlc@ezescholz` | Claude Code | `/sdlc:phase` | Also registers the five vendored skills. Duplicates with user-scope copies are reported by `which.js --verbose`. |
| Manual | `cp -r skills/* ~/.claude/skills/` | Claude Code, OpenCode | `/sdlc` (user-scope) | Copies the router and the five vendored skills. |
| OpenCode command | `cp .opencode/command/sdlc-phase.md ~/.config/opencode/command/` | (any of the above) | `/sdlc-phase` | Manual step on every path. |

Run the skills.sh command from `~`, not from inside a project: the CLI installs into the current directory's scope when it finds a repo there. The CLI copies each skill folder whole and links it into `~/.claude/skills`, `~/.codex/skills`, `~/.cursor/skills` and `~/.config/opencode/skills`.

Codex and Cursor get the skill by intent only in v1; native command files for them are on the roadmap.

Overwrite and duplicate notes:

- skills.sh overwrites same-named skills already in `~/.agents/skills`. Back up local edits first.
- Installing both the plugin and a user-scope copy registers the same skill twice. Keep one; `node skills/sdlc/bin/which.js --verbose` lists the duplicates.
- Find other skills with `npx skills find <term>`.

## Usage

Describe the work, or say "where are we". Example:

```
You:    A customer says the receipt total shows 12.5 instead of 12.50.
Agent:  Phase: analysis - a complaint with no spec yet
        Evidence: no spec in docs/specs; tasks/todo.md has no open tasks
        Warnings: none
        Options: [confirm analysis] [new cycle: analysis]
You:    confirm
Agent:  Who asks: <who reported it?> Where: <which screen?> Urgency: <blocking / this week / whenever?>
You:    Ana, shop owner. Checkout receipt preview. This week.
Agent:  Who asks:      Ana, shop owner
        What happens:  The receipt total shows 12.5 instead of 12.50
        Expected:      Two decimals, always
        Where:         Checkout screen, receipt preview
        Urgency:       this week
        Next: spec-driven-development turns this card into a short spec.
```

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
| deployment | `Status: closed` |

It never touches the CHANGELOG and never runs state-changing git commands.

## Missing-skill protocol

If none of a phase's recommended skills (or alternatives) is installed, the router asks one extra question with four options: install a known one, search (`npx skills find <term>` or the `find-skills` skill), create it along the way, or continue without it. Continuing is announced once and never blocks. See `skills/sdlc/references/missing-skill.md`.

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

Node 20 or newer, no dependencies. The gate loop is the same one CI runs:

```
for t in skills/sdlc/bin/lib/*.self-test.js skills/sdlc/bin/*.self-test.js; do node "$t" || exit 1; done
node skills/sdlc/bin/sync-vendored.js --check
node skills/sdlc/bin/check-manifest.js
node skills/sdlc/bin/check-sheets.js
node skills/sdlc/bin/check-frontmatter.js
node skills/sdlc/bin/check-eol.js
```

`node skills/sdlc/bin/where.self-test.js` runs the ten phase-inference fixtures alone. Red CI runs and the dogfood record are in `docs/ci-red-runs.md`.

## Roadmap

v1.1: own `sdlc-qa-gate` and `sdlc-release` skills; command files for Codex and Cursor once their formats are verified.

## License

MIT, see `LICENSE`. Vendored skills keep their upstream MIT license.

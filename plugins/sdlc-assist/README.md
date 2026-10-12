# sdlc-assist

An SDLC phase router for coding agents. It tells the agent where work on a code repository stands, in four plain steps and per stage of a staged plan, and points to the skill that does the next step. Spec-anchored: the spec stays the record of decisions and its header tracks the phase; code is not generated from it.

The developer's workflow has four steps: (1) state the situation, (2) the agent writes the spec and the developer approves it, (3) the agent writes the plan and the developer approves it, (4) implement, test and ship. A large plan splits into stages; each stage repeats steps 3 and 4. The six internal phases map onto those steps (`initial` 1, `analysis` 2, `planning` 3, `development`/`testing`/`deployment` 4). The skill informs the agent; the agent tells the developer in one plain sentence, in their language, and proceeds.

**Not for research or non-code tasks.** It acts only on work about a code repository with specs.

It ships nine skills: the router `sdlc`, three own skills (`sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release`) and five vendored unmodified from `addyosmani/agent-skills` (`spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`, `context-engineering`).

## Install

Claude Code plugin:

```
claude plugin marketplace add PapiScholz/SDLC-Assist
claude plugin install sdlc-assist@papischolz
```

Then, in any repository, describe the work or say "where are we". The command form is `/sdlc-assist:phase`, and `/sdlc-assist:phase close` runs close mode.

**Runs on its own in Claude Code.** Installing the plugin from the marketplace enables a `UserPromptSubmit` hook that adds one line (stage, step, next action) to the agent's context on every prompt inside a repository with an active cycle, and prints nothing anywhere else. Installing the skills with `npx skills add` does not install the hook; then the skill is invoked by name.

Other hosts (OpenCode, Codex, Cursor) install the same skills through the skills CLI; the commands, the phase table and the full documentation are in the repository: https://github.com/PapiScholz/SDLC-Assist

## What it reads and does

The scripts under `skills/sdlc/bin/` read files in the repository being analysed and run read-only git queries. They install nothing, send nothing anywhere, and run the project's test suite only behind an explicit flag. Details in `SECURITY.md` at the repository root.

## License

MIT, see `LICENSE`. Vendored skills keep their upstream MIT license (each folder has a `VENDORED.md`).

# sdlc-assist

An SDLC phase router for coding agents. It works out which phase of the software development life cycle a work request is in (initial planning, requirements analysis, planning, development, testing, deployment), shows the evidence it read from the repository, asks one confirmation, and points to the skill that does the next step.

It ships nine skills: the router `sdlc`, three own skills (`sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release`) and five vendored unmodified from `addyosmani/agent-skills` (`spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`, `context-engineering`).

## Install

Claude Code plugin:

```
claude plugin marketplace add PapiScholz/SDLC-Assist
claude plugin install sdlc-assist@papischolz
```

Then, in any repository, describe the work or say "where are we". The command form is `/sdlc-assist:phase`, and `/sdlc-assist:phase close` runs close mode.

Other hosts (OpenCode, Codex, Cursor) install the same skills through the skills CLI; the commands, the phase table and the full documentation are in the repository: https://github.com/PapiScholz/SDLC-Assist

## What it reads and does

The scripts under `skills/sdlc/bin/` read files in the repository being analysed and run read-only git queries. They install nothing, send nothing anywhere, and run the project's test suite only behind an explicit flag. Details in `SECURITY.md` at the repository root.

## License

MIT, see `LICENSE`. Vendored skills keep their upstream MIT license (each folder has a `VENDORED.md`).

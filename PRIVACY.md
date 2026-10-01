# Privacy Policy

Last updated: 2026-10-01

SDLC-Assist is a set of agent skills: Markdown instructions and zero-dependency Node scripts that run on your machine, inside the coding agent you already use. There is no SDLC-Assist service, account or server.

## What it collects

Nothing. The skills and scripts collect no personal data, send nothing to any server, include no analytics or telemetry, and keep no record of how you use them.

## What it reads on your machine

- `where.js` reads spec, plan and task files in the repository it analyses and runs read-only git queries on it.
- `which.js` reads the folder names and `SKILL.md` headers of the skills installed in your agent's skill folders, to tell which ones are available.
- What each script touches is listed in detail in [`SECURITY.md`](SECURITY.md#what-the-skill-does-on-your-machine).

What these reads return stays on your machine, except for what the agent itself sends to its model provider (next section).

## Your coding agent

The skills run inside your agent (Claude Code, OpenCode, Codex, Cursor or another host). The agent, and the model provider behind it, receives the conversation and the files the agent reads, as it does with any other skill or prompt. That processing is governed by your agent's and provider's own privacy policy, not by this one.

## Network access

The skills make no network calls at runtime. When you ask for it, `where.js --run-tests` and the `sdlc-qa-gate` skill run your project's own test suite and build, which do whatever your project's code does, network included. The only script with network access is `sync-vendored.js`, a maintainer tool that CI runs to compare the vendored skills with their public upstream; it is not part of what the skill runs for you. Installing through `npx skills add` or the Claude Code plugin marketplace downloads the files from GitHub, under those tools' and GitHub's own terms.

## Changes

Changes to this policy are made in this file, and its git history is the record of every version.

## Contact

Questions about this policy: open an issue at https://github.com/PapiScholz/SDLC-Assist/issues or write to contact@nandi.com.ar.

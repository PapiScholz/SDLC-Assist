# Security Policy

This policy is intended for public repositories.

## Scope
This repository provides the `sdlc` agent skill (Markdown instructions plus zero-dependency Node scripts) and five vendored skills from `addyosmani/agent-skills`.

Security scope includes:
- integrity of the behavior defined in `skills/sdlc/SKILL.md` and its reference sheets
- read-only discipline of the scripts under `skills/sdlc/bin/` toward the repository they analyse
- byte-identity of the vendored skills to their pinned upstream commit
- safety of the install paths described in the README

## Supported Versions
Only the latest commit on the default branch is supported for security fixes.

## Reporting a Vulnerability
Please report security issues privately.

Preferred channel:
- open a private security advisory in this GitHub repository
- email: contact@nandi.com.ar

Include:
- summary of the issue
- impact and affected files
- reproduction steps
- suggested remediation if known

## Response Expectations
Maintainers will:
- acknowledge receipt as soon as practical
- assess severity and impact
- coordinate a fix and disclosure timeline
- publish a patch when validated

## Disclosure Guidelines
Please do not publish proof-of-concept exploit details before a fix is available. Coordinated disclosure helps reduce user risk.

## What the Skill Does on Your Machine
Automated skill scanners flag this skill because it instructs the agent to run scripts. This is what those scripts do, and what they never do.

`skills/sdlc/bin/where.js` (phase inference):
- reads spec, plan and todo files under the repository it is pointed at
- runs read-only git queries only (`rev-parse`, `ls-files`, `log`, `status`, `tag`, `rev-list`) with `GIT_OPTIONAL_LOCKS=0` and `core.fsmonitor=false`, so git never writes to the repository's index and never runs repository-configured commands
- never writes into the analysed repository; the self-test asserts a byte-level snapshot of every fixture before and after each run
- runs the project's test suite only with the explicit `--run-tests` flag, which the skill instructs the agent to pass only when the user asked for it in the current turn

`skills/sdlc/bin/which.js` (installed-skill detection):
- reads directory listings and `SKILL.md` frontmatter under `~/.agents/skills`, `~/.claude/skills`, `~/.config/opencode/skills`, `~/.codex/skills`, `~/.cursor/skills`, the project-level equivalents, and the Claude Code plugin cache
- never writes, never executes what it finds

`skills/sdlc/bin/sync-vendored.js` (maintainer tool):
- clones `addyosmani/agent-skills` at the pinned commit into a temporary directory to compare bytes
- the only script with network access; it is run by CI and maintainers, not by the skill at runtime

The agent itself, following `SKILL.md`:
- writes into the user's repository in exactly two cases: the `Phase:`/`Status:` header when it creates a spec, and the header update on a confirmed close
- never runs `git add`, `commit`, `push`, `reset`, `checkout` or any state-changing git command
- never installs anything without asking; install commands in `references/missing-skill.md` are offered as options, not executed
- never initiates a release

## Trust Boundaries
- Vendored skills are byte-identical to upstream commit `bc97fd46fdb294dc3518d0e94edb989a38894f31`; `node skills/sdlc/bin/sync-vendored.js --check` verifies it and runs in CI.
- Installing through `npx skills add` copies files into `~/.agents/skills` and overwrites same-named skills there; use `--skill sdlc` to install only the router. The Claude Code plugin path never touches user-scope skill directories.
- Request text passed to `where.js` is treated as data: it is read from a file (`--message-file`) or stdin, never interpolated into a shell command.

## Hardening Notes
This repository is intentionally simple:
- no runtime dependencies, no build step, no services
- no secrets should be stored in this repository
- scripts must stay transparent, auditable and read-only toward the analysed repository

Contributors should avoid introducing remote execution, network access at runtime, or any write into the analysed repository.

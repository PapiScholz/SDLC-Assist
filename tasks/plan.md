Spec: docs/specs/2026-09-29-sdlc-skill-design.md

## Goal

Build and publish v1 of SDLC-Assist: a portable `sdlc` skill that infers the SDLC phase of a work request from repo signals, confirms it with the user, and routes to the bundled SDD-family skills.

## Architecture

A multi-skill repo. skills/sdlc/ holds the router (SKILL.md, bin/ zero-dependency Node scripts, references/ phase sheets); five vendored skills from addyosmani/agent-skills at commit bc97fd46 sit beside it. Repo root carries the Claude Code plugin manifest, the self-referencing marketplace, command files for Claude Code and OpenCode, CI, and docs.

## File Structure

```
.
├── skills/
│   ├── sdlc/
│   │   ├── SKILL.md
│   │   ├── bin/
│   │   │   ├── header.js
│   │   │   ├── todo.js
│   │   │   ├── keywords.js
│   │   │   ├── signals.js
│   │   │   ├── infer.js
│   │   │   └── where.js
│   │   └── references/
│   │       └── (phase sheets)
│   ├── spec-driven-development/
│   ├── test-driven-development/
│   ├── systematic-debugging/
│   ├── verification-before-completion/
│   └── finishing-a-development-branch/
├── docs/
│   └── specs/
├── plugin.json
├── marketplace.json
├── commands/
├── .gitattributes
├── .gitignore
├── LICENSE
├── CHANGELOG.md
└── README.md
```

## Tasks

- [ ] Task 1: Amend the spec and close Analysis
- [ ] Task 2: Repo skeleton
- [ ] Task 3: Vendor the five SDD-family skills with a sync check
- [ ] Task 4: header.js parseHeader
- [ ] Task 5: todo.js countTasks
- [ ] Task 6: keywords.js classifyRequest
- [ ] Task 7: signals.js filesystem signals
- [ ] Task 8: signals.js git queries and --run-tests
- [ ] Task 9: infer.js decision table
- [ ] Task 10: where.js CLI and fixture harness
- [ ] Task 11: Fixtures 2, 6, 7
- [ ] Task 12: Fixtures 3, 4, 5, 8
- [ ] Task 13: Fixtures 9 and 10
- [ ] Task 14: --run-tests end to end
- [ ] Task 15: which.js installed-skill detector
- [ ] Task 16: Phase sheets and reference docs
- [ ] Task 17: SKILL.md for the router
- [ ] Task 18: Plugin, marketplace, command files, manifest check
- [ ] Task 19: Frontmatter and EOL checks, CI workflow, red runs
- [ ] Task 20: README and dogfooding close
- [ ] Task 21: Manual install verification

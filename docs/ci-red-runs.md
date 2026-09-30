# CI red runs

Evidence that every gate in `.github/workflows/ci.yml` can actually go red. Each run was made on a temp copy under `/tmp` (via the `--root`, `--skills-dir` or `--sheets-dir` hooks, or a copied `skills/` tree) so the working tree was never dirtied. `$S` is the temp dir. Reverting = discarding the copy.

| Gate | How it was made red | Output line | Exit |
|---|---|---|---|
| self-tests | inverted fixture in a copy of `where.self-test.js` | `FAIL exit 2 with stderr message when --root is not a directory` | 1 |
| sync-vendored | appended a line to a copy of a vendored `SKILL.md` | `drift: skills/test-driven-development/SKILL.md` | 1 |
| check-manifest | deleted `name` in a copy of `plugin.json` | `FAIL plugin.json: missing field name` | 1 |
| check-sheets | renamed a sheet in a copy | `check-sheets: missing sheet: testing` | 1 |
| check-frontmatter | removed `description:` in a copy | `check-frontmatter: sdlc: frontmatter missing description` | 1 |
| check-eol | wrote a CRLF file in an empty dir | `check-eol: CRLF in crlf.md` | 1 |

## Commands

```sh
S=$(mktemp -d); cp -r skills $S/skills

# self-tests: flip the expected status in fixture "exit 2 with stderr message..." (line 47)
sed -i '47s/status, 2)/status, 3)/' $S/skills/sdlc/bin/where.self-test.js
node $S/skills/sdlc/bin/where.self-test.js        # FAIL exit 2 with stderr message when --root is not a directory

# sync-vendored
echo "drift line" >> $S/skills/test-driven-development/SKILL.md
node skills/sdlc/bin/sync-vendored.js --check --skills-dir $S/skills
#   drift: skills/test-driven-development/SKILL.md
#   1 skill(s) drifted

# check-manifest (delete "name" from the copied plugin.json)
mkdir -p $S/m && cp -r .claude-plugin $S/m/
node -e "const f=process.argv[1];const j=JSON.parse(require('fs').readFileSync(f));delete j.name;require('fs').writeFileSync(f,JSON.stringify(j,null,2))" $S/m/.claude-plugin/plugin.json
node skills/sdlc/bin/check-manifest.js --root $S/m   # FAIL plugin.json: missing field name

# check-sheets
cp -r skills/sdlc/references/phases $S/ph && mv $S/ph/testing.md $S/ph/testng.md
node skills/sdlc/bin/check-sheets.js --sheets-dir $S/ph
#   check-sheets: missing sheet: testing
#   check-sheets: extra sheet: testng.md

# check-frontmatter
mkdir -p $S/f && cp -r skills $S/f/ && sed -i '/^description:/d' $S/f/skills/sdlc/SKILL.md
node skills/sdlc/bin/check-frontmatter.js --root $S/f   # check-frontmatter: sdlc: frontmatter missing description

# check-eol
mkdir -p $S/e && printf 'a\r\nb\r\n' > $S/e/crlf.md
node skills/sdlc/bin/check-eol.js --root $S/e           # check-eol: CRLF in crlf.md
```

Revert: none needed, the tracked tree was not touched (`git status --short` showed only the new untracked files).

## Notes

- The eol red run is local-only: `.gitattributes` (`* text=auto eol=lf`) normalises blobs on commit, so a CRLF file cannot reach CI through git. The gate guards against a checkout or tool that bypasses normalisation.
- `check-eol.js` also skips `graphify-out/` (gitignored generated output that contains CRLF locally) in addition to `.git`, `node_modules`, `.superpowers`, `.sdlc-fixtures`.
- sync-vendored needs network (it clones upstream).

## Advisory job: `claude plugin validate .`

Recorded from Task 18 and re-run locally in this task. Exit 0, one warning (advisory job stays `continue-on-error: true`):

```
⚠ Found 1 warning:

  ❯ description: No marketplace description provided. Adding a description helps users understand what this marketplace offers

✔ Validation passed with warnings
```

## Dogfood

The router run on its own repo at the planning close. Command: `node skills/sdlc/bin/where.js --message "continue"`. Only `inferred`, `evidence`, `alternatives` and `warnings` are recorded.

Before close mode (spec header `Phase: planning`, plan present, todo with open tasks):

```
inferred: planning
evidence:
  - header Phase: planning, Status: approved (docs/specs/2026-09-29-sdlc-skill-design.md)
  - fallback: development (candidates: development)
  - tests not run (no --run-tests)
alternatives:
  - {phase: development, kind: fallback, reason: "header disagrees with fallback"}
warnings:
  - header says planning but artifacts say development
```

Close mode applied by hand (the owner approved the plan, which is the planning close): the spec header line changed from `Phase: planning` to `Phase: development`, `Status: approved` kept. Second run:

```
inferred: development
evidence:
  - header Phase: development, Status: approved (docs/specs/2026-09-29-sdlc-skill-design.md)
  - fallback: development (candidates: development)
  - tests not run (no --run-tests)
alternatives: []
warnings: []
```

## Manual install verification (Task 21)

Date: 2026-09-30. Repo published at https://github.com/PapiScholz/SDLC-Assist (main, 23 commits).

### Path 1: skills.sh CLI (verified)

Command, from an empty temporary home (`HOME=/tmp/sdlc-home`):

```
npx -y skills add PapiScholz/SDLC-Assist -y --copy
```

Result: six skills installed under `~/.agents/skills/` (`sdlc`, `spec-driven-development`,
`planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`,
`context-engineering`), each with all its files (`sdlc/bin/`, `sdlc/references/` present), and
linked into `~/.claude/skills/` plus the other agents' skill directories.

End-to-end run of the installed copy against a scratch production repo (source file, tag
`v1.2.0`, versioned CHANGELOG, no spec) with the request file containing
`un cliente se queja de que la app se rompió al pagar`:

```
node ~/.agents/skills/sdlc/bin/where.js --root <scratch> --message-file <file>
inferred: analysis   request.type: complaint   inProduction: true   warnings: []
evidence: fallback: analysis (candidates: analysis); tests not run (no --run-tests); in production: tag v1.2.0
```

### Path 2: Claude Code plugin (owner, native terminal)

```
claude plugin marketplace add PapiScholz/SDLC-Assist
claude plugin install sdlc@papischolz
```

Expected: `/sdlc:phase` in the palette; one `/spec-driven-development` entry when no user-scope copy
exists (`node <install>/skills/sdlc/bin/which.js --verbose` lists any duplicate).

### Path 3: OpenCode command (owner)

```
cp .opencode/command/sdlc-phase.md ~/.config/opencode/command/
```

Expected: `/sdlc-phase` available; the `sdlc` skill loads by intent from `~/.agents/skills`.

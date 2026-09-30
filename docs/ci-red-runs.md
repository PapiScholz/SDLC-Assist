# CI red runs

Evidence that every gate in `.github/workflows/ci.yml` can actually go red. Each run was made on a temp copy under `/tmp` (via the `--root`, `--skills-dir` or `--sheets-dir` hooks, or a copied `skills/` tree) so the working tree was never dirtied. `$S` is the temp dir. Reverting = discarding the copy.

| Gate | How it was made red | Output line | Exit |
|---|---|---|---|
| self-tests | inverted fixture in a copy of `where.self-test.js` | `FAIL exit 2 with stderr message when --root is not a directory` | 1 |
| sync-vendored | appended a line to a copy of a vendored `SKILL.md` | `drift: skills/test-driven-development/SKILL.md` | 1 |
| check-manifest | deleted `name` in a copy of `plugin.json` | `FAIL plugin.json: missing field name` | 1 |
| check-sheets | renamed a sheet in a copy | `check-sheets: missing sheet: testing` | 1 |
| check-sheets (body) | deleted the `**Measure:**` line from a copy of `testing.md` | `check-sheets: testing.md: missing body line "**Measure:**"` | 1 |
| check-frontmatter | removed `description:` in a copy | `check-frontmatter: sdlc: frontmatter missing description` | 1 |
| check-skill-sections | renamed `## Report` to `## Results` in a copy of `sdlc-qa-gate/SKILL.md` | `check-skill-sections: sdlc-qa-gate: missing section "Report"` | 1 |
| check-eol | wrote a CRLF file in an empty dir | `check-eol: CRLF in crlf.md` | 1 |
| gates.sh (git-authorization hook) | `permissionDecision: 'deny'` flipped to `'allow'` in a copy of the hook | `FAIL scripts/hooks/git-authorization.self-test.js` | 1 |
| gates.sh (eol-guard hook) | `process.exit(2)` flipped to `process.exit(0)` in a copy of the hook | `FAIL scripts/hooks/eol-guard.self-test.js` | 1 |
| gates.sh (settings.json) | copy of `.claude/settings.json` replaced by `{` | `FAIL settings.json` | 1 |
| gates.sh (check-eol) | appended a CRLF line to a copy of `README.md` | `FAIL check-eol` | 1 |

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

# check-sheets, body lines (drop the Measure line from the copied testing sheet)
P=$(mktemp -d); cp -r skills/sdlc/references/phases $P/ph; sed -i '/^\*\*Measure:\*\*/d' $P/ph/testing.md
node skills/sdlc/bin/check-sheets.js --sheets-dir $P/ph
#   check-sheets: testing.md: missing body line "**Measure:**"

# check-frontmatter
mkdir -p $S/f && cp -r skills $S/f/ && sed -i '/^description:/d' $S/f/skills/sdlc/SKILL.md
node skills/sdlc/bin/check-frontmatter.js --root $S/f   # check-frontmatter: sdlc: frontmatter missing description

# check-skill-sections (rename a contract heading in the copy)
sed -i 's/^## Report$/## Results/' $S/skills/sdlc-qa-gate/SKILL.md
node skills/sdlc/bin/check-skill-sections.js --root $S
#   check-skill-sections: sdlc-qa-gate: missing section "Report"

# check-eol
mkdir -p $S/e && printf 'a\r\nb\r\n' > $S/e/crlf.md
node skills/sdlc/bin/check-eol.js --root $S/e           # check-eol: CRLF in crlf.md

# scripts/gates.sh, whole-repo temp copy (T is separate from S); each red run prints the FAIL line and exits 1
T=$(mktemp -d); tar --exclude=.git --exclude=graphify-out --exclude=node_modules -cf - . | tar -xf - -C "$T"
sed -i "s/permissionDecision: 'deny'/permissionDecision: 'allow'/" $T/scripts/hooks/git-authorization.js
bash $T/scripts/gates.sh --quick | grep ^FAIL    # FAIL scripts/hooks/git-authorization.self-test.js
# (recreate T from the tar line before each of the next three)
sed -i 's/process.exit(2)/process.exit(0)/' $T/scripts/hooks/eol-guard.js
bash $T/scripts/gates.sh --quick | grep ^FAIL    # FAIL scripts/hooks/eol-guard.self-test.js
echo '{' > $T/.claude/settings.json
bash $T/scripts/gates.sh --quick | grep ^FAIL    # FAIL settings.json
printf 'x\r\n' >> $T/README.md
bash $T/scripts/gates.sh --quick | grep ^FAIL    # FAIL check-eol
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

## v1.1 dogfood

Runs of the own skills against this repo or a scratch copy, pasted verbatim.

### (b) sdlc-release, detect mode, this repo at 7fb1d19

Commands run at the repo root (HEAD 7fb1d19; the run was first done at 9463368, one more commit landed since). `where.js` was fed a message file containing `release the current work`; only the fields the skill reads are printed. Real output:

```
$ node skills/sdlc/bin/where.js --message-file <tmp>/m.txt | node -e '<print three fields>'
releaseWorkflow.files = [".github/workflows/ci.yml",".github/workflows/release.yml"]
git.lastSemverTag = {"name":"v0.1.1","sha":"2b9683ea70405fa4a8cac3282856f0f9536aab0a"}
git.commitsAfterTag = 6

$ grep -n "BUMP=\|\[major\]\|\[minor\]\|BREAKING" .github/scripts/release.sh
73:BUMP="patch"
74:if echo "$COMMITS" | grep -qF '[major]' || echo "$COMMITS" | grep -q 'BREAKING CHANGE'; then
75:  BUMP="major"
76:elif echo "$COMMITS" | grep -qF '[minor]'; then
77:  BUMP="minor"

$ grep -n "branches\|workflow_dispatch" .github/workflows/release.yml
5:    branches: [main]
9:  workflow_dispatch:

$ git log v0.1.1..HEAD --format=%s | grep -cF -e '[minor]' -e '[major]' -e 'BREAKING CHANGE'
0
```

Skill output (step 1, detect):

```
mechanism:      release workflow (release.yml drives; it calls .github/scripts/release.sh)
trigger:        push to main, plus workflow_dispatch for a re-run
bump rule:      release.sh lines 73-77: patch unless a commit subject since the tag contains the literal [minor], or [major] / BREAKING CHANGE; feat: prefixes do not bump
current state:  0 of the 6 commits after v0.1.1 carry a marker, so the script computes v0.1.2
recommendation: merge the PR into main; do not tag by hand. The plan for the closing commit is to carry [minor], which would give v0.2.0; without it the script computes v0.1.2. Nothing was executed (steps 2 to 6 not run).
```

### (c) sdlc-debugging, seeded fault in a scratch copy

Scratch copy of `skills/` with `'bogus'` inserted at the head of `PHASES` in `skills/sdlc/bin/lib/header.js`; the scratch is not a git repo, so `where.js` gave no git signals and no test runner (`testRunner.command` null).

Commands and real output (fresh scratch copy; `ok` lines filtered out with `grep -v "^  ok"`):

```
$ cp -r skills "$S/skills"; sed -i "s/const PHASES = \[/const PHASES = ['bogus', /" "$S/skills/sdlc/bin/lib/header.js"
$ grep -n "const PHASES" skills/sdlc/bin/lib/header.js
1:const PHASES = ['bogus', 'initial', 'analysis', 'planning', 'development', 'testing', 'deployment'];
$ node skills/sdlc/bin/lib/header.self-test.js 2>&1 | grep -v "^  ok"; echo "exit ${PIPESTATUS[0]}"
parseHeader
  FAIL PHASES is the six slugs in cycle order
       Expected values to be strictly deep-equal:
+ actual - expected

  [
+   'bogus',
    'initial',
    'analysis',
    'planning',
    'development',
    'testing',


12 passed, 1 failed
exit 1
```

Disproof attempt (second copy with the seed removed):

```
$ sed -i "s/'bogus', //" "$D/skills/sdlc/bin/lib/header.js"
$ grep -n "const PHASES" "$D/skills/sdlc/bin/lib/header.js"
1:const PHASES = ['initial', 'analysis', 'planning', 'development', 'testing', 'deployment'];
$ node "$D/skills/sdlc/bin/lib/header.self-test.js" 2>&1 | tail -1; echo "exit ${PIPESTATUS[0]}"
13 passed, 0 failed
exit 0
```

Skill output:

```
Reproduction: node skills/sdlc/bin/lib/header.self-test.js -> exit 1, "FAIL PHASES is the six slugs in cycle order", 12 passed, 1 failed (output above)
Location:     skills/sdlc/bin/lib/header.js:1
Cause:        PHASES starts with an extra 'bogus' entry, so the array is no longer the six slugs the self-test asserts with deepStrictEqual (header.self-test.js:57).
Evidence:     reproduction above; location header.js:1; disproof attempt: removed 'bogus' in a second copy -> self-test 13 passed, 0 failed, consistent with the cause (no git signals available, so no commit suspect)
Diagnostic:   removed (no test or print added; the existing self-test is the reproduction and stays as it is)
Next:         short spec via spec-driven-development (Phase: analysis / Status: draft)
```

### (c2) sdlc-debugging, no reproduction possible

Card: `What happens: sometimes where.js reports deployment on a clean checkout; no steps to reproduce`. Same scratch copy, with the seed still in place (unrelated to this card).

Loop run in the scratch root (message file: `sometimes where.js reports deployment on a clean checkout`), real output:

```
$ for i in 1 2 3 4 5; do node skills/sdlc/bin/where.js --message-file <tmp>/m3.txt | grep '"inferred"'; done
  "inferred": "analysis",
  "inferred": "analysis",
  "inferred": "analysis",
  "inferred": "analysis",
  "inferred": "analysis",
```

Skill output:

```
Reproduction: none — no steps given and the fault is intermittent; five consecutive runs of where.js on the clean scratch inferred analysis every time, never deployment (loop above); evidence used instead: the card's user report plus those five runs
Location:     not localisable with current evidence — a run that reports deployment, or its input (message text, specs headers, git state)
Cause:        none declared; the skill does not allow a cause without a reproduction or an explicit statement of what replaces it
Evidence:     none; the five runs were consistent, so nothing to disprove or confirm
Diagnostic:   removed (nothing added)
Next:         short spec via spec-driven-development (Phase: analysis / Status: draft). Hand-off confidence: lower, because there is no reproduction. Ask the user for the message text and the checkout state when it happened.
```

### Reference scenarios (fresh temp home)

Fresh `HOME` (`$T/home`, `USERPROFILE` set to it so `os.homedir()` follows on Windows), then `npx -y skills add C:/Users/ezesc/Github/SDLC-Assist -y -g --copy`, then `which.js` from `$HOME/.agents/skills/sdlc/bin`.

```
$ T=$(mktemp -d); export HOME="$T/home"; export USERPROFILE="$HOME"; mkdir -p "$HOME" "$T/np/src"; cd "$HOME"
$ npx -y skills add "C:/Users/ezesc/Github/SDLC-Assist" -y -g --copy
[installer output trimmed to 20 lines of the sdlc lines and the summary; the rest lists other agents' target paths]
◇  Installed 9 skills ──────────────────────────────────────────────╮
│  ✓ context-engineering (copied)                                   │
│  ✓ incremental-implementation (copied)                            │
│  ✓ planning-and-task-breakdown (copied)                           │
│  ✓ sdlc (copied)                                                  │
│    → .\.agents\skills\sdlc                                        │
│    → .\.claude\skills\sdlc                                        │
[trimmed]
exit 0
$ W="$HOME/.agents/skills/sdlc/bin"
$ node "$W/which.js" --phase analysis | grep -c '"name": "sdlc-debugging"'
1
$ node "$W/which.js" --phase testing | grep -c '"name": "sdlc-qa-gate"'
1
$ node "$W/which.js" --phase deployment | grep -c '"name": "sdlc-release"'
1
```

#### Scenario 2b: sdlc-qa-gate on a repo with no runner

Setup and stack facts, run from `$T/np` (commands and their stdout):

```
$ git init -q && printf "module.exports=1\n" > src/a.js && git add . && git commit -qm init && printf "module.exports=2\n" > src/a.js && git status --short
warning: in the working copy of 'src/a.js', LF will be replaced by CRLF the next time Git touches it
 M src/a.js
$ ls package.json
ls: cannot access 'package.json': No such file or directory
$ node "$W/where.js" --message-file "$T/msg.txt" | grep -A3 -E "\"(testRunner|lastSemverTag|releaseWorkflow)\"|\"files\""
      "lastSemverTag": null,
      "tagOnHead": false,
      "commitsAfterTag": null
    },
--
    "releaseWorkflow": {
      "exists": false,
      "files": []
    },
--
    "testRunner": {
      "kind": null,
      "command": null
    },
$ git diff --name-only HEAD; git status --short
warning: in the working copy of 'src/a.js', LF will be replaced by CRLF the next time Git touches it
src/a.js
 M src/a.js
```

The request text in `$T/msg.txt` was `bug: a.js exports the wrong value`.

Diff map (base: HEAD, one uncommitted file):

| File | Domain | Existing coverage | Nature |
|---|---|---|---|
| `src/a.js` | logic | none | refactor (value changed, no test exists to judge it) |

```
| Layer | Verified | Not verified | Residual risk |
|---|---|---|---|
| static | not run | no runner detected, verify by hand | medium: no type checker or linter configured, the edit is unchecked |
| unit | not run | no runner detected, verify by hand | high: no test covers src/a.js |
| build | not run | no runner detected, verify by hand | medium: no build step to prove the artifact |
| runtime | not run | applies when the diff touches UI, API, config or dependencies; a logic-only edit to one module does not | low: nothing served |
| functional | not run | applies when the diff touches UI or API; it does not | low: no route or endpoint changed |
| regression | not run | applies when shared modules changed; one file with no importers | low: no importer found |
```

Six rows, all `not run`. Next step: verify `src/a.js` by hand, or add a runner before asking for the gate again.

#### Scenario 3b: sdlc-release steps 1-2 on the same scratch

Step 1 (detect) evidence and step 2 (classify) inputs, commands and their stdout:

```
$ git tag | wc -l
0
$ git log --format=%s
init
$ ls scripts .github .changeset release-please-config.json .releaserc* package.json
ls: cannot access 'scripts': No such file or directory
ls: cannot access '.github': No such file or directory
ls: cannot access '.changeset': No such file or directory
ls: cannot access 'release-please-config.json': No such file or directory
ls: cannot access '.releaserc*': No such file or directory
ls: cannot access 'package.json': No such file or directory
$ node "$W/where.js" --message-file "$T/msg.txt" | grep -A4 -E "\"(lastSemverTag|commitsAfterTag|releaseWorkflow)\""
      "lastSemverTag": null,
      "tagOnHead": false,
      "commitsAfterTag": null
    },
    "changelog": {
      "exists": false,
--
    "releaseWorkflow": {
      "exists": false,
      "files": []
    },
```

No mechanism in step 1, so the skill would run steps 2 to 6 itself. The one subject (`init`) matches no class; it counts as patch-level, and with no tag and no pinned version file the first version is 0.1.0. The line the skill's step-2 format yields:

```
last tag: none   commits: 1   classes: unclassified 1 (patch-level)   proposed: v0.1.0 (patch)
```

Stopped before step 5: nothing was edited, committed, tagged or pushed (steps 3 to 6 not run).

### (a) sdlc-qa-gate on the v1.1 diff

Base `main` (`git diff --name-only main...HEAD` plus `git status --short`, read-only). `where.js` on this repo: `signals.testRunner.kind` null (no `package.json`), so the unit layer runs the repo's own loop, as CONTRIBUTING.md defines it.

Diff map (24 files in `main...HEAD`; `docs/ci-red-runs.md`, the spec and `tasks/todo.md` also carry uncommitted edits; untracked `.claude/handoff.md` is local and not part of the diff):

| File | Domain | Existing coverage | Nature |
|---|---|---|---|
| `.github/scripts/release.sh` | CI | none (exercised only by the release workflow) | ci-infra |
| `.github/workflows/ci.yml` | CI | the workflow itself on push/PR | ci-infra |
| `CHANGELOG.md` | docs | none | config |
| `CLAUDE.md` | docs | none | config |
| `CONTRIBUTING.md` | docs | none | config |
| `README.md` | docs | none | config |
| `docs/ci-red-runs.md` | docs | none | config |
| `docs/specs/2026-09-30-v1-1-own-skills.md` | docs | header parsed by `lib/header.self-test.js` | config |
| `skills/sdlc-debugging/SKILL.md` | docs (skill) | `check-frontmatter.js`, `check-skill-sections.js` | new-logic |
| `skills/sdlc-qa-gate/SKILL.md` | docs (skill) | `check-frontmatter.js`, `check-skill-sections.js` | new-logic |
| `skills/sdlc-release/SKILL.md` | docs (skill) | `check-frontmatter.js`, `check-skill-sections.js` | new-logic |
| `skills/sdlc/SKILL.md` | docs (skill) | `check-frontmatter.js` | config |
| `skills/sdlc/bin/check-frontmatter.js` | logic | `check-frontmatter.self-test.js` | new-logic |
| `skills/sdlc/bin/check-frontmatter.self-test.js` | logic (test) | itself | new-logic |
| `skills/sdlc/bin/check-sheets.js` | logic | `check-sheets.self-test.js` | refactor (comment only) |
| `skills/sdlc/bin/check-skill-sections.js` | logic | `check-skill-sections.self-test.js` | new-logic |
| `skills/sdlc/bin/check-skill-sections.self-test.js` | logic (test) | itself | new-logic |
| `skills/sdlc/references/missing-skill.md` | docs | none | config |
| `skills/sdlc/references/phases/analysis.md` | docs (sheet) | `check-sheets.js`, `which.self-test.js` | config |
| `skills/sdlc/references/phases/deployment.md` | docs (sheet) | `check-sheets.js`, `which.self-test.js` | config |
| `skills/sdlc/references/phases/testing.md` | docs (sheet) | `check-sheets.js`, `which.self-test.js` | config |
| `skills/sdlc/references/request-card.md` | docs | none | config |
| `tasks/plan.md` | docs | none | config |
| `tasks/todo.md` | docs | none | config |

Layers run:

```
$ for t in skills/sdlc/bin/lib/*.self-test.js skills/sdlc/bin/*.self-test.js; do echo "== $t"; node "$t" | tail -1 || exit 1; done; echo "exit $?"
== skills/sdlc/bin/lib/header.self-test.js
13 passed, 0 failed
== skills/sdlc/bin/lib/infer.self-test.js
27 passed, 0 failed
== skills/sdlc/bin/lib/keywords.self-test.js
28 passed, 0 failed
== skills/sdlc/bin/lib/signals.self-test.js
18 passed, 0 failed
== skills/sdlc/bin/lib/todo.self-test.js
5 passed, 0 failed
== skills/sdlc/bin/check-eol.self-test.js
6 passed, 0 failed
== skills/sdlc/bin/check-frontmatter.self-test.js
10 passed, 0 failed
== skills/sdlc/bin/check-manifest.self-test.js
10 passed, 0 failed
== skills/sdlc/bin/check-sheets.self-test.js
7 passed, 0 failed
== skills/sdlc/bin/check-skill-sections.self-test.js
7 passed, 0 failed
== skills/sdlc/bin/sync-vendored.self-test.js
drift: skills/spec-driven-development/SKILL.md
missing: skills/spec-driven-development/LICENSE
missing: skills/spec-driven-development/VENDORED.md
drift: skills/spec-driven-development/SKILL.md
missing: skills/spec-driven-development/LICENSE
missing: skills/spec-driven-development/VENDORED.md
sync-vendored self-test OK
== skills/sdlc/bin/where.self-test.js
28 passed, 0 failed
== skills/sdlc/bin/which.self-test.js
15 passed, 0 failed
exit 0
$ node skills/sdlc/bin/sync-vendored.js --check && node skills/sdlc/bin/check-manifest.js && node skills/sdlc/bin/check-sheets.js && node skills/sdlc/bin/check-frontmatter.js && node skills/sdlc/bin/check-skill-sections.js && node skills/sdlc/bin/check-eol.js; echo "exit $?"
vendored skills in sync
manifests ok
check-sheets: 6 sheets OK
check-frontmatter: 9 skills OK
check-skill-sections: 3 skills OK
check-eol: no CRLF or BOM found
exit 0
```

The regression row's evidence is in the loop above: `check-frontmatter.self-test.js` 10 passed, `check-sheets.self-test.js` 7 passed, `which.self-test.js` 15 passed (it reads the sheets). The `drift:`/`missing:` lines under `sync-vendored.self-test.js` are that self-test's own fixture output, ending in `sync-vendored self-test OK`. The loop's `tail -1` keeps each self-test's last line only.

```
| Layer | Verified | Not verified | Residual risk |
|---|---|---|---|
| static | not run | no type checker or linter is configured in this repo | medium: syntax errors in scripts surface only when a self-test loads them |
| unit | no test runner detected (`signals.testRunner.kind` null), so the repo loop stands in as the suite: 13 self-tests, exit 0, no skips; the six gates above, all exit 0 | behaviour of `release.sh` and `ci.yml` (no self-test); skill prose (only structure is checked: frontmatter, sections, sheets) | medium: the release script and the install-smoke job are proven only by CI on the PR |
| build | not run | not applicable: Markdown and scripts, no build step and no artifact | low: nothing is compiled |
| runtime | not run | not applicable: no server or app; the diff touches CI and scripts, nothing is served | low: nothing to start |
| functional | not run | not applicable: no UI or API changed. The install path was exercised by hand on a temp home (scenarios above, 1/1/1) | low: real install verified once locally, CI re-runs it on Ubuntu and Windows |
| regression | `check-frontmatter.js` and `check-sheets.js` changed: their self-tests are in the loop and passed; `which.self-test.js` reads the sheets, 15 passed, 0 failed | the three skill bodies followed by an agent other than the author | low: the changed scripts are covered; behavioural quality of the new skills rests on the dogfood scenarios |
```

Gaps from the diff map: no `new-logic` file lacks a covering test (both scripts have self-tests, and the frontmatter change has 22 added self-test lines). Not covered by any test: `.github/scripts/release.sh` (ci-infra, six changed lines; exercised only when `release.yml` runs on `main`).

Next step: accept the residual risk and run `sdlc close` for Testing, or fix the gap list first (a release.sh check, proposed only, not written).

### Reference scenario 2, rerun on a scratch npm project

The earlier scenario 2 ran on a repo without `package.json`, so no row showed the runner path. This rerun follows `skills/sdlc-qa-gate/SKILL.md` literally on a scratch npm project with one changed file (the `git` LF/CRLF warnings are omitted from the outputs below; output trimmed where marked).

Setup:

```
T=$(mktemp -d); mkdir -p "$T/np2/src"; cd "$T/np2"; git init -q; git config user.name t; git config user.email t@t
printf '{"name":"np2","version":"0.0.1","scripts":{"test":"node -e 0"}}\n' > package.json
echo 'module.exports = 1;' > src/a.js; git add -A; git commit -qm init
echo 'module.exports = 2;' > src/a.js
```

Router facts, `node skills/sdlc/bin/where.js --root "$T/np2" --message-file <tmp>` (trimmed to the load-bearing fields):

```
"git": { "isRepo": true, "branch": "master", "commits": [ { "subject": "init", "paths": ["package.json", "src/a.js"] } ] }
"sourceFiles": { "count": 1, "sample": ["src/a.js"] }
"testRunner": { "kind": "npm", "command": "npm test" }
```

`testRunner.kind` is `npm`, so the unit layer applies.

Diff map (`git diff --name-only HEAD` printed `src/a.js`; `git status --short` printed ` M src/a.js`):

| File | Domain | Existing coverage | Nature |
|---|---|---|---|
| `src/a.js` | logic | none | new-logic |

Unit layer, `npm test`:

```
> np2@0.0.1 test
> node -e 0

exit=0
```

Report:

| Layer | Verified | Not verified | Residual risk |
|---|---|---|---|
| static | not run | no `tsconfig.json`, lint script or type-checker config in the project | medium: no static check of `src/a.js` |
| unit | `npm test` ran, exit 0, no skips | the suite is `node -e 0`: it executes no test, so it says nothing about `src/a.js` | high: exit 0 without any assertion |
| build | not run | no `build` script and no build backend | low: nothing is built |
| runtime | not run | the diff touches no UI, API, config or dependencies | low: nothing to start |
| functional | not run | the diff touches no UI or API | low: no routes changed |
| regression | not run | no shared module changed and no other module imports `src/a.js` | low: no importer to re-run |

Gaps from the diff map: `gap: src/a.js new-logic without a covering test; proposed: a.test.js asserting that require("./src/a") returns 2`.

Next step: accept the residual risk and run `sdlc close` for Testing, or add the proposed test first (proposed only, not written).

Result: the runner path is now exercised. `testRunner.kind` came back `npm`, the unit row carries a real command, output and exit code, and the other five rows are listed as not run with their reasons.

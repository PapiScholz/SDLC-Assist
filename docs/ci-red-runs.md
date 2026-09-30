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
# (output filtered to the FAIL line by the `| grep ^FAIL`; the `ok` lines of the gates that still pass are dropped)
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

## v1.2 dogfood

Runs of the v1.2 protocol against this repo, pasted verbatim.

### (a) Intent without a spec pointing at it, before the spec edit (branch `v1.2-playbook-alignment` at f351dc9)

The intent was committed on its own, so the repo had an intent file and no spec `Intent:` line. Real output:

```
$ git ls-files docs/intents
docs/intents/2026-09-30-playbook-alignment.md
$ grep -rn "^Intent:" docs/specs/
exit=1
```

### (b) After the spec edit, same branch, working tree only

The spec header gained the `Intent:` line (third header line, after `Status:`). The header parser and the phase inference must not change. Real output:

```
$ grep -rn "^Intent:" docs/specs/
docs/specs/2026-09-30-v1-2-playbook-alignment.md:5:Intent: docs/intents/2026-09-30-playbook-alignment.md
exit=0
$ node skills/sdlc/bin/lib/header.self-test.js | tail -1
13 passed, 0 failed
$ node skills/sdlc/bin/where.js --message-file <tmp>/m.txt | grep '"inferred"'
  "inferred": "planning",
```

The message file contained `seguí con v1.2`. Phase stays `planning` because the spec header is still `Phase: planning` / `Status: approved`; the phase advances only through close mode.

### (c) Reference scenarios, fresh temp home, branch at eb641d0

All commands ran from a script under the session scratchpad on Windows (Git Bash, Node). `HOME` and `USERPROFILE` pointed at an empty temp directory for the install. Output is real; paths are shortened to `<tmp>`, `<checkout>`, `<repo-a>`, `<repo-b>`, `<clone>`. Two lines of the install log per skill ("Eve does not support global skill installation") were filtered out; they are the CLI reporting one unsupported target, not a failure.

**(0) Install.** The published copy is `main` (v0.2.0): it has no `intent.md` or `maintain.md` yet, so scenarios 1 and 2 ran `where.js` from this checkout and followed the branch's sheets. The install itself is what a v1.2 user gets after the release.

```
$ HOME=<tmp>/home USERPROFILE=<tmp>/home npx -y skills add PapiScholz/SDLC-Assist -y -g --copy
└  Done!  Review skills before use; they run with full agent permissions.

$ ls ~/.agents/skills
context-engineering
incremental-implementation
planning-and-task-breakdown
sdlc
sdlc-debugging
sdlc-qa-gate
sdlc-release
spec-driven-development
test-driven-development
$ ls ~/.agents/skills/sdlc/references
entry-points.md
missing-skill.md
phases
request-card.md
spec-header.md
$ grep -m1 "^version:" ~/.agents/skills/sdlc/SKILL.md
version: 0.2.0
```

**(1) Idea on existing code.** Scratch repo with `src/orders.js`, one commit, no `docs/`, no spec. Request file: `quiero agregar exportación a CSV`.

```
$ node <checkout>/skills/sdlc/bin/where.js --root <repo-a> --message-file m1.txt
inferred: analysis  request.type: feature  inProduction: false  warnings: []
evidence: fallback: analysis (candidates: analysis); tests not run (no --run-tests)
$ git ls-files docs/intents; ls docs
ls: cannot access 'docs': No such file or directory
```

The agent then follows `intent.md`: the repo has no `docs/intents/`, so it asks before creating it (in this run the owner of the scratch repo is the agent itself; the question is the sheet's rule, recorded here as the step). It writes the intent in the originator's words, leaving what the originator has not said as open questions rather than inventing it. File written and committed:

```
$ cat docs/intents/2026-09-30-exportacion-csv.md
# Intent: exportación a CSV

Who:              originador del pedido (dueño del repo)
Problem:          "quiero agregar exportación a CSV" (sin más detalle todavía)
Desired outcome:  pendiente de confirmar con el originador
Constraints:      pendiente
Open questions:   ¿exportar qué (órdenes de `src/orders.js`)? ¿desde dónde se dispara? ¿quién lo consume?
$ git ls-files docs/intents; grep -rln "^Intent:" docs/specs/
docs/intents/2026-09-30-exportacion-csv.md
specs naming it: exit=2
```

`exit=2` is grep on a missing `docs/specs/`: the intent has no spec naming it yet, which is the "intent without spec" warning the `sdlc` question must show until the analysis spec carries `Intent: docs/intents/2026-09-30-exportacion-csv.md`.

**(2) Production alert.** Scratch repo with `src/api.js`, `CHANGELOG.md` with `## [1.2.0]`, tag `v1.2.0` on HEAD. Request file: `la API devuelve 500 desde ayer en producción`.

```
$ node <checkout>/skills/sdlc/bin/where.js --root <repo-b> --message-file m2.txt
inferred: analysis  request.type: unknown  inProduction: true  warnings: []
evidence: fallback: analysis (candidates: analysis); tests not run (no --run-tests); in production: tag v1.2.0
```

`maintain` is not inferred, by design (`maintain.md`: "nothing in `where.js` infers it"); the agent routes there from `inProduction: true` plus a signal from the running system. `request.type` came back `unknown`: the classifier has no pattern for "devuelve 500" (it does for "se queja", scenario (b) of Task 21). Noted as a minor for the v1.2 review; the routing does not depend on it here. Following `maintain.md`, the agent asks for the signal's evidence and writes the intent with the four extra lines under "Problem":

```
$ cat docs/intents/2026-09-30-api-500-produccion.md
# Intent: la API devuelve 500 desde ayer en producción

Who:              originador del aviso (opera el servicio)
Problem:          "la API devuelve 500 desde ayer en producción"
  Anomaly and evidence:  pendiente: pedir métrica, línea de log o id de alerta al originador
  Proposed outcome:      pendiente de confirmar con el originador
  Affected systems:      `src/api.js` (v1.2.0 en producción)
  Open questions:        ¿todas las rutas o una? ¿qué cambió ayer (deploy, dependencia, infra)?
Desired outcome:  pendiente
Constraints:      pendiente
Open questions:   ver arriba
$ git ls-files docs/intents; grep -rln "^Intent:" docs/specs/
docs/intents/2026-09-30-api-500-produccion.md
specs naming it: exit=2
```

Next phase recommended by the sheet: analysis, as a new cycle.

**(3) Contributor clone.** `git clone` of this checkout into a temp dir, then the versioned hook fed the same JSON Claude Code sends (tool call `git push`, transcript whose last human record is "dale", an older one says "pusheá"), and the single gate target.

```
$ git clone -q <checkout> clone && cd clone && git log --oneline -1
eb641d0 spec: intent link and Node hooks paragraph; v1.2 dogfood (a)(b) [skip release]
$ cat transcript.jsonl   # three records, last human line is "dale"
{"type":"user","origin":{"kind":"human"},"message":{"role":"user","content":"pusheá cuando termines"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"listo, ¿sigo?"}]}}
{"type":"user","origin":{"kind":"human"},"message":{"role":"user","content":"dale"}}
$ cat hook-input.json
{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git push"},"transcript_path":"<transcript>","cwd":"<clone>"}
$ node scripts/hooks/git-authorization.js < hook-input.json; echo "exit=$?"
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"git-authorization: push needs one of: push / pushea / pushear. Ask the user to say it in their next message. Last user message: \"dale\""}}exit=0
$ bash scripts/gates.sh | tail -3; echo "exit=${PIPESTATUS[0]}"
ok check-eol
ok settings.json
all gates ok
exit=0
```

Exit 0 with a `deny` JSON is the Claude Code contract (the decision travels in stdout, not the exit code). A first attempt fed the hook an MSYS-style `transcript_path` (`/tmp/...`) and got `deny` with reason "transcript missing/lagging": fail-closed worked, but for the wrong reason; the run above uses a Windows path, which is what Claude Code passes.

### (d) sdlc-qa-gate on the branch diff against `main` (HEAD 0937ff4 plus three uncommitted doc edits)

Stack facts from `where.js` (message `sdlc close`): `testRunner: {"kind":null,"command":null}`, 43 source files, `inferred: testing`. No `package.json`, `tsconfig.json` or `pyproject.toml`: the repo's runner is the single gate target, so the unit layer is `bash scripts/gates.sh`.

Diff map (`git diff --name-only <merge-base>...HEAD` plus `git status --short`), grouped:

| File | Domain | Existing coverage | Nature |
|---|---|---|---|
| `scripts/hooks/git-authorization.js` | logic (hook) | `git-authorization.self-test.js` (103 checks) | new-logic |
| `scripts/hooks/eol-guard.js` | logic (hook) | `eol-guard.self-test.js` (11 checks) | new-logic |
| `skills/sdlc/bin/check-sheets.js` | logic (gate) | `check-sheets.self-test.js` (10 checks) | new-logic (two mandatory lines) |
| `scripts/gates.sh` | CI | red runs in this file (four seeded FAILs) | ci-infra |
| `.github/workflows/ci.yml` | CI | none locally; the PR run is the check | ci-infra |
| `.claude/settings.json` | config | `settings.json` gate (JSON parse, hook paths exist) | config |
| `.gitignore` | config | none | config |
| `skills/sdlc/SKILL.md`, `references/*.md` (8 sheets, `intent.md`, `maintain.md`, `entry-points.md`, `spec-header.md`) | docs (skill prose) | `check-sheets`, `check-frontmatter`, `check-skill-sections`, `check-eol` | docs |
| `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/ci-red-runs.md`, `docs/intents/*`, `docs/specs/*` | docs | `check-eol` | docs |

Unit layer, real output:

```
$ bash scripts/gates.sh
ok skills/sdlc/bin/lib/header.self-test.js
ok skills/sdlc/bin/lib/infer.self-test.js
ok skills/sdlc/bin/lib/keywords.self-test.js
ok skills/sdlc/bin/lib/signals.self-test.js
ok skills/sdlc/bin/lib/todo.self-test.js
ok skills/sdlc/bin/check-eol.self-test.js
ok skills/sdlc/bin/check-frontmatter.self-test.js
ok skills/sdlc/bin/check-manifest.self-test.js
ok skills/sdlc/bin/check-sheets.self-test.js
ok skills/sdlc/bin/check-skill-sections.self-test.js
ok skills/sdlc/bin/sync-vendored.self-test.js
ok skills/sdlc/bin/where.self-test.js
ok skills/sdlc/bin/which.self-test.js
ok scripts/hooks/eol-guard.self-test.js
ok scripts/hooks/git-authorization.self-test.js
ok sync-vendored
ok check-manifest
ok check-sheets
ok check-frontmatter
ok check-skill-sections
ok check-eol
ok settings.json
all gates ok
exit=0
```

Regression: importers of the changed scripts (`grep -rln`) are only their own self-tests, `scripts/gates.sh` and the ledger snapshots under `.superpowers/` (git-ignored); no untouched module imports them. The untouched suites (`where`, `which`, `lib/*`) ran inside the same gate.

Report:

| Layer | Verified | Not verified | Residual risk |
|---|---|---|---|
| static | not run | no type checker or linter configured in the repo | low: the scripts are plain Node with `'use strict'`; syntax errors would fail their self-tests, which ran |
| unit | `bash scripts/gates.sh`, exit 0, 22 gates, no skips (`sync-vendored --check` included, network was up) | nothing | low: 124 hook checks plus the sheet gates; the seven parked tokenizer bypasses are documented in README, not covered by tests on purpose |
| build | not run | no build step (no manifest, nothing compiled) | low: nothing is built |
| runtime | not run | the diff touches no UI, API or dependencies; `.claude/settings.json` is host config, exercised by scenario (c)(3) with the same JSON Claude Code sends | low: the hooks ran once from a clean clone against a real input |
| functional | the hook fed a `tool_name: "PowerShell"` call by hand (below): first run allowed `git push` with "dale"; after the fix it denies, 137/137 self-test checks | no routes; the real-session checks were two denies through Claude Code (a heredoc containing `git commit|push` text, and "dale") | low after the fix: the `Bash|PowerShell` matcher now reaches the gate on both tools |
| regression | untouched suites ran inside the gate (exit 0) | `ci.yml` on Ubuntu and Windows runners: only the PR run verifies the workflow edit | medium until CI is green on both OS |

Finding while writing the functional row: `main()` in `git-authorization.js` returned without a decision for any `tool_name` other than `Bash`, so the `Bash|PowerShell` matcher in `settings.json` invoked the hook for PowerShell and the hook let `git push` through. Real output before the fix (script feeding the same payload with both tool names, transcript ending in "dale"):

```
$ node <scratch>/ps-input.js <transcript>
Bash: exit=0 stdout="{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"git-authorization: push needs one of: push / pushea / pushear. Ask the user to say it in their next message. Last user message: \\\"dale\\\"\"}}" stderr=""
PowerShell: exit=0 stdout="" stderr=""
```

Fix, test first: three checks added to `git-authorization.self-test.js` (PowerShell + "dale" → deny, PowerShell + "pusheá" → allow, `Write` with a `command` field → allow), the first one red (`136 passed, 1 failed`), then `SHELL_TOOLS = new Set(['Bash', 'PowerShell'])` replaces the `=== 'Bash'` test in `main()`:

```
$ node scripts/hooks/git-authorization.self-test.js | tail -1
137 passed, 0 failed
$ bash scripts/gates.sh --quick | tail -1
all gates ok
```

Gaps from the diff map: none of the `new-logic` files lacks a covering test. Open minor for the review wave: `keywords.js` classifies "devuelve 500" as `unknown` (scenario (c)(2)).

Next step: accept the residual risk (CI on both OS pending the PR) and run `sdlc close` for Testing.

### (e) Final branch review and fix wave (base ba56b5b, HEAD a7cc47a, working tree)

Package: `git diff -U10 ba56b5b HEAD` split in two files (code and skill prose; the two long docs), the spec, the plan, the intent and the SDD ledger with its nine rulings. Reviewer: a fresh subagent on the most capable model, read-only, told to verify every suspected bug by running it against throwaway inputs and to assess the parked bypass ruling. The reviewer's probes used placeholders for the gated words because the owner's global guard blocks them in the reviewer's own shell calls.

Findings, with the reviewer's real output (message "look at logs" unless stated):

| # | Severity | Finding | Reviewer's probe |
|---|---|---|---|
| 1 | blocking | PowerShell assignment bypasses the gate: the command word becomes `$out` | `$out = git push 2>&1` → `ALLOW`; controls `(git push)` and `& git push` → `DENY` |
| 2 | blocking | Windows paths to `git.exe` under PowerShell bypass: bash backslash escaping applied to a shell that has none | `& "C:\Program Files\Git\cmd\git.exe" push` → `ALLOW`; `C:\PROGRA~1\Git\cmd\git.exe push` → `ALLOW`; single-quoted form → `DENY` |
| 3 | important | PowerShell twins of `bash -c`/`eval` not rescanned | `cmd /c git push`, `pwsh -NoProfile -Command "git push"`, `powershell -c "git push"`, `iex 'git push'`, `Invoke-Expression "git push"` → all `ALLOW` |
| 4 | important | Bash double quotes dropped every backslash (bash only drops it before `` $ ` " \ `` and newline) | Bash `"C:\Program Files\Git\cmd\git.exe" push` → `ALLOW` |
| 5 | important | `bash -e -c "git push"` allowed (flag had to be the token right after the shell) | → `ALLOW` |
| 6 | important | `git branch -d -f` / `-df` not gated | both → `ALLOW` |
| 7 | parked | the 7 bypasses of the T3 ruling all still pass on HEAD | `$'g'it push`, `$"g"it push`, `{git,push}`, `git {push,}`, `gi${x}t push`, `g$1it push`, `$(echo git) push` → all `ALLOW` |

On the ruling's proposed closure the reviewer showed three defects before writing a different patch: dropping `$` before a quote erases the only marker (`$'\x67'it push` would still pass); splitting on `{`/`}` only when standalone regresses PowerShell (`if ($true) {git push}` needs the split); "command word contains `$` and a later token is gated" misses `{git,push}`, `git {push,}` and `$(echo git) push`. The patch instead adds a second tokenizer view (unquoted substitutions and braces kept inside the token), one level of brace expansion unioned with the original tokens (expansion alone would open `git -C '{a,b}' push`), and treats any command word containing `$`, a backtick or `{…,…}` as a possible `git` when a gated subcommand follows. Every change adds views, so it can only add denies. Accepted over-detection: `$runner push` is denied.

Fix wave, test first. 28 checks added to `git-authorization.self-test.js` (rows 1-7 above plus benign forms: `ls {a,b}`, `node -e "const o={a:1,b:2}"`, `"$(npm bin)/eslint" .`, `find … -exec grep -l foo {} \;`, `echo "{git,push}"`, `Get-ChildItem | ForEach-Object { $_.Name }`, `$x = git status`, and the binding case `git commit -m "a && git push"` + "commit it" → allow):

```
$ node scripts/hooks/git-authorization.self-test.js | tail -1     # before the patch
146 passed, 21 failed
$ node scripts/hooks/git-authorization.self-test.js | tail -1     # reviewer's patch + rows 5 and 6 (bash -e -c via findIndex; branch -d/-f flag clusters)
167 passed, 0 failed
$ bash scripts/gates.sh --quick | tail -1
all gates ok
```

One-line minors closed in the same wave, each locked by a check: `eol-guard.js` skipped in-project files named `..foo` (`rel.startsWith('..')`; now `rel === '..' || rel.startsWith('..' + path.sep)`, probe: CRLF `..foo.md` → exit 2, 12/12); `SDLC_GIT_VERBS` accepted `[""]` and printed `needs one of: .` (empty strings filtered); `keywords.js` `es.bug` gains `devuelve 500`, `da 500`, `caida`, `caido` (not a bare `500`: "soporte para 500 usuarios" stays `feature`; 30/30; scenario (c)(2) now reads `type: bug`).

Doc fixes from the review: README hooks note now names both tools, the wrapper list, the dynamic-command-word rule, `Start-Process` as a known limit and the SDK/headless behaviour (no human records → every gated op denied); CHANGELOG Unreleased says what the hook gates; `spec-header.md` `Intent:` annotation copies SKILL.md's wording ("only when the cycle opens from an intent.md", since `maintain` also writes an intent); `maintain.md` "support ticket" qualified as raised by monitoring, a person's report stays a complaint (request card); spec testing strategy no longer says `where.js` emits the intent warning (the router's agent-side check does).

Stays deferred (reviewer's list, none blocks the release): presence-only verb match ("no hagas push todavía" allows, by design); heredoc commit bodies scanned line by line (false-positive denies); fence toggle only at column 0; `maintain` four-lines overlap with Open questions; self-test extraEnv/filler items and the temp dir never removed; `humanText` regexes outside the budget; `<local-command-stdout>` not stripped (no human-origin record carries it); `check-sheets` accepts an empty `**Governance:**`; eol-guard flags `.cmd`/`.bat` and gitignored paths that `check-eol` skips; the spec header jumped planning → deployment in one commit (two closes confirmed in one answer, recorded in (d)); spec line 85 "fail the tool call" is loose for a PostToolUse hook (it reports after the write).

Full gate target after the wave:

```
$ bash scripts/gates.sh | tail -1
all gates ok
```

### (f) /code-review and /simplify on the branch after the fix wave (HEAD b432457)

`/code-review` (medium) on `main...HEAD`: three findings, all in the PowerShell path of the hook, each confirmed with a probe against HEAD (transcript ending in "dale"):

```
$ node <scratch>/probe2.js <transcript>
PowerShell "git pu`sh" -> DENY {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",…
PowerShell "git `\n  push origin main" -> ALLOW
PowerShell "pwsh -Comm \"git push\"" -> ALLOW
PowerShell "powershell -EncodedCommand ZwBpAHQAIABwAHUAcwBoAA==" -> ALLOW
```

`/simplify` (four agents: reuse, simplification, efficiency, altitude). The altitude review named the root cause of all three findings: PowerShell support was layered on after a bash tokenizer (a backslash replace on the raw text, a `$x =` skip inside the loop, three pasted `findIndex` rescans), so every PowerShell form needed its own patch. Applied, tests first (8 checks added, 5 red):

```
$ node scripts/hooks/git-authorization.self-test.js | grep "FAIL\|passed"
  FAIL PowerShell: backtick line continuation before the subcommand + "dale" -> deny
  FAIL PowerShell: pwsh -Comm "git push" (parameter prefix) + "dale" -> deny
  FAIL PowerShell: pwsh -Command:"git push" (colon form) + "dale" -> deny
  FAIL PowerShell: powershell -EncodedCommand <b64> + "pusheá" -> deny (never scanned, always denied)
  FAIL PowerShell: pwsh -enc <b64> + "dale" -> deny
170 passed, 5 failed
$ node scripts/hooks/git-authorization.self-test.js | tail -1      # after the changes below
175 passed, 0 failed
$ bash scripts/gates.sh --quick | tail -1
all gates ok
```

- `normalize(tool, cmd)` before `scan()`: for PowerShell, backtick+newline → space, backtick+char → the char, backslash → slash. `scan()` is tool-agnostic again; the raw-text replace is gone.
- One `RESCAN` table (shells `-c`, `pwsh`/`powershell` `-Command`, `cmd /c|/k`) replaces three pasted branches; `psParam(name, tok)` accepts any PowerShell parameter prefix and the `-Name:value` form.
- `-e`/`-enc`/`-EncodedCommand` on `pwsh`/`powershell` throws → deny with a reason, never decoded (over-detection rule); `-ExecutionPolicy` is not a prefix of it and still passes.
- `cluster(args, letters)` replaces four hand-written flag-cluster regexes; `views` built with one `flatMap`; `bump = () => charge(1)`; the second tokenizer view runs only when the text has `{`, `}`, a backtick or `$(`.
- A self-test parses `.claude/settings.json` and asserts its `PreToolUse` matcher equals `SHELL_TOOLS`, so the two lists cannot drift.
- Reuse: `lib/unfenced.js` (`unfencedLines`) now serves both `check-sheets.js` and `check-skill-sections.js`; the label pair is a constant.
- eol-guard self-test: `extraEnv` applied once; the filler `assert.ok(p)` removed.

Skipped, with reason: sharing `normalise`/`toRegex` from `lib/keywords.js` with the hook (the hook stays dependency-free so a copy of `scripts/hooks/` works alone); a shared `lib/eol.js` for two one-line byte checks; a shared self-test harness (pre-existing pattern across ten files, separate cleanup); deleting the repeated non-regression assertions in the hook self-test (cheap, and each round's label documents why it exists); parallel gates in CI and a 64 KB prefix read in eol-guard (would miss a late CRLF); `branch -d` over-detection (plain `-d` of a merged branch stays allowed, asserted by an existing check).

### (g) Merge and release (PR #2 merged with a merge commit, main at 0c21145)

```
$ gh pr view 2 --json state,mergedAt,mergeCommit
{"mergeCommit":{"oid":"b842d25c370c785a32bfe0ff9b68a29fe40419df"},"mergedAt":"2026-09-30T18:26:18Z","state":"MERGED"}
$ gh run list --workflow=release.yml -L 1 --json status,conclusion,databaseId -q '.[0] | "\(.status) \(.conclusion) \(.databaseId)"'
completed success 36758572509
$ git fetch --tags && git describe --tags origin/main
v0.3.0
$ git log --oneline -2 origin/main
0c21145 chore(release): v0.3.0 [skip ci]
b842d25 Merge pull request #2 from PapiScholz/v1.2-playbook-alignment
```

Deployment closed on this output: `Status: closed` in the spec, committed with `[skip release]`.

## v1.3 dogfood

### (a) where.js on the request, branch `v1.3-distribution` at 5e0a3c6, before any edit

```
$ node skills/sdlc/bin/where.js --message-file <tmp>      # request: README "who this is for", GitHub metadata, directory readiness (rename plugin to sdlc-assist), awesome lists
{
  "inferred": "analysis",
  "evidence": [
    "plan present but no active spec to compare against; treated as current",
    "fallback: analysis (candidates: analysis, testing)",
    "tests not run (no --run-tests)",
    "in production: tag v0.3.0"
  ],
  "alternatives": [ { "phase": "testing", "kind": "candidate", "reason": "fallback row also holds" } ],
  "warnings": [],
  "request": { "type": "unknown" },
  "active": null
}
```

`active` is null because the v1.2 spec is closed, so the plan file is stale for the router: a new cycle in analysis, confirmed by the owner when approving the plan. Type `unknown`: the request names four deliverables and no bug, feature or complaint keyword.

### (b) check-manifest red run: fixture still on the old id after the gate moved to `sdlc-assist`

```
$ node skills/sdlc/bin/check-manifest.self-test.js | grep "FAIL\|passed"
  FAIL valid pair => exit 0
       FAIL marketplace.json: field plugins[0].name must be "sdlc-assist"
  FAIL marketplace top-level description accepted; empty or non-string => exit 1
10 passed, 2 failed
$ node skills/sdlc/bin/check-manifest.self-test.js | tail -1      # after the fixtures moved to sdlc-assist
12 passed, 0 failed
```

The two new cases (old id in both manifests; ids that disagree) were red before the gate change and green after it, in the same run pair.

### (c) sdlc-qa-gate on the branch diff (Tasks 1 and 2 done, working tree)

Diff map: two manifests, one gate and its self-test, `SKILL.md` close-mode trigger, README (new block, three renamed references, one link), design spec (four annotated lines), CHANGELOG, `tasks/todo.md`, two new docs.

| Layer | Verified | Not verified | Residual risk |
|---|---|---|---|
| static | `claude plugin validate .` → `Validation passed`; `check-eol`, `check-frontmatter`, `check-sheets`, `check-skill-sections` inside `gates.sh` | | none |
| unit | `bash scripts/gates.sh` → `all gates ok`; `check-manifest.self-test.js` 12/12 after the red pair in (b) | | none |
| build | n/a (no build step) | | |
| runtime | `where.js` on the request in (a) | the plugin path: `/sdlc-assist:phase` in the palette needs a native terminal (`claude --plugin-dir .` without a TTY falls into `--print`) | the slash rename is not seen live until the owner installs `sdlc-assist@papischolz`; the manifest is the only thing that names it and the validator accepts it |
| functional | | the directory's own Validate (owner's portal) | a check the checklist page does not list; the doc says what to do with a **Blocks** finding |
| regression | install-smoke and both test jobs in CI on the PR | | the skills.sh path never used the plugin id, so the rename cannot reach it |

Testing closed on this table with the runtime and functional gaps accepted; deployment is the merge and the release.

### (d) Merge and release (PR #3 merged with a merge commit)

```
$ gh pr view 3 --json state,mergeCommit -q '"\(.state) \(.mergeCommit.oid[0:7])"'
MERGED 6930f7a
$ gh run list --workflow=release.yml -L 3 --json status,conclusion,headSha -q '.[] | select(.headSha|startswith("6930f7a")) | "\(.status) \(.conclusion)"'
completed success
$ git fetch --tags && git describe --tags origin/main
v0.4.0
```

Deployment closed on this output: `Status: closed`, committed with `[skip release]`.

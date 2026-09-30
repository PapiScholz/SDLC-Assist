# v1.1 Own Phase Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Spec: docs/specs/2026-09-30-v1-1-own-skills.md

**Goal:** Ship `sdlc-debugging`, `sdlc-qa-gate` and `sdlc-release` so a user with only this repo installed never hits the missing-skill question on the bug route, Testing or Deployment.

**Architecture:** Three Markdown-only skills under `skills/sdlc-*/` (one `SKILL.md` each, no scripts; stack facts come from `where.js`). One new zero-dependency gate (`check-skill-sections.js`) enforces section parity with the contracts in the spec. Phase sheets, missing-skill table, request card, README, CI and the release script are updated so the router recommends, detects, installs and versions the three skills.

**Tech Stack:** Node 20+ zero-dependency scripts with `.self-test.js` files (assert + spawnSync), GitHub Actions, bash, Markdown.

## Global Constraints

- Files are LF, UTF-8 without BOM (`check-eol.js`); repository-facing docs in English; the skills reply in the user's language.
- Every push to `main` publishes a release: all v1.1 work goes on branch `v1.1-own-skills` and a PR. Docs/CI-only commits carry `[skip release]`.
- Gates before any commit: all self-tests, `sync-vendored --check`, `check-manifest`, `check-sheets`, `check-frontmatter`, `check-eol`, and from Task 4 on `check-skill-sections`.
- Vendored skills (`skills/<name>/` other than `sdlc*`) are never edited.
- No state-changing git command without the owner's explicit words in the current turn; the guard hook blocks otherwise. Subagents never commit; the controller commits with explicit paths when the owner says so. No `Co-Authored-By` trailers.
- Own skill frontmatter: `name` equals folder, `version` equals `.claude-plugin/plugin.json` version (currently `0.1.1`; the release bumps all four), `description` present.
- Skill text is generic English: no Electron, Next.js, POS or owner-repo references; ecosystems named only as npm/pnpm/yarn, Python, Rust, Go, JVM.
- Section headings the gate checks (level 2 or 3, optional `N. ` prefix): Debugging `Reproduce, Localise, Explain, Hand off, Never`; QA gate `Diff map, Layers, Report, Never`; Release `Detect, Classify, Update, Validate, Commit tag push publish, Publish guidance, Never`.
- `check-sheets.js` `DEFAULT_KNOWN` already lists the three names; do not touch it.

## Review Focus

1. A repo with no test runner, no build script and no lint (`signals.testRunner.kind` null): the gate must still print the full table with every layer `not run` and a reason, never crash or skip the table. Pinned in Task 10 scenario 2b.
2. A bug that cannot be reproduced on demand (intermittent, needs production data): `sdlc-debugging` must write an explicit "no reproduction: <why>, evidence used instead: <what>" line rather than inventing a cause. Pinned in Task 9 run (c2).
3. A repo with no tags at all: `sdlc-release` must treat the first release as `0.1.0` (or the version already pinned in the version file) and say so before acting. Pinned in Task 3 self-check and Task 10 scenario 3b.
4. Version sources drift after the release script rewrites only some of them: `check-frontmatter.js` compares every own skill `version:` with `plugin.json` and fails on mismatch. Pinned in Task 5 self-test.
5. A contract heading that appears only inside a fenced code block (an example of the report) must not satisfy the gate; a numbered heading (`## 1. Reproduce`) must. Pinned in Task 4 self-test.

## File Structure

```
skills/
  sdlc-debugging/SKILL.md            (new) bug-route protocol, 4 steps + Never
  sdlc-qa-gate/SKILL.md              (new) diff map, layers, report, Never
  sdlc-release/SKILL.md              (new) detect, classify, update, validate, publish, Never
  sdlc/bin/check-skill-sections.js   (new) gate: section parity
  sdlc/bin/check-skill-sections.self-test.js (new)
  sdlc/bin/check-frontmatter.js      (mod) version on own skills, equal to plugin.json
  sdlc/bin/check-frontmatter.self-test.js (mod)
  sdlc/SKILL.md                      (mod) step 5: two-recommends note covers analysis
  sdlc/references/phases/analysis.md (mod) recommends sdlc-debugging; Do now
  sdlc/references/phases/testing.md  (mod) Do now: skill exists
  sdlc/references/phases/deployment.md (mod) Do now: skill exists
  sdlc/references/missing-skill.md   (mod) install rows; drop "planned for v1.1"
  sdlc/references/request-card.md    (mod) optional Cause: / Evidence:
.github/workflows/ci.yml             (mod) new gate step; install-smoke asserts three dirs + which.js
.github/scripts/release.sh           (mod) three more version sources
README.md, CHANGELOG.md, CONTRIBUTING.md, CLAUDE.md (mod)
docs/ci-red-runs.md                  (mod) red run of the new gate; v1.1 dogfood section
tasks/plan.md, tasks/todo.md         (this cycle)
```

## Tasks

- [ ] Task 1: Branch, close planning, `sdlc-debugging` skill
- [ ] Task 2: `sdlc-qa-gate` skill
- [ ] Task 3: `sdlc-release` skill
- [ ] Task 4: `check-skill-sections.js` gate, self-test, CI step, red run
- [ ] Task 5: `check-frontmatter.js` version rule and `release.sh` version sources
- [ ] Task 6: Phase sheets, missing-skill table, request card, router note
- [ ] Task 7: CI `install-smoke` asserts the three skills
- [ ] Task 8: README, CHANGELOG `[Unreleased]`, CONTRIBUTING, CLAUDE.md
- [ ] Task 9: Dogfood runs (b) release detect and (c) debugging on a seeded fault
- [ ] Task 10: Reference scenarios on a fresh temp home, dogfood (a) QA gate, close the cycle

---

### Task 1: Branch, close planning, `sdlc-debugging` skill

**Files:**
- Create: `skills/sdlc-debugging/SKILL.md`
- Modify: `docs/specs/2026-09-30-v1-1-own-skills.md:3` (`Phase: planning` → `Phase: development`)

**Interfaces:**
- Consumes: `node <sdlc bin>/where.js --message-file <tmp>` JSON (`request.type`, `signals.testRunner.command`, `signals.git.commits`); `references/request-card.md` five lines.
- Produces: two lines `Cause:` and `Evidence:` appended to the request card and copied into the short spec's `## Cause` section (Task 6 adds them to the card template).

- [ ] **Step 1: Branch and close planning (owner's words required)**

Ask the owner to say the words. Then run exactly:

```bash
git switch -c v1.1-own-skills
```

Then, applying close mode for planning, edit line 3 of the spec:

```bash
sed -i '3s/^Phase: planning$/Phase: development/' docs/specs/2026-09-30-v1-1-own-skills.md
sed -n 3,4p docs/specs/2026-09-30-v1-1-own-skills.md
```

Expected: `Phase: development` / `Status: approved`.

- [ ] **Step 2: Write the skill**

Create `skills/sdlc-debugging/SKILL.md` with this content:

````markdown
---
name: sdlc-debugging
version: 0.1.1
description: Localises the cause of a bug or complaint before the short spec is written, so the spec states a cause, not a symptom. Four steps with exit criteria (reproduce, localise, explain, hand off) and no product-code changes. Use on the bug route of Requirements analysis, when sdlc classifies a request as bug or complaint, or when asked why something fails before any fix is attempted.
---

# sdlc-debugging: localise before you specify

## Overview

A bug enters Requirements analysis with a symptom. This skill turns the symptom into a cause with evidence, then hands the cause to the short spec. It writes no product code: the fix belongs to Development. Reply in the user's language.

Inputs: the request card (`Who asks`, `What happens`, `Expected`, `Where`, `Urgency`) and the `where.js` output of the `sdlc` skill. When you need stack facts (test command, recent commits), run `where.js` as the `sdlc` skill describes (locate `bin/` the same way) instead of detecting them yourself:

```
node "<sdlc bin>/where.js" --message-file "<temp file>"
```

Read `signals.testRunner.command` (the suite command, or null) and `signals.git.commits` (recent commits with paths).

Work through the four steps in order. Each has an exit criterion; do not move on until it is met or until you have written why it cannot be met.

## 1. Reproduce

Goal: one command or one manual step that shows the fault, which you can run again after every hypothesis.

How: prefer, in this order, a failing test (an existing one, or a new one that asserts `Expected` from the card), a command (`signals.testRunner.command`, a script, a `curl`), a request against a running instance the user already has. Adding a failing test or a diagnostic print is allowed; it is removed or kept on purpose in the hand-off.

Exit: `Reproduction: <command or step>` and its observed output. If no reproduction is possible, write `Reproduction: none — <why>; evidence used instead: <logs, screenshot, user report>` and continue with lower confidence, saying so in the hand-off.

## 2. Localise

Goal: the smallest unit that still fails: file, function, input.

How: start from `Where` on the card. Narrow with logs around the suspected path, bisection over inputs (halve the input until the fault disappears), or bisection over commits when the fault is a regression (`git bisect` only on the working tree state the user chose; never `checkout` or `reset` without the user's words in the current turn; `git log -S<term>` is read-only). Check `signals.git.commits`: if the last change to the failing path is recent, that commit is the first suspect.

Exit: `Location: <file>:<line range>` or `Location: not localisable with current evidence — <what is missing>`.

## 3. Explain

Goal: one sentence that predicts the symptom from the cause.

Rules that come first:
- If the last action before the symptom appeared was your own (an edit, a command, a config change), that action is the first suspect. Reread your own recent steps before opening any file.
- When two sources disagree (a log and a screenshot, a test and a manual run, two numbers), one of them is lying. Find which one before digging deeper; a measurement is cheaper to discard than a phantom is to chase.

How: state the cause, then try to disprove it once: change the input, the environment or the order in a way that the cause predicts should make the symptom disappear (or appear), and run the reproduction again.

Exit: `Cause: <sentence>` and `Disproof attempt: <what you changed> → <observed>, consistent with the cause`. A disproof that succeeds sends you back to Localise.

## 4. Hand off

Append two lines to the request card and carry them into the short spec:

```
Cause:         <the sentence from step 3>
Evidence:      <reproduction command or "none"; location; disproof attempt>
```

Then: state whether the diagnostic print or failing test stays (a failing test that pins the bug usually stays and becomes the first task of Development) or is removed, and remove it if so. Recommend `spec-driven-development` for the short spec with the header `Phase: analysis` / `Status: draft`, as the `sdlc` skill requires. The fix is Development's job; do not start it.

## Never

- Change product code during these steps. A diagnostic print or a failing test is the only allowed edit, and it is removed or kept deliberately.
- Declare a cause without a reproduction or without an explicit statement that none exists and what evidence replaces it.
- Run state-changing git commands (`checkout`, `reset`, `stash`, `bisect` that moves HEAD) without the user's explicit words in the current turn.
- Run the test suite as a whole unless the user asked or the reproduction is the suite itself; run the smallest failing unit.
- Invent a card line the user did not give; ask for it.

## Output

```
Reproduction: <command or none — why>
Location:     <file:lines or not localisable — what is missing>
Cause:        <sentence>
Evidence:     <disproof attempt → observed>
Diagnostic:   <kept as failing test <path> | removed>
Next:         short spec via spec-driven-development (Phase: analysis / Status: draft)
```
````

- [ ] **Step 3: Run the gates that exist today**

```bash
node skills/sdlc/bin/check-frontmatter.js && node skills/sdlc/bin/check-eol.js && node skills/sdlc/bin/check-sheets.js
```

Expected: `check-frontmatter: 7 skills OK`, `check-eol: no CRLF or BOM found`, `check-sheets: 6 sheets OK`.

- [ ] **Step 4: Commit (controller, when the owner says so in the turn)**

```bash
git add skills/sdlc-debugging/SKILL.md docs/specs/2026-09-30-v1-1-own-skills.md CLAUDE.md
git commit -m "feat: sdlc-debugging skill (bug route of analysis); close planning for v1.1"
```

---

### Task 2: `sdlc-qa-gate` skill

**Files:**
- Create: `skills/sdlc-qa-gate/SKILL.md`

**Interfaces:**
- Consumes: `where.js` JSON (`signals.testRunner.{kind,command}`, `signals.git.commits[].paths`, `signals.sourceFiles`); the diff since the plan's base (`git diff --name-only <base>...HEAD`, read-only).
- Produces: the report table `| Layer | Verified | Not verified | Residual risk |` plus gap lines, ending with the next step. Task 10 pastes one into `docs/ci-red-runs.md`.

- [ ] **Step 1: Write the skill**

Create `skills/sdlc-qa-gate/SKILL.md`:

````markdown
---
name: sdlc-qa-gate
version: 0.1.1
description: Runs every applicable verification layer (static, unit, build, runtime, functional, regression) against the built artifact and reports what was verified, what was not, and the residual risk, without ever saying "green". Use for the Testing phase, before a push or a PR, when the plan's tasks are closed, or when asked how sure we are that nothing breaks.
---

# sdlc-qa-gate: verify layers, report risk

## Overview

The Testing phase ends with a table, not a verdict. This skill maps the diff, runs every layer that applies, lists every layer that did not run with its reason, and ends with the next step. Reply in the user's language.

Stack facts come from the `sdlc` skill's `where.js` (locate `bin/` as that skill describes; never re-implement detection):

```
node "<sdlc bin>/where.js" --message-file "<temp file>"
```

Read `signals.testRunner.kind` (`npm`, `pytest`, `cargo`, `go`, or null) and `.command`, `signals.git.commits` (recent commits with paths), `signals.sourceFiles`. Running the suite here is the gate's job: the user asking for the gate is the request to run it.

Parallel agents: when the host can spawn agents, independent layers (static, unit, build) may run in parallel; each agent reports only its own layer's row and raw output, and this skill composes the table. Runtime and functional stay sequential because functional needs the runtime instance.

## Diff map

Before any layer, list the changed files since the base the user names (default: the merge base with the default branch; read-only `git diff --name-only <base>...HEAD`, plus `git status --short` for uncommitted work). For each file record:

| File | Domain | Existing coverage | Nature |
|---|---|---|---|
| `<path>` | logic / API / UI / integration / config / CI / docs | `<test file(s)>` or none | dead-code / refactor / new-logic / ci-infra / config |

Rules: `new-logic` with coverage `none` is a gap; the report names it and proposes the test, and writes it only if the user asks. Docs-only diffs skip unit, build, runtime and functional and say so.

## Layers

Cheapest first. Every layer either runs or appears in the report as not run with the reason. Commands by ecosystem; when `signals.testRunner.kind` is null and no manifest is found, every layer is `not run: no runner detected, verify by hand`.

| Layer | Applies when | Command (npm/pnpm/yarn · Python · Rust · Go · JVM) | Passes when |
|---|---|---|---|
| static | a type checker or linter is configured (`tsconfig.json`, lint script, `ruff`/`mypy` config, `clippy`, `go vet`, Gradle/Maven check) | `npx tsc --noEmit` and the lint script · `ruff check .` / `mypy .` · `cargo clippy` · `go vet ./...` · `./gradlew check` or `mvn -q verify -DskipTests` | exit 0 |
| unit | `signals.testRunner.kind` is set | `signals.testRunner.command` | full suite exit 0, zero unjustified skips (list each skip with its reason) |
| build | a build step exists (`build` script, `pyproject` build backend, `Cargo.toml`, `go build`, Gradle/Maven) | `npm run build` · `python -m build` · `cargo build --release` · `go build ./...` · `./gradlew build -x test` or `mvn -q package -DskipTests` | the artifact exists and its manifests are complete (no missing entry the build was expected to emit) |
| runtime | the diff touches UI, API, config or dependencies | start the built artifact in production mode on a free port the user did not reserve (never dev mode), wait up to 30 s, `curl -sf http://127.0.0.1:<port>/` | answers within the timeout |
| functional | the diff touches UI or API | against the runtime instance: an authenticated health call first (must return 200), then each changed route or endpoint | changed routes answer without errors |
| regression | shared modules changed (utils, stores, schemas, shared types) | the suites of untouched modules that import the changed ones (find importers with `grep -rl`) | they still pass |

Stop the runtime instance you started by its process id, never by pattern. Report the exact command and exit code of every layer that ran.

## Report

Mandatory format, always complete, one row per layer:

```
| Layer | Verified | Not verified | Residual risk |
|---|---|---|---|
| static | <what ran, exit code> | <what did not, why> | <low / medium / high: why> |
| unit | ... | ... | ... |
| build | ... | ... | ... |
| runtime | ... | ... | ... |
| functional | ... | ... | ... |
| regression | ... | ... | ... |
```

Then one line per gap from the diff map (`gap: <file> new-logic without a covering test; proposed: <test name>`).

The words "green", "100%" and "safe" never appear as a verdict. The report ends with the next step: `sdlc close` for Testing when the user accepts the residual risk, otherwise the fix list in order.

## Never

- Run dev mode as a substitute for the built artifact.
- Kill processes by a broad pattern; stop only the process id you started.
- Claim a layer passed that did not run, or shorten the table.
- Write a missing test without asking first.
- Run state-changing git commands; the diff map uses read-only queries only.
````

- [ ] **Step 2: Run the gates**

```bash
node skills/sdlc/bin/check-frontmatter.js && node skills/sdlc/bin/check-eol.js
```

Expected: `check-frontmatter: 8 skills OK`.

- [ ] **Step 3: Commit (controller, when the owner says so)**

```bash
git add skills/sdlc-qa-gate/SKILL.md
git commit -m "feat: sdlc-qa-gate skill (testing phase, layered report)"
```

---

### Task 3: `sdlc-release` skill

**Files:**
- Create: `skills/sdlc-release/SKILL.md`

**Interfaces:**
- Consumes: `where.js` JSON (`signals.releaseWorkflow.files`, `signals.git.lastSemverTag`, `signals.git.commitsAfterTag`, `signals.changelog`).
- Produces: the version decision line, the list of commands for steps 5 and 6 awaiting the user's words. Task 9 pastes a detect-mode run into `docs/ci-red-runs.md`.

- [ ] **Step 1: Write the skill**

Create `skills/sdlc-release/SKILL.md`:

````markdown
---
name: sdlc-release
version: 0.1.1
description: Decides the next version from the commits since the last tag, updates every version source and the changelog, validates, then tags and publishes through the forge, driving the project's existing release mechanism when there is one. Every state-changing command runs only after the user asks in the current turn. Use for the Deployment phase, when asked to release, tag, bump the version or publish.
---

# sdlc-release: version, validate, publish on request

## Overview

Deployment produces a version decision, updated version files and changelog, a tag and a published release, in that order, stopping at the first failure. Reply in the user's language. Stack facts come from the `sdlc` skill's `where.js` (locate `bin/` as that skill describes):

```
node "<sdlc bin>/where.js" --message-file "<temp file>"
```

Read `signals.releaseWorkflow.files`, `signals.git.lastSemverTag` (`{name, sha}` or null), `signals.git.commitsAfterTag`, `signals.changelog.exists`.

## 1. Detect

Look for a release mechanism already in the repo, in this order:

| Mechanism | Evidence |
|---|---|
| release workflow | `signals.releaseWorkflow.files` non-empty (`.github/workflows/*release*`) |
| release script | `scripts/release*`, `.github/scripts/release*`, a `release` script in `package.json` |
| changesets | `.changeset/` directory |
| semantic-release | `semantic-release` in `package.json` or `.releaserc*` |
| release-please | `release-please-config.json` or a `release-please` workflow |

If one exists, read it and drive it: state what triggers it (a push to `main`, a manual `workflow_dispatch`, a merged PR, a changeset file) and the exact action the user must take. Do not reimplement steps 2 to 6; only report the version it will produce if the mechanism computes one. Only without any mechanism perform steps 2 to 6 yourself.

## 2. Classify

Commits since `lastSemverTag` (read-only `git log <tag>..HEAD --format=%s`; with no tag at all, every commit, and the first version is `0.1.0` unless the version file already pins a higher one). Map subjects: `BREAKING` or `!` → major; `feat` → minor; `fix`, `docs`, `ci`, `chore`, `refactor`, `test` → patch. Mixed → when every commit carries a conventional prefix, the highest class present decides; when some do not, propose the safer lower bump and ask. Honour a higher version already pinned in the version file. State the reasoning before acting:

```
last tag: <vX.Y.Z or none>   commits: <n>   classes: <feat n, fix n, ...>   proposed: <vA.B.C> (<major|minor|patch>)
```

## 3. Update

Every version source the project has, all to the same value: `package.json` (and lockfile via the package manager's own `version` command when there is one), `pyproject.toml`, `Cargo.toml` (and `Cargo.lock` through `cargo`), `go` (tag only), plugin manifests (`.claude-plugin/plugin.json`), a `version:` frontmatter in skills. The changelog: consume `## [Unreleased]` into `## [A.B.C] - YYYY-MM-DD` when present; otherwise prepend an entry with the commits grouped Added / Changed / Fixed / CI. Show the diff of these edits.

## 4. Validate

The project's own checks: the test suite (`signals.testRunner.command`), the build or a pack dry run (`npm pack --dry-run`, `python -m build`, `cargo package --no-verify --allow-dirty --list`, `go build ./...`), and version consistency across every source touched in step 3 (`grep` each, all must equal `A.B.C`). Any failure stops the release: report it and go no further.

## 5. Commit tag push publish

List the exact commands first, then wait for the user's words in the current turn:

```
git add <the version files and the changelog, by path>
git commit -m "chore(release): vA.B.C"
git tag -a vA.B.C -m "vA.B.C"
git push origin <branch> --follow-tags
gh release create vA.B.C --title "vA.B.C" --notes-file <changelog entry extracted to a temp file>
```

Run them one by one, stopping at the first non-zero exit. If a guard in the environment blocks a command, report the block and stop; do not look for another way around it.

## 6. Publish guidance

Print the registry command for the ecosystem and run it only if the user asked for the publish too in the current turn:

| Ecosystem | Command |
|---|---|
| npm/pnpm/yarn | `npm publish --access public` (after `npm pack --dry-run` showed the file list) |
| Python | `python -m build && twine upload dist/*` |
| Rust | `cargo publish` |
| Go | nothing to publish; the tag is the release, `GOPROXY` picks it up |
| JVM | `./gradlew publish` or `mvn deploy` with the project's configured repository |

## Never

- Force-push, rewrite or move a tag, or delete a release.
- Publish to a registry without the user asking for it in the current turn.
- Continue after a failed validation.
- Run any command of steps 5 and 6 before listing it and getting the user's words.
- Reimplement a release mechanism the repo already has.
````

- [ ] **Step 2: Run the gates**

```bash
node skills/sdlc/bin/check-frontmatter.js && node skills/sdlc/bin/check-eol.js
```

Expected: `check-frontmatter: 9 skills OK`.

- [ ] **Step 3: Commit (controller, when the owner says so)**

```bash
git add skills/sdlc-release/SKILL.md
git commit -m "feat: sdlc-release skill (deployment phase, drives existing release mechanism)"
```

---

### Task 4: `check-skill-sections.js` gate, self-test, CI step, red run

**Files:**
- Create: `skills/sdlc/bin/check-skill-sections.js`
- Create: `skills/sdlc/bin/check-skill-sections.self-test.js`
- Modify: `.github/workflows/ci.yml` (after the `check-frontmatter` step)
- Modify: `docs/ci-red-runs.md` (table row + command)

**Interfaces:**
- Produces: `node skills/sdlc/bin/check-skill-sections.js [--root <dir>]`, exit 0 with `check-skill-sections: 3 skills OK`, exit 1 with one `check-skill-sections: <skill>: missing section "<name>"` line per gap or `<skill>: SKILL.md not found`.

- [ ] **Step 1: Write the failing self-test**

Create `skills/sdlc/bin/check-skill-sections.self-test.js`:

```js
#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); console.log('  ok   ' + label); passed++; }
  catch (err) { console.log('  FAIL ' + label); console.log('       ' + err.message); failed++; }
}
const CONTRACTS = {
  'sdlc-debugging': ['Reproduce', 'Localise', 'Explain', 'Hand off', 'Never'],
  'sdlc-qa-gate': ['Diff map', 'Layers', 'Report', 'Never'],
  'sdlc-release': ['Detect', 'Classify', 'Update', 'Validate', 'Commit tag push publish', 'Publish guidance', 'Never'],
};
function body(sections, prefix) {
  return '---\nname: x\n---\n# T\n' + sections.map((s, i) => (prefix ? '## ' + (i + 1) + '. ' + s : '## ' + s) + '\n\ntext\n').join('');
}
function tree(overrides) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sections-'));
  for (const [name, sections] of Object.entries(CONTRACTS)) {
    const content = overrides && name in overrides ? overrides[name] : body(sections, false);
    if (content === null) continue;
    fs.mkdirSync(path.join(d, 'skills', name), { recursive: true });
    fs.writeFileSync(path.join(d, 'skills', name, 'SKILL.md'), content);
  }
  return d;
}
function run(d) {
  return spawnSync(process.execPath, [path.join(__dirname, 'check-skill-sections.js'), '--root', d], { encoding: 'utf8' });
}
const out = (r) => r.stderr + r.stdout;
console.log('check-skill-sections');
check('all contracts present exits 0 and counts 3 skills', () => {
  const r = run(tree());
  assert.strictEqual(r.status, 0, out(r));
  assert.ok(r.stdout.includes('3 skills OK'));
});
check('missing section exits 1 and names skill and section', () => {
  const r = run(tree({ 'sdlc-qa-gate': body(['Diff map', 'Layers', 'Never'], false) }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('sdlc-qa-gate') && out(r).includes('"Report"'));
});
check('numbered headings (## 1. Reproduce) satisfy the contract', () => {
  const r = run(tree({ 'sdlc-debugging': body(CONTRACTS['sdlc-debugging'], true) }));
  assert.strictEqual(r.status, 0, out(r));
});
check('level-3 headings satisfy the contract', () => {
  const r = run(tree({ 'sdlc-release': body(CONTRACTS['sdlc-release'], false).replace(/^## /gm, '### ') }));
  assert.strictEqual(r.status, 0, out(r));
});
check('a heading inside a fenced block does not count', () => {
  const b = body(['Detect', 'Classify', 'Update', 'Validate', 'Commit tag push publish', 'Never'], false)
    + '```\n## Publish guidance\n```\n';
  const r = run(tree({ 'sdlc-release': b }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('"Publish guidance"'));
});
check('missing skill directory exits 1', () => {
  const r = run(tree({ 'sdlc-debugging': null }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('sdlc-debugging') && out(r).includes('not found'));
});
check('CRLF file is read correctly', () => {
  const r = run(tree({ 'sdlc-qa-gate': body(CONTRACTS['sdlc-qa-gate'], false).replace(/\n/g, '\r\n') }));
  assert.strictEqual(r.status, 0, out(r));
});
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to see it fail**

```bash
node skills/sdlc/bin/check-skill-sections.self-test.js
```

Expected: every check `FAIL` (spawn of a missing script yields status null), `0 passed, 7 failed`, exit 1.

- [ ] **Step 3: Write the gate**

Create `skills/sdlc/bin/check-skill-sections.js`:

```js
#!/usr/bin/env node
'use strict';
// Every own skill (skills/sdlc-*/SKILL.md) carries the sections its contract names.
// A section is a level-2 or level-3 heading, optionally prefixed "N. ", outside fenced code.
// Usage: check-skill-sections.js [--root <dir>]
const fs = require('fs');
const path = require('path');

const CONTRACTS = {
  'sdlc-debugging': ['Reproduce', 'Localise', 'Explain', 'Hand off', 'Never'],
  'sdlc-qa-gate': ['Diff map', 'Layers', 'Report', 'Never'],
  'sdlc-release': ['Detect', 'Classify', 'Update', 'Validate', 'Commit tag push publish', 'Publish guidance', 'Never'],
};

const i = process.argv.indexOf('--root');
const root = i !== -1 && process.argv[i + 1]
  ? path.resolve(process.argv[i + 1])
  : path.resolve(__dirname, '..', '..', '..');

function headings(text) {
  const out = [];
  let fenced = false;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = /^#{2,3}\s+(?:\d+\.\s+)?(.+?)\s*$/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

const errors = [];
for (const [skill, sections] of Object.entries(CONTRACTS)) {
  const f = path.join(root, 'skills', skill, 'SKILL.md');
  if (!fs.existsSync(f)) { errors.push(skill + ': SKILL.md not found'); continue; }
  const have = headings(fs.readFileSync(f, 'utf8'));
  for (const s of sections) if (!have.includes(s)) errors.push(skill + ': missing section "' + s + '"');
}
if (errors.length) {
  for (const e of errors) console.error('check-skill-sections: ' + e);
  process.exit(1);
}
console.log('check-skill-sections: ' + Object.keys(CONTRACTS).length + ' skills OK');
```

- [ ] **Step 4: Run the self-test and the gate on the repo**

```bash
node skills/sdlc/bin/check-skill-sections.self-test.js && node skills/sdlc/bin/check-skill-sections.js
```

Expected: `7 passed, 0 failed` and `check-skill-sections: 3 skills OK`. If the repo run fails, fix the heading in the skill (the contract is fixed by the spec, the skill text is not).

- [ ] **Step 5: Add the CI step**

In `.github/workflows/ci.yml`, after the line `- run: node skills/sdlc/bin/check-frontmatter.js` add:

```yaml
      - run: node skills/sdlc/bin/check-skill-sections.js
```

- [ ] **Step 6: Record the red run**

In `docs/ci-red-runs.md`, add to the table:

```
| check-skill-sections | renamed `## Report` to `## Results` in a copy of `sdlc-qa-gate/SKILL.md` | `check-skill-sections: sdlc-qa-gate: missing section "Report"` | 1 |
```

and to the `## Commands` block:

```sh
# check-skill-sections (rename a contract heading in the copy)
sed -i 's/^## Report$/## Results/' $S/skills/sdlc-qa-gate/SKILL.md
node skills/sdlc/bin/check-skill-sections.js --root $S
#   check-skill-sections: sdlc-qa-gate: missing section "Report"
```

Run exactly those commands on a temp copy and paste the real output line; do not write the line from memory.

- [ ] **Step 7: Full gate loop, then commit (controller, when the owner says so)**

```bash
for t in skills/sdlc/bin/lib/*.self-test.js skills/sdlc/bin/*.self-test.js; do node "$t" || exit 1; done && node skills/sdlc/bin/sync-vendored.js --check && node skills/sdlc/bin/check-manifest.js && node skills/sdlc/bin/check-sheets.js && node skills/sdlc/bin/check-frontmatter.js && node skills/sdlc/bin/check-skill-sections.js && node skills/sdlc/bin/check-eol.js
```

```bash
git add skills/sdlc/bin/check-skill-sections.js skills/sdlc/bin/check-skill-sections.self-test.js .github/workflows/ci.yml docs/ci-red-runs.md
git commit -m "ci: check-skill-sections gate (section parity for the own skills) with red run"
```

---

### Task 5: `check-frontmatter.js` version rule and `release.sh` version sources

**Files:**
- Modify: `skills/sdlc/bin/check-frontmatter.js:24-31`
- Modify: `skills/sdlc/bin/check-frontmatter.self-test.js`
- Modify: `.github/scripts/release.sh:10-12` (comment) and after line `sed -i "s/^version: .*/version: $NEW_VERSION/" skills/sdlc/SKILL.md`

**Interfaces:**
- Produces: `check-frontmatter` errors `<skill>: frontmatter missing version (own skills carry the plugin version)` and `<skill>: version "<v>" differs from plugin.json "<p>"`; the `--root` tree may lack `.claude-plugin/plugin.json`, in which case only presence is checked.

- [ ] **Step 1: Add failing self-tests**

Append to `skills/sdlc/bin/check-frontmatter.self-test.js` before the final `console.log(passed ...)`:

```js
function treeWithPlugin(skills, pluginVersion) {
  const d = tree(skills);
  fs.mkdirSync(path.join(d, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(d, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'sdlc', version: pluginVersion }));
  return d;
}
check('own skill (sdlc-*) without version exits 1', () => {
  const r = run(tree({ 'sdlc-qa-gate': '---\nname: sdlc-qa-gate\ndescription: d\n---\n' }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('version') && out(r).includes('sdlc-qa-gate'));
});
check('vendored skill without version exits 0', () => {
  assert.strictEqual(run(tree({ 'test-driven-development': '---\nname: test-driven-development\ndescription: d\n---\n' })).status, 0);
});
check('own skill version differing from plugin.json exits 1', () => {
  const r = run(treeWithPlugin({ sdlc: '---\nname: sdlc\nversion: 0.1.1\ndescription: d\n---\n' }, '0.2.0'));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('0.1.1') && out(r).includes('0.2.0'));
});
check('own skill version equal to plugin.json exits 0', () => {
  assert.strictEqual(run(treeWithPlugin({ sdlc: '---\nname: sdlc\nversion: 0.2.0\ndescription: d\n---\n' }, '0.2.0')).status, 0);
});
```

- [ ] **Step 2: Run to see the new checks fail**

```bash
node skills/sdlc/bin/check-frontmatter.self-test.js
```

Expected: `8 passed, 2 failed` (the "without version" and "differing" checks fail).

- [ ] **Step 3: Implement**

In `skills/sdlc/bin/check-frontmatter.js`, after `const skillsDir = ...` add:

```js
const pluginFile = path.join(root, '.claude-plugin', 'plugin.json');
let pluginVersion = null;
try { pluginVersion = JSON.parse(fs.readFileSync(pluginFile, 'utf8')).version || null; } catch { /* no manifest in this tree */ }
```

and inside the loop after the `desc` check:

```js
  if (/^sdlc(-|$)/.test(d)) {
    const version = field('version');
    if (!version) errors.push(d + ': frontmatter missing version (own skills carry the plugin version)');
    else if (pluginVersion && version !== pluginVersion) {
      errors.push(d + ': version "' + version + '" differs from plugin.json "' + pluginVersion + '"');
    }
  }
```

Update the header comment: `// Every skills/*/SKILL.md needs a --- block with name (== folder) and a non-empty description; own skills (sdlc, sdlc-*) also need version equal to .claude-plugin/plugin.json.`

- [ ] **Step 4: Run the self-test and the repo gate**

```bash
node skills/sdlc/bin/check-frontmatter.self-test.js && node skills/sdlc/bin/check-frontmatter.js
```

Expected: `10 passed, 0 failed`; `check-frontmatter: 9 skills OK`.

- [ ] **Step 5: Add the version sources to the release script**

In `.github/scripts/release.sh` replace the comment lines 10-12 with:

```bash
# Version sources rewritten here (keep each on one line):
#   .claude-plugin/plugin.json   "version": "X.Y.Z"   (the only "version" key)
#   skills/sdlc/SKILL.md         version: X.Y.Z       (frontmatter)
#   skills/sdlc-debugging/SKILL.md, skills/sdlc-qa-gate/SKILL.md, skills/sdlc-release/SKILL.md  (same line)
```

After the line `sed -i "s/^version: .*/version: $NEW_VERSION/" skills/sdlc/SKILL.md` add:

```bash
for own in sdlc-debugging sdlc-qa-gate sdlc-release; do
  sed -i "s/^version: .*/version: $NEW_VERSION/" "skills/$own/SKILL.md"
done
```

Also add the four skill files to the `git add` line of the release commit in the same script (find it with `grep -n 'git add' .github/scripts/release.sh` and append `skills/sdlc-debugging/SKILL.md skills/sdlc-qa-gate/SKILL.md skills/sdlc-release/SKILL.md`).

- [ ] **Step 6: Dry-run the release script**

```bash
grep -n 'dry' .github/scripts/release.sh | head -3
bash .github/scripts/release.sh --dry-run 2>&1 | tail -5
```

Expected: the dry-run prints `last tag: v0.1.1   auto-bump: minor -> 0.2.0` (feat commits present) and `dry run: nothing was modified.`; `git status --short` shows no change to the version files. If the flag is named differently, use the name the grep shows.

- [ ] **Step 7: Commit (controller, when the owner says so)**

```bash
git add skills/sdlc/bin/check-frontmatter.js skills/sdlc/bin/check-frontmatter.self-test.js .github/scripts/release.sh
git commit -m "ci: own skills carry the plugin version; release script rewrites all four"
```

---

### Task 6: Phase sheets, missing-skill table, request card, router note

**Files:**
- Modify: `skills/sdlc/references/phases/analysis.md` (frontmatter `recommends`, `Do now`)
- Modify: `skills/sdlc/references/phases/testing.md` (`Do now`)
- Modify: `skills/sdlc/references/phases/deployment.md` (`Do now`)
- Modify: `skills/sdlc/references/missing-skill.md` (table rows, last paragraph)
- Modify: `skills/sdlc/references/request-card.md` (template, note)
- Modify: `skills/sdlc/SKILL.md` step 5 sentence "When a phase recommends two skills (development)"

**Interfaces:**
- Consumes: `check-sheets.js` resolves `recommends` names against `DEFAULT_KNOWN` (already includes the three).
- Produces: `which.js --phase analysis` lists `sdlc-debugging` under `recommends`.

- [ ] **Step 1: analysis.md**

Frontmatter line: `recommends: [spec-driven-development, sdlc-debugging]`. Replace the `**Do now:**` line with:

```
**Do now:** for a bug or complaint, run `sdlc-debugging` first (reproduce, localise, explain, hand off the `Cause:` and `Evidence:` lines), then `spec-driven-development` for the short spec; for a feature or idea, run `spec-driven-development`. Prepend the header (see `../spec-header.md`). One of the two recommended skills installed is enough to skip the missing-skill question.
```

- [ ] **Step 2: testing.md and deployment.md**

testing.md `**Do now:**`:

```
**Do now:** run `sdlc-qa-gate`: diff map, every applicable layer, the report table with residual risk. Alternative when it is not installed: `qa-push` (missing-skill protocol in `../missing-skill.md`).
```

deployment.md `**Do now:**`:

```
**Do now:** run `sdlc-release`: it detects the repo's release mechanism and drives it, or classifies, updates, validates and publishes step by step. Alternative: `release-engineer`. Nothing is pushed or tagged without the user's explicit request in the current turn.
```

- [ ] **Step 3: missing-skill.md**

Replace the row `| `sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release` | no public source (planned for v1.1) |` with three rows:

```
| `sdlc-debugging` | `cd ~ && npx skills add PapiScholz/SDLC-Assist --skill sdlc-debugging` (bundled with `sdlc`) |
| `sdlc-qa-gate` | `cd ~ && npx skills add PapiScholz/SDLC-Assist --skill sdlc-qa-gate` (bundled) |
| `sdlc-release` | `cd ~ && npx skills add PapiScholz/SDLC-Assist --skill sdlc-release` (bundled) |
```

Replace the last paragraph (`In v1, ... do not exist yet ...`) with:

```
`sdlc-debugging`, `sdlc-qa-gate` and `sdlc-release` ship with this repo since v1.1. Known alternatives: `superpowers:systematic-debugging`, `debugging-strategies`, `release-engineer`, `qa-push`.
```

Update the verification date line to `on 2026-09-30` after checking `~/.agents/.skill-lock.json` still lists the same sources.

- [ ] **Step 4: request-card.md**

Change "Five lines." to "Five lines, plus two optional ones that `sdlc-debugging` fills on the bug route." Add to the template after `Urgency:`:

```
Cause:         <optional; written by sdlc-debugging: the sentence that predicts the symptom>
Evidence:      <optional; written by sdlc-debugging: reproduction, location, disproof attempt>
```

Add to the example:

```
Cause:         formatTotal() drops trailing zeros because it calls Number.toString() instead of toFixed(2)
Evidence:      repro: node -e "..." prints 12.5; location src/receipt/format.js:41-44; disproof: toFixed(2) → 12.50
```

- [ ] **Step 5: sdlc/SKILL.md step 5**

Replace `When a phase recommends two skills (development), a single installed one is enough` with `When a phase recommends two skills (analysis, development), a single installed one is enough`.

- [ ] **Step 6: Gates and which.js check**

```bash
node skills/sdlc/bin/check-sheets.js && node skills/sdlc/bin/check-eol.js && node skills/sdlc/bin/which.js --phase analysis | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.phases.analysis.recommends)})"
```

Expected: `check-sheets: 6 sheets OK`; the printed list contains `sdlc-debugging`.

- [ ] **Step 7: Commit (controller, when the owner says so)**

```bash
git add skills/sdlc/references/phases/analysis.md skills/sdlc/references/phases/testing.md skills/sdlc/references/phases/deployment.md skills/sdlc/references/missing-skill.md skills/sdlc/references/request-card.md skills/sdlc/SKILL.md
git commit -m "feat: phase sheets recommend the own skills; install table and request card updated"
```

---

### Task 7: CI `install-smoke` asserts the three skills

**Files:**
- Modify: `.github/workflows/ci.yml` (job `install-smoke`)

**Interfaces:**
- Consumes: `which.js --phase testing` JSON, `phases.testing.installed[].name`; `which.js` reads `$HOME` for user-scope dirs.

- [ ] **Step 1: Extend the install step**

After `test -f "$HOME/.agents/skills/spec-driven-development/SKILL.md"` add:

```yaml
          for s in sdlc-debugging sdlc-qa-gate sdlc-release; do test -f "$HOME/.agents/skills/$s/SKILL.md" || { echo "missing $s"; exit 1; }; done
```

- [ ] **Step 2: Add a step after "Installed copy infers a production complaint as analysis"**

```yaml
      - name: Installed copy reports sdlc-qa-gate for testing and sdlc-debugging for analysis
        run: |
          export HOME="$RUNNER_TEMP/home"; cd "$RUNNER_TEMP/fx"
          node "$HOME/.agents/skills/sdlc/bin/which.js" --phase testing > which.json
          node -e "const j=require('./which.json'); const n=j.phases.testing.installed.map(i=>i.name); if(!n.includes('sdlc-qa-gate')){console.error(JSON.stringify(j,null,1));process.exit(1)}; console.log('ok testing', n.join(','))"
          node "$HOME/.agents/skills/sdlc/bin/which.js" --phase analysis > which2.json
          node -e "const j=require('./which2.json'); const n=j.phases.analysis.installed.map(i=>i.name); if(!n.includes('sdlc-debugging')){console.error(JSON.stringify(j,null,1));process.exit(1)}; console.log('ok analysis', n.join(','))"
```

- [ ] **Step 3: Replay the job locally in bash (Git Bash on Windows is fine)**

```bash
T=$(mktemp -d); export HOME="$T/home"; mkdir -p "$HOME"; cd "$HOME"
npx -y skills add "C:/Users/ezesc/Github/SDLC-Assist" -y -g --copy
for s in sdlc-debugging sdlc-qa-gate sdlc-release; do test -f "$HOME/.agents/skills/$s/SKILL.md" && echo "ok $s"; done
node "$HOME/.agents/skills/sdlc/bin/which.js" --phase testing | grep -c '"name": "sdlc-qa-gate"'
```

Expected: three `ok` lines and `1`. If `npx skills add` refuses a local path, fall back to `cp -r skills/* "$HOME/.agents/skills/"` for the local replay only and say so; CI keeps the CLI path.

- [ ] **Step 4: Commit (controller, when the owner says so)**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: install-smoke asserts the three own skills and which.js reports them [skip release]"
```

---

### Task 8: README, CHANGELOG `[Unreleased]`, CONTRIBUTING, CLAUDE.md

**Files:**
- Modify: `README.md` lines 5, 7-16, 21-23 (install notes), 95-106 (bundled), 122-124 (roadmap)
- Modify: `CHANGELOG.md` (prepend `## [Unreleased]`)
- Modify: `CONTRIBUTING.md:26-32` (gate loop)
- Modify: `CLAUDE.md` (gates line)

- [ ] **Step 1: README phase table and intro**

Line 5: `Five skills from addyosmani/agent-skills (...) are bundled` → `Three own phase skills (sdlc-debugging, sdlc-qa-gate, sdlc-release) and five skills from addyosmani/agent-skills (the spec-driven-development family) are bundled so the recommendations work out of the box.`

Table rows:

```
| `analysis` | Requirements analysis | spec-driven-development; sdlc-debugging on the bug route |
| `testing` | Testing | sdlc-qa-gate (alternative: qa-push) |
| `deployment` | Deployment | sdlc-release (alternative: release-engineer) |
```

Delete line 16 (`sdlc-qa-gate and sdlc-release are not shipped in v1; ...`).

Install table notes: `Installs the six skills (router + five vendored)` → `Installs the nine skills (router + three own + five vendored)`; `Also registers the five vendored skills` → `Also registers the three own and five vendored skills`; `Copies the router and the five vendored skills` → `Copies all nine skills`.

- [ ] **Step 2: README own-skills section**

Before `## Bundled skills` insert:

```markdown
## Own skills

Written for this repo, generic, English, Markdown only (stack detection stays in `where.js`).

| Skill | Phase | Produces |
|---|---|---|
| `sdlc-debugging` | analysis, bug route | `Cause:` and `Evidence:` lines for the short spec; reproduce, localise, explain, hand off; never edits product code |
| `sdlc-qa-gate` | testing | the `Layer / Verified / Not verified / Residual risk` table plus gaps; never a "green" verdict |
| `sdlc-release` | deployment | version decision, version files and changelog, tag and release; drives an existing release mechanism; every state-changing command only on request |

Section parity with their contracts is enforced by `node skills/sdlc/bin/check-skill-sections.js`.
```

Roadmap: replace the v1.1 line with `v1.2: native command files for Codex and Cursor once their formats are verified.`

Development gate loop in README (line ~109 onwards): add `node skills/sdlc/bin/check-skill-sections.js` after the frontmatter line.

- [ ] **Step 3: CHANGELOG**

Insert after `# Changelog` and a blank line:

```markdown
## [Unreleased]

### Added
- Own phase skills `sdlc-debugging` (bug route of analysis), `sdlc-qa-gate` (testing) and `sdlc-release` (deployment); the router recommends them by default and the alternatives stay listed.
- `check-skill-sections.js` gate: section parity with the skill contracts.

### Changed
- `check-frontmatter.js` requires `version` on the own skills, equal to `plugin.json`; the release script rewrites all four.
- `analysis` sheet recommends `sdlc-debugging` beside `spec-driven-development`; the request card gains optional `Cause:` and `Evidence:` lines.

### CI
- `install-smoke` asserts the three own skills are installed and reported by `which.js`.

```

The release script consumes this section into `## [0.2.0] - <date>` on the merge to `main`.

- [ ] **Step 4: CONTRIBUTING and CLAUDE.md**

CONTRIBUTING gate block: add `node skills/sdlc/bin/check-skill-sections.js` after the frontmatter line. CLAUDE.md gates bullet: add `check-skill-sections` after `check-frontmatter`; the version-sources bullet: replace `(and the own skills once they exist)` with `and the version: line of the three own skills`.

- [ ] **Step 5: Gates and commit (controller, when the owner says so)**

```bash
node skills/sdlc/bin/check-eol.js && grep -c 'sdlc-debugging' README.md
```

Expected: no CRLF; count at least 3.

```bash
git add README.md CHANGELOG.md CONTRIBUTING.md CLAUDE.md
git commit -m "docs: own skills in README, changelog unreleased entry, gate loop [skip release]"
```

---

### Task 9: Dogfood runs (b) release detect and (c) debugging on a seeded fault

**Files:**
- Modify: `docs/ci-red-runs.md` (new section `## v1.1 dogfood`)

**Interfaces:**
- Consumes: the two skills as written in Tasks 1 and 3, followed literally by the agent.

- [ ] **Step 1: (b) `sdlc-release` in detect mode on this repo**

Follow `skills/sdlc-release/SKILL.md` step 1 on this repo: run `where.js`, read `signals.releaseWorkflow.files`, read `.github/workflows/release.yml` and `.github/scripts/release.sh`. Expected outcome to record: mechanism `release workflow` found; trigger `push to main`; recommendation "merge the PR into main; do not tag by hand; the workflow computes 0.2.0 from the feat commits". Nothing is executed.

- [ ] **Step 2: (c) `sdlc-debugging` on a seeded fault in a scratch copy**

```bash
S=$(mktemp -d); cp -r skills "$S/skills"
sed -i 's/const PHASES = \[/const PHASES = ["bogus", /' "$S/skills/sdlc/bin/lib/header.js"
node "$S/skills/sdlc/bin/lib/header.self-test.js"; echo "exit $?"
```

If that `sed` matches nothing (`grep -n 'PHASES' "$S/skills/sdlc/bin/lib/header.js"` to see the real line), seed instead by changing one expected slug in the array. Then follow `skills/sdlc-debugging/SKILL.md` literally against `$S` as the repo root, with the card `What happens: header.self-test.js fails after a one-line edit`. Record the six output lines (`Reproduction`, `Location`, `Cause`, `Evidence`, `Diagnostic`, `Next`).

- [ ] **Step 3: (c2) the irreproducible variant (Review Focus 2)**

Same scratch, but the card says `What happens: sometimes where.js reports deployment on a clean checkout; no steps to reproduce`. Follow the skill: step 1 must produce `Reproduction: none — <why>; evidence used instead: <what>` and the hand-off must state lower confidence. Record the lines.

- [ ] **Step 4: Record**

Append to `docs/ci-red-runs.md`:

```markdown
## v1.1 dogfood

Runs of the own skills against this repo or a scratch copy, pasted verbatim.

### (b) sdlc-release, detect mode, this repo at <sha>

<the mechanism line, trigger, recommendation>

### (c) sdlc-debugging, seeded fault in a scratch copy

<the six output lines>

### (c2) sdlc-debugging, no reproduction possible

<the Reproduction line and the hand-off confidence statement>
```

- [ ] **Step 5: Commit (controller, when the owner says so)**

```bash
git add docs/ci-red-runs.md
git commit -m "docs: v1.1 dogfood runs for sdlc-release detect and sdlc-debugging [skip release]"
```

---

### Task 10: Reference scenarios on a fresh temp home, dogfood (a) QA gate, close the cycle

**Files:**
- Modify: `docs/ci-red-runs.md` (scenarios table + `### (a)` report)
- Modify: `docs/specs/2026-09-30-v1-1-own-skills.md:3` (close development → testing → deployment → closed, each on the owner's confirmation)
- Modify: `tasks/todo.md` (tick tasks)

- [ ] **Step 1: Close development (owner confirms)**

Ask whether Development is finished (Tasks 1-9 done, gates in the full loop from Task 4 step 7 all exit 0). On yes, edit line 3 of the spec to `Phase: testing`.

- [ ] **Step 2: Reference scenarios on a fresh temp home**

```bash
T=$(mktemp -d); export HOME="$T/home"; mkdir -p "$HOME" "$T/np/src"; cd "$HOME"
npx -y skills add "C:/Users/ezesc/Github/SDLC-Assist" -y -g --copy
W="$HOME/.agents/skills/sdlc/bin"
# scenario 1: analysis, bug
node "$W/which.js" --phase analysis | grep -c '"name": "sdlc-debugging"'
# scenario 2: testing skill installed
node "$W/which.js" --phase testing | grep -c '"name": "sdlc-qa-gate"'
# scenario 3: deployment skill installed
node "$W/which.js" --phase deployment | grep -c '"name": "sdlc-release"'
```

Expected: `1` three times. Then scenario 2b (Review Focus 1): in `$T/np`, `git init -q`, one `src/a.js` committed, no `package.json`; follow `sdlc-qa-gate` on that repo with one changed file; the table must have six rows, all `not run: no runner detected, verify by hand`. Scenario 3b (Review Focus 3): same repo, no tags; follow `sdlc-release` steps 1-2 only; it must say `last tag: none ... proposed: v0.1.0` and stop before step 5. Record both.

- [ ] **Step 3: (a) `sdlc-qa-gate` on the v1.1 diff of this repo**

Follow `skills/sdlc-qa-gate/SKILL.md` with base `main`: diff map of every changed file, then layers (static: none configured → not run; unit: `signals.testRunner.kind` is null for this repo because `package.json` has no test script → the self-test loop is the suite, run it and say so; build/runtime/functional: docs and scripts only → not run with reason; regression: `check-frontmatter.js` changed → its self-test and the full loop). Paste the table and gap lines under `### (a) sdlc-qa-gate on the v1.1 diff` in `docs/ci-red-runs.md`, with the scenarios from step 2 under `### Reference scenarios (fresh temp home)`.

- [ ] **Step 4: Tick the todo and commit (controller, when the owner says so)**

Mark Tasks 1-10 in `tasks/todo.md`.

```bash
git add docs/ci-red-runs.md tasks/todo.md tasks/plan.md
git commit -m "docs: v1.1 reference scenarios and QA gate report [skip release]"
```

- [ ] **Step 5: Close testing, open the PR (owner's words for push)**

On the owner's acceptance of the residual risk, edit the spec header to `Phase: deployment`, commit it (`spec: v1.1 testing closed [skip release]`), then on the owner's words:

```bash
git push -u origin v1.1-own-skills
gh pr create --title "v1.1: own phase skills (sdlc-debugging, sdlc-qa-gate, sdlc-release)" --body-file <temp file with the CHANGELOG Unreleased section>
```

CI must be green on Ubuntu and Windows including `install-smoke`. Merge only on the owner's words; the merge to `main` runs `release.yml`, which publishes `v0.2.0` and rewrites the four version sources.

- [ ] **Step 6: Close the cycle**

After the release workflow succeeds (`git fetch --tags && git describe --tags` on `main` shows `v0.2.0`), on the owner's confirmation edit the spec to `Phase: deployment` / `Status: closed`, commit `spec: close the v1.1 cycle [skip release]`, push on the owner's words. Reinstall the local copy so the junction is not stale: `cd ~ && npx skills add PapiScholz/SDLC-Assist -y`.

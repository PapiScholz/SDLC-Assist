# v1.2 Playbook Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Spec: docs/specs/2026-09-30-v1-2-playbook-alignment.md (approved by the owner on 2026-09-30; analysis closes when this plan lands in `tasks/plan.md`).

## Context

The owner asked whether the repo follows section "Plays" (`#sd-c2`) of the AI-native SDLC playbook. It follows the core idea (versioned artifacts, human confirmation at gates) but lacks the playbook's vocabulary and two process pieces. The approved spec picks five cheap, portable deliverables: `intent.md` as the artifact that opens a cycle; `Governance:` and `Measure:` lines on every phase sheet; a `maintain` entry point that turns a production signal into an `intent.md`; a single gate target `scripts/gates.sh`; and two versioned Claude Code hooks (git authorization, EOL guard) so a second contributor gets the protection the owner has from a global hook today. The automation plays (Maintain loop, evals, `REVIEW.md`, `.claude/agents/`, scans) stay documented as out of scope.

**Goal:** ship v0.3.0 of SDLC-Assist with the five deliverables, gates and dogfood recorded, cycle closed.

**Architecture:** Markdown references and sheets under `skills/sdlc/references/`; one body-line check added to `check-sheets.js`; two zero-dependency Node hook scripts under `scripts/hooks/` declared in a versioned `.claude/settings.json`; one bash gate runner `scripts/gates.sh` called by CI and docs. Inference scripts (`header.js`, `infer.js`, `where.js`, `which.js`) untouched.

**Tech Stack:** Node 20+ zero-dependency scripts with `*.self-test.js` (assert + spawnSync, pattern in `skills/sdlc/bin/check-frontmatter.self-test.js`), bash, GitHub Actions, Markdown.

## Global Constraints

- LF, UTF-8 without BOM everywhere (`check-eol.js`); English docs; the skill replies in the user's language.
- Work on branch `v1.2-playbook-alignment` and a PR; docs/CI-only commits carry `[skip release]`; the closing commit carries `[minor]` (release.sh greps all commits since the last tag; `[skip release]` is read on the head commit only, so merge with a merge commit).
- Gates before any commit: from Task 5 on, `bash scripts/gates.sh`; before that, the v1.1 loop plus the new self-tests.
- No state-changing git without the owner's words in the current turn; implementers never commit; the controller commits with explicit paths. No `Co-Authored-By` trailers.
- `PHASES` in `skills/sdlc/bin/lib/header.js:1` stays at six slugs; the scripts never parse `intent.md`.
- Sheet frontmatter keys stay `slug, title, recommends, alternatives, design`; `check-sheets.js` `DEFAULT_KNOWN` unchanged.
- Hook scripts: Node, exec form (`"command":"node","args":[...]`), never bash/pwsh; deny via exit 0 + `hookSpecificOutput.permissionDecision: "deny"` (PreToolUse) and exit 2 + stderr (PostToolUse); `SDLC_HOOKS_DISABLE=1` from the harness env disables both.
- Vendored skills never edited.

## Rulings taken while planning (record in the ledger)

1. Hooks in Node, not bash as the spec's "Design decisions" says: Node is the only interpreter guaranteed wherever Claude Code runs; bash is absent on Windows without Git Bash. The spec paragraph is amended at close (Task 7 step 1) to say Node. Cost if wrong: none.
2. `git add` is allowed by the hook (reversible staging); `git commit`, `push`, `push --force` (own verb), `reset --hard`, `tag -d`, `branch -D` are gated. `switch -c`, `fetch`, `branch -d`, read-only git allowed.
3. Human message detection ports the owner's global guard: `type === "user"`, `origin.kind === "human"`, not `isSidechain`; read the transcript tail-first (up to 8 MB) so 100 MB transcripts stay cheap; fail closed when no human message is found (subagent transcripts have none).
4. `check-sheets.js` gains body-line checks (`**Governance:**`, `**Measure:**`) even though it was frontmatter-only; it is the sheet gate the spec names.

## Review Focus

1. A transcript that lags (current turn not flushed): the hook must deny with a reason that quotes the message it saw, never allow silently. Pinned in Task 3 self-test "transcript with only tool_result records denies".
2. A file path with backslashes or a different drive in `tool_input.file_path`: the EOL guard must resolve it and skip files outside the project instead of crashing. Pinned in Task 4 self-tests.
3. A sheet that has the two new lines inside a code fence or with different casing (`**governance:**`): the sheet gate must accept only the exact bold label at line start. Pinned in Task 2 self-test.
4. `gates.sh` run from another cwd, or with an unmatched glob: must still run every gate from the repo root and fail loudly. Pinned in Task 5 step 4.
5. `Intent:` header line pushing `Phase:`/`Status:` past the 15-line window of `header.js`: the spec-header doc must say the three lines go directly under the H1. Pinned in Task 1 step 2 wording and the dogfood spec of Task 7.

## File Structure

```
skills/sdlc/references/intent.md                (new) template + rules
skills/sdlc/references/maintain.md              (new) maintain entry sheet (not a phase)
skills/sdlc/references/spec-header.md           (mod) optional Intent: line
skills/sdlc/references/entry-points.md          (mod) artifact column + Production signal row
skills/sdlc/references/phases/*.md              (mod, 6) Governance:/Measure: lines
skills/sdlc/SKILL.md                            (mod) step 6, question template warning, entry rules
skills/sdlc/bin/check-sheets.js (+ self-test)   (mod) body-line checks
scripts/hooks/git-authorization.js (+ self-test) (new)
scripts/hooks/eol-guard.js (+ self-test)         (new)
scripts/gates.sh                                 (new)
.claude/settings.json                            (new, versioned)
.gitignore                                       (mod) .claude/handoff.md
.github/workflows/ci.yml                         (mod) test job → gates.sh; hook self-tests included
CONTRIBUTING.md, README.md, CLAUDE.md, CHANGELOG.md (mod)
docs/ci-red-runs.md                              (mod) red runs + v1.2 dogfood
docs/intents/2026-09-30-playbook-alignment.md    (new) dogfood intent
tasks/plan.md, tasks/todo.md                     (this cycle)
```

## Tasks (batches: A = 1,2,3,4 in parallel, disjoint files; B = 5,6 after A; C = 7)

- [x] Task 1: `intent.md` template, `maintain` entry sheet, spec header, entry points, router text
- [x] Task 2: Governance/Measure lines on six sheets; `check-sheets.js` body check + self-test + red run
- [x] Task 3: `scripts/hooks/git-authorization.js` + self-test
- [x] Task 4: `scripts/hooks/eol-guard.js` + self-test + `.claude/settings.json` + `.gitignore`
- [x] Task 5: `scripts/gates.sh`, CI, CONTRIBUTING/README/CLAUDE.md gate references, red runs
- [x] Task 6: README playbook mapping + hooks notes; CHANGELOG `[Unreleased]`
- [ ] Task 7: Dogfood intent chain, reference scenarios, close the cycle, PR, release

---

### Task 1: `intent.md` template, `maintain` entry sheet, spec header, entry points, router text

**Files:** create `skills/sdlc/references/intent.md`, `skills/sdlc/references/maintain.md`; modify `skills/sdlc/references/spec-header.md` (format block L7-12 and rules L14-18), `skills/sdlc/references/entry-points.md` (table L3-8), `skills/sdlc/SKILL.md` (step 6 at L43, question template L47-52 and its paragraph L54).

**Interfaces:** produces the intent file convention `docs/intents/<YYYY-MM-DD>-<slug>.md` and the header line `Intent: docs/intents/<file>` consumed by Task 7's dogfood; `check-sheets.js` must NOT see `maintain.md` as an extra sheet (it lives in `references/`, not `references/phases/`).

- [x] Step 1: Write `references/intent.md`:

```markdown
# intent.md

The artifact that opens a cycle for an idea or a feature (Plan stage). Written in the originator's own words; the agent asks and transcribes, it does not rewrite. Complaints and bugs use the request card instead (`request-card.md`).

Path by convention: `docs/intents/<YYYY-MM-DD>-<slug>.md`, committed. Ask before creating `docs/intents/` in a repo that has none.

## Template

```
# Intent: <one line>

Who:              <originator, role>
Problem:          <what hurts today, in the originator's words>
Desired outcome:  <what is true when this is done>
Constraints:      <policy, deadline, budget, systems that must not change>
Open questions:   <what the originator does not know yet>
```

## Rules

- No `Phase:` header: an intent is not a cycle. The spec that consumes it carries `Intent: <path>` right under its `Status:` line (`spec-header.md`).
- The originator corrects the intent; the agent does not restate it in its own words.
- An intent committed with no spec naming it is a warning in the `sdlc` question ("intent without spec: <path>"), found with the read-only `git ls-files docs/intents` and a grep for `Intent:` in `docs/specs/`.
- A production signal (alert, scan finding, ticket) becomes an intent through `maintain.md`.
```

- [x] Step 2: `spec-header.md`: in the format block add a third line `Intent: docs/intents/<file>   (optional, ideas and features only)` and the rule "The header is the first three lines under the H1: `Phase:`, `Status:`, then the optional `Intent:`. `header.js` reads only the first 15 lines after the frontmatter, so nothing goes above them." (Review Focus 5.)

- [x] Step 3: Write `references/maintain.md`:

```markdown
# Maintain (entry point)

Not a phase: nothing in `where.js` infers it. It is how work re-enters the loop from production.

**Enters when:** a signal arrives from a running system: an alert, a breached metric band, a security scan finding, a support ticket, a post-mortem action.
**Produces:** an `intent.md` (`intent.md` template) with four extra lines in "Problem": anomaly and evidence, proposed outcome, affected systems, open questions; the service owner triages it (fix now, schedule, dismiss with reason).
**Do now:** ask the user for the signal's evidence (metric, log line, finding id, ticket); write the intent in their words after they confirm; recommend a new cycle in analysis. A bounded fix that meets the hotfix threshold may go straight to development and say so.
**Next phase:** analysis, as a new cycle (`entry-points.md`).
**Warns when:** the signal is acted on without an intent (no audit trail), or a fix ships without a regression test for the incident class.
**Governance:** the intent is the audit record (author, timestamp, revision history in git); dismissals carry a reason; fixes go through the normal PR gate.
**Measure:** leading: time from signal to committed intent; lagging: share of intents that become merged fixes, and repeat incidents of the same class.

Out of scope for this skill, documented as the user's infrastructure: control bands, tiered automatic responses, scheduled scans, evals per incident.
```

- [x] Step 4: `entry-points.md`: add the column `Artifact` to the table (`intent.md` for the two idea rows, `request card` for complaint/bug/feature, `none` for hotfix) and the row `| Production signal (alert, finding, ticket) | \`analysis\` as a new cycle | Through \`maintain.md\`: writes an \`intent.md\` first. | \`intent.md\` |`.

- [x] Step 5: `skills/sdlc/SKILL.md`: step 6 gains "When the active spec carries an `Intent:` line, read that file too and quote its `Desired outcome` in the next-step statement. Entry sheet for production signals: `references/maintain.md`." The question template paragraph (L54) gains "Warnings also list `intent without spec: <path>` when `docs/intents/` holds a committed intent no spec names (read-only `git ls-files`, grep `Intent:` in `docs/specs/`)."

- [x] Step 6: Gates: `node skills/sdlc/bin/check-sheets.js && node skills/sdlc/bin/check-eol.js && node skills/sdlc/bin/check-skill-sections.js` → `6 sheets OK`, clean, `3 skills OK`.

- [x] Step 7: Commit (controller, owner's words): `git add skills/sdlc/references skills/sdlc/SKILL.md && git commit -m "feat: intent.md template, maintain entry point, Intent: header line"`

---

### Task 2: Governance/Measure lines on six sheets; `check-sheets.js` body check + self-test + red run

**Files:** modify `skills/sdlc/references/phases/{initial,analysis,planning,development,testing,deployment}.md` (append two lines after `**Warns when:**`), `skills/sdlc/bin/check-sheets.js` (after the frontmatter checks, L46-65), `skills/sdlc/bin/check-sheets.self-test.js` (fixture L15-17 must gain the two lines or every existing check breaks), `docs/ci-red-runs.md` (table row + Commands entry).

**Interfaces:** error lines `check-sheets: <file>: missing body line "**Governance:**"` / `"**Measure:**"`; a label counts only when a line starts with exactly `**Governance:**` / `**Measure:**` outside fenced code (Review Focus 3).

- [x] Step 1: Add to the self-test, before the final tally, three checks: sheet without `**Governance:**` → exit 1 naming the file and the label; sheet with the label only inside a ``` fence → exit 1; sheet with lower-case `**governance:**` → exit 1. Update the fixture in `tree()` so every sheet carries both lines. Run: expect the three new checks FAIL, the rest pass.

- [x] Step 2: Implement in `check-sheets.js` after the frontmatter checks:

```js
const body = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
let fenced = false; const found = new Set();
for (const line of body.split('\n')) {
  if (/^```/.test(line)) { fenced = !fenced; continue; }
  if (fenced) continue;
  for (const label of ['**Governance:**', '**Measure:**']) if (line.startsWith(label)) found.add(label);
}
for (const label of ['**Governance:**', '**Measure:**']) if (!found.has(label)) errors.push(f + ': missing body line "' + label + '"');
```

(`text` is the CRLF-normalised sheet text the script already reads.) Run the self-test: all pass. The repo run now FAILS on six sheets until step 3.

- [x] Step 3: Append to each sheet the two lines, verbatim:

| Sheet | Governance | Measure |
|---|---|---|
| initial | `**Governance:** the first spec (and its intent, when one exists) is the audit record: author, timestamp and revision history live in git.` | `**Measure:** leading: time from the first conversation to the committed intent or spec; lagging: number of intent edits made after the first spec commit.` |
| analysis | `**Governance:** the spec is approved by the owner through close mode (`Status: approved` in a commit attributed to them); policy skills apply while it is written, not in a later review.` | `**Measure:** leading: elapsed time between the intent commit and the spec commit; lagging: spec commits dated after the first plan commit of the same cycle.` |
| planning | `**Governance:** design review happens before code exists; `tasks/plan.md` is committed and approved before implementation (plan mode holds edits until then).` | `**Measure:** leading: time from plan approval to merged PR; lagging: rework cycles per change and how far the merged diff departs from the committed plan.` |
| development | `**Governance:** when the implementation departs from the plan, `tasks/plan.md` is updated in the same commit; repeated corrections enter `CLAUDE.md`.` | `**Measure:** leading: share of changes merged from the first implementation pass; lagging: rework cycles per change from PR history.` |
| testing | `**Governance:** verification is part of "done"; the report names what was not run; test files are not edited during a fix; the residual risk is accepted by a named person through close mode.` | `**Measure:** leading: first-pass CI success rate for agent-written changes; lagging: change failure rate and review time per PR.` |
| deployment | `**Governance:** the agent acts up to the production gate and never past it; release, tag and publish run only on the user's request; the PR and the tag are the audit record.` | `**Measure:** leading: time to first review and share of pipeline failures triaged without paging a person; lagging: DORA measures and defects that escaped to production.` |

- [x] Step 4: Run `node skills/sdlc/bin/check-sheets.js` → `check-sheets: 6 sheets OK`; `node skills/sdlc/bin/check-sheets.self-test.js` → all pass; `check-eol` clean.

- [x] Step 5: Red run on a temp copy: `S=$(mktemp -d); cp -r skills/sdlc/references/phases $S/ph; sed -i '/^\*\*Measure:\*\*/d' $S/ph/testing.md; node skills/sdlc/bin/check-sheets.js --sheets-dir $S/ph` → paste the real line (`check-sheets: testing.md: missing body line "**Measure:**"`) into the table and the Commands block of `docs/ci-red-runs.md`.

- [x] Step 6: Commit (controller): `git add skills/sdlc/references/phases skills/sdlc/bin/check-sheets.js skills/sdlc/bin/check-sheets.self-test.js docs/ci-red-runs.md && git commit -m "feat: governance and measure lines on every phase sheet, enforced by check-sheets"`

---

### Task 3: `scripts/hooks/git-authorization.js` + self-test

**Files:** create `scripts/hooks/git-authorization.js`, `scripts/hooks/git-authorization.self-test.js`.

**Interfaces:** stdin JSON `{hook_event_name, tool_name, tool_input:{command}, transcript_path, cwd}`; stdout deny JSON `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}` with exit 0; allow = exit 0, empty stdout. Env: `SDLC_HOOKS_DISABLE=1`, `SDLC_GIT_VERBS` (JSON object merged over the defaults).

- [x] Step 1: Write the self-test first (harness copied from `check-frontmatter.self-test.js`; helper `transcript(lastMsg)` writes a temp JSONL with, in order: an old human record, an assistant record, a tool_result-only user record with `origin.kind: "tool"`, the last human record `{"type":"user","origin":{"kind":"human"},"message":{"role":"user","content":"<lastMsg>"}}`, then an assistant record and another tool_result user record; helper `run(cmd, lastMsg, env)` spawns the hook with `tool_name: "Bash"` and a clean env; `verdict(r)` returns `allow` when status 0 and stdout empty, `deny` when stdout parses with `permissionDecision === "deny"`). Cases (label → expectation):
  - `git commit -m x` + "commiteá y seguí" → allow; + "commitea" → allow; + "COMMIT please" → allow; + "dale" → deny, reason contains `commitea`.
  - `git push` + "commiteá" → deny; + "pusheá" → allow. `git push --force` + "pusheá" → deny; `git push -f` + "force push" → allow; `git push origin +main` + "pusheá" → deny.
  - Allowed with "dale": `git log`, `git status`, `git diff`, `git tag`, `git tag -l`, `git branch`, `git branch -d x`, `git switch -c f`, `git fetch`, `git add -A`, `git reset --soft HEAD~1`.
  - `git reset --hard` + "dale" → deny; + "resetea" → allow. `git tag -d v1` + "dale" → deny; + "borrá el tag v1" → allow. `git branch -D x` + "dale" → deny; + "delete branch x" → allow.
  - `npm test && git push` + "pusheá" → allow; + "dale" → deny. `git commit -m "a && git push"` + "commiteá" → allow. `git -C ../o push` + "dale" → deny. `git -c user.name=x commit -m y` + "dale" → deny. `echo git push` + "dale" → allow. `bash -c "git push"` + "dale" → deny. `git add x && git commit -m y && git push` + "commiteá" → deny, reason names `push` and not `commit`.
  - No `transcript_path` → deny, reason matches /transcript/. Nonexistent path → deny. Transcript whose records are all tool_result/assistant (lag) → deny, reason matches /could not be read/ (Review Focus 1). Transcript with `isSidechain: true` human record only → deny.
  - `SDLC_HOOKS_DISABLE=1` + `git push` + "dale" → allow. `SDLC_GIT_VERBS='{"commit":["ship it"]}'` + "ship it" → allow, + "commitea" → deny. Invalid `SDLC_GIT_VERBS` → defaults, stderr contains `not valid JSON`. `tool_name: "Write"` → allow. Garbage stdin → exit 0.
  Run it: every check FAILs (script missing).

- [x] Step 2: Write the hook (about 110 lines). Verb table, accent normalisation (`NFD` + strip `̀-ͯ`, lower-case), word-boundary match `(^|[^a-z0-9])verb($|[^a-z0-9])`; quote-aware segmentation on `; & | newline ( ) \` { }`; skip env prefixes (`FOO=bar`) and `sudo/env/command/time/exec`; recurse once into `sh|bash|zsh|dash -c "<cmd>"`; `classify(tokens)` skips global flags (`-C x`, `-c k=v`, `--git-dir=`) and maps `commit`→commit, `push`(+`-f`/`--force*`/`+ref`)→force-push else push, `reset --hard`→reset, `tag -d|--delete`→tag-delete, `branch -D` or `--delete --force`→branch-delete, else null. `lastHuman(path)`: open the file, read the last 8 MB in 256 KB chunks from the end, split lines, keep a carried partial first line, and for each line from the end: cheap filter `/"kind"\s*:\s*"human"/`, then `JSON.parse`, accept when `type === "user"`, `origin.kind === "human"`, not `isSidechain`; content string or the joined `text` blocks; strip `<system-reminder>…</system-reminder>` and `<command-*>…</command-*>` wrappers; return the first non-empty. Deny when ops non-empty and (no message → "last user message could not be read (transcript missing/lagging: <path>)") or (verbs missing → quote the first 60 chars of the message and the verbs that would authorize each missing op). Defaults:

```js
const V = {
  commit: ['commit', 'commitea', 'commitear', 'comitea'],
  push: ['push', 'pushea', 'pushear'],
  'force-push': ['force', 'forza', 'forzar', 'force push'],
  reset: ['reset', 'resetea', 'resetear'],
  'tag-delete': ['borra el tag', 'elimina el tag', 'delete tag', 'delete the tag'],
  'branch-delete': ['borra la rama', 'borra el branch', 'elimina la rama', 'delete branch', 'delete the branch'],
};
```

- [x] Step 3: `node scripts/hooks/git-authorization.self-test.js` → all pass; `node skills/sdlc/bin/check-eol.js` clean. Live check: `echo '{"tool_name":"Bash","tool_input":{"command":"git push"}}' | node scripts/hooks/git-authorization.js` prints a deny JSON containing `could not be read`.

- [x] Step 4: Commit (controller): `git add scripts/hooks/git-authorization.js scripts/hooks/git-authorization.self-test.js && git commit -m "feat: versioned git-authorization hook (Node, transcript-based, fail-closed)"`

---

### Task 4: `scripts/hooks/eol-guard.js` + self-test + `.claude/settings.json` + `.gitignore`

**Files:** create `scripts/hooks/eol-guard.js`, `scripts/hooks/eol-guard.self-test.js`, `.claude/settings.json`; modify `.gitignore` (append `.claude/handoff.md`).

- [x] Step 1: Self-test first (each case creates a temp project dir and passes `CLAUDE_PROJECT_DIR`; stdin `{"tool_name":"Write","tool_input":{"file_path":"<p>"}}`): LF file → 0; CRLF → 2 and stderr has the relative path and `sed -i`; BOM+LF → 2, stderr mentions BOM; `a.png` with CRLF bytes → 0; path built with `path.join` (backslashes on Windows) → 2; same file with forward slashes → 2; relative path → 2; missing file → 0; CRLF file outside the project dir → 0; file with a NUL byte and CRLF → 0; `SDLC_HOOKS_DISABLE=1` → 0 (Review Focus 2). Run: all FAIL.

- [x] Step 2: Write the hook (about 30 lines):

```js
#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path');
let i; try { i = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const fp = i.tool_input && i.tool_input.file_path;
if (!fp || process.env.SDLC_HOOKS_DISABLE === '1') process.exit(0);
if (/\.(png|gif|jpe?g|ico|woff2?|pdf|zip)$/i.test(fp)) process.exit(0);
const root = path.resolve(process.env.CLAUDE_PROJECT_DIR || i.cwd || process.cwd());
const abs = path.resolve(root, fp);
const rel = path.relative(root, abs);
if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) process.exit(0);
let b; try { if (!fs.statSync(abs).isFile()) process.exit(0); b = fs.readFileSync(abs); } catch { process.exit(0); }
if (b.includes(0)) process.exit(0);
const bom = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf, crlf = b.includes('\r\n');
if (bom || crlf) {
  console.error('eol-guard: ' + rel + ' has ' + [crlf && 'CRLF line endings', bom && 'a UTF-8 BOM'].filter(Boolean).join(' and ')
    + ". This repo is LF/UTF-8 without BOM. Fix: sed -i 's/\\r$//' \"" + rel + '"' + (bom ? " && sed -i '1s/^\\xEF\\xBB\\xBF//' \"" + rel + '"' : '') + ' (or rewrite the file with LF).');
  process.exit(2);
}
```

- [x] Step 3: Write `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [ { "type": "command", "command": "node", "args": ["${CLAUDE_PROJECT_DIR}/scripts/hooks/git-authorization.js"], "timeout": 10 } ] }
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit", "hooks": [ { "type": "command", "command": "node", "args": ["${CLAUDE_PROJECT_DIR}/scripts/hooks/eol-guard.js"], "timeout": 10 } ] }
    ]
  }
}
```

Then `git check-ignore -v .claude/settings.json` must print nothing (not ignored). Append `.claude/handoff.md` to `.gitignore`.

- [x] Step 4: `node scripts/hooks/eol-guard.self-test.js` → all pass; `node -e 'JSON.parse(require("fs").readFileSync(".claude/settings.json","utf8"))'` → no error; `check-eol` clean.

- [x] Step 5: Commit (controller): `git add scripts/hooks/eol-guard.js scripts/hooks/eol-guard.self-test.js .claude/settings.json .gitignore && git commit -m "feat: versioned eol-guard hook and project hook settings"`

---

### Task 5: `scripts/gates.sh`, CI, CONTRIBUTING/README/CLAUDE.md gate references, red runs

**Files:** create `scripts/gates.sh`; modify `.github/workflows/ci.yml` (test job L18-24 → one step), `CONTRIBUTING.md` (L23-38), `README.md` (L117-131), `CLAUDE.md` (gates bullet), `docs/ci-red-runs.md`.

- [x] Step 1: Write `scripts/gates.sh`:

```bash
#!/usr/bin/env bash
# Single verification target: every gate CI runs, in order, stopping at the first failure.
# Usage: bash scripts/gates.sh [--quick]   (--quick skips sync-vendored --check, which needs the network)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
quick=0; [ "${1:-}" = "--quick" ] && quick=1
gate() { local n=$1 out; shift
  if out=$("$@" 2>&1); then echo "ok $n"; else echo "FAIL $n"; printf '%s\n' "$out"; exit 1; fi; }
B=skills/sdlc/bin
for t in $B/lib/*.self-test.js $B/*.self-test.js scripts/hooks/*.self-test.js; do gate "$t" node "$t"; done
if [ "$quick" = 1 ]; then echo "skip sync-vendored (--quick)"; else gate sync-vendored node $B/sync-vendored.js --check; fi
for c in check-manifest check-sheets check-frontmatter check-skill-sections check-eol; do gate "$c" node "$B/$c.js"; done
gate settings.json node -e 'const s=JSON.parse(require("fs").readFileSync(".claude/settings.json","utf8"));for(const ev of Object.values(s.hooks))for(const g of ev)for(const h of g.hooks)for(const a of h.args)if(!require("fs").existsSync(a.replace("${CLAUDE_PROJECT_DIR}","."))) throw new Error("hook missing: "+a)'
echo "all gates ok"
```

- [x] Step 2: `ci.yml` test job steps become `node --version`, checkout, `- run: bash scripts/gates.sh`. `install-smoke` and `plugin-validate` untouched.

- [x] Step 3: CONTRIBUTING "Local Validation Before PR": replace the seven-command block with `bash scripts/gates.sh` (and `--quick` for local loops) plus one sentence listing what it runs; README "Development" block the same; CLAUDE.md gates bullet: "**Gates before any commit:** `bash scripts/gates.sh` (what it runs is listed in `CONTRIBUTING.md`)". Keep the gate list in CONTRIBUTING only.

- [x] Step 4: Verify: `bash scripts/gates.sh` from the repo root → every `ok`, `all gates ok`, exit 0; `cd /tmp && bash "<repo>/scripts/gates.sh" --quick` → same plus `skip sync-vendored (--quick)` (Review Focus 4); `git ls-files --eol scripts/gates.sh` shows `i/lf`.

- [x] Step 5: Red runs on a temp copy (`T=$(mktemp -d); tar --exclude=.git --exclude=graphify-out --exclude=node_modules -cf - . | tar -xf - -C "$T"`), each recorded with the real output line in `docs/ci-red-runs.md`: (a) `sed -i "s/permissionDecision: 'deny'/permissionDecision: 'allow'/" $T/scripts/hooks/git-authorization.js; bash $T/scripts/gates.sh --quick` → `FAIL scripts/hooks/git-authorization.self-test.js`; (b) `sed -i 's/process.exit(2)/process.exit(0)/' $T/scripts/hooks/eol-guard.js` → `FAIL scripts/hooks/eol-guard.self-test.js`; (c) `echo '{' > $T/.claude/settings.json` → `FAIL settings.json`; (d) `printf 'x\r\n' >> $T/README.md` → `FAIL check-eol`.

- [x] Step 6: Commit (controller): `git add scripts/gates.sh .github/workflows/ci.yml CONTRIBUTING.md README.md CLAUDE.md docs/ci-red-runs.md && git commit -m "ci: single gate target scripts/gates.sh; hook self-tests in CI [skip release]"`

---

### Task 6: README playbook mapping + hooks notes; CHANGELOG `[Unreleased]`

**Files:** modify `README.md` (new section "## Playbook mapping" before "## Own skills"; Install notes L25-27 gain one line on hooks), `CHANGELOG.md` (prepend `## [Unreleased]`).

- [x] Step 1: README section:

```markdown
## Playbook mapping

How the router maps to the six stages of the AI-native SDLC playbook (`#sd-c2`):

| Stage | Here | Artifact that ends it |
|---|---|---|
| Plan | `initial`, or an `intent.md` for an idea on existing code (`references/intent.md`) | committed `intent.md` |
| Design | `analysis` (spec, with `Intent:` when one exists; request card for bugs) | spec with `Status: approved` |
| Build | `planning` then `development` | `tasks/plan.md`, then the merged PR |
| Test | `testing` (`sdlc-qa-gate`) | the gate report and `Phase: deployment` |
| Deploy | `deployment` (`sdlc-release`) | tag and release |
| Maintain | entry point `references/maintain.md` | a new `intent.md` |

Every sheet carries `Governance:` (what git records) and `Measure:` (one leading, one lagging indicator). Left out on purpose, as the user's infrastructure: the automatic Maintain loop with control bands, evals in CI, AI review with `REVIEW.md`, `.claude/agents/` definitions, scheduled security scans.

This repo's own hooks (`.claude/settings.json`: git authorization from the user's last message, LF/no-BOM guard) apply to Claude Code sessions in this checkout; other hosts rely on CI. Set `SDLC_HOOKS_DISABLE=1` in your shell to turn them off.
```

- [x] Step 2: CHANGELOG `## [Unreleased]`: Added: `intent.md` template and `Intent:` header line; `maintain` entry point; Governance/Measure on sheets (enforced); `scripts/gates.sh`; versioned hooks. Changed: CI and docs call `gates.sh`; README playbook mapping. The closing commit will carry `[minor]` (v0.3.0).

- [x] Step 3: `bash scripts/gates.sh --quick` ok. Commit (controller): `git add README.md CHANGELOG.md && git commit -m "docs: playbook mapping, hooks notes, unreleased entry [skip release]"`

---

### Task 7: Dogfood intent chain, reference scenarios, close the cycle, PR, release

**Files:** create `docs/intents/2026-09-30-playbook-alignment.md`; modify `docs/specs/2026-09-30-v1-2-playbook-alignment.md` (header `Intent:` line, "Design decisions" hooks paragraph → Node), `docs/ci-red-runs.md` (`## v1.2 dogfood`), `tasks/todo.md`.

- [x] Step 1: Write the intent in the owner's words from this session ("Conviene?" → the five deliverables), commit it alone first (owner's words), then add `Intent: docs/intents/2026-09-30-playbook-alignment.md` as the third header line of the spec and amend the hooks paragraph to Node. Run `where.js`: before the spec edit, the agent-side check finds the intent without a spec naming it (record the `git ls-files docs/intents` + grep output); after, it does not. Paste both into `## v1.2 dogfood`.
- [x] Step 2: Reference scenarios, pasted commands and real outputs: (1) fresh temp home install (`npx -y skills add <repo> -y -g --copy`), a scratch repo with `src/` and no spec, request "quiero agregar exportación a CSV" → `where.js` infers analysis; the agent follows `intent.md` and writes the intent (record the file); (2) request "la API devuelve 500 desde ayer en producción" with `inProduction` → `maintain.md` → intent with the four lines → analysis; (3) fresh clone in a temp dir opened with Claude Code semantics: `echo '{"tool_name":"Bash","tool_input":{"command":"git push"},"transcript_path":"<temp transcript whose last human line is dale>"}' | node scripts/hooks/git-authorization.js` → deny JSON; `bash scripts/gates.sh` → exit 0.
- [x] Step 3: Close development → testing (owner confirms); run `sdlc-qa-gate` on the branch diff against `main` (unit layer = `bash scripts/gates.sh`), paste the table; close testing → deployment on accepted risk; tick `tasks/todo.md`.
- [ ] Step 4: Commit (controller, owner's words): `git add docs/intents docs/specs/2026-09-30-v1-2-playbook-alignment.md docs/ci-red-runs.md tasks/todo.md tasks/plan.md && git commit -m "spec: v1.2 testing closed; dogfood intent chain and scenarios [minor]"`; `git push -u origin v1.2-playbook-alignment`; `gh pr create --base main --title "v1.2: playbook alignment (intent.md, governance/measure, maintain, gates.sh, hooks)" --body-file <Unreleased section>`; CI green on both OS; merge with a merge commit (owner's words); `git fetch --tags && git describe --tags origin/main` → `v0.3.0`; close the cycle (`Status: closed`, commit `[skip release]`, push on words); `cd ~ && npx skills add PapiScholz/SDLC-Assist -y`.

## Verification (end to end)

- `bash scripts/gates.sh` exits 0 on the repo (self-tests incl. two hook suites, six gates, settings check); `--quick` prints the skip line.
- `node skills/sdlc/bin/check-sheets.js` → `6 sheets OK`; the red run in `docs/ci-red-runs.md` shows the new body-line error.
- In a Claude Code session on this checkout, a `git push` without the verb in the last message is denied by the project hook alone (test with the global guard disabled once, `SDLC_HOOKS_DISABLE` unset), and a Write producing CRLF is reported.
- CI `test` job runs the single `bash scripts/gates.sh` step green on Ubuntu and Windows; `install-smoke` unchanged and green.
- `where.js` still infers the same phases on the v1 fixtures (`where.self-test.js` untouched and passing); the spec with the `Intent:` line parses (`Phase`/`Status` within the 15-line window).
- README maps the six stages; CHANGELOG `[Unreleased]` consumed into `v0.3.0` after the merge.

# v1.7 — four plain steps, staged plans, and a router that runs on its own: implementation plan

> **For agentic workers:** use superpowers:executing-plans or superpowers:subagent-driven-development, as the owner chooses when approving this plan. Steps use checkboxes (`- [ ]`). Read `spec.md` beside this file first. Commits and pushes need the owner's explicit verb in the current turn (`CLAUDE.md`, git-authorization hook); never add co-authorship trailers.

**Goal:** `where.js` understands staged plans and maps every inference to four plain steps; `--brief` prints one line; a Claude Code hook injects that line on each prompt inside a repo with an active cycle and stays silent everywhere else; `SKILL.md` stops asking the developer to confirm the phase.

**Architecture:** Two new pure modules in `bin/lib/`: `stages.js` (parse stages from `plan.md`, read the stage a `tasks.md` names) and `steps.js` (phase to step), plus `brief.js` (one-line status). `signals.js` adds a `stages` signal for the active cycle; `infer.js` adds a staged view that overrides the fallback only in staged mode; `where.js` gains `--brief`. The hook is a Node script in `plugins/sdlc-assist/hooks/` that requires those modules in process and exits 0 on every path.

**Tech Stack:** Node 20+, zero dependencies, `*.self-test.js` files run by `scripts/gates.sh`; GitHub Actions install-smoke.

**Spec:** [`spec.md`](spec.md)

## Global Constraints

- Node with zero dependencies; every new script under `bin/` ships a `*.self-test.js` (constitution, Testing).
- Files are LF, UTF-8 without BOM; `bash scripts/gates.sh` before any commit.
- No emoji in any file or output. The legacy check marker is referenced only as `String.fromCodePoint(0x2705)`.
- Every JSON field `where.js` printed in v0.11.1 stays; `step` and `stage` are added.
- The hook never exits non-zero and sets `"timeout": 5`.
- Version: `[minor]` in a branch commit, so the release after merge is v0.12.0. One PR.
- Docs and code comments in English; the skill replies to the developer in their language.

## Review Focus

- A single-pass plan that uses `### Phase 1:` headings (the vendored planning template) must infer exactly as v0.11.1 and add no warning. Test owned by Task 3.
- A stage table whose name cell carries bold, a date and the marker (`**Diseño** [x] 2026-10-12`) must yield a clean name and `closed: true`. Test owned by Task 1.
- CRLF `plan.md` and stage tables inside a ``` fence (a plan quoting an example) must parse the same as LF and ignore the fenced sample. Test owned by Task 1.
- The hook run from a subdirectory of the repo (Claude Code's cwd is often not the root) must still print the line. Test owned by Task 5.
- The hook given a cwd that does not exist, or stdin that is not JSON, must print nothing and exit 0. Test owned by Task 5.

---

### Task 1: `lib/stages.js` — parse stages and the stage `tasks.md` names

**Files:**
- Create: `plugins/sdlc-assist/skills/sdlc/bin/lib/stages.js`
- Test: `plugins/sdlc-assist/skills/sdlc/bin/lib/stages.self-test.js`

**Interfaces:**
- Consumes: `unfencedLines(markdown)` from `lib/unfenced.js` (returns the lines outside ``` fences).
- Produces: `parseStages(markdown) -> Array<{ number: number, name: string, closed: boolean }>`, `stageOfTasks(markdown) -> number | null`, `isClosed(text) -> boolean`.

- [ ] **Step 1: Write the failing self-test**

```js
#!/usr/bin/env node
const assert = require('assert');
const { parseStages, stageOfTasks, isClosed } = require('./stages');
let passed = 0, failed = 0;
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
const CHECK = String.fromCodePoint(0x2705);
const TABLE = '# Plan\n\n## Etapas\n\n| # | Etapa | Entregable |\n|---|---|---|\n' +
  '| 0 | **Prueba de R2** ' + CHECK + ' 2026-10-11 | x |\n| 1 | **Diseño** [x] 2026-10-12 | y |\n| 2 | **Ingreso y roles** | z |\n\n## Salida\n\n| 9 | not a stage | w |\n';
console.log('parseStages');
check('table under a Stages/Etapas heading: number, clean name, closed by [x] or legacy marker', () => {
  assert.deepStrictEqual(parseStages(TABLE), [
    { number: 0, name: 'Prueba de R2', closed: true },
    { number: 1, name: 'Diseño', closed: true },
    { number: 2, name: 'Ingreso y roles', closed: false },
  ]);
});
check('one heading per stage; task checkboxes under a heading never close it', () => {
  const md = '# Plan\n\n### Fase 0: Línea base [x]\n- [ ] t\n\n### Fase 1: Código\n- [x] a\n- [x] b\n\n## Stage 2 — Release\n';
  assert.deepStrictEqual(parseStages(md), [
    { number: 0, name: 'Línea base', closed: true },
    { number: 1, name: 'Código', closed: false },
    { number: 2, name: 'Release', closed: false },
  ]);
});
check('CRLF parses like LF; a fenced sample table is ignored', () => {
  assert.deepStrictEqual(parseStages(TABLE.replace(/\n/g, '\r\n')), parseStages(TABLE));
  const fenced = '# Plan\n\n```markdown\n## Stages\n| 1 | **A** [x] | x |\n```\n';
  assert.deepStrictEqual(parseStages(fenced), []);
});
check('no stages, empty and non-string input', () => {
  assert.deepStrictEqual(parseStages('# Plan\n\n## Steps\n- [ ] a\n'), []);
  assert.deepStrictEqual(parseStages(''), []);
  assert.deepStrictEqual(parseStages(null), []);
});
console.log('stageOfTasks / isClosed');
check('H1 that names a stage, in four languages of the keyword', () => {
  assert.strictEqual(stageOfTasks('# Etapa 3 — Ingreso y roles\n\n- [x] a\n'), 3);
  assert.strictEqual(stageOfTasks('# Tasks for Stage 12: billing\n'), 12);
  assert.strictEqual(stageOfTasks('# Fase 2\n'), 2);
  assert.strictEqual(stageOfTasks('# Phase 4 tasks\n'), 4);
});
check('H1 without a stage, a stage only in a later heading, no H1 => null', () => {
  assert.strictEqual(stageOfTasks('# Tasks: bug hunt\n\n## Stage 2\n'), null);
  assert.strictEqual(stageOfTasks('- [ ] a\n'), null);
  assert.strictEqual(stageOfTasks(undefined), null);
});
check('isClosed: [x] in either case, legacy marker; [ ] is open', () => {
  assert.strictEqual(isClosed('**A** [X]'), true);
  assert.strictEqual(isClosed('A ' + CHECK), true);
  assert.strictEqual(isClosed('A [ ]'), false);
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it and see it fail**

Run: `node plugins/sdlc-assist/skills/sdlc/bin/lib/stages.self-test.js`
Expected: exits 1 with `Cannot find module './stages'`.

- [ ] **Step 3: Implement**

```js
// Stages of a staged plan. A stage is closed only by a marker on its own row or heading: `[x]`, or the legacy
// check emoji (read, never written). Task checkboxes under a stage never close it. Two formats: a table under a
// heading named Stages/Etapas/Phases/Fases (one row per stage), or one heading per stage (`### Fase 1: ...`).
const { unfencedLines } = require('./unfenced');
const CHECK = String.fromCodePoint(0x2705);
const WORD = '(?:stage|etapa|phase|fase)';
const SEP = '[\\s:.\\-–—]';
const TABLE_TITLE = new RegExp('^#{2,4}\\s+' + WORD + 's?\\s*$', 'i');
const STAGE_HEADING = new RegExp('^#{1,4}\\s+' + WORD + '\\s+(\\d+)\\b' + SEP + '*(.*)$', 'i');
const ROW = /^\|\s*(\d+)\s*\|([^|]*)\|/;
const TASKS_H1 = new RegExp('^#\\s+.*?\\b' + WORD + '\\s+(\\d+)\\b', 'i');
const DATE = /\b\d{4}-\d{2}-\d{2}\b/g;
const EDGE = new RegExp('^' + SEP + '+|' + SEP + '+$', 'g');
function isClosed(text) { return /\[x\]/i.test(text) || String(text).includes(CHECK); }
function clean(text) {
  return text.replace(/\*\*/g, '').replace(/\[x\]/gi, '').split(CHECK).join('').replace(DATE, '').replace(EDGE, '').trim();
}
function lines(markdown) { return unfencedLines(typeof markdown === 'string' ? markdown.replace(/\r\n/g, '\n') : ''); }
function parseStages(markdown) {
  const ls = lines(markdown);
  const t = ls.findIndex(l => TABLE_TITLE.test(l));
  if (t !== -1) {
    const out = [];
    for (const l of ls.slice(t + 1)) {
      if (/^#/.test(l)) break;
      const m = ROW.exec(l);
      if (m) out.push({ number: Number(m[1]), name: clean(m[2]), closed: isClosed(m[2]) });
    }
    if (out.length) return out;
  }
  return ls.map(l => STAGE_HEADING.exec(l)).filter(Boolean)
    .map(m => ({ number: Number(m[1]), name: clean(m[2]), closed: isClosed(m[2]) }));
}
function stageOfTasks(markdown) {
  const h1 = lines(markdown).find(l => /^#\s/.test(l));
  const m = h1 && TASKS_H1.exec(h1);
  return m ? Number(m[1]) : null;
}
module.exports = { parseStages, stageOfTasks, isClosed };
```

- [ ] **Step 4: Run it and see it pass**

Run: `node plugins/sdlc-assist/skills/sdlc/bin/lib/stages.self-test.js`
Expected: `7 passed, 0 failed`. If `unfencedLines` already normalises CRLF, the `replace` in `lines()` is harmless; keep it.

### Task 2: `stages` signal for the active cycle

**Files:**
- Modify: `plugins/sdlc-assist/skills/sdlc/bin/lib/signals.js` (`collectSignals`, the `return` object)
- Test: `plugins/sdlc-assist/skills/sdlc/bin/lib/signals.self-test.js` (new checks before the final summary)

**Interfaces:**
- Consumes: `parseStages`, `stageOfTasks` (Task 1).
- Produces: `signals.stages = { list: Array<{number,name,closed}>, tasksStage: number | null }`, always present (empty list when no plan).

- [ ] **Step 1: Write the failing checks** (append before the `console.log(\`\n${passed} passed` line)

```js
console.log('stages signal');
check('folder cycle: stages from its plan.md, tasksStage from its tasks.md H1', () => {
  const root = tmpDir(); const d = 'docs/specs/2026-10-08-lms';
  write(root, d + '/spec.md', '# Spec\nPhase: development\nStatus: approved\n');
  write(root, d + '/plan.md', '# Plan\n\n## Etapas\n\n| # | Etapa |\n|---|---|\n| 3 | **Ingreso** [x] 2026-10-12 |\n| 4 | **Catálogo** |\n');
  write(root, d + '/tasks.md', '# Etapa 3 — Ingreso\n\n- [x] a\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.stages, { list: [{ number: 3, name: 'Ingreso', closed: true }, { number: 4, name: 'Catálogo', closed: false }], tasksStage: 3 });
});
check('no plan: empty stages, tasksStage null', () => {
  assert.deepStrictEqual(collectSignals(tmpDir(), { runTests: false }).stages, { list: [], tasksStage: null });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `node plugins/sdlc-assist/skills/sdlc/bin/lib/signals.self-test.js`
Expected: the two new checks FAIL (`s.stages` is undefined); every older check still ok.

- [ ] **Step 3: Implement**

In the `require` line at the top add `const { parseStages, stageOfTasks } = require('./stages');`. After `const todo = active ? active.todo : todoInfo(GLOBAL.todo);` add:

```js
  // Stages of the active cycle's plan, and the stage its tasks.md names in its H1 (lib/stages.js).
  const planText = plan.exists ? readText(path.join(abs, plan.path)) : null;
  const todoText = todo.exists ? readText(path.join(abs, todo.path)) : null;
  const stages = { list: parseStages(planText), tasksStage: stageOfTasks(todoText) };
```

and add `stages,` to the returned object right after `todo,`.

- [ ] **Step 4: Run it and see it pass**

Run: `node plugins/sdlc-assist/skills/sdlc/bin/lib/signals.self-test.js`
Expected: `0 failed`.

### Task 3: staged inference and the four steps in `infer.js`

**Files:**
- Create: `plugins/sdlc-assist/skills/sdlc/bin/lib/steps.js`
- Modify: `plugins/sdlc-assist/skills/sdlc/bin/lib/infer.js` (`infer`, exports)
- Test: `plugins/sdlc-assist/skills/sdlc/bin/lib/infer.self-test.js` (new section before the summary)

**Interfaces:**
- Consumes: `signals.stages` (Task 2); a signals object without `stages` (older tests' `sig()`) means no stages.
- Produces: `stepOf(phase) -> { number: 1|2|3|4, name: 'situation'|'spec'|'plan'|'implement', detail: null|'build'|'test'|'ship' }`; `infer()` returns two more fields, `step` (from `stepOf(inferred)`) and `stage` (`{ number, name, closed: <count of closed>, total } | null`).

- [ ] **Step 1: Write the failing checks** (append before the summary)

```js
const { stepOf } = require('./steps');
console.log('steps and staged plans');
const fspec = (phase = 'development') => spec('docs/specs/x/spec.md', phase, 'approved', { layout: 'folder' });
const stages = (closed, tasksStage) => ({ list: [0, 1, 2, 3].map(n => ({ number: n, name: 'S' + n, closed: closed.includes(n) })), tasksStage });
const staged = (todoArgs, st, phase) => sig({ specs: [fspec(phase)], plan: plan({ path: 'docs/specs/x/plan.md' }), todo: todo(...todoArgs, 'docs/specs/x/tasks.md'), sourceFiles: src, stages: st });
check('stepOf maps six phases to four steps', () => {
  assert.deepStrictEqual(['initial', 'analysis', 'planning', 'development', 'testing', 'deployment'].map(p => { const s = stepOf(p); return [s.number, s.name, s.detail]; }),
    [[1, 'situation', null], [2, 'spec', null], [3, 'plan', null], [4, 'implement', 'build'], [4, 'implement', 'test'], [4, 'implement', 'ship']]);
});
check('tasks of a closed stage all done, a later stage open: plan the first open stage, no header warning', () => {
  const r = infer(staged([0, 50], stages([0, 1], 1)), req('unknown'));
  assert.strictEqual(r.inferred, 'planning'); assert.deepStrictEqual(r.stage, { number: 2, name: 'S2', closed: 2, total: 4 });
  assert.strictEqual(r.step.number, 3); assert.deepStrictEqual(r.warnings, []);
});
check('open tasks: build the stage the tasks name', () => {
  const r = infer(staged([3, 5], stages([0], 1)), req('unknown'));
  assert.strictEqual(r.inferred, 'development'); assert.strictEqual(r.stage.number, 1); assert.strictEqual(r.step.detail, 'build');
});
check('all done, their stage not closed: test that stage', () => {
  const r = infer(staged([0, 8], stages([0], 1)), req('unknown'));
  assert.strictEqual(r.inferred, 'testing'); assert.strictEqual(r.stage.number, 1); assert.deepStrictEqual(r.warnings, []);
});
check('all done, a stage closed, tasks.md names no stage: test the first open stage with a warning', () => {
  const r = infer(staged([0, 8], stages([0], null)), req('unknown'));
  assert.strictEqual(r.inferred, 'testing'); assert.strictEqual(r.stage.number, 1);
  assert.ok(r.warnings.some(w => /tasks\.md names no stage/.test(w)));
});
check('no tasks file content yet in staged mode: plan the first open stage', () => {
  const r = infer(staged([0, 0], stages([0, 1], null)), req('unknown'));
  assert.strictEqual(r.inferred, 'planning'); assert.strictEqual(r.stage.number, 2);
});
check('single-pass plan with Phase headings (none closed, tasks name none): same as v0.11.1, no new warning', () => {
  const withStages = infer(staged([0, 8], stages([], null)), req('unknown'));
  const without = infer(staged([0, 8], undefined), req('unknown'));
  assert.strictEqual(withStages.inferred, without.inferred); assert.deepStrictEqual(withStages.warnings, without.warnings);
  assert.strictEqual(withStages.stage, null);
});
check('every stage closed: existing rules (deployment header ties with testing)', () => {
  const r = infer(staged([0, 8], stages([0, 1, 2, 3], 3), 'deployment'), req('unknown'));
  assert.strictEqual(r.inferred, 'deployment'); assert.strictEqual(r.stage, null);
});
```

- [ ] **Step 2: Run and see them fail**

Run: `node plugins/sdlc-assist/skills/sdlc/bin/lib/infer.self-test.js`
Expected: `Cannot find module './steps'` (exit 1).

- [ ] **Step 3: Implement `steps.js`**

```js
// The developer-facing view of the six phases: four steps (situation, spec, plan, implement).
const STEPS = {
  initial: [1, 'situation', null], analysis: [2, 'spec', null], planning: [3, 'plan', null],
  development: [4, 'implement', 'build'], testing: [4, 'implement', 'test'], deployment: [4, 'implement', 'ship'],
};
function stepOf(phase) { const s = STEPS[phase] || STEPS.analysis; return { number: s[0], name: s[1], detail: s[2] }; }
module.exports = { stepOf, STEPS };
```

- [ ] **Step 4: Implement the staged view in `infer.js`**

Add `const { stepOf } = require('./steps');` at the top. Add this function above `infer`:

```js
// Staged mode: 2+ stages and an explicit signal (a closed stage, or tasks.md naming its stage). Without that signal a
// plan with `### Phase 1:` headings is a single-pass plan and keeps v0.11.1 behavior. Returns null outside staged mode.
function stagedView(stages, eligible, todo) {
  const list = (stages && stages.list) || [];
  const tasksStage = stages ? stages.tasksStage : null;
  if (!eligible || list.length < 2 || (!list.some(s => s.closed) && tasksStage == null)) return null;
  const firstOpen = list.find(s => !s.closed) || null;
  const own = tasksStage == null ? null : list.find(s => s.number === tasksStage) || null;
  const view = { total: list.length, closed: list.filter(s => s.closed).length, current: null, phase: null, warning: null };
  if (!firstOpen) return view;
  if (todo.open > 0) return { ...view, current: own || firstOpen, phase: 'development' };
  if (todo.total === 0 || (own && own.closed)) return { ...view, current: firstOpen, phase: 'planning' };
  return { ...view, current: own || firstOpen, phase: 'testing',
    warning: own ? null : `tasks.md names no stage: its finished tasks are counted toward stage ${firstOpen.number}` };
}
```

In `infer`, replace `const fallback = candidates[0] || 'analysis';` with:

```js
  const st = stagedView(signals.stages, approved && planCurrent, todo);
  const fallback = (st && st.phase) || candidates[0] || 'analysis';
  if (st && st.current) evidence.push(`stage ${st.current.number} "${st.current.name}" (${st.closed}/${st.total} closed)`);
  if (st && st.warning) warnings.push(st.warning);
```

Replace the header block (from `let inferred = fallback;` to the closing `}` of `if (active && active.phase)`) with:

```js
  const stageWins = !!(st && st.phase && ['development', 'testing', 'deployment'].includes(headerPhase));
  let inferred = fallback;
  if (active && active.phase) {
    inferred = stageWins ? fallback : active.phase;
    evidence.unshift(`header Phase: ${active.phase}, Status: ${active.status} (${active.path})`);
    if (active.phase !== fallback && !deployTie && !stageWins) { warnings.push(`header says ${active.phase} but artifacts say ${fallback}`); alternatives.push({ phase: fallback, kind: 'fallback', reason: 'header disagrees with fallback' }); }
    if (['development', 'testing', 'deployment'].includes(active.phase) && !approved) warnings.push(`header ${active.phase} without an approved spec`);
    if (active.phase === 'deployment' && signals.git.tagOnHead) evidence.push(EVIDENCE.CLOSE_CYCLE);
  }
```

`headerPhase` is already declared above as `active && active.phase`; move the `deployTie` line after the new `fallback` line if needed so it reads the new value. In the `return` add:

```js
    step: stepOf(inferred),
    stage: st && st.current ? { number: st.current.number, name: st.current.name, closed: st.closed, total: st.total } : null,
```

and export `stagedView` with the others.

- [ ] **Step 5: Run and see them pass**

Run: `node plugins/sdlc-assist/skills/sdlc/bin/lib/infer.self-test.js`
Expected: `0 failed`, including every pre-existing check (the staged code is inert when `signals.stages` is missing).

### Task 4: `--brief` one-line status

**Files:**
- Create: `plugins/sdlc-assist/skills/sdlc/bin/lib/brief.js`, `plugins/sdlc-assist/skills/sdlc/bin/lib/brief.self-test.js`
- Modify: `plugins/sdlc-assist/skills/sdlc/bin/where.js` (`parseArgs`, `main`, header comment)
- Test: `plugins/sdlc-assist/skills/sdlc/bin/where.self-test.js` (two new checks)

**Interfaces:**
- Consumes: `infer()` result with `step`, `stage`, `inferred`, `active`, `warnings`, `alternatives` (Task 3).
- Produces: `briefLine(result) -> string` starting with `sdlc: `; `where.js` output JSON gains `step` and `stage`; `where.js --brief` prints only `briefLine(...) + '\n'`.

- [ ] **Step 1: Write the failing self-test `brief.self-test.js`**

```js
#!/usr/bin/env node
const assert = require('assert');
const { briefLine } = require('./brief');
let passed = 0, failed = 0;
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
const base = { inferred: 'planning', active: { path: 'docs/specs/x/spec.md' }, warnings: [], alternatives: [],
  step: { number: 3, name: 'plan', detail: null }, stage: { number: 4, name: 'Catálogo y contenido', closed: 4, total: 9 } };
console.log('briefLine');
check('staged planning names the stage and the next action, one line', () => {
  const l = briefLine(base);
  assert.strictEqual(l, 'sdlc: stage 4 "Catálogo y contenido" (4/9 closed) · step 3/4 plan · next: write the plan for this stage');
  assert.ok(!l.includes('\n'));
});
check('single-pass testing has no stage part and a detail', () => {
  assert.strictEqual(briefLine({ ...base, inferred: 'testing', stage: null, step: { number: 4, name: 'implement', detail: 'test' } }),
    'sdlc: step 4/4 implement (test) · next: test the change');
});
check('analysis names the spec to finish; the first warning is appended', () => {
  assert.strictEqual(briefLine({ ...base, inferred: 'analysis', stage: null, step: { number: 2, name: 'spec', detail: null }, warnings: ['w1', 'w2'] }),
    'sdlc: step 2/4 spec · next: finish docs/specs/x/spec.md and get it approved · note: w1');
});
check('a new-cycle alternative adds the new-topic note', () => {
  assert.ok(/new topic/.test(briefLine({ ...base, alternatives: [{ phase: 'analysis', kind: 'new-cycle', reason: 'r' }] })));
});
check('no emoji in any line', () => {
  for (const p of ['initial', 'analysis', 'planning', 'development', 'testing', 'deployment'])
    assert.ok(!/\p{Extended_Pictographic}/u.test(briefLine({ ...base, inferred: p })));
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it and see it fail**

Run: `node plugins/sdlc-assist/skills/sdlc/bin/lib/brief.self-test.js`
Expected: `Cannot find module './brief'`.

- [ ] **Step 3: Implement `brief.js`**

```js
// One line for the agent: where the work is (stage, step) and what comes next. The agent says it to the developer
// in their own language; this line is never shown verbatim as a question.
function nextAction(r) {
  const staged = !!r.stage;
  switch (r.inferred) {
    case 'initial': return 'write the first spec from the situation';
    case 'analysis': return r.active ? `finish ${r.active.path} and get it approved` : 'write the spec for this request';
    case 'planning': return staged ? 'write the plan for this stage' : 'write the plan';
    case 'development': return 'implement the open tasks';
    case 'testing': return staged ? 'test this stage, then mark it [x] in plan.md' : 'test the change';
    default: return 'ship and close the cycle';
  }
}
function briefLine(r) {
  const parts = [];
  if (r.stage) parts.push(`stage ${r.stage.number} "${r.stage.name}" (${r.stage.closed}/${r.stage.total} closed)`);
  parts.push(`step ${r.step.number}/4 ${r.step.name}${r.step.detail ? ' (' + r.step.detail + ')' : ''}`);
  parts.push('next: ' + nextAction(r));
  if ((r.alternatives || []).some(a => a.kind === 'new-cycle')) parts.push('this request may be a new topic: ask whether to keep it apart');
  if ((r.warnings || []).length) parts.push('note: ' + r.warnings[0]);
  return 'sdlc: ' + parts.join(' · ');
}
module.exports = { briefLine, nextAction };
```

- [ ] **Step 4: Wire `--brief` into `where.js`**

Header comment: add `[--brief]` to the usage line and `--brief prints one status line instead of JSON.` In `parseArgs` initialise `brief: false` and add `if (a === '--brief') { args.brief = true; continue; }`. In `main`, add `step: r.step, stage: r.stage` to `out` (after `inferred`), then:

```js
  if (args.brief) { process.stdout.write(require('./lib/brief').briefLine(out) + '\n'); return 0; }
```

before the JSON write.

- [ ] **Step 5: Add the `where.js` checks** (in `where.self-test.js`, before the summary; `runWhere(root, message, extra)` already exists)

```js
check('--brief prints one sdlc: line and no JSON', () => {
  const r = spawnSync(process.execPath, [WHERE, '--root', tmpDir(), '--message', 'x', '--brief'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0); assert.match(r.stdout, /^sdlc: step \d\/4 /); assert.strictEqual(r.stdout.trim().split('\n').length, 1);
});
check('JSON keeps v0.11.1 fields and adds step and stage', () => {
  const j = runWhere(tmpDir(), 'x');
  for (const k of ['signals', 'cycles', 'active', 'inferred', 'evidence', 'alternatives', 'warnings', 'request', 'step', 'stage']) assert.ok(k in j, k);
});
```

`runWhere` asserts exit 0 and an untouched fixture, and returns the parsed JSON.

- [ ] **Step 6: Run both self-tests**

Run: `node plugins/sdlc-assist/skills/sdlc/bin/lib/brief.self-test.js && node plugins/sdlc-assist/skills/sdlc/bin/where.self-test.js`
Expected: `0 failed` in both.

### Task 5: the Claude Code hook

**Files:**
- Create: `plugins/sdlc-assist/hooks/hooks.json`, `plugins/sdlc-assist/hooks/sdlc-status.js`, `plugins/sdlc-assist/hooks/sdlc-status.self-test.js`
- Modify: `scripts/gates.sh` (self-test loop), `CONTRIBUTING.md` (gate list line)

**Interfaces:**
- Consumes: `collectSignals`, `infer`, `briefLine`, `classifyRequest` from `skills/sdlc/bin/lib/`.
- Produces: stdout line `sdlc: ... (applies only when the request is about this repository's work)` or nothing; exit 0 always.

- [ ] **Step 1: Write the failing self-test**

```js
#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const HOOK = path.join(__dirname, 'sdlc-status.js');
let passed = 0, failed = 0; const tmps = [];
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
function tmpDir() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-hook-')); tmps.push(d); return d; }
function write(root, rel, text) { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
function git(root, args) { execFileSync('git', args, { cwd: root, stdio: 'ignore' }); }
process.on('exit', () => { for (const d of tmps) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5 }); } catch {} });
function run(stdin) { return spawnSync(process.execPath, [HOOK], { input: stdin, encoding: 'utf8' }); }
function stagedRepo() {
  const root = tmpDir(); const d = 'docs/specs/2026-10-08-lms';
  write(root, d + '/spec.md', '# Spec\n\nPhase: development\nStatus: approved\n');
  write(root, d + '/plan.md', '# Plan\n\n## Etapas\n\n| # | Etapa |\n|---|---|\n| 3 | **Ingreso** [x] 2026-10-12 |\n| 4 | **Catálogo** |\n');
  write(root, d + '/tasks.md', '# Etapa 3 — Ingreso\n\n- [x] a\n');
  write(root, 'src/a.js', 'x\n');
  git(root, ['init', '-q']); git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A']);
  git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init']);
  return root;
}
console.log('sdlc-status hook');
check('staged repo: one line naming stage 4 and step 3', () => {
  const r = run(JSON.stringify({ cwd: stagedRepo(), prompt: 'seguimos' }));
  assert.strictEqual(r.status, 0); assert.match(r.stdout, /^sdlc: stage 4 "Catálogo" .*step 3\/4 plan/);
});
check('from a subdirectory of the repo: same line', () => {
  const root = stagedRepo();
  const r = run(JSON.stringify({ cwd: path.join(root, 'src'), prompt: 'x' }));
  assert.match(r.stdout, /^sdlc: stage 4 /);
});
check('not a git repo, or a repo without an active cycle: silent, exit 0', () => {
  assert.deepStrictEqual([run(JSON.stringify({ cwd: tmpDir() })).stdout, run(JSON.stringify({ cwd: tmpDir() })).status], ['', 0]);
  const root = tmpDir(); write(root, 'a.js', 'x\n'); git(root, ['init', '-q']);
  assert.strictEqual(run(JSON.stringify({ cwd: root })).stdout, '');
});
check('cwd that does not exist, or stdin that is not JSON: silent, exit 0', () => {
  const a = run(JSON.stringify({ cwd: path.join(tmpDir(), 'missing') }));
  const b = run('not json');
  assert.deepStrictEqual([a.stdout, a.status, b.status], ['', 0, 0]);
});
check('a complaint while a stage is in flight adds the new-topic note', () => {
  const r = run(JSON.stringify({ cwd: stagedRepo(), prompt: 'un cliente se queja de que el botón no anda' }));
  assert.match(r.stdout, /new topic/);
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
```

Note on the third check: with stdin `not json` the hook falls back to `process.cwd()`, which in the gates is the repo itself; assert only the exit code there, as written.

- [ ] **Step 2: Run it and see it fail**

Run: `node plugins/sdlc-assist/hooks/sdlc-status.self-test.js`
Expected: every check FAIL (the hook file does not exist; `spawnSync` reports status 1 with `Cannot find module`).

- [ ] **Step 3: Implement `sdlc-status.js`**

```js
#!/usr/bin/env node
// Claude Code UserPromptSubmit hook: prints the router's one-line status for the agent, or nothing.
// Silent outside a git repository or without an active cycle. Exits 0 on every path: exit 2 would block the prompt.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const LIB = path.join(__dirname, '..', 'skills', 'sdlc', 'bin', 'lib');
function input() { try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; } }
function toplevel(cwd) {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).trim() || null; }
  catch { return null; }
}
function status(cwd, prompt) {
  const root = toplevel(cwd);
  if (!root) return '';
  const { collectSignals } = require(path.join(LIB, 'signals'));
  const { infer } = require(path.join(LIB, 'infer'));
  const { briefLine } = require(path.join(LIB, 'brief'));
  const { classifyRequest } = require(path.join(LIB, 'keywords'));
  const s = collectSignals(root, { runTests: false });
  const r = infer(s, { message: prompt || '', type: classifyRequest(prompt || '') });
  if (!r.active) return '';
  return briefLine({ ...r, warnings: [...r.warnings, ...s.notes] }) + " (applies only when the request is about this repository's work)";
}
try {
  const j = input();
  const line = status(typeof j.cwd === 'string' ? j.cwd : process.cwd(), typeof j.prompt === 'string' ? j.prompt : '');
  if (line) process.stdout.write(line + '\n');
} catch { /* never surface an error into the prompt */ }
process.exitCode = 0;
```

- [ ] **Step 4: Implement `hooks.json`**

```json
{
  "description": "sdlc-assist: adds a one-line work status (stage, step, next action) to the agent's context inside a repository with an active cycle; silent everywhere else.",
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/sdlc-status.js\"", "timeout": 5 } ] }
    ]
  }
}
```

- [ ] **Step 5: Run the hook self-test and see it pass**

Run: `node plugins/sdlc-assist/hooks/sdlc-status.self-test.js`
Expected: `5 passed, 0 failed`.

- [ ] **Step 6: Gates run the hook self-test**

In `scripts/gates.sh` change the self-test loop to:

```bash
for t in $B/lib/*.self-test.js $B/*.self-test.js scripts/hooks/*.self-test.js plugins/sdlc-assist/hooks/*.self-test.js; do gate "$t" node "$t"; done
```

and add `plugins/sdlc-assist/hooks/*.self-test.js` to the self-test line of the gate list in `CONTRIBUTING.md`. Run `bash scripts/gates.sh --quick`; expected last line `all gates ok`.

### Task 6: `SKILL.md`, phase sheets and manifests speak the four steps

**Files:**
- Modify: `plugins/sdlc-assist/skills/sdlc/SKILL.md` (frontmatter `description`, Overview, Protocol, Question template, Close mode, Never)
- Modify: `plugins/sdlc-assist/skills/sdlc/references/phases/{initial,analysis,planning,development,testing,deployment}.md` (one `**Step:**` line each)
- Modify: `plugins/sdlc-assist/skills/sdlc/references/entry-points.md` (a "Staged plans" section)
- Modify: `plugins/sdlc-assist/.claude-plugin/plugin.json` (`description`)

**Interfaces:**
- Consumes: `where.js --brief` and the JSON fields `step`, `stage` (Tasks 3-4); the hook line (Task 5).
- Produces: the agent-facing protocol; gates `check-frontmatter`, `check-skill-sections`, `check-sheets` stay green.

- [ ] **Step 1: Frontmatter description** (replace the whole `description:` value)

```
description: Tells the agent where work on a code repository stands, in four steps (situation, spec, plan, implement) and per stage of a staged plan, and what comes next; routes to spec-driven-development and its family. Use when working on a repository that has specs under docs/specs, when asked "where are we", or "sdlc close". Not for research, browsing, or non-code tasks.
```

- [ ] **Step 2: Overview** — replace its second paragraph with:

```
The developer's workflow has four steps: (1) state the situation, (2) the agent writes the spec and the developer approves it, (3) the agent writes the plan and the developer approves it, (4) implement, test and ship. A large plan splits into stages; each stage repeats steps 3 and 4. The six internal phases map onto those steps (`initial` 1, `analysis` 2, `planning` 3, `development`/`testing`/`deployment` 4). The skill informs the agent; the agent tells the developer in one plain sentence, in their language, and proceeds. In Claude Code the plugin's hook runs this on every prompt inside a repository with an active cycle; elsewhere invoke it by name.
```

- [ ] **Step 3: Protocol** — replace steps 3 to 5 and the Question template section with:

```
3. **Say where the work is, in one sentence, and proceed.** Use `step` and `stage` (or the hook's `sdlc:` line): "Stage 4 of 9, Catálogo y contenido: step 3, the plan. Next: I write the plan for this stage." Never name the internal phases, the fallback, candidates or evidence to the developer. Do not ask for confirmation.
4. **Ask only for a new topic.** When `alternatives` holds a `new-cycle` entry (a complaint, bug or feature while a cycle is active), ask one plain question: keep it apart as a new cycle, or fold it into the current stage. A request card still applies to complaints (`references/request-card.md`).
5. **Missing skills are one line, not a question.** Run `which.js --phase <slug>`; when nothing in `recommends` or `alternatives` is installed, say which skill would help and how to get it (`references/missing-skill.md`), then continue.
```

Keep the "Question template" heading only if `check-skill-sections.js` requires it; if it does, its body becomes the template of the new-topic question:

```
New topic: <one line on the request>. Keep it apart (new cycle in analysis) or fold it into stage <n> "<name>"?
```

- [ ] **Step 4: Close mode** — add after the table:

```
Staged plans: closing a stage that is not the last one writes `[x]` and the date on that stage's row or heading in the cycle's `plan.md` (for example `| 4 | **Catálogo** [x] 2026-11-02 |`) and leaves the spec header alone. Closing the last stage applies the table above. Never write an emoji; plans that carry the legacy check emoji are read as closed and left as they are.
```

- [ ] **Step 5: Never** — replace the line about writing into the user's repo with:

```
- Write into the user's repo beyond three categories: spec files created through the SDD flow with the header, header updates on a confirmed close, and the `[x]` and date that close a stage in `plan.md`.
- Write an emoji anywhere.
```

- [ ] **Step 6: Phase sheets** — add one line right after each sheet's H1:

| Sheet | Line |
|---|---|
| `initial.md` | `**Step:** 1 of 4, situation.` |
| `analysis.md` | `**Step:** 2 of 4, spec.` |
| `planning.md` | `**Step:** 3 of 4, plan. In a staged plan: the plan of the next open stage.` |
| `development.md` | `**Step:** 4 of 4, implement (build).` |
| `testing.md` | `**Step:** 4 of 4, implement (test). In a staged plan: test this stage, then close it with [x] in plan.md.` |
| `deployment.md` | `**Step:** 4 of 4, implement (ship).` |

- [ ] **Step 7: `entry-points.md`** — append:

```
## Staged plans

A plan with two or more stages (a table under a Stages/Etapas/Phases/Fases heading, or one `Stage|Etapa|Phase|Fase N` heading per stage) is read per stage once a stage is closed with `[x]` or `tasks.md` names its stage in its H1 (`# Etapa 3 — ...`). Then: open tasks, build that stage; all done and the stage not closed, test it; the stage closed and others open, plan the next open one. Task checkboxes under a stage heading never close it.
```

- [ ] **Step 8: `plugin.json` description**

```
"description": "SDLC router: tells the agent where work on a code repository stands (four steps, per stage) and what comes next, with a hook that adds that line on each prompt; hands off to spec-driven-development, sdlc-qa-gate and sdlc-release.",
```

- [ ] **Step 9: Run the documentation gates**

Run: `node plugins/sdlc-assist/skills/sdlc/bin/check-frontmatter.js && node plugins/sdlc-assist/skills/sdlc/bin/check-skill-sections.js && node plugins/sdlc-assist/skills/sdlc/bin/check-sheets.js && node plugins/sdlc-assist/skills/sdlc/bin/check-manifest.js`
Expected: each exits 0. If `check-skill-sections` names a removed heading, restore the heading with the new body rather than editing the checker.

### Task 7: README, flow diagram and install-smoke

**Files:**
- Modify: `README.md`, `plugins/sdlc-assist/README.md`, `docs/sdlc-flow.md`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: everything above.
- Produces: user-facing docs; a CI step proving the installed copy reads a staged plan.

- [ ] **Step 1: READMEs** — in both files, replace the "how it works" paragraph with the four steps and stages (same text as Task 6 Step 2), add a "Runs on its own in Claude Code" paragraph (installing the plugin from the marketplace enables the hook; installing the skills with `npx skills add` does not, and then the skill is invoked by name), and a one-line "Not for research or non-code tasks".
- [ ] **Step 2: `docs/sdlc-flow.md`** — add a loop edge from step 4 back to step 3 labelled `next stage`, and validate the Mermaid block renders (the repo's existing practice for this file).
- [ ] **Step 3: install-smoke** — add after "Installed copy reads a folder cycle":

```yaml
      - name: Installed copy plans the next stage of a staged plan
        run: |
          export HOME="$RUNNER_TEMP/home"
          fx="$RUNNER_TEMP/fx3"; d="docs/specs/2026-10-08-lms"; mkdir -p "$fx/src" "$fx/$d"; cd "$fx"
          git init -q --initial-branch=main
          git config user.name t; git config user.email t@t
          echo x > src/index.js
          printf '# Spec\n\nPhase: development\nStatus: approved\n' > "$d/spec.md"
          printf '# Plan\n\n## Etapas\n\n| # | Etapa |\n|---|---|\n| 3 | **Ingreso** [x] 2026-10-12 |\n| 4 | **Catalogo** |\n' > "$d/plan.md"
          printf '# Etapa 3 - Ingreso\n\n- [x] a\n' > "$d/tasks.md"
          git add -A; git commit -qm init
          node "$HOME/.agents/skills/sdlc/bin/where.js" --root "$fx" --brief | tee brief.txt
          grep -q '^sdlc: stage 4 "Catalogo" (1/2 closed) · step 3/4 plan · next: write the plan for this stage$' brief.txt
```

- [ ] **Step 4:** `bash scripts/gates.sh --quick` → `all gates ok`.

### Task 8: dogfood on the owner's repositories, record, commit

**Files:**
- Modify: `docs/ci-red-runs.md` (append a "v1.7 dogfood" section), `tasks.md` beside this plan (tick)

- [ ] **Step 1: Run the acceptance probe**

```bash
for r in Sr-Lievito NANDI Almacen; do node plugins/sdlc-assist/skills/sdlc/bin/where.js --root "$HOME/Github/$r" --brief; done
```

Expected, one line each: Sr-Lievito `sdlc: stage 4 "Catálogo y contenido" (4/9 closed) · step 3/4 plan · ...`; NANDI `sdlc: step 4/4 implement (test) · ...`; Almacén `sdlc: step 2/4 spec · ...`. Sr-Lievito's plan marks its closed stages with the legacy emoji; the line must still read 4/9.

- [ ] **Step 2: Hook in a real session** — install the plugin from this checkout (`claude plugin marketplace add <checkout>` then `claude plugin install sdlc-assist@<market>`), open Claude Code in Sr-Lievito and in a non-repo folder, submit a prompt in each, and confirm the line appears only in Sr-Lievito (transcript or `--debug` hook output).
- [ ] **Step 3: Record** — paste the commands and real stdout of Steps 1-2 and of `bash scripts/gates.sh` under "v1.7 dogfood" in `docs/ci-red-runs.md`, trimmed and marked when trimmed.
- [ ] **Step 4: Commit and PR (only with the owner's verb)** — one branch commit carrying `[minor]` in its message, then a PR; CI must be green on Ubuntu and Windows before merge. After merge, `sdlc close` on the spec moves it through the remaining phases.

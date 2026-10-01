#!/usr/bin/env node
const assert = require('assert');
const { countTasks } = require('./todo');
let passed = 0, failed = 0;
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
console.log('countTasks');
check('counts -, *, 1. bullets and open markers [ ] [-] [~]', () => {
  assert.deepStrictEqual(countTasks('- [ ] a\n* [-] b\n1. [~] c\n2. [x] d\n- [X] e\n'), { open: 3, done: 2, total: 5 });
});
check('nested checkboxes count, including under non-checkbox parents', () => {
  assert.deepStrictEqual(countTasks('- Task A\n  - [ ] sub1\n  - [x] sub2\n    * [ ] sub3\n'), { open: 2, done: 1, total: 3 });
});
check('non-checkbox bullets and prose are ignored', () => {
  assert.deepStrictEqual(countTasks('# Todo\n\n- plain bullet\n- [] not a checkbox\n[ ] no bullet\ntext [x] inline\n'), { open: 0, done: 0, total: 0 });
});
check('checkboxes inside ``` fences are not tasks (a plan with a sample checklist)', () => {
  assert.deepStrictEqual(countTasks('- [ ] real\n\n```markdown\n- [ ] sample a\n- [x] sample b\n```\n\n- [x] done\n'), { open: 1, done: 1, total: 2 });
  assert.deepStrictEqual(countTasks('```\n- [ ] only fenced\n'), { open: 0, done: 0, total: 0 });   // unclosed fence swallows the rest
});
check('CRLF input', () => { assert.deepStrictEqual(countTasks('- [ ] a\r\n- [x] b\r\n'), { open: 1, done: 1, total: 2 }); });
check('empty and non-string', () => {
  assert.deepStrictEqual(countTasks(''), { open: 0, done: 0, total: 0 });
  assert.deepStrictEqual(countTasks(undefined), { open: 0, done: 0, total: 0 });
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

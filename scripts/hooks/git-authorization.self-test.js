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
const HOOK = path.join(__dirname, 'git-authorization.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitauth-'));
let n = 0;
function writeJsonl(records) {
  const p = path.join(dir, 't' + (n++) + '.jsonl');
  fs.writeFileSync(p, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return p;
}
const assistant = { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'ok, running git commit and git push now' }] } };
const toolResult = { type: 'user', origin: { kind: 'tool' }, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'commit push force reset' }] } };
function human(content, extra) {
  return Object.assign({ type: 'user', origin: { kind: 'human' }, message: { role: 'user', content } }, extra || {});
}
function transcript(lastMsg) {
  return writeJsonl([human('commit push force reset delete branch x'), assistant, toolResult, human(lastMsg), assistant, toolResult]);
}
function spawn(stdin, env) {
  return spawnSync(process.execPath, [HOOK], {
    input: stdin, encoding: 'utf8', env: Object.assign({ PATH: process.env.PATH }, env || {}),
  });
}
function runWith(payload, env) { return spawn(JSON.stringify(payload), env); }
function run(cmd, lastMsg, env) {
  return runWith({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: cmd }, transcript_path: transcript(lastMsg), cwd: dir }, env);
}
function verdict(r) {
  if (r.status === 0 && r.stdout.trim() === '') return 'allow';
  try {
    const o = JSON.parse(r.stdout);
    if (r.status === 0 && o.hookSpecificOutput.hookEventName === 'PreToolUse' && o.hookSpecificOutput.permissionDecision === 'deny') return 'deny';
  } catch (_) { /* fall through */ }
  return 'unexpected(status=' + r.status + ', stdout=' + JSON.stringify(r.stdout) + ', stderr=' + JSON.stringify(r.stderr) + ')';
}
function reason(r) { return JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason; }
function expect(cmd, msg, want, env) {
  const r = run(cmd, msg, env);
  assert.strictEqual(verdict(r), want);
  return r;
}
console.log('git-authorization');

// commit
check('git commit + "commiteá y seguí" -> allow', () => expect('git commit -m x', 'commiteá y seguí', 'allow'));
check('git commit + "commitea" -> allow', () => expect('git commit -m x', 'commitea', 'allow'));
check('git commit + "COMMIT please" -> allow (case-insensitive)', () => expect('git commit -m x', 'COMMIT please', 'allow'));
check('git commit + "dale" -> deny, reason names verb commitea', () => {
  assert.ok(reason(expect('git commit -m x', 'dale', 'deny')).includes('commitea'));
});

// push / force-push
check('git push + "commiteá" -> deny (commit does not authorize push)', () => expect('git push', 'commiteá', 'deny'));
check('git push + "pusheá" -> allow', () => expect('git push', 'pusheá', 'allow'));
check('git push --force + "pusheá" -> deny (needs force verb)', () => expect('git push --force', 'pusheá', 'deny'));
check('git push -f + "force push" -> allow', () => expect('git push -f', 'force push', 'allow'));
check('git push origin +main + "pusheá" -> deny (+ref is a force push)', () => expect('git push origin +main', 'pusheá', 'deny'));

// PowerShell tool (settings.json matcher is Bash|PowerShell): same gate, same verbs
check('PowerShell tool, git push + "dale" -> deny', () => {
  const r = runWith({ hook_event_name: 'PreToolUse', tool_name: 'PowerShell', tool_input: { command: 'git push' }, transcript_path: transcript('dale'), cwd: dir });
  assert.strictEqual(verdict(r), 'deny');
});
check('PowerShell tool, git push + "pusheá" -> allow', () => {
  const r = runWith({ hook_event_name: 'PreToolUse', tool_name: 'PowerShell', tool_input: { command: 'git push' }, transcript_path: transcript('pusheá'), cwd: dir });
  assert.strictEqual(verdict(r), 'allow');
});
check('other tool (Write) with a command field -> allow (not a shell)', () => {
  const r = runWith({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { command: 'git push' }, transcript_path: transcript('dale'), cwd: dir });
  assert.strictEqual(verdict(r), 'allow');
});

function ps(cmd, msg) {
  return verdict(runWith({ hook_event_name: 'PreToolUse', tool_name: 'PowerShell', tool_input: { command: cmd }, transcript_path: transcript(msg), cwd: dir }));
}
// PowerShell forms (final review, blocking 1-2 and important 3)
check('PowerShell: $out = git push 2>&1 + "dale" -> deny (assignment capture)', () => assert.strictEqual(ps('$out = git push 2>&1', 'dale'), 'deny'));
check('PowerShell: $x = git status + "dale" -> allow', () => assert.strictEqual(ps('$x = git status', 'dale'), 'allow'));
check('PowerShell: & "C:\\Program Files\\Git\\cmd\\git.exe" push + "dale" -> deny', () => assert.strictEqual(ps('& "C:\\Program Files\\Git\\cmd\\git.exe" push', 'dale'), 'deny'));
check('PowerShell: C:\\PROGRA~1\\Git\\cmd\\git.exe push + "dale" -> deny', () => assert.strictEqual(ps('C:\\PROGRA~1\\Git\\cmd\\git.exe push', 'dale'), 'deny'));
for (const c of ['cmd /c git push', 'pwsh -NoProfile -Command "git push"', 'powershell -c "git push"', "iex 'git push'", 'Invoke-Expression "git push"', 'if ($true) {git push}']) {
  check('PowerShell: ' + c + ' + "dale" -> deny', () => assert.strictEqual(ps(c, 'dale'), 'deny'));
}
check('PowerShell: ForEach-Object { $_.Name } + "dale" -> allow', () => assert.strictEqual(ps('Get-ChildItem | ForEach-Object { $_.Name }', 'dale'), 'allow'));

// obfuscated command words, previously parked (final review): over-detection is the rule
for (const c of ["$'g'it push", '$"g"it push', '{git,push}', 'git {push,}', 'gi${x}t push', 'g$1it push', '$(echo git) push', "$'\\x67'it push", '`echo git` push']) {
  check('bypass: ' + c + ' + "dale" -> deny', () => expect(c, 'dale', 'deny'));
}
check('"C:\\Program Files\\Git\\cmd\\git.exe" push + "dale" -> deny (bash keeps backslashes before ordinary chars)', () => expect('"C:\\Program Files\\Git\\cmd\\git.exe" push', 'dale', 'deny'));
check('bash -e -c "git push" + "dale" -> deny (flag before -c)', () => expect('bash -e -c "git push"', 'dale', 'deny'));
check('git branch -d -f topic + "dale" -> deny', () => expect('git branch -d -f topic', 'dale', 'deny'));
check('git branch -df topic + "dale" -> deny', () => expect('git branch -df topic', 'dale', 'deny'));
// benign forms that must keep passing
for (const c of ['ls {a,b}', 'node -e "const o={a:1,b:2}"', '"$(npm bin)/eslint" .', 'find . -name "*.js" -exec grep -l foo {} \\;', 'echo "{git,push}"']) {
  check('benign: ' + c + ' + "dale" -> allow', () => expect(c, 'dale', 'allow'));
}
check('git commit -m "a && git push" + "commit it" -> allow (binding case holds)', () => expect('git commit -m "a && git push"', 'commit it', 'allow'));

// read-only / non-destructive ops pass with "dale"
for (const cmd of ['git log', 'git status', 'git diff', 'git tag', 'git tag -l', 'git branch', 'git branch -d x',
  'git switch -c f', 'git fetch', 'git add -A', 'git reset --soft HEAD~1']) {
  check(cmd + ' + "dale" -> allow (not a gated op)', () => expect(cmd, 'dale', 'allow'));
}

// reset --hard, tag -d, branch -D
check('git reset --hard + "dale" -> deny', () => expect('git reset --hard', 'dale', 'deny'));
check('git reset --hard + "resetea" -> allow', () => expect('git reset --hard', 'resetea', 'allow'));
check('git tag -d v1 + "dale" -> deny', () => expect('git tag -d v1', 'dale', 'deny'));
check('git tag -d v1 + "borrá el tag v1" -> allow', () => expect('git tag -d v1', 'borrá el tag v1', 'allow'));
check('git branch -D x + "dale" -> deny', () => expect('git branch -D x', 'dale', 'deny'));
check('git branch -D x + "delete branch x" -> allow', () => expect('git branch -D x', 'delete branch x', 'allow'));

// segmentation and parsing
check('npm test && git push + "pusheá" -> allow (push found after &&)', () => expect('npm test && git push', 'pusheá', 'allow'));
check('npm test && git push + "dale" -> deny (push found after &&)', () => expect('npm test && git push', 'dale', 'deny'));
check('git commit -m "a && git push" + "commiteá" -> allow (quoted && is not a separator)', () => expect('git commit -m "a && git push"', 'commiteá', 'allow'));
check('git -C ../o push + "dale" -> deny (-C global flag skipped)', () => expect('git -C ../o push', 'dale', 'deny'));
check('git -c user.name=x commit -m y + "dale" -> deny (-c global flag skipped)', () => expect('git -c user.name=x commit -m y', 'dale', 'deny'));
check('echo git push + "dale" -> allow (git is an argument, not the command)', () => expect('echo git push', 'dale', 'allow'));
check('bash -c "git push" + "dale" -> deny (recurses into sh -c)', () => expect('bash -c "git push"', 'dale', 'deny'));
check('add && commit && push + "commiteá" -> deny, reason names push and not commit', () => {
  const rs = reason(expect('git add x && git commit -m y && git push', 'commiteá', 'deny'));
  const head = rs.split('Last user message')[0];
  assert.ok(/push/.test(head), 'reason should name push: ' + rs);
  assert.ok(!/commit/.test(head), 'reason should not name commit: ' + rs);
});

// shell keywords (fix round 1, Critical 1)
check('for ...; do git push; done + "dale" -> deny (do keyword skipped)', () => expect('for b in a; do git push; done', 'dale', 'deny'));
check('if true; then git commit -m x; fi + "dale" -> deny (then keyword skipped)', () => expect('if true; then git commit -m x; fi', 'dale', 'deny'));
check('for ...; do git push; done + "pusheá" -> allow', () => expect('for b in a; do git push; done', 'pusheá', 'allow'));

// command substitution inside double quotes (fix round 1, Critical 2)
check('out="$(git commit -m x)" + "dale" -> deny', () => expect('out="$(git commit -m x)"', 'dale', 'deny'));
check('echo "$(git push)" + "dale" -> deny', () => expect('echo "$(git push)"', 'dale', 'deny'));
check('echo "`git push`" + "dale" -> deny (backtick in double quotes)', () => expect('echo "`git push`"', 'dale', 'deny'));
check('echo "$(git push)" + "pusheá" -> allow', () => expect('echo "$(git push)"', 'pusheá', 'allow'));
// Round 5 flipped this from allow to deny (R3): `$(` trips the desync gate, and a single-quoted `$(` cannot be
// told from a double-quoted one without trusting the very quote tracker the gate exists to distrust.
check("echo '$(git push)' + \"dale\" -> deny (R3 over-detection: single-quoted $( trips the desync gate)", () => expect("echo '$(git push)'", 'dale', 'deny'));
check('non-regression: git commit -m "a && git push" + "commiteá" still allows', () => expect('git commit -m "a && git push"', 'commiteá', 'allow'));

// $( body end must respect quotes; an unbalanced body must not swallow trailing text (fix round 2, Critical A)
check("echo \"$(echo '(')\" && git push + \"dale\" -> deny (quoted ( in the body)", () => expect("echo \"$(echo '(')\" && git push", 'dale', 'deny'));
check("echo \"$(echo ')'; git push)\" + \"dale\" -> deny (quoted ) in the body)", () => expect("echo \"$(echo ')'; git push)\"", 'dale', 'deny'));
check('heredoc commit message with unbalanced ( then && git push + "commiteá" -> deny naming push', () => {
  const cmd = 'git commit -m "$(cat <<\'EOF\'\nfix (part 1\nEOF\n)" && git push';
  const rs = reason(expect(cmd, 'commiteá', 'deny'));
  const head = rs.split('Last user message')[0];
  assert.ok(/push/.test(head) && !/commit/.test(head), rs);
});
check('heredoc commit message with unbalanced ( then && git push + "commiteá y pusheá" -> allow', () => {
  expect('git commit -m "$(cat <<\'EOF\'\nfix (part 1\nEOF\n)" && git push', 'commiteá y pusheá', 'allow');
});
check('unclosed backtick in double quotes does not swallow trailing text + "dale" -> deny', () => expect('echo "`x" ; git push', 'dale', 'deny'));
check('nested $( inside a $( body: echo "$(echo "$(git push)")" + "dale" -> deny', () => expect('echo "$(echo "$(git push)")"', 'dale', 'deny'));
check('non-regression (round 2): git commit -m "a && git push" + "commiteá" still allows', () => expect('git commit -m "a && git push"', 'commiteá', 'allow'));

// time is a wrapper, not a skipped keyword (fix round 2, Important B)
check('time -p git push + "dale" -> deny', () => expect('time -p git push', 'dale', 'deny'));
check('time git push + "pusheá" -> allow', () => expect('time git push', 'pusheá', 'allow'));

// long wrapper options and env -S (fix round 2, Important C)
for (const cmd of ['sudo --user root git push', 'sudo --user=root git push', 'env --unset HOME git push', 'env --unset=HOME git push',
  'xargs --max-args 1 git push', 'env -S "git push"', 'env --split-string "git push"', 'env --split-string="git push"', 'env -S git push']) {
  check(cmd + ' + "dale" -> deny (long option / split string)', () => expect(cmd, 'dale', 'deny'));
}
check('env -S "git push" + "pusheá" -> allow', () => expect('env -S "git push"', 'pusheá', 'allow'));
check('sudo --user root git push + "pusheá" -> allow', () => expect('sudo --user root git push', 'pusheá', 'allow'));
check('env -S "echo hi" + "dale" -> allow (no git inside the split string)', () => expect('env -S "echo hi"', 'dale', 'allow'));

// quote state inside heredocs/comments is unreliable: neutralized rescan (fix round 3, Critical 1)
function expectOne(cmd, msg, want) { // one-record transcript, as the reviewer's probes used
  const r = runWith({ tool_name: 'Bash', tool_input: { command: cmd }, transcript_path: writeJsonl([human(msg)]) });
  assert.strictEqual(verdict(r), want);
  return r;
}
check('heredoc body with an apostrophe and a lone " then ; git push + "dale" -> deny', () => {
  expectOne('echo "$(cat <<EOF\nit\'s "\nEOF\n)" ; git push', 'dale', 'deny');
});
check('commit heredoc with don\'t and a lone " then && git push + "commiteá" -> deny naming push', () => {
  const rs = reason(expectOne('git commit -m "$(cat <<\'EOF\'\ndon\'t use a " here\nEOF\n)" && git push', 'commiteá', 'deny'));
  assert.ok(/push/.test(rs.split('Last user message')[0]), rs);
});
check('comment with an apostrophe inside $( ) then ; git push + "dale" -> deny', () => {
  expectOne('echo "$(echo hi # it\'s "\n)" ; git push', 'dale', 'deny');
});
check('commit heredoc with don\'t, no push + "commiteá" -> allow (no over-detection of commit text)', () => {
  expectOne('git commit -m "$(cat <<\'EOF\'\ndon\'t push yet\nEOF\n)"', 'commiteá', 'allow');
});
check('unclosed quote at end of input: echo "x ; git push + "dale" -> deny', () => expectOne('echo "x ; git push', 'dale', 'deny'));
check('non-regression (round 3): git commit -m "a && git push" + "commiteá" still allows', () => expectOne('git commit -m "a && git push"', 'commiteá', 'allow'));

// env -S inside a short-flag cluster; getopt-style clusters on wrappers (fix round 3, Important 2 + optional)
check('env -iS "git push" + "dale" -> deny', () => expect('env -iS "git push"', 'dale', 'deny'));
check('env -vS "git push" + "dale" -> deny', () => expect('env -vS "git push"', 'dale', 'deny'));
check('env -iS "git push" + "pusheá" -> allow', () => expect('env -iS "git push"', 'pusheá', 'allow'));
check('env -uSHELL git push + "dale" -> deny (-u takes the attached value, not -S)', () => expect('env -uSHELL git push', 'dale', 'deny'));
check('sudo -Eu root git push + "dale" -> deny (cluster ending in a value flag)', () => expect('sudo -Eu root git push', 'dale', 'deny'));
check('sudo -uroot git push + "dale" -> deny (attached value)', () => expect('sudo -uroot git push', 'dale', 'deny'));
check('sudo -Eu root git push + "pusheá" -> allow', () => expect('sudo -Eu root git push', 'pusheá', 'allow'));

// quote tracker desync with a balanced-looking end: a whole-text quote-neutralized scan (fix round 4, Critical 1).
// Every command here runs the push in bash 5.3; each was a false ALLOW before the fix.
check('reviewer probe 1: heredoc apostrophe, false $( end, trailing \'x)"\' + "dale" -> deny', () => {
  expectOne('echo "$(cat <<EOF\nit\'s\nEOF\n)" ; git push ; echo \'x)"\'', 'dale', 'deny');
});
check('reviewer probe 2: heredoc apostrophe, false $( end, trailing : "\')" + "dale" -> deny', () => {
  expectOne('echo "$(cat <<EOF\nit\'s\nEOF\n)"; git push; : "\')"', 'dale', 'deny');
});
check('top-level heredoc apostrophe closed by a later quote hides git push + "dale" -> deny', () => {
  expectOne('cat <<EOF\nit\'s\nEOF\ngit push\necho \'x\'', 'dale', 'deny');
});
check("$'it\\'s' (ANSI-C quoting) closed by a later quote hides git push + \"dale\" -> deny", () => {
  expectOne("echo $'it\\'s' ; git push ; echo 'x'", 'dale', 'deny');
});
check('quote nested in ${x%"\'"} inside double quotes hides git push + "dale" -> deny', () => {
  expectOne('echo "${x%"\'"}" ; git push ; echo "\'"', 'dale', 'deny');
});
check('reviewer probe 1 + "pusheá" -> allow (denied on the verb, not on the budget)', () => {
  expectOne('echo "$(cat <<EOF\nit\'s\nEOF\n)" ; git push ; echo \'x)"\'', 'pusheá', 'allow');
});
check('multi-line commit message with an apostrophe and "push" as plain text + "commiteá" -> allow', () => {
  expectOne('git commit -m "fix\n\nsee notes; don\'t push yet"', 'commiteá', 'allow');
});
check('git commit -m "fix #12" + "commiteá" -> allow (# triggers the neutral scan; nothing extra found)', () => {
  expectOne('git commit -m "fix #12"', 'commiteá', 'allow');
});
check('non-regression (round 4): git commit -m "a && git push" + "commiteá" still allows', () => expectOne('git commit -m "a && git push"', 'commiteá', 'allow'));

// bounded work: exponential rescans hit the budget and deny fast instead of timing out (fix round 4, Important 2)
function expectFast(cmd, ms, why) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: cmd }, transcript_path: writeJsonl([human('dale')]) }),
    encoding: 'utf8', env: { PATH: process.env.PATH }, timeout: 8000,
  });
  const dt = Date.now() - t0;
  assert.strictEqual(verdict(r), 'deny');
  assert.ok((why || /internal error/).test(reason(r)), reason(r));
  assert.ok(dt < ms, 'took ' + dt + ' ms');
  return r;
}
check('echo "$("$("... x40 ; git push + "dale" -> deny within 2 s (was >30 s: hook timeout = allow)', () => {
  expectFast('echo "' + '$("'.repeat(40) + ' ; git push', 2000);
});
check('40 unclosed "$( at one level ; git push + "dale" -> deny within 2 s', () => {
  expectFast('echo ' + '"$(x '.repeat(40) + '; git push', 2000);
});
check('8 parity-keeping "$(x "y" openers + 1 MB tail -> deny within 2 s (2^8 rescans x 1 MB: only the budget bounds it)', () => {
  // Depth stays at 8, so the depth guard never fires; without the budget this takes ~8 s (> hook timeout).
  expectFast('echo ' + '"$(x "y" '.repeat(8) + 'x'.repeat(1 << 20) + ' ; git push', 2000);
});

// quote-split words and wider desync gate (fix round 5, Critical 1 + Critical 2). All run the push in bash 5.3;
// each was a false ALLOW before the fix.
check('top-level heredoc apostrophe then "g"it push + "dale" -> deny (quotes deleted view)', () => {
  expectOne('cat <<EOF\nit\'s\nEOF\n"g"it push\necho \'x\'', 'dale', 'deny');
});
check('heredoc in $( ) then g"i"t push + "dale" -> deny', () => {
  expectOne('echo "$(cat <<EOF\nit\'s\nEOF\n)" ; g"i"t push ; echo \'x)"\'', 'dale', 'deny');
});
check("$'it\\'s' then gi''t push + \"dale\" -> deny", () => {
  expectOne("echo $'it\\'s' ; gi''t push ; echo 'x'", 'dale', 'deny');
});
check('case pattern ) inside "$( )" desyncs, then ; git push + "dale" -> deny', () => {
  expectOne('echo "$(case a in a) echo "\'" ;; esac)" ; git push ; echo "\'"', 'dale', 'deny');
});
check('git commit -m "$(case ...)" ; git push (hidden push) + "commiteá" -> deny naming push', () => {
  const rs = reason(expectOne('git commit -m "$(case a in a) echo "\'" ;; esac)" ; git push ; echo "\'"', 'commiteá', 'deny'));
  assert.ok(/push/.test(rs.split('Last user message')[0]), rs);
});
check('\\} inside "${...}" desyncs, then ; git push + "dale" -> deny', () => {
  expectOne('echo "${x/\\}/"\'"}" ; git push ; echo "\'"', 'dale', 'deny');
});
check('apostrophe inside a top-level backtick body, then ; git push + "dale" -> deny', () => {
  expectOne('echo `echo \'` ; git push ; echo `echo \'`', 'dale', 'deny');
});
check('non-regression (round 5): git commit -m "a && git push" + "commiteá" still allows (gate not tripped)', () => {
  expectOne('git commit -m "a && git push"', 'commiteá', 'allow');
});
check('echo "$(date)" && git commit -m x + "commiteá" -> allow ($( trips the gate; copies add nothing)', () => {
  expectOne('echo "$(date)" && git commit -m x', 'commiteá', 'allow');
});

// the desync gate is linear and budgeted (fix round 5, Important 3)
check('git push ; echo \\${ x100000 (300 KB) + "dale" -> deny within 2 s (was >15 s: hook timeout = allow)', () => {
  expectFast('git push ; echo ' + '\\${'.repeat(100000) + ' > /dev/null', 2000, /push needs one of/);
});

// wrappers and exec forms (fix round 1, Important 4)
for (const cmd of ['timeout 60 git push', 'timeout -s KILL 5m git push', 'nohup git push', 'nice -n 10 git push', 'eval "git push"',
  'xargs git push', 'xargs -n 1 git push', 'env -i git push', 'env -u HOME git push', 'sudo -u root git push', 'sudo -E git push']) {
  check(cmd + ' + "dale" -> deny (wrapper skipped / eval unwrapped)', () => expect(cmd, 'dale', 'deny'));
}
check('timeout 60 git push + "pusheá" -> allow', () => expect('timeout 60 git push', 'pusheá', 'allow'));
check('sudo -u root git push + "pusheá" -> allow', () => expect('sudo -u root git push', 'pusheá', 'allow'));

// fail closed on an internal error (fix round 1, Important 6)
check('pathologically nested substitution -> deny with internal error, exit 0 (scan runs inside try)', () => {
  let s = 'git status';
  for (let k = 0; k < 12000; k++) s = 'echo "$(' + s + ')"';
  const r = runWith({ tool_name: 'Bash', tool_input: { command: s }, transcript_path: transcript('dale') });
  assert.strictEqual(verdict(r), 'deny');
  assert.ok(/internal error/.test(reason(r)), reason(r));
});

// the newest human record is the last message, even when it strips to empty (fix round 1, Important 3 / ruling R1)
// The standard fixture's older human record says "commit push force reset ...", so walking back would allow.
check('last message is slash-command only (args "close") + git push -> deny, no walk-back', () => {
  const r = run('git push', '<command-name>/sdlc</command-name><command-args>close</command-args>', {});
  assert.strictEqual(verdict(r), 'deny');
});
check('slash-command args carry the verb (<command-args>pusheá</command-args>) -> allow', () => {
  expect('git push', '<command-name>/x</command-name><command-args>pusheá</command-args>', 'allow');
});
check('last message is system-reminder only -> deny, no walk-back', () => {
  const r = run('git push', '<system-reminder>pusheá</system-reminder>', {});
  assert.strictEqual(verdict(r), 'deny');
  assert.ok(/no text/.test(reason(r)), reason(r));
});
check('system-reminder text is stripped: "<system-reminder>pusheá</system-reminder> dale" -> deny', () => {
  expect('git push', '<system-reminder>pusheá</system-reminder> dale', 'deny');
});
check('text outside the reminder still counts: "pusheá <system-reminder>x</system-reminder>" -> allow', () => {
  expect('git push', 'pusheá <system-reminder>x</system-reminder>', 'allow');
});
check('last message is image-only content -> deny, no walk-back', () => {
  expect('git push', [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }], 'deny');
});

// tail-first chunked reader (fix round 1, Important 5)
function paddedTranscript(msgs, padBytes) {
  // assistant padding records of two-byte chars; a prefix is tuned so a 256 KB chunk boundary
  // falls in the middle of a multibyte character.
  for (let shift = 0; shift < 4; shift++) {
    const pad = { type: 'assistant', message: { content: 'x'.repeat(shift) + 'ñ'.repeat(100000) } };
    const count = Math.ceil(padBytes / 200000);
    const p = writeJsonl([...msgs, ...Array(count).fill(pad)]);
    const size = fs.statSync(p).size, b = Buffer.alloc(1), fd = fs.openSync(p, 'r');
    fs.readSync(fd, b, 0, 1, size - 256 * 1024);
    fs.closeSync(fd);
    if ((b[0] & 0xC0) === 0x80) return p; // continuation byte: the boundary splits a character
  }
  throw new Error('could not place a chunk boundary inside a multibyte character');
}
check('last human record behind >256 KB of padding, multibyte char split at a chunk boundary -> found (allow)', () => {
  const p = paddedTranscript([human('dale'), human('pusheá ñandú')], 1024 * 1024);
  assert.strictEqual(verdict(runWith({ tool_name: 'Bash', tool_input: { command: 'git push' }, transcript_path: p })), 'allow');
});
check('same padded transcript, last human says "dale" (older says pusheá) -> deny', () => {
  const p = paddedTranscript([human('pusheá'), human('dale ñandú')], 1024 * 1024);
  assert.strictEqual(verdict(runWith({ tool_name: 'Bash', tool_input: { command: 'git push' }, transcript_path: p })), 'deny');
});
check('chunk boundary splits the verb\'s á (last human record straddles it) -> decoded whole (allow)', () => {
  // Padding after the human record is sized so the 256 KB boundary falls on the 2nd byte of the á in "pusheá".
  const head = Buffer.from([human('dale'), human('pusheá')].map((r) => JSON.stringify(r)).join('\n') + '\n');
  const a = head.lastIndexOf(Buffer.from('á'));
  const padFor = (L) => Buffer.from(JSON.stringify({ type: 'assistant', message: { content: 'x'.repeat(L) } }) + '\n');
  const L = a + 1 + 256 * 1024 - head.length - padFor(0).length;
  const buf = Buffer.concat([head, padFor(L)]);
  assert.strictEqual(buf.length - 256 * 1024, a + 1, 'boundary placement');
  assert.strictEqual(buf[a + 1], 0xA1, 'boundary byte is the continuation byte of á');
  const p = path.join(dir, 't' + (n++) + '.jsonl');
  fs.writeFileSync(p, buf);
  assert.strictEqual(verdict(runWith({ tool_name: 'Bash', tool_input: { command: 'git push' }, transcript_path: p })), 'allow');
});
check('only human record lies beyond the 8 MB floor -> deny "could not be read"', () => {
  const p = paddedTranscript([human('pusheá')], 9 * 1024 * 1024);
  const r = runWith({ tool_name: 'Bash', tool_input: { command: 'git push' }, transcript_path: p });
  assert.strictEqual(verdict(r), 'deny');
  assert.ok(/could not be read/.test(reason(r)), reason(r));
});

// fail closed on transcript problems
check('no transcript_path -> deny, reason mentions transcript', () => {
  const r = runWith({ tool_name: 'Bash', tool_input: { command: 'git push' } });
  assert.strictEqual(verdict(r), 'deny');
  assert.ok(/transcript/.test(reason(r)));
});
check('nonexistent transcript path -> deny', () => {
  assert.strictEqual(verdict(runWith({ tool_name: 'Bash', tool_input: { command: 'git push' }, transcript_path: path.join(dir, 'nope.jsonl') })), 'deny');
});
check('transcript with only assistant/tool_result records (lag) -> deny "could not be read"', () => {
  const r = runWith({ tool_name: 'Bash', tool_input: { command: 'git push' }, transcript_path: writeJsonl([assistant, toolResult, assistant]) });
  assert.strictEqual(verdict(r), 'deny');
  assert.ok(/could not be read/.test(reason(r)), reason(r));
});
check('transcript whose only human record is a sidechain -> deny', () => {
  const r = runWith({ tool_name: 'Bash', tool_input: { command: 'git push' }, transcript_path: writeJsonl([human('pusheá', { isSidechain: true }), assistant]) });
  assert.strictEqual(verdict(r), 'deny');
});
check('human content as array of text blocks is read', () => {
  const r = runWith({ tool_name: 'Bash', tool_input: { command: 'git push' }, transcript_path: writeJsonl([human([{ type: 'text', text: 'ok, pusheá' }]), assistant]) });
  assert.strictEqual(verdict(r), 'allow');
});

// env and input handling
check('SDLC_HOOKS_DISABLE=1 + git push + "dale" -> allow', () => expect('git push', 'dale', 'allow', { SDLC_HOOKS_DISABLE: '1' }));
check('SDLC_GIT_VERBS commit=["ship it"] + "ship it" -> allow', () => expect('git commit -m x', 'ship it', 'allow', { SDLC_GIT_VERBS: '{"commit":["ship it"]}' }));
check('SDLC_GIT_VERBS commit=["ship it"] + "commitea" -> deny (override replaces the list)', () => expect('git commit -m x', 'commitea', 'deny', { SDLC_GIT_VERBS: '{"commit":["ship it"]}' }));
check('invalid SDLC_GIT_VERBS -> defaults used, stderr says not valid JSON', () => {
  const r = expect('git commit -m x', 'commitea', 'allow', { SDLC_GIT_VERBS: '{nope' });
  assert.ok(r.stderr.includes('not valid JSON'), r.stderr);
});
check('tool_name Write -> allow', () => {
  assert.strictEqual(verdict(runWith({ tool_name: 'Write', tool_input: { file_path: 'x', content: 'git push' } })), 'allow');
});
check('garbage stdin -> exit 0', () => {
  assert.strictEqual(spawn('not json {{{').status, 0);
});

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);

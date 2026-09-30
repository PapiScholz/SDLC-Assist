#!/usr/bin/env node
'use strict';
// PreToolUse hook: denies state-changing git commands (commit, push, force push, reset --hard,
// tag -d, branch -D) unless the last human message of the session names the verb for that op.
// Fails closed when the transcript cannot be read. SDLC_HOOKS_DISABLE=1 disables it;
// SDLC_GIT_VERBS (JSON object of op -> [verbs]) is merged over the defaults.
const fs = require('fs');
const V = {
  commit: ['commit', 'commitea', 'commitear', 'comitea'],
  push: ['push', 'pushea', 'pushear'],
  'force-push': ['force', 'forza', 'forzar', 'force push'],
  reset: ['reset', 'resetea', 'resetear'],
  'tag-delete': ['borra el tag', 'elimina el tag', 'delete tag', 'delete the tag'],
  'branch-delete': ['borra la rama', 'borra el branch', 'elimina la rama', 'delete branch', 'delete the branch'],
};
// Tools whose tool_input.command is a shell line (the settings.json matcher lists the same two).
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const KEYWORDS = new Set(['do', 'then', 'else', 'elif', 'if', 'while', 'until', '!']);
// Wrapper -> its flags that take a separate value (every other -x flag, and any --long=value,
// is skipped alone). `env -S/--split-string` is handled apart: its value is rescanned as a command.
const WRAPPERS = {
  sudo: ['-u', '--user', '-g', '--group', '-C', '--close-from', '-h', '--host', '-p', '--prompt',
    '-U', '--other-user', '-r', '--role', '-t', '--type', '-D', '--chdir', '-T', '--command-timeout'],
  env: ['-u', '--unset', '-C', '--chdir'],
  command: [], time: ['-o', '--output', '-f', '--format'], exec: ['-a'], nohup: [],
  timeout: ['-s', '--signal', '-k', '--kill-after'],
  nice: ['-n', '--adjustment'],
  xargs: ['-n', '--max-args', '-I', '-L', '--max-lines', '-P', '--max-procs', '-d', '--delimiter',
    '-E', '-s', '--max-chars', '-a', '--arg-file'],
};
// env -S/--split-string, also inside a short cluster (-iS, -vS): returns the attached string
// ('' when the value is the next token) or null. -u/-C end a cluster (their value follows).
function envSplit(tok) {
  const m = /^--split-string(?:=([\s\S]*))?$/.exec(tok);
  if (m) return m[1] || '';
  if (!/^-[^-]/.test(tok)) return null;
  for (let k = 1; k < tok.length; k++) {
    if (tok[k] === 'S') return tok.slice(k + 1);
    if (tok[k] === 'u' || tok[k] === 'C') return null;
  }
  return null;
}
// Tokens a wrapper flag consumes: a short cluster (-Eu) is read getopt-style, so a value flag
// ends the cluster; its value is the rest of the cluster (-uroot) or the next token (-Eu root).
function flagWidth(w, tok) {
  if (tok.startsWith('--')) return WRAPPERS[w].includes(tok) ? 2 : 1;
  for (let k = 1; k < tok.length; k++) if (WRAPPERS[w].includes('-' + tok[k])) return k === tok.length - 1 ? 2 : 1;
  return 1;
}
const NUMERIC = /^[0-9.]+[smhd]?$/; // timeout duration
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash']);
const ASSIGN = /^[A-Za-z_][A-Za-z0-9_]*=/;
const norm = (s) => String(s).normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const says = (msg, verb) => new RegExp('(^|[^a-z0-9])' + esc(norm(verb)) + '($|[^a-z0-9])').test(msg);
const base = (t) => (t || '').split(/[\\/]/).pop().toLowerCase().replace(/\.exe$/, '');

// Two quote-free views of a text: quotes as spaces (a quoted word becomes its own token) and
// quotes deleted (a quote-split word such as "g"it or gi''t becomes whole again).
const neutral = (s) => s.replace(/['"`]/g, ' ');
const joined = (s) => s.replace(/['"`]/g, '');
// Constructs where the quote tracker below can desync from bash: heredoc bodies, comments,
// $'...', anything inside ${...}, $(...) or backticks (case patterns, \} escapes, apostrophes in
// a substitution body). Any of them can hide a later command inside a "quoted" token. Linear.
const UNRELIABLE = /\n|#|<<|\$'|\$\{|\$\(|`/;
// Global work budget: every character visited by the scanners counts. Unbalanced substitutions
// re-scan their remainder, which can go exponential; the budget throws (-> deny in main) long
// before the hook timeout, which Claude Code would treat as an allow.
let work = 0, budget = Infinity;
function charge(n) { work += n; if (work > budget) throw new Error('scan budget exceeded'); }
const bump = () => charge(1);
// Index of the backtick closing a `...` body that starts at j, or -1.
function tickEnd(cmd, j) {
  for (; j < cmd.length; j++) { bump(); if (cmd[j] === '\\') j++; else if (cmd[j] === '`') return j; }
  return -1;
}
// Index of the ')' closing a $( body that starts at j, or -1. Tracks single and double quotes,
// escapes, nested $( and backticks, and bare ( ) subshells inside the body.
function substEnd(cmd, j) {
  let q = null, d = 0;
  for (; j < cmd.length; j++) {
    bump();
    const c = cmd[j];
    if (q === "'") { if (c === "'") q = null; continue; }
    if (c === '\\') { j++; continue; }
    let e = null;
    if (c === '$' && cmd[j + 1] === '(') e = substEnd(cmd, j + 2);
    else if (c === '`') e = tickEnd(cmd, j + 1);
    if (e !== null) { if (e === -1) return -1; j = e; continue; }
    if (q === '"') { if (c === '"') q = null; continue; }
    if (c === "'" || c === '"') q = c;
    else if (c === '(') d++;
    else if (c === ')') { if (d === 0) return j; d--; }
  }
  return -1;
}

// Quote-aware split into segments of tokens. Command substitutions inside double quotes
// ($(...) and backticks) are returned in `subs` so the caller scans them too.
function segments(cmd, words) {
  const segs = [], subs = [];
  let toks = [], cur = '', has = false, q = null, qStart = 0;
  const endTok = () => { if (has) toks.push(cur); cur = ''; has = false; };
  const endSeg = () => { endTok(); if (toks.length) segs.push(toks); toks = []; };
  for (let i = 0; i < cmd.length; i++) {
    bump();
    const c = cmd[i];
    if ((q === '"' || (words && !q)) && (c === '`' || (c === '$' && cmd[i + 1] === '('))) { has = true;
      const open = c === '`' ? 1 : 2;
      const end = c === '`' ? tickEnd(cmd, i + 1) : substEnd(cmd, i + 2);
      if (end === -1) {
        // No balanced end: scan the whole remainder as a substitution AND keep scanning the
        // outer text from just after the opener, so nothing after it is swallowed.
        // A second copy with quotes neutralized covers bodies whose quote state is unreliable
        // (apostrophes in heredocs or comments); over-detection can only deny.
        subs.push(cmd.slice(i + open), neutral(cmd.slice(i + open)));
        cur += cmd.slice(i, i + open);
        i += open - 1;
        continue;
      }
      subs.push(cmd.slice(i + open, end));
      cur += cmd.slice(i, end + 1);
      i = end;
      continue;
    }
    if (q) {
      if (c === q) q = null;
      else if (c === '\\' && q === '"' && '$`"\\\n'.includes(cmd[i + 1] || '')) cur += cmd[++i];
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") { q = c; qStart = i; has = true; continue; }
    if (c === '\\' && i + 1 < cmd.length) { if (cmd[++i] !== '\n') { cur += cmd[i]; has = true; } continue; }
    if (words && (c === '{' || c === '}') && (has || (c === '{' && !/\s/.test(cmd[i + 1] || ' ')))) { cur += c; has = true; continue; }
    if (';&|\n()`{}'.includes(c)) { endSeg(); continue; }
    if (/\s/.test(c)) { endTok(); continue; }
    cur += c; has = true;
  }
  if (q) subs.push(neutral(cmd.slice(qStart + 1))); // input ended inside an unclosed quote
  endSeg();
  return { segs, subs };
}

// One level of brace expansion (pre{a,b}post -> prea preb), empty words dropped.
function braces(tok) {
  const m = /^([^{}]*)\{([^{}]*,[^{}]*)\}([^{}]*)$/.exec(tok);
  return m ? m[2].split(',').map((a) => m[1] + a + m[3]).filter(Boolean) : [tok];
}
function classify(t) {
  let j = 0;
  while (j < t.length && t[j].startsWith('-')) j += /^(-C|-c|--git-dir|--work-tree|--namespace)$/.test(t[j]) ? 2 : 1;
  const sub = t[j], rest = t.slice(j + 1);
  if (sub === 'commit') return 'commit';
  if (sub === 'push') {
    const force = rest.some((a) => a.startsWith('--force') || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a) || /^\+./.test(a));
    return force ? 'force-push' : 'push';
  }
  if (sub === 'reset' && rest.includes('--hard')) return 'reset';
  if (sub === 'tag' && (rest.includes('-d') || rest.includes('--delete'))) return 'tag-delete';
  if (sub === 'branch') { // -D, -d -f, -df/-fd, --delete --force; plain -d (merged only) is safe
    const del = rest.includes('--delete') || cluster(rest, 'd'), force = rest.includes('--force') || cluster(rest, 'Df');
    if (cluster(rest, 'D') || (del && force)) return 'branch-delete';
  }
  return null;
}
// True when any short-flag cluster in `args` (-df, -Eu) carries one of the letters.
const cluster = (args, letters) => args.some((a) => new RegExp('^-[a-zA-Z]*[' + letters + '][a-zA-Z]*$').test(a));
// Wrappers that run their operand as a new command line: the flag that introduces it and
// whether the operand is one token (sh -c "…") or the rest of the segment (pwsh -Command …).
// PowerShell accepts any prefix of a parameter name (-c, -Com, -Command), optionally with ":value".
const psParam = (name, tok) => { const m = /^-([a-z]+)(?::|$)/i.exec(tok); return !!m && name.startsWith(m[1].toLowerCase()); };
const RESCAN = [
  { exes: SHELLS, flag: (tok) => /^-[a-z]*c$/.test(tok), rest: false },
  { exes: new Set(['pwsh', 'powershell']), flag: (tok) => psParam('command', tok), rest: true },
  { exes: new Set(['cmd']), flag: (tok) => /^\/[ck]$/i.test(tok), rest: true },
];
// pwsh/powershell -e/-enc/-EncodedCommand: a base64 command line is never scanned, so it is denied outright.
const encoded = (tok) => psParam('encodedcommand', tok);

function scan(cmd, depth) {
  if (depth > 8) throw new Error('command nesting too deep'); // fail closed via the caller's catch
  const ops = [];
  const { segs, subs } = segments(cmd);
  // Quote state may be wrong past an UNRELIABLE construct, so also scan two quote-free copies of
  // the whole text (quotes as spaces, quotes deleted): a command hidden in a "quoted" token
  // surfaces in one of them. Over-detection can only deny. The copies have no quotes, so they
  // are not rescanned again. The regex pass is charged to the budget like any other scan.
  charge(cmd.length);
  if (UNRELIABLE.test(cmd)) { const n = neutral(cmd); if (n !== cmd) subs.push(n, joined(cmd)); }
  for (const s of subs) ops.push(...scan(s, depth + 1));
  // Second view only when the text has something the first view splits differently (braces,
  // unquoted substitutions); brace expansion as a further view. Duplicate views only repeat a deny.
  const all = /[{}`]|\$\(/.test(cmd) ? segs.concat(segments(cmd, true).segs) : segs;
  const views = all.flatMap((t) => [t, t.flatMap(braces)]);
  seg: for (const t of views) {
    let i = 0;
    for (;;) {
      if (i < t.length && (ASSIGN.test(t[i]) || KEYWORDS.has(t[i]))) { i++; continue; }
      if (/^\$[\w:]+$/.test(t[i] || '') && /^[-+*\/%]?=$/.test(t[i + 1] || '')) { i += 2; continue; } // PowerShell $x = cmd
      const w = base(t[i]);
      if (i < t.length && Object.prototype.hasOwnProperty.call(WRAPPERS, w)) {
        i++;
        while (i < t.length && t[i].startsWith('-') && t[i] !== '-') {
          const s = w === 'env' ? envSplit(t[i]) : null;
          if (s !== null) { // env -S "<cmd> args": the string is split into a command line; rescan it
            const value = s !== '' ? s : (t[i + 1] || '');
            const rest = t.slice(s !== '' ? i + 1 : i + 2);
            ops.push(...scan([value, ...rest].join(' '), depth + 1));
            continue seg;
          }
          i += flagWidth(w, t[i]); // --long=value is one token: skipped alone
        }
        if (w === 'timeout' && NUMERIC.test(t[i] || '')) i++; // the duration operand
        continue;
      }
      break;
    }
    const exe = base(t[i]);
    const r = RESCAN.find((x) => x.exes.has(exe));
    if (r) { // flags may precede the operand flag (bash -e -c, pwsh -NoProfile -Command)
      if ((exe === 'pwsh' || exe === 'powershell') && t.some((a, j) => j > i && encoded(a))) throw new Error(exe + ' -EncodedCommand is never scanned; write the command in clear text');
      const k = t.findIndex((a, j) => j > i && r.flag(a));
      const attached = k > 0 ? (/^[^:]*:(.*)$/.exec(t[k]) || [])[1] : undefined; // -Command:"…" form
      const operand = attached !== undefined ? [attached, ...t.slice(k + 1)] : k > 0 ? t.slice(k + 1) : [];
      if (operand.length) ops.push(...scan(r.rest ? operand.join(' ') : operand[0], depth + 1));
    } else if ((exe === 'eval' || exe === 'iex' || exe === 'invoke-expression') && t.length > i + 1) ops.push(...scan(t.slice(i + 1).join(' '), depth + 1));
    else if (exe === 'git' || /[$`{]/.test(t[i] || '')) { const op = classify(t.slice(i + 1)); if (op) ops.push(op); } // dynamic command word: may be git
  }
  return [...new Set(ops)];
}

function textOf(c) {
  if (typeof c === 'string') return c;
  if (!Array.isArray(c)) return '';
  return c.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n');
}
// null = not a human record; otherwise the record's text with harness wrappers stripped
// (may be '': a slash-command-only, image-only or reminder-only turn is still the last message).
function humanText(line) {
  if (!/"kind"\s*:\s*"human"/.test(line)) return null;
  let r;
  try { r = JSON.parse(line); } catch (_) { return null; }
  if (!r || r.type !== 'user' || !r.origin || r.origin.kind !== 'human' || r.isSidechain) return null;
  return textOf(r.message && r.message.content)
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<command-args>([\s\S]*?)<\/command-args>/g, ' $1 ')
    .replace(/<(command-[a-z-]+)>[\s\S]*?<\/\1>/g, '')
    .trim();
}
function lastHuman(p) {
  if (typeof p !== 'string' || !p) return null;
  let fd;
  try { fd = fs.openSync(p, 'r'); } catch (_) { return null; }
  try {
    const size = fs.fstatSync(fd).size, floor = Math.max(0, size - 8 * 1024 * 1024), CHUNK = 256 * 1024;
    let pos = size, carry = Buffer.alloc(0);
    while (pos > floor) {
      const len = Math.min(CHUNK, pos - floor);
      pos -= len;
      const chunk = Buffer.alloc(len);
      fs.readSync(fd, chunk, 0, len, pos);
      let buf = Buffer.concat([chunk, carry]);
      if (pos > 0) {
        const nl = buf.indexOf(10);
        if (nl === -1) { carry = buf; continue; }
        carry = buf.subarray(0, nl);
        buf = buf.subarray(nl + 1);
      } else carry = Buffer.alloc(0);
      const lines = buf.toString('utf8').split('\n');
      for (let k = lines.length - 1; k >= 0; k--) { const t = humanText(lines[k]); if (t !== null) return t; }
    }
    return null;
  } catch (_) { return null; } finally { fs.closeSync(fd); }
}

function loadVerbs() {
  const verbs = Object.assign({}, V);
  const env = process.env.SDLC_GIT_VERBS;
  if (!env) return verbs;
  try {
    const o = JSON.parse(env);
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('not an object');
    for (const [k, v] of Object.entries(o)) if (Array.isArray(v) && v.every((s) => typeof s === 'string') && v.some((s) => s.trim())) verbs[k] = v.filter((s) => s.trim());
  } catch (_) { process.stderr.write('git-authorization: SDLC_GIT_VERBS is not valid JSON (an object of op -> [verbs]); using defaults\n'); }
  return verbs;
}
function deny(why) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'git-authorization: ' + why } }));
}

// The scanner speaks bash. PowerShell differs in three characters, folded here so scan() stays
// tool-agnostic: backtick+newline is a line continuation, backtick+char is an escape (the char
// itself), and backslash is a path separator, never an escape. Only over-detection can result.
function normalize(tool, cmd) {
  if (tool !== 'PowerShell') return cmd;
  return cmd.replace(/`\r?\n/g, ' ').replace(/`(.)/g, '$1').replace(/\\/g, '/');
}

function main(raw) {
  if (process.env.SDLC_HOOKS_DISABLE === '1') return;
  let input;
  try { input = JSON.parse(raw); } catch (_) { return; }
  if (!input || !SHELL_TOOLS.has(input.tool_name) || !input.tool_input || typeof input.tool_input.command !== 'string') return;
  try {
    const cmd = normalize(input.tool_name, input.tool_input.command);
    work = 0; budget = Math.min(256 * cmd.length + 65536, 1 << 24); // a plain command needs ~4x its length
    const ops = scan(cmd, 0);
    if (!ops.length) return;
    const verbs = loadVerbs();
    const msg = lastHuman(input.transcript_path);
    if (msg === null) return deny(ops.join(', ') + ' blocked: last user message could not be read (transcript missing/lagging: ' + (input.transcript_path || '<none>') + '). Ask the user to authorize it explicitly.');
    if (msg === '') return deny(ops.join(', ') + ' blocked: last user message has no text (slash command, image or reminder only). Ask the user to authorize it explicitly.');
    const m = norm(msg);
    const missing = ops.filter((op) => !(verbs[op] || []).some((v) => says(m, v)));
    if (!missing.length) return;
    deny(missing.map((op) => op + ' needs one of: ' + (verbs[op] || []).join(' / ')).join('; ') +
      '. Ask the user to say it in their next message. Last user message: "' + msg.slice(0, 60) + '"');
  } catch (err) { deny('command blocked: internal error while checking git authorization (' + (err && err.message) + ')'); }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => main(raw));
process.stdin.on('error', () => {});

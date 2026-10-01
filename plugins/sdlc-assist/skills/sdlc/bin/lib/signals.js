const fs = require('fs'); const path = require('path');
const { parseHeader, hasHeaderLine } = require('./header'); const { countTasks } = require('./todo'); const { pickActive } = require('./infer'); const { unfencedLines } = require('./unfenced');
const SOURCE_EXTENSIONS = ['js','mjs','cjs','jsx','ts','tsx','py','rb','go','rs','java','kt','kts','swift','c','cc','cpp','h','hpp','cs','php','scala','sh','ps1','vue','svelte','dart','ex','exs','erl','clj','lua','r','sql'];
const EXCLUDED_DIRS = ['.git','node_modules','dist','build','out','target','vendor','.next','.nuxt','coverage','__pycache__','.venv','venv','.cache','tmp','.idea','.vscode','.pytest_cache','.tox','.turbo'];
const CONFIG_FILE = /^(?:.*\.config\.[cm]?[jt]s|\..*rc\.[cm]?js|setup\.py|conftest\.py|manage\.py|gulpfile\.js|gruntfile\.js|karma\.conf\.js|knexfile\.js)$/i;
const MAX_FILES = 5000, MAX_DEPTH = 8;
const PUBLISHED = /^##\s+\[?v?\d+\.\d+\.\d+/m;
const FOLDER_SPEC = /^docs\/specs\/[^/]+\/spec\.md$/i;
function readText(abs) { try { return fs.readFileSync(abs, 'utf8'); } catch { return null; } }
function mtimeSec(abs) { try { return Math.floor(fs.statSync(abs).mtimeMs / 1000); } catch { return null; } }
function listDir(abs) { try { return fs.readdirSync(abs, { withFileTypes: true }); } catch { return []; } }
function findSpecs(root) {
  const out = [];
  // A cycle is a flat `docs/specs/<name>.md` or a folder `docs/specs/<dir>/spec.md`; a folder without spec.md is not a cycle.
  for (const e of listDir(path.join(root, 'docs', 'specs'))) {
    if (e.isFile() && /\.md$/i.test(e.name)) out.push('docs/specs/' + e.name);
    else if (e.isDirectory() && listDir(path.join(root, 'docs', 'specs', e.name)).some(f => f.isFile() && /^spec\.md$/i.test(f.name))) out.push('docs/specs/' + e.name + '/spec.md');
  }
  for (const e of listDir(root)) if (e.isFile() && (/^spec\.md$/i.test(e.name) || /^SPEC-.*\.md$/i.test(e.name))) out.push(e.name);
  return out.sort();
}
// Cross-cycle documents (constitution, ARCHITECTURE.md): detected and cited, never required, never written. First path found wins.
function findDoc(root, paths) {
  for (const rel of paths) {
    const text = readText(path.join(root, rel));
    if (text === null) continue;
    const sections = unfencedLines(text).map(l => /^##\s+(.+?)\s*$/.exec(l)).filter(Boolean).map(m => m[1]);
    return { exists: true, path: rel, sections };
  }
  return { exists: false, path: null, sections: [] };
}
const CONSTITUTION_PATHS = ['docs/constitution.md', 'CONSTITUTION.md'];
const ARCHITECTURE_PATHS = ['ARCHITECTURE.md', 'docs/architecture.md'];
function findConstitution(root) { return findDoc(root, CONSTITUTION_PATHS); }
function findArchitecture(root) { return findDoc(root, ARCHITECTURE_PATHS); }
// ADRs (Nygard): detected and cited, never written. `docs/adr/` wins over `docs/decisions/`; only `NNNN-slug.md` files count.
const ADR_DIRS = ['docs/adr', 'docs/decisions'];
const ADR_FILE = /^(\d{4})-[^/\\]+\.md$/i;
function adrStatus(text) {
  const line = unfencedLines(text).map(l => /^Status:\s*(.+?)\s*$/i.exec(l)).find(Boolean);
  if (!line) return 'unknown';
  const value = line[1].toLowerCase();
  return /^superseded\b/.test(value) ? 'superseded' : value;
}
function findAdrs(root) {
  const dir = ADR_DIRS.find(rel => { try { return fs.statSync(path.join(root, rel)).isDirectory(); } catch { return false; } });
  if (!dir) return { exists: false, dir: null, count: 0, byStatus: {}, latest: null };
  const byStatus = {}; let latest = null, count = 0;
  for (const e of listDir(path.join(root, dir))) {
    const m = e.isFile() && ADR_FILE.exec(e.name);
    if (!m) continue;
    const rel = dir + '/' + e.name, number = Number(m[1]), status = adrStatus(readText(path.join(root, rel)) || '');
    count++; byStatus[status] = (byStatus[status] || 0) + 1;
    if (!latest || number > latest.number) latest = { number, path: rel, status };
  }
  return { exists: true, dir, count, byStatus, latest };
}
function countSourceFiles(root) {
  let count = 0; const sample = [];
  (function walk(rel, depth) {
    if (depth > MAX_DEPTH || count >= MAX_FILES) return;
    for (const e of listDir(path.join(root, rel)).slice().sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const childRel = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { if (!EXCLUDED_DIRS.includes(e.name)) walk(childRel, depth + 1); continue; }
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).slice(1).toLowerCase();
      if (!SOURCE_EXTENSIONS.includes(ext) || CONFIG_FILE.test(e.name)) continue;
      count++; if (sample.length < 5) sample.push(childRel);
    }
  })('', 0);
  return { count, sample: sample.sort() };
}
function detectTestRunner(root) {
  const pkg = readText(path.join(root, 'package.json'));
  if (pkg) { try { const t = (JSON.parse(pkg).scripts || {}).test; if (t && !/no test specified/.test(t)) return { kind: 'npm', command: 'npm test' }; } catch {} }
  if (fs.existsSync(path.join(root, 'pyproject.toml')) || fs.existsSync(path.join(root, 'pytest.ini'))) return { kind: 'pytest', command: 'pytest' };
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) return { kind: 'cargo', command: 'cargo test' };
  if (fs.existsSync(path.join(root, 'go.mod'))) return { kind: 'go', command: 'go test ./...' };
  return { kind: null, command: null };
}
function releaseWorkflow(root) {
  const dir = path.join(root, '.github', 'workflows'); const files = [];
  for (const e of listDir(dir)) if (e.isFile() && /\.ya?ml$/i.test(e.name) && (/release/i.test(e.name) || /release/i.test(readText(path.join(dir, e.name)) || ''))) files.push('.github/workflows/' + e.name);
  return { exists: files.length > 0, files: files.sort() };
}

const { execFileSync, spawnSync } = require('child_process');
// git inherits the process environment untouched (this code never reads it). What used to travel as
// environment goes as flags: no pager, no optional locks. Every query is run with cwd = root.
const GIT_OPTS = ['--no-optional-locks', '-c', 'core.pager=cat', '-c', 'core.quotepath=off', '-c', 'core.fsmonitor=false', '--literal-pathspecs'];
function git(root, args) {
  try { return execFileSync('git', [...GIT_OPTS, ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, maxBuffer: 64 * 1024 * 1024 }); }
  catch { return null; }
}
const lines = out => (out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const toInt = s => (s && /^\d+$/.test(s) ? parseInt(s, 10) : null);
const toSlash = p => p.split(path.sep).join('/');
// Only rev-parse captures stderr: it is where git reports a repo it refuses to read.
function repoInfo(root, notes) {
  const r = spawnSync('git', [...GIT_OPTS, 'rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  if (r.error || r.status !== 0 || (r.stdout || '').trim() !== 'true') {
    if (/dubious ownership/i.test(r.stderr || '')) notes.push('git refused this repo (dubious ownership): git signals skipped; the user can run git config --global --add safe.directory <repo>');
    return { isRepo: false, toplevel: null };
  }
  let top = null;
  try { top = fs.realpathSync.native((git(root, ['rev-parse', '--show-toplevel']) || '').trim()); } catch { return { isRepo: false, toplevel: null }; }
  if (top === fs.realpathSync.native(root)) return { isRepo: true, toplevel: toSlash(top) };
  notes.push('not the repo root; run with --root ' + toSlash(top));
  return { isRepo: false, toplevel: toSlash(top) };
}
function branch(root) {
  if (!git(root, ['rev-parse', '--verify', 'HEAD'])) return null;          // no commits
  const b = (git(root, ['symbolic-ref', '--short', 'HEAD']) || '').trim();  // detached => null
  return b || null;
}
// Three git spawns for all spec paths plus the plan, whatever their number; returns rel => dates.
function fileDatesBatch(root, rels) {
  const out = new Map();
  if (!rels.length) return out;
  const tracked = new Set((git(root, ['ls-files', '-z', '--', ...rels]) || '').split('\0').filter(Boolean));
  const first = new Map(), last = new Map(); let ct = null;
  for (const line of (git(root, ['log', '--format=@@%ct', '--name-only', '--', ...rels]) || '').split(/\r?\n/)) {   // newest first
    if (line.startsWith('@@')) { ct = toInt(line.slice(2).trim()); continue; }
    if (!line || ct === null) continue;
    if (!last.has(line)) last.set(line, ct);
    first.set(line, ct);
  }
  const dirty = new Set(); const st = (git(root, ['status', '--porcelain', '-z', '--', ...rels]) || '').split('\0');
  for (let i = 0; i < st.length; i++) {
    if (st[i].length < 4) continue;
    dirty.add(st[i].slice(3));
    if (/[RC]/.test(st[i].slice(0, 2))) i++;   // rename/copy: the next entry is the source path
  }
  for (const rel of rels) {
    const mtime = mtimeSec(path.join(root, rel));
    out.set(rel, tracked.has(rel)
      ? { tracked: true, firstCommit: first.has(rel) ? first.get(rel) : null, lastCommit: last.has(rel) ? last.get(rel) : null, dirty: dirty.has(rel), mtime }
      : { tracked: false, firstCommit: null, lastCommit: null, dirty: false, mtime });
  }
  return out;
}
function recentCommits(root) {
  const out = git(root, ['log', '-10', '--name-only', '--format=@@%H%x09%ct%x09%s']); const commits = [];
  for (const line of (out || '').split(/\r?\n/)) {
    if (line.startsWith('@@')) { const [sha, date, ...rest] = line.slice(2).split('\t'); commits.push({ sha, date: toInt(date), subject: rest.join('\t'), paths: [] }); }
    else if (line.trim() && commits.length) commits[commits.length - 1].paths.push(line.trim());
  }
  for (const c of commits) c.paths.sort();
  return commits;
}
const SEMVER_TAG = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
function lastSemverTag(root) {
  const tags = lines(git(root, ['tag', '--list'])).map(t => ({ name: t, m: SEMVER_TAG.exec(t) })).filter(t => t.m)
    .map(t => ({ name: t.name, key: [+t.m[1], +t.m[2], +t.m[3]] }))
    .sort((a, b) => b.key[0] - a.key[0] || b.key[1] - a.key[1] || b.key[2] - a.key[2]);
  if (!tags.length) return null;
  return { name: tags[0].name, sha: (git(root, ['rev-list', '-n', '1', tags[0].name]) || '').trim() };
}
function collectGit(root, notes) {
  const info = repoInfo(root, notes);
  if (!info.isRepo) return { isRepo: false, toplevel: info.toplevel, branch: null, commits: [], lastSemverTag: null, tagOnHead: false, commitsAfterTag: null };
  const tag = lastSemverTag(root);
  const tagOnHead = !!tag && lines(git(root, ['tag', '--points-at', 'HEAD'])).includes(tag.name);
  const commitsAfterTag = tag ? toInt((git(root, ['rev-list', '--count', tag.name + '..HEAD']) || '').trim()) : null;
  return { isRepo: true, toplevel: info.toplevel, branch: branch(root), commits: recentCommits(root), lastSemverTag: tag, tagOnHead, commitsAfterTag };
}
function runTests(root, runner) {
  if (!runner.kind) return { status: 'no-runner', exitCode: null, tail: [] };
  // shell:true because on Windows `npm` is npm.cmd; the command string comes from the fixed runner table, never from input.
  const r = spawnSync(runner.command, { cwd: root, shell: true, encoding: 'utf8', windowsHide: true, timeout: 10 * 60 * 1000 });
  const tail = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).filter(Boolean).slice(-20);
  return { status: r.status === 0 ? 'passed' : 'failed', exitCode: r.status, tail };
}

function collectSignals(repoRoot, opts) {
  const options = opts || {};
  const abs = fs.realpathSync.native(repoRoot);
  const root = toSlash(abs);
  const notes = [];
  const gitInfo = collectGit(abs, notes);
  // Capability map proxy (v1): with 2+ root SPEC-*.md, only those carrying a Phase:/Status: line are cycles;
  // the headerless ones are module specs, listed in `modules` and kept out of active ranking.
  const found = findSpecs(abs).map(rel => ({ rel, text: readText(path.join(abs, rel)) }));
  const rootSpecs = found.filter(f => /^SPEC-.*\.md$/i.test(f.rel));
  const modules = rootSpecs.length >= 2 ? rootSpecs.filter(f => !hasHeaderLine(f.text)).map(f => f.rel) : [];
  const cycleFiles = found.filter(f => !modules.includes(f.rel));
  // Per-cycle layout: a folder cycle (docs/specs/<dir>/spec.md) takes plan.md and tasks.md from its folder, with
  // no fallback to the global pair; a flat spec, and the "no active cycle" case, keep tasks/plan.md and tasks/todo.md.
  const GLOBAL = { plan: 'tasks/plan.md', todo: 'tasks/todo.md' };
  const pairOf = rel => FOLDER_SPEC.test(rel) ? { plan: path.posix.dirname(rel) + '/plan.md', todo: path.posix.dirname(rel) + '/tasks.md' } : GLOBAL;
  const planPaths = [...new Set([GLOBAL.plan, ...cycleFiles.map(f => pairOf(f.rel).plan)])].filter(p => fs.existsSync(path.join(abs, p)));
  const batch = gitInfo.isRepo ? fileDatesBatch(abs, [...cycleFiles.map(f => f.rel), ...planPaths]) : new Map();
  const dates = rel => batch.get(rel) || { tracked: false, firstCommit: null, lastCommit: null, dirty: false, mtime: mtimeSec(path.join(abs, rel)) };
  const planInfo = rel => {
    if (!planPaths.includes(rel)) return { exists: false, path: rel };
    const d = dates(rel);
    return { exists: true, path: rel, tracked: d.tracked, lastCommit: d.lastCommit, dirty: d.dirty, mtime: d.mtime };
  };
  const todoInfo = rel => {
    const text = readText(path.join(abs, rel));
    return text === null ? { exists: false, path: rel, open: 0, done: 0, total: 0 } : { exists: true, path: rel, ...countTasks(text) };
  };
  const specs = cycleFiles.map(f => {
    const pair = pairOf(f.rel);
    return { path: f.rel, layout: FOLDER_SPEC.test(f.rel) ? 'folder' : 'flat', header: parseHeader(f.text), plan: planInfo(pair.plan), todo: todoInfo(pair.todo), ...dates(f.rel) };
  });
  const active = pickActive(specs);
  const plan = active ? active.plan : planInfo(GLOBAL.plan);
  const todo = active ? active.todo : todoInfo(GLOBAL.todo);
  const clText = readText(path.join(abs, 'CHANGELOG.md'));
  const changelog = { exists: clText !== null, path: 'CHANGELOG.md', hasPublishedVersion: clText !== null && PUBLISHED.test(clText) };
  const testRunner = detectTestRunner(abs);
  const tests = options.runTests ? runTests(abs, testRunner) : { status: 'unknown', exitCode: null, tail: [] };
  const rw = releaseWorkflow(abs);
  const inProduction = !!(gitInfo.lastSemverTag && (changelog.hasPublishedVersion || rw.exists));
  return {
    root, specs, modules, plan, todo, constitution: findConstitution(abs), architecture: findArchitecture(abs), adr: findAdrs(abs), git: gitInfo, changelog,
    releaseWorkflow: rw, sourceFiles: countSourceFiles(abs),
    testRunner, tests, inProduction, notes,
  };
}
module.exports = { collectSignals, findSpecs, findDoc, SOURCE_EXTENSIONS, EXCLUDED_DIRS };

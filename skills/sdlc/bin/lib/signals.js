const fs = require('fs'); const path = require('path');
const { parseHeader } = require('./header'); const { countTasks } = require('./todo');
const SOURCE_EXTENSIONS = ['js','mjs','cjs','jsx','ts','tsx','py','rb','go','rs','java','kt','kts','swift','c','cc','cpp','h','hpp','cs','php','scala','sh','ps1','vue','svelte','dart','ex','exs','erl','clj','lua','r','sql'];
const EXCLUDED_DIRS = ['.git','node_modules','dist','build','out','target','vendor','.next','.nuxt','coverage','__pycache__','.venv','venv','.cache','tmp','.idea','.vscode','.pytest_cache','.tox','.turbo'];
const CONFIG_FILE = /^(?:.*\.config\.[cm]?[jt]s|\..*rc\.[cm]?js|setup\.py|conftest\.py|manage\.py|gulpfile\.js|gruntfile\.js|karma\.conf\.js|knexfile\.js)$/i;
const MAX_FILES = 5000, MAX_DEPTH = 8;
const PUBLISHED = /^##\s+\[?v?\d+\.\d+\.\d+/m;
function readText(abs) { try { return fs.readFileSync(abs, 'utf8'); } catch { return null; } }
function mtimeSec(abs) { try { return Math.floor(fs.statSync(abs).mtimeMs / 1000); } catch { return null; } }
function listDir(abs) { try { return fs.readdirSync(abs, { withFileTypes: true }); } catch { return []; } }
function findSpecs(root) {
  const out = [];
  for (const e of listDir(path.join(root, 'docs', 'specs'))) if (e.isFile() && /\.md$/i.test(e.name)) out.push('docs/specs/' + e.name);
  for (const e of listDir(root)) if (e.isFile() && (/^spec\.md$/i.test(e.name) || /^SPEC-.*\.md$/i.test(e.name))) out.push(e.name);
  return out.sort();
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
function cleanEnv() { const e = { ...process.env }; delete e.GIT_DIR; delete e.GIT_WORK_TREE; delete e.GIT_INDEX_FILE; e.GIT_PAGER = 'cat'; return e; }
function git(root, args) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: cleanEnv(), windowsHide: true }); }
  catch { return null; }
}
const lines = out => (out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const toInt = s => (s && /^\d+$/.test(s) ? parseInt(s, 10) : null);
function isRepo(root) {
  if ((git(root, ['rev-parse', '--is-inside-work-tree']) || '').trim() !== 'true') return false;
  const top = (git(root, ['rev-parse', '--show-toplevel']) || '').trim();
  try { return fs.realpathSync.native(top) === fs.realpathSync.native(root); } catch { return false; }
}
function branch(root) {
  if (!git(root, ['rev-parse', '--verify', 'HEAD'])) return null;          // no commits
  const b = (git(root, ['symbolic-ref', '--short', 'HEAD']) || '').trim();  // detached => null
  return b || null;
}
function fileDates(root, rel) {
  const mtime = mtimeSec(path.join(root, rel));
  const tracked = lines(git(root, ['ls-files', '--', rel])).length > 0;
  if (!tracked) return { tracked: false, firstCommit: null, lastCommit: null, dirty: false, mtime };
  const all = lines(git(root, ['log', '--format=%ct', '--', rel]));   // newest first
  return { tracked: true, firstCommit: toInt(all[all.length - 1]), lastCommit: toInt(all[0]),
           dirty: lines(git(root, ['status', '--porcelain', '--', rel])).length > 0, mtime };
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
function collectGit(root) {
  if (!isRepo(root)) return { isRepo: false, branch: null, commits: [], lastSemverTag: null, tagOnHead: false, commitsAfterTag: null };
  const tag = lastSemverTag(root);
  const tagOnHead = !!tag && lines(git(root, ['tag', '--points-at', 'HEAD'])).includes(tag.name);
  const commitsAfterTag = tag ? toInt((git(root, ['rev-list', '--count', tag.name + '..HEAD']) || '').trim()) : null;
  return { isRepo: true, branch: branch(root), commits: recentCommits(root), lastSemverTag: tag, tagOnHead, commitsAfterTag };
}
function runTests(root, runner) {
  if (!runner.kind) return { status: 'no-runner', exitCode: null, tail: [] };
  // shell:true because on Windows `npm` is npm.cmd; the command string comes from the fixed runner table, never from input.
  const r = spawnSync(runner.command, { cwd: root, shell: true, encoding: 'utf8', env: cleanEnv(), windowsHide: true, timeout: 10 * 60 * 1000 });
  const tail = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).filter(Boolean).slice(-20);
  return { status: r.status === 0 ? 'passed' : 'failed', exitCode: r.status, tail };
}

function collectSignals(repoRoot, opts) {
  const options = opts || {};
  const abs = fs.realpathSync.native(repoRoot);
  const root = abs.split(path.sep).join('/');
  const gitInfo = collectGit(abs);
  const dates = rel => gitInfo.isRepo ? fileDates(abs, rel) : { tracked: false, firstCommit: null, lastCommit: null, dirty: false, mtime: mtimeSec(path.join(abs, rel)) };
  const specs = findSpecs(abs).map(rel => ({ path: rel, header: parseHeader(readText(path.join(abs, rel))), ...dates(rel) }));
  const planPath = 'tasks/plan.md', todoPath = 'tasks/todo.md';
  let plan = { exists: false, path: planPath };
  if (fs.existsSync(path.join(abs, planPath))) {
    const d = dates(planPath);
    plan = { exists: true, path: planPath, tracked: d.tracked, lastCommit: d.lastCommit, dirty: d.dirty, mtime: d.mtime };
  }
  const todoText = readText(path.join(abs, todoPath));
  const todo = todoText === null
    ? { exists: false, path: todoPath, open: 0, done: 0, total: 0 }
    : { exists: true, path: todoPath, ...countTasks(todoText) };
  const clText = readText(path.join(abs, 'CHANGELOG.md'));
  const changelog = { exists: clText !== null, path: 'CHANGELOG.md', hasPublishedVersion: clText !== null && PUBLISHED.test(clText) };
  const testRunner = detectTestRunner(abs);
  const tests = options.runTests ? runTests(abs, testRunner) : { status: 'unknown', exitCode: null, tail: [] };
  const rw = releaseWorkflow(abs);
  const inProduction = !!(gitInfo.lastSemverTag && (changelog.hasPublishedVersion || rw.exists));
  return {
    root, specs, plan, todo, git: gitInfo, changelog,
    releaseWorkflow: rw, sourceFiles: countSourceFiles(abs),
    testRunner, tests, inProduction,
  };
}
module.exports = { collectSignals, SOURCE_EXTENSIONS, EXCLUDED_DIRS };

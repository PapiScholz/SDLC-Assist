'use strict';
const path = require('path');

function candidateDirs(home, cwd) {
  return [
    path.join(home, '.agents', 'skills'), path.join(home, '.claude', 'skills'),
    path.join(home, '.config', 'opencode', 'skills'), path.join(home, '.codex', 'skills'),
    path.join(home, '.cursor', 'skills'), path.join(cwd, '.agents', 'skills'),
    path.join(cwd, '.claude', 'skills'), path.join(cwd, '.codex', 'skills'), path.join(cwd, '.cursor', 'skills'),
    path.join(cwd, '.opencode', 'skills'),
  ];
}

function subdirs(fs, dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() || e.isSymbolicLink()).map(e => e.name);
  } catch { return []; }
}

// Version dirs: numeric (`1.10.0`, `v6.9`) compare segment by segment; anything else
// (a commit SHA) ranks by directory mtime and loses to any numeric version.
const VERSION_RE = /^v?(\d+(?:\.\d+)+)(?:[-+][0-9A-Za-z.-]+)?$/;
function compareVersionDirs(a, b) {   // > 0 when a is newer
  const va = VERSION_RE.exec(a.name), vb = VERSION_RE.exec(b.name);
  if (va && !vb) return 1;
  if (!va && vb) return -1;
  if (va && vb) {
    const sa = va[1].split('.').map(Number), sb = vb[1].split('.').map(Number);
    for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
      const d = (sa[i] || 0) - (sb[i] || 0);
      if (d) return d;
    }
  }
  return (a.mtime - b.mtime) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
function newestVersion(fs, dir) {
  const vers = subdirs(fs, dir).map(name => {
    let mtime = 0; try { mtime = fs.statSync(path.join(dir, name)).mtimeMs; } catch {}
    return { name, mtime };
  });
  if (!vers.length) return null;
  return vers.reduce((best, v) => (compareVersionDirs(v, best) > 0 ? v : best)).name;
}

// plugin caches: <home>/.claude/plugins/cache/<market>/<plugin>/<ver>/skills/<name>/SKILL.md
// Only the newest <ver> of each <market>/<plugin> counts; older cached versions are not installs.
function pluginSkillDirs(home, fs) {
  const out = [];
  const cache = path.join(home, '.claude', 'plugins', 'cache');
  for (const market of subdirs(fs, cache))
    for (const plugin of subdirs(fs, path.join(cache, market))) {
      const ver = newestVersion(fs, path.join(cache, market, plugin));
      if (ver === null) continue;
      for (const name of subdirs(fs, path.join(cache, market, plugin, ver, 'skills'))) {
        const dir = path.join(cache, market, plugin, ver, 'skills', name);
        if (fs.existsSync(path.join(dir, 'SKILL.md'))) out.push({ dir, name, form: `${plugin}:${name}` });
      }
    }
  return out;
}

function normalizeName(s) { return s.includes(':') ? s.split(':').pop() : s; }

module.exports = { candidateDirs, pluginSkillDirs, subdirs, normalizeName, compareVersionDirs };

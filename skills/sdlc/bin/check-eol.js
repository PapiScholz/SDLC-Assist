#!/usr/bin/env node
'use strict';
// Flags CRLF and a leading UTF-8 BOM in text files (.md .js .json .yml .yaml .txt, or no extension).
// Usage: check-eol.js [--root <dir>]
const fs = require('fs');
const path = require('path');
const i = process.argv.indexOf('--root');
const root = i !== -1 && process.argv[i + 1]
  ? path.resolve(process.argv[i + 1])
  : path.resolve(__dirname, '..', '..', '..');
const SKIP = new Set(['.git', 'node_modules', '.superpowers', '.sdlc-fixtures', 'graphify-out']);
const EXT = new Set(['.md', '.js', '.json', '.yml', '.yaml', '.txt', '']);
const bad = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); continue; }
    if (!e.isFile() || !EXT.has(path.extname(e.name).toLowerCase())) continue;
    const buf = fs.readFileSync(p);
    const rel = path.relative(root, p).split(path.sep).join('/');
    if (buf.includes('\r\n')) bad.push('CRLF in ' + rel);
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) bad.push('BOM in ' + rel);
  }
})(root);
if (bad.length) {
  for (const f of bad) console.error('check-eol: ' + f);
  process.exit(1);
}
console.log('check-eol: no CRLF or BOM found');

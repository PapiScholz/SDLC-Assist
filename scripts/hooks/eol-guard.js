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

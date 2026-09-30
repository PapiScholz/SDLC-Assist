#!/usr/bin/env node
// Keeps skills/<name>/SKILL.md byte-identical to upstream at UPSTREAM_COMMIT.
const fs = require('fs'); const path = require('path'); const os = require('os');
const { execFileSync } = require('child_process');
const UPSTREAM = 'https://github.com/addyosmani/agent-skills.git';
const UPSTREAM_COMMIT = 'bc97fd46fdb294dc3518d0e94edb989a38894f31';
const NAMES = ['spec-driven-development','planning-and-task-breakdown','incremental-implementation','test-driven-development','context-engineering'];
function parseArgs(argv){ const a={mode:null,upstreamDir:null,skillsDir:path.join(__dirname,'..','..'),names:NAMES};
  for(let i=0;i<argv.length;i++){const x=argv[i];
    if(x==='--check'||x==='--fix')a.mode=x.slice(2);
    else if(x==='--upstream-dir')a.upstreamDir=argv[++i];
    else if(x==='--skills-dir')a.skillsDir=argv[++i];
    else if(x==='--names')a.names=argv[++i].split(',');}
  if(!a.mode) throw new Error('usage: --check | --fix'); return a; }
function fetchUpstream(a){ if(a.upstreamDir) return a.upstreamDir;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sdlc-upstream-'));
  execFileSync('git',['clone','--quiet','--filter=blob:none','--no-checkout',UPSTREAM,dir],{stdio:'ignore'});
  execFileSync('git',['-C',dir,'checkout','--quiet',UPSTREAM_COMMIT],{stdio:'ignore'}); return dir; }
function vendoredNote(name){ return `# Vendored skill\n\nSource: ${UPSTREAM}\nPath: skills/${name}/SKILL.md\nCommit: ${UPSTREAM_COMMIT}\nLicense: MIT (see LICENSE)\n\nDo not edit. Update with: node skills/sdlc/bin/sync-vendored.js --fix\n`; }
function main(){ const a=parseArgs(process.argv.slice(2)); const up=fetchUpstream(a); let drift=0;
  for(const name of a.names){ const src=path.join(up,'skills',name,'SKILL.md'); const dstDir=path.join(a.skillsDir,name); const dst=path.join(dstDir,'SKILL.md');
    const want=fs.readFileSync(src); let have=null; try{have=fs.readFileSync(dst);}catch{}
    const same=have&&Buffer.compare(want,have)===0;
    if(a.mode==='check'){ if(!same){drift++; console.error(`drift: skills/${name}/SKILL.md`);}
      for(const f of ['LICENSE','VENDORED.md']) if(!fs.existsSync(path.join(dstDir,f))){drift++; console.error(`missing: skills/${name}/${f}`);}
      continue; }
    fs.mkdirSync(dstDir,{recursive:true}); fs.writeFileSync(dst,want);
    fs.writeFileSync(path.join(dstDir,'LICENSE'),fs.readFileSync(path.join(up,'LICENSE')));
    fs.writeFileSync(path.join(dstDir,'VENDORED.md'),vendoredNote(name)); console.log(`vendored: ${name}`); }
  if(a.mode==='check') { console.log(drift?`${drift} vendored file(s) drifted or missing`:'vendored skills in sync'); process.exit(drift?1:0); } }
try{ main(); }catch(e){ console.error(e.message); process.exit(2); }

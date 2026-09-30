#!/usr/bin/env bash
# Single verification target: every gate CI runs, in order, stopping at the first failure.
# Usage: bash scripts/gates.sh [--quick]   (--quick skips sync-vendored --check, which needs the network)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
quick=0; [ "${1:-}" = "--quick" ] && quick=1
gate() { local n=$1 out; shift
  if out=$("$@" 2>&1); then echo "ok $n"; else echo "FAIL $n"; printf '%s\n' "$out"; exit 1; fi; }
B=plugins/sdlc-assist/skills/sdlc/bin
for t in $B/lib/*.self-test.js $B/*.self-test.js scripts/hooks/*.self-test.js; do gate "$t" node "$t"; done
if [ "$quick" = 1 ]; then echo "skip sync-vendored (--quick)"; else gate sync-vendored node $B/sync-vendored.js --check; fi
for c in check-manifest check-sheets check-frontmatter check-skill-sections check-eol; do gate "$c" node "$B/$c.js"; done
gate settings.json node -e 'const s=JSON.parse(require("fs").readFileSync(".claude/settings.json","utf8"));for(const ev of Object.values(s.hooks))for(const g of ev)for(const h of g.hooks)for(const a of h.args)if(!require("fs").existsSync(a.replace("${CLAUDE_PROJECT_DIR}","."))) throw new Error("hook missing: "+a)'
echo "all gates ok"

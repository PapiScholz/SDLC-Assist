---
description: Show where the active cycle stands (spec, plan, stage, next task), computed from the repository
allowed-tools: Bash(node:*)
---
!`node "${CLAUDE_PLUGIN_ROOT}/skills/sdlc/bin/where.js" --status`

Reply with the block above exactly as it is, and nothing else: no tool calls, no summary, no translation, no advice. Do not load the sdlc skill.

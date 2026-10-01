# Distribution

Where the plugin is listed, what each channel checks, and what the owner does by hand. Automated indexes (skills.sh, awesomeclaudeplugins.com) read the public repository on their own; nothing to submit there.

## Anthropic plugin directory

Submission happens from the owner's claude.ai account at `claude.ai/directory/manage` (Pro or Max plan, GitHub account connected on claude.ai with push access to this repo). An agent session does not submit. Reference: `claude.com/docs/plugins/submit` and `claude.com/docs/plugins/pre-submission-checklist`.

### Pre-submission checks, run on 2026-09-30 at the repository root

The directory blocks a submission on: no `plugin.json`, no README of 40+ words, no license, a file over 256 KiB, more than 512 files, binaries other than images, symlinks or LFS pointers, unpinned `npx`/`uvx` launchers in hooks or MCP servers, a registry config file, credentials in any file. It holds a version for a reviewer on a plugin name made only of generic words, which is why the id is `sdlc-assist` and not `sdlc`.

```
$ git ls-files | wc -l
90
$ git ls-files -z | xargs -0 stat -c '%s %n' | sort -rn | head -3
51709 docs/ci-red-runs.md
34092 tasks/plan.md
31040 scripts/hooks/git-authorization.self-test.js
$ git ls-files | grep -Eic '\.(png|jpg|gif|pdf|zip|ico|exe|mcpb|dxt)$'
0
$ git ls-files -s | awk '$1=="120000"' | wc -l
0
$ ls -a | grep -Ei 'npmrc|bunfig|uv.toml|package-lock|bun.lock' | wc -l
0
$ grep -c hooks .claude-plugin/plugin.json
0
$ claude plugin validate .

✔ Validation passed
```

Since v1.4 the plugin folder is `plugins/sdlc-assist/` (manifest, icon, skills, commands, a short README and a byte copy of `LICENSE` that the manifest gate compares with the root file); `marketplace.json` at the root points there, so the directory validates only what ships and not `CLAUDE.md`, `docs/` or `scripts/`. The pasted checks above ran on the v1.3 layout, where the root was the plugin folder. `plugin.json` declares no hooks and no MCP servers; the `.claude/settings.json` hooks are project settings for this checkout and are not part of the plugin. The scripts under `skills/sdlc/bin` only read the analysed repository (`SECURITY.md`).

### Portal validation record (owner's portal, pasted from the screen)

```
Validation                                   main @ 59264f8 · 7 checks
Repository fetched                           ok
80 files, 240,4kB, within the size limits    ok
.claude-plugin/plugin.json found and valid   ok
9 habilidades · 1 command                    ok
No MCP servers                               ok
Directory lints passed                       ok
Name and publisher checks passed             ok
```
Plugin path `plugins/sdlc-assist`, branch empty. 0 policy holds, 0 warnings. The path there: `main@18e534a` (root as plugin folder) 7 warnings + 3 holds; `main@a324a9c` (v1.4 subfolder) 0 warnings + 2 holds; two hotfixes removed every `curl` mention and every `process.env` read from the plugin (`1a3713c`, `59264f8`). The vendored `we're` in the planning template only trips the marketplace-root view; fix proposed upstream in `addyosmani/agent-skills#623`.

### Portal steps

1. **Submit new** → **Plugin bundle**.
2. **Source**: repository `PapiScholz/SDLC-Assist`; plugin path `plugins/sdlc-assist`; branch empty (follows `main`). Select **Validate**. Fix anything marked **Blocks**, push, **Re-validate**.
3. **Listing details**: name and short description come from `plugin.json`, the long description from `README.md`. Edit those files and re-validate to change them.
4. **Data handling**: the plugin reads no personal data, sends nothing to any service, keeps nothing, and is not intended for people under 18. The scripts read files in the repository being analysed and run read-only git queries; the only network access in the whole repo is `sync-vendored.js --check`, a development gate that fetches `addyosmani/agent-skills` from GitHub and is not part of the plugin's runtime.
5. **Compliance**: contact email, four acknowledgements.
6. **Review and submit**: submit for review. The push webhook is not part of the wizard: on the plugin page, **Set up push updates** shows a payload URL and a one-time secret; in GitHub, `Settings → Webhooks → Add webhook` with that URL, content type `application/json`, the secret, **Just the push event**, Active. GitHub sends a ping on save and the hook shows "Last delivery was successful"; the plugin page then stops saying it polls every 6 hours (done 2026-10-01). Without it, **Check for new commits** on the plugin page pulls `main` by hand.

After the first listing, every push to `main` already publishes a release, and the directory picks up the same commit; `release.sh` raises `version` in `plugin.json` each time, which the directory requires.

## Community lists

| List | Entry type | Status |
|---|---|---|
| `hesreallyhim/awesome-claude-code` | Link only, through the issue form `issues/new?template=recommend-resource.yml`. Pull requests are refused. Requires 14+ days of activity after the first commit, or 100+ stars. One-line factual description, no marketing. | Apply on or after 2026-10-13. Suggested line: "SDLC phase router skill: infers the phase from the repo, asks one question, hands off to spec-driven-development, sdlc-qa-gate and sdlc-release." |
| `composio-community/awesome-claude-plugins` | Copies the plugin folder into their repository | Not pursued: a second copy of the plugin with no sync check drifts silently. |
| `GiladShoham/awesome-claude-plugins` | Copies the plugin folder into `plugins/` of their marketplace | Not pursued, same reason. |
| skills.sh, awesomeclaudeplugins.com | Automatic index of public GitHub repositories | Listed already; nothing to do. |

## GitHub metadata

Set with `gh repo edit` (description, homepage, topics). Current values: `gh repo view PapiScholz/SDLC-Assist --json description,homepageUrl,repositoryTopics`.

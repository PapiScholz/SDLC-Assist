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

### Listing status (owner's portal, pasted from the screen on 2026-10-01)

```
Sdlc Assist · Complemento · de PapiScholz · submitted hace 20 horas
Publicado   Listed in: Claude Code · Cowork · Claude apps   Live in the directory.
Live now        v0.11.0   published hace 5 minutos
Latest version  v0.11.0
Latest activity
  Publicado v0.11.0 · 24ee775     Sistema · hace 5 minutos
  Scan passed                     Sistema · hace 5 minutos
  New version detected            Sistema · hace 6 minutos
```
After the first listing, a push to `main` reached the directory on its own: the push webhook reported the commit, the security scan ran and the version went live within about a minute, with no reviewer step shown. A plugin page left open goes stale: before the reload it still said "The live version is still v0.8.0" and offered **Publish update** for `10b9af8`, which the portal then rejected as older than the version being served. Reload the page before acting on it.

## Community lists

| List | Entry type | Status |
|---|---|---|
| `hesreallyhim/awesome-claude-code` | Link only, through the issue form `issues/new?template=recommend-resource.yml`. Pull requests are refused. Requires 14+ days of activity after the first commit, or 100+ stars. One-line factual description, no marketing. | Apply on or after 2026-10-13. Suggested line: "SDLC phase router skill: infers the phase from the repo, asks one question, hands off to spec-driven-development, sdlc-qa-gate and sdlc-release." |
| `composio-community/awesome-claude-plugins` | Copies the plugin folder into their repository | Not pursued: a second copy of the plugin with no sync check drifts silently. |
| `GiladShoham/awesome-claude-plugins` | Copies the plugin folder into `plugins/` of their marketplace | Not pursued, same reason. |
| skills.sh, awesomeclaudeplugins.com | Automatic index of public GitHub repositories | Listed already; nothing to do. |
| `awesome-opencode/awesome-opencode` | Link only: one YAML file in `data/projects/` (schema `data/schema.json`, tagline ≤120 chars); the README regenerates from it. Requires relevance to OpenCode and commits in the last 6 months. | Submitted 2026-10-01 as `awesome-opencode/awesome-opencode#799` from the fork `PapiScholz/awesome-opencode`, branch `add-sdlc-assist`; passed their `scripts/validate.js` locally. Their CI had not run yet (first-time contributor). Last merge there 2026-07-02, 200+ open PRs. |
| `composio-community/awesome-codex-skills` | Link only, with a Codex install line (`install-skill-from-github.py`); no star or age floor. | Eligible, not sent. Verify the install line from a clean Codex home first. |
| `BehiSecc/awesome-claude-skills` | Link only, one line; no written rules. | Eligible, not sent. 200+ open PRs; the maintainer adds entries by hand. |
| `heilcheng/awesome-agent-skills` | Link only. | Eligible, not sent. Dormant since 2026-04-05. |
| `VoltAgent/awesome-agent-skills` | Link only, description ≤10 words with author prefix, PR title `Add skill: author/skill-name`. Refuses brand-new skills; recent additions had 136+ stars. | Later, once the repo has users and stars. |
| `libukai/awesome-agent-skills` | Hand-curated by the maintainer; issues welcome. | Later, as an issue suggestion at most. |
| `travisvn/awesome-claude-skills` | Link only. Closes skills under 10 stars and refuses AI-assisted PRs. | Not eligible. |
| `ComposioHQ/awesome-claude-skills` | Copies the skill folder into their repository. | Not pursued: copy drifts, and no merge since 2026-05-22. |
| `hashgraph-online/awesome-codex-plugins` (fork at `PapiScholz/awesome-codex-plugins`) | Needs `.codex-plugin/plugin.json` and the HOL plugin scanner in CI. | Not pursued: this repo ships no Codex plugin manifest. |

Rules above were read on 2026-10-01 from each list's README, CONTRIBUTING and templates; recheck before sending.

## GitHub metadata

Set with `gh repo edit` (description, homepage, topics). Current values: `gh repo view PapiScholz/SDLC-Assist --json description,homepageUrl,repositoryTopics`.

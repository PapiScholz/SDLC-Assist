#!/usr/bin/env bash
# Release driver. Normally invoked by .github/workflows/release.yml, but it is
# plain git/sed/gh and runs just as well from a maintainer's machine, which is
# the point: a release that only exists inside Actions has no way out of an
# Actions outage. Ported from NANDI-Services/doc-governance-skill.
#
#   bash .github/scripts/release.sh --dry-run   # show the plan, change nothing
#   bash .github/scripts/release.sh             # actually release
#
# Version sources rewritten here (keep each on one line):
#   .claude-plugin/plugin.json   "version": "X.Y.Z"   (the only "version" key)
#   skills/sdlc/SKILL.md         version: X.Y.Z       (frontmatter)
#   skills/sdlc-debugging/SKILL.md, skills/sdlc-qa-gate/SKILL.md, skills/sdlc-release/SKILL.md  (same line)
#
# Requires GNU sed (-i with no suffix); preflight() checks for it rather than
# letting a BSD sed corrupt the version files halfway through.
set -euo pipefail

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) echo "unknown argument: $arg (expected --dry-run or nothing)" >&2; exit 2 ;;
  esac
done

die() { echo "preflight: $1" >&2; exit 1; }

# Conditions that only matter when we are about to mutate. In --dry-run they are
# reported and tolerated, so "am I published?" stays answerable mid-change.
soft() {
  if [ "$DRY_RUN" = 1 ]; then echo "preflight warning: $1" >&2; else die "$1"; fi
}

preflight() {
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)
  [ "$branch" = "main" ] || die "on branch '$branch', expected main"

  sed --version 2>/dev/null | grep -q GNU || die "sed is not GNU sed; the in-place substitutions would corrupt the version files"
  gh auth status >/dev/null 2>&1 || die "gh is not authenticated; the run would push commits and tags and only then fail at 'gh release create'"

  [ -z "$(git status --porcelain)" ] || soft "working tree is dirty; uncommitted edits to the version files would be swept into the release commit"

  if [ -z "${GITHUB_ACTIONS:-}" ]; then
    if git fetch --quiet origin main 2>/dev/null; then
      [ "$(git rev-parse HEAD)" = "$(git rev-parse FETCH_HEAD)" ] ||
        soft "main and origin/main have diverged; push or pull before releasing"
    else
      soft "cannot reach origin to compare with origin/main"
    fi
  fi

  echo "preflight: ok (branch $branch, GNU sed, gh authenticated)"
}
preflight

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
LAST_VERSION="${LAST_TAG#v}"
IFS='.' read -r MAJOR MINOR PATCH <<< "$LAST_VERSION"

CURRENT_VERSION=$(grep -m1 '"version"' .claude-plugin/plugin.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')

# Commits since last tag, excluding prior release commits to avoid noise.
# With no tag yet (first release) the range is the whole history.
if git rev-parse "$LAST_TAG" >/dev/null 2>&1; then RANGE="${LAST_TAG}..HEAD"; else RANGE="HEAD"; fi
COMMITS=$(git log "$RANGE" --format='%s' 2>/dev/null | grep -v '^chore(release):' || true)
if [ -z "$COMMITS" ]; then
  echo "No user commits since $LAST_TAG. Nothing to release."
  exit 0
fi

BUMP="patch"
if echo "$COMMITS" | grep -qF '[major]' || echo "$COMMITS" | grep -q 'BREAKING CHANGE'; then
  BUMP="major"
elif echo "$COMMITS" | grep -qF '[minor]'; then
  BUMP="minor"
fi

case "$BUMP" in
  major) NEW_MAJOR=$((MAJOR+1)); NEW_MINOR=0; NEW_PATCH=0 ;;
  minor) NEW_MAJOR=$MAJOR; NEW_MINOR=$((MINOR+1)); NEW_PATCH=0 ;;
  patch) NEW_MAJOR=$MAJOR; NEW_MINOR=$MINOR; NEW_PATCH=$((PATCH+1)) ;;
esac
NEW_VERSION="$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"
AUTO_VERSION="$NEW_VERSION"

# Honor a manually-pinned higher version in plugin.json (e.g. first release under this pipeline).
HIGHER=$(printf '%s\n%s\n' "$CURRENT_VERSION" "$NEW_VERSION" | sort -V | tail -1)
if [ "$HIGHER" = "$CURRENT_VERSION" ] && [ "$CURRENT_VERSION" != "$NEW_VERSION" ]; then
  echo "plugin.json version ($CURRENT_VERSION) > auto-bump ($NEW_VERSION). Honoring plugin.json."
  NEW_VERSION="$CURRENT_VERSION"
fi

NEW_TAG="v$NEW_VERSION"
TODAY=$(date -u +%Y-%m-%d)

# If tag already exists (idempotent re-run), stop cleanly.
if git rev-parse "$NEW_TAG" >/dev/null 2>&1; then
  echo "Tag $NEW_TAG already exists. Skipping."
  exit 0
fi

COMMIT_COUNT=$(printf '%s\n' "$COMMITS" | grep -c . || true)
echo "last tag: $LAST_TAG   auto-bump: $BUMP -> $AUTO_VERSION"
echo "would release: $NEW_TAG  ($COMMIT_COUNT commit(s) since $LAST_TAG)"

if [ "$DRY_RUN" = 1 ]; then
  echo "dry run: nothing was modified."
  exit 0
fi

echo "Releasing $NEW_TAG (bump: $BUMP, from $LAST_TAG)"

# plugin.json has exactly one "version" key, so an unanchored substitution is safe.
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" .claude-plugin/plugin.json
sed -i "s/^version: .*/version: $NEW_VERSION/" skills/sdlc/SKILL.md
for own in sdlc-debugging sdlc-qa-gate sdlc-release; do
  sed -i "s/^version: .*/version: $NEW_VERSION/" "skills/$own/SKILL.md"
done

ENTRY_BODY=$(echo "$COMMITS" | sed 's/^/- /')

# CHANGELOG: three idempotent cases.
#  1. the version entry already exists (manual bump upstream): leave it alone;
#  2. an "## [Unreleased]" section exists: it becomes this version's entry and
#     the commit list is appended under it as "### Commits";
#  3. otherwise prepend a fresh entry made of the commit list.
if grep -q "^## \[$NEW_VERSION\]" CHANGELOG.md; then
  echo "CHANGELOG already has [$NEW_VERSION] entry. Skipping."
elif grep -q '^## \[Unreleased\]' CHANGELOG.md; then
  awk -v ver="$NEW_VERSION" -v today="$TODAY" -v body="$ENTRY_BODY" '
    BEGIN { inside = 0 }
    /^## \[Unreleased\]/ { print "## [" ver "] - " today; inside = 1; next }
    /^## / && inside { print ""; print "### Commits"; print ""; print body; print ""; inside = 0 }
    { print }
    END { if (inside) { print ""; print "### Commits"; print ""; print body } }
  ' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
else
  {
    echo "# Changelog"
    echo ""
    echo "## [$NEW_VERSION] - $TODAY"
    echo ""
    echo "$ENTRY_BODY"
    tail -n +2 CHANGELOG.md
  } > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
fi

node skills/sdlc/bin/check-manifest.js
node skills/sdlc/bin/check-frontmatter.js
node skills/sdlc/bin/check-eol.js

git add .claude-plugin/plugin.json skills/sdlc/SKILL.md skills/sdlc-debugging/SKILL.md skills/sdlc-qa-gate/SKILL.md skills/sdlc-release/SKILL.md CHANGELOG.md
if git diff --cached --quiet; then
  echo "Version files and CHANGELOG already at $NEW_VERSION. Tagging existing HEAD."
else
  git commit -m "chore(release): $NEW_TAG [skip ci]"
  git push origin HEAD:main
fi
git tag -a "$NEW_TAG" -m "Release $NEW_VERSION"
git push origin "$NEW_TAG"

gh release create "$NEW_TAG" \
  --title "$NEW_TAG" \
  --notes "$ENTRY_BODY"

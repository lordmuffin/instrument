#!/usr/bin/env bash
# Called by .github/workflows/release.yml for one consumer app, from a directory holding
# ./instrument (this repo) and ./app (the consumer, checked out with INSTRUMENT_BOT_TOKEN).
# Env: V (version), REPO (owner/name), TARGETS (JSON array of {dest, platforms}), GH_TOKEN.
set -euo pipefail

root="$PWD"
dist="$root/instrument/dist"
branch="instrument/v$V"
cd "$root/app"
default_branch="$(git ls-remote --symref origin HEAD | awk '/^ref:/ {sub("refs/heads/", "", $2); print $2; exit}')"
[[ -n "$default_branch" ]] || { echo "Cannot find the default branch of $REPO" >&2; exit 1; }
git fetch -q origin "$default_branch"
git checkout -q -B "$branch" "origin/$default_branch"

# 1. Vendor every target.
checks=""
while IFS= read -r t; do
  dest="$(jq -r .dest <<<"$t")"
  mapfile -t platforms < <(jq -r '.platforms[]' <<<"$t")
  INSTRUMENT_LOCAL_DIST="$dist" "$root/instrument/scripts/sync-instrument.sh" "$V" "$dest" "${platforms[@]}"
  checks+="          scripts/sync-instrument.sh --check ${dest}"$'\n'
done < <(jq -c '.[]' <<<"$TARGETS")

# 2. Keep the app's copy of the sync script current.
mkdir -p scripts
cp "$root/instrument/scripts/sync-instrument.sh" scripts/sync-instrument.sh
chmod +x scripts/sync-instrument.sh

# 3. A CI check that fails if anyone edits vendored Instrument files by hand.
mkdir -p .github/workflows
cat > .github/workflows/instrument-check.yml <<YAML
# Managed by lordmuffin/instrument (scripts/propagate.sh). Do not edit: changes are overwritten.
name: Instrument

on:
  pull_request:
  push:
    branches: [${default_branch}]

permissions:
  contents: read

jobs:
  vendored:
    name: Vendored Instrument is untouched
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
YAML
printf '%s' "$checks" >> .github/workflows/instrument-check.yml

git add -A
if git diff --cached --quiet; then
  echo "$REPO is already on Instrument v$V. Nothing to do."
  exit 0
fi

git -c user.name="instrument-bot" -c user.email="instrument-bot@users.noreply.github.com" \
  commit -q -m "chore(instrument): sync Instrument v$V" \
  -m "Vendored by lordmuffin/instrument release automation."
git push -q -f origin "$branch"

notes="$(awk -v v="## $V" 'index($0, v)==1 {f=1; next} /^## / {f=0} f' "$root/instrument/CHANGELOG.md" 2>/dev/null || true)"
first_time=""
if [[ "$(git ls-tree -r --name-only "origin/$default_branch" | grep -c 'INSTRUMENT_VERSION' || true)" == "0" ]]; then
  first_time=$'\n> **First Instrument sync for this repo.** These files are vendored but not wired into the build yet. Follow the runbook prompt for this app (Instrument README, "Using Instrument in an app").\n'
fi
body="$(cat <<MD
Syncs **Instrument v$V** from [lordmuffin/instrument](https://github.com/lordmuffin/instrument/releases/tag/v$V).
${first_time}
### What changed in Instrument
${notes:-See the release notes.}

### This PR
$(jq -r '.[] | "- `\(.dest)`: \(.platforms | join(", "))"' <<<"$TARGETS")
- \`scripts/sync-instrument.sh\` and \`.github/workflows/instrument-check.yml\` (managed)

### Before merging
- [ ] CI is green, including **Instrument / Vendored Instrument is untouched**
- [ ] Checked on LAB: the app still renders correctly in light and dark
MD
)"

existing="$(gh pr list -R "$REPO" --head "$branch" --state open --json number -q '.[0].number')"
if [[ -n "$existing" ]]; then
  gh pr edit "$existing" -R "$REPO" --body "$body" >/dev/null
  echo "Updated $REPO#$existing"
else
  gh pr create -R "$REPO" --base "$default_branch" --head "$branch" --title "chore(instrument): sync Instrument v$V" --body "$body"
fi

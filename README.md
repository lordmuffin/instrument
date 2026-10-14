# Instrument

The design system for every one of my self-hosted apps: Jarvis Voice, Sleep Dashboard, Home, and whatever comes next. Every app uses the same colours, type, spacing, components and patterns, and differs only by name, wordmark and content.

Design source: the Claude Design canvas **Homelab Family Design System**. Its artboards are mirrored in [`docs/design/canvas/`](docs/design/canvas/).

## What's here

| Path | What it is |
|---|---|
| `tokens/instrument.tokens.json` | **The single source of truth.** Every token in light and dark, plus platform mapping notes. |
| `reference/instrument.css` | The hand-built reference stylesheet from the design: tokens and `.i-*` component rules. Component rules are copied into `dist/web/instrument.css`. |
| `reference/instrument-proposed.css` | v0.2 proposal of parts Sleep Dashboard needs (review chip, fact grid, inline choice form, radial clock, planned slot, narrow shell). Not in `dist/` yet. |
| `dist/` | Generated. Never edit by hand. |
| `scripts/build.mjs` | Token build (Node 18+, no dependencies). |
| `scripts/test.mjs` | Tests, including parity with the reference stylesheet. |
| `scripts/contrast.mjs` | WCAG AA contrast check for every meaningful colour pair, both themes. |
| `scripts/sync-instrument.sh` | How apps vendor a pinned release, and check it wasn't edited. |
| `scripts/propagate.sh` | Opens the sync PR in each app on release (run by CI). |
| `consumers.json` | Which apps get sync PRs, and where the files land in each. |
| `docs/design/canvas/` | Every artboard from the design canvas. |

### Generated outputs (`dist/`)

| Path | Platform |
|---|---|
| `web/instrument.tokens.css` | CSS custom properties only (`--inst-*`): light, dark (system), and `data-theme` overrides. |
| `web/instrument.css` | Tokens + all component rules. **Most web apps load just this file.** |
| `swift/Instrument.xcassets` | One colour set per token, `inst/<name>`, with Any + Dark appearances. |
| `swift/InstrumentTokens.swift` | `Color.inst.*`, `InstType.*` text styles with `.instStyle()`, `InstSpace`, `InstRadius`, `InstSize`, `InstMotion`. |
| `android/res/values{,-night}/inst_colors.xml` | `@color/inst_*`, light and night. |
| `android/res/values/inst_dimens.xml` | `@dimen/inst_space_*`, sizes, radii, type sizes (sp). |
| `android/compose/InstTheme.kt` | `InstColors`, `InstTheme`, `Inst.colors` for Compose. Package `instrument` (override with `INSTRUMENT_ANDROID_PACKAGE`). |
| `echarts/instrument-{light,dark}.json` | ECharts themes: series order, axes, gridlines, tooltip, legend. |
| `tokens.flat.json` | Name → value per theme, for anything else. |

## Changing Instrument

1. Change `tokens/instrument.tokens.json` (or a component rule in `reference/instrument.css`). Ideally make the change in the Claude Design canvas first, so the design stays the source.
2. Bump `version` (patch: fix, minor: addition, major: rename or removal) and add a `## <version>` section to `CHANGELOG.md` written for app developers.
3. `make build && make check`, then open a PR. CI fails if `dist/` is stale, a test or contrast check fails, or the version/changelog wasn't bumped.
4. Merge. **Everything after that is automatic:** the release workflow tags `v<version>`, publishes `instrument-dist.tar.gz` with its SHA256, and opens or updates a sync PR in every enabled app in `consumers.json`.
5. In each app, review the sync PR, check LAB, merge, and release the app as usual.

To re-send sync PRs for the current version (for example after enabling a new app), run **Actions → Release → Run workflow**.

## Using Instrument in an app

Apps never copy files by hand. The first release opens a sync PR that vendors the files into the paths in `consumers.json`, adds `scripts/sync-instrument.sh`, and adds a managed `.github/workflows/instrument-check.yml` that fails if anyone edits the vendored files. Wiring them into the build happens once per app, in that app's adoption PR:

- **Web (HTMX/Jinja or Preact):** load `<dest>/web/instrument.css` once, add `class="inst"` to `<body>` (or the app root), and use only `--inst-*` variables and `.i-*` classes. Charts: `echarts.registerTheme('instrument-light', …)` from `<dest>/echarts/`, and switch with the colour scheme.
- **SwiftUI (XcodeGen):** make sure the vendored folder is inside a target's sources so `Instrument.xcassets` and `InstrumentTokens.swift` are included, then use `Color.inst.surface`, `Text("…").instStyle(InstType.body)`.
- **Android (XML views):** add the vendored resources as a res source dir in the module's Gradle file, for example `android { sourceSets["main"].res.srcDir("src/instrument/android/res") }`, then use `@color/inst_surface`, `@dimen/inst_space_16`. Compose apps add `src/instrument/android/compose` as a Kotlin source dir and wrap content in `InstTheme { }`.

Manual sync (rarely needed): `scripts/sync-instrument.sh 0.1.0 <dest> web echarts`.

## One-time setup

The release workflow needs a token that can push branches and open PRs in the app repos.

1. Create a **fine-grained personal access token**: GitHub → Settings → Developer settings → Fine-grained tokens.
   - Repository access: `lordmuffin/sleep-dashboard`, `lordmuffin/jarvis-voice` (and each future app).
   - Permissions: **Contents: Read and write**, **Pull requests: Read and write**, **Workflows: Read and write** (the PR adds a workflow file), Metadata: Read.
2. Add it to this repo: Settings → Secrets and variables → Actions → New repository secret, name `INSTRUMENT_BOT_TOKEN`.
3. If this repo is **private**, apps' sync script downloads need auth. CI propagation doesn't (it uses this repo's `dist/` directly), but manual syncs need `gh auth login` or `GITHUB_TOKEN`.

Without the secret, releases still publish; the propagate jobs skip with a warning.

## Adding a new app

1. Build it from the design recipe (`docs/design/canvas/Recipe.dc.html`).
2. Add it to `consumers.json` with its targets and `"enabled": true`, and add the repo to the `INSTRUMENT_BOT_TOKEN` token's repository access.
3. Run **Actions → Release → Run workflow** to send its first sync PR.

## Known issues

- **Light-theme status chips are below WCAG AA.** `success` text on `surface-2` is 4.36:1 and `warning` text on `surface-2` is 4.17:1 (4.5:1 needed). This affects chips like "✓ ACTIVE" and "INVITED". Proposed fixes: light `success` → `#116329` (6.34:1) and light `warning` → `#875C00` (5.06:1), or put chips on `surface` instead. Tracked in `scripts/contrast-known.json`; CI warns, and fails on any new failure.

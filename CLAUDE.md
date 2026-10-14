# Instrument: agent instructions

Instrument is the design system every one of Andrew's self-hosted apps uses (Jarvis Voice, Sleep Dashboard, Home, future apps). Apps differ only by name, wordmark and content.

## Rules
- `tokens/instrument.tokens.json` is the single source of truth. Never edit `dist/` by hand: change tokens (or `reference/instrument.css` for component rules), then `make build`.
- Naming is fixed: CSS `--inst-*` custom properties and `.i-*` classes; SwiftUI `Color.inst.*` from asset-catalog colour sets `inst/*`; Android `inst_*` resources and the Compose `InstTheme`.
- Use existing tokens. A new colour, size or type style needs both light and dark values, a `use` description, and a reason it can't be expressed with existing tokens.
- Name additions for what they do, not for the app that first needed them.
- Any change to `dist/` needs a version bump in `tokens/instrument.tokens.json` (patch: fix, minor: addition, major: rename or removal) and a `## <version>` section in `CHANGELOG.md`. CI enforces both.
- `make check` must pass: dist is current, tests, contrast (WCAG AA), sync script.
- Contrast failures are not waived silently. Only `scripts/contrast-known.json` may list accepted ones, each with a proposed fix.
- `docs/design/canvas/*.dc.html` are the design artboards from Claude Design: the visual reference for every component and screen. They render fully only in Claude Design, but the markup, inline styles and sample data are readable.

## Release flow (automatic)
Merging to `main` with a new version → `.github/workflows/release.yml` builds, tags `v<version>`, publishes `instrument-dist.tar.gz` + sha256, then opens or updates a sync PR in every enabled app in `consumers.json` (needs the `INSTRUMENT_BOT_TOKEN` secret).

# Changelog

Every release has a `## <version>` section; the release workflow uses it as the GitHub release notes and the sync-PR description in each app. Write it for app developers: what they'll see change, and anything they must do.

## 0.1.0

First release, imported from the Claude Design canvas "Homelab Family Design System".

- Tokens for light and dark: surfaces, text, accent, state, speaker, chart series, channel badges, type scale, spacing, sizes, radii, elevation, motion.
- Generated outputs: CSS custom properties and the reference component stylesheet (`web/`), SwiftUI asset catalog and `InstrumentTokens.swift` (`swift/`), Android colour/dimension resources and a Compose theme (`android/`), ECharts themes (`echarts/`), and `tokens.flat.json`.
- Known issue: light-theme success and warning text on `surface-2` (status chips) is below WCAG AA. See README, "Known issues".

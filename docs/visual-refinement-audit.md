# ApplyCraft visual refinement audit

## Inventory

- Brand direction: dark navy page backgrounds, indigo/blue accents, white primary text, privacy-first professional tone.
- Core app tokens: `C.bg`, `C.surface`, `C.elevated`, `C.border`, `C.borderHi`, `C.text1`, `C.text2`, `C.text3`, accent colors, gradients, and radius values.
- Static-page tokens: CSS custom properties in `public/_seo.css` for surfaces, text hierarchy, borders, radii, content widths, and shadows.
- Main repeated patterns: gradient primary buttons, outlined secondary buttons, bordered dark cards, pill badges, document previews, grid-based feature sections, FAQ/details rows, footer link groups.

## Issues found

- Muted blue-gray text was too faint on dark surfaces in the React app and static SEO pages.
- Product language claims were inconsistent: some pages said `50+ languages` while the app supports 99 document languages and 5 full interface languages.
- Several prominent feature/trust icons used emoji glyphs, which are less reliable across platforms.
- Homepage and SEO-page heading scales were slightly oversized relative to section content.
- Cards were visually repetitive, especially in trust/multilingual sections.

## Changes made

- Raised secondary and muted text contrast while preserving a three-level text hierarchy.
- Added explicit design tokens for static SEO pages through CSS custom properties.
- Added explicit React token values for success/warning/danger and shared radii.
- Standardized visible claims to `99 document languages` and `5 interface languages`.
- Replaced prominent landing/footer feature icons with lightweight inline stroke icons.
- Slightly reduced hero heading scale and tightened letter spacing.
- Added `npm run test:visual` to catch claim, token, and basic static-page structure regressions.

## Screenshot baselines

True screenshot baselines were not generated in this environment because no Chromium, Chrome, or Playwright binary is installed. To avoid a heavy browser dependency in this refinement pass, the repository now includes a lightweight visual regression guard. Browser screenshot baselines should be added in a browser-enabled CI job if the project wants pixel-level regression coverage.

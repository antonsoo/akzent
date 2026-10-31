# Contributing

Use Node 24 or later. Run `npm ci`, `npm run check`, and `npm run dev`.
Development serves `/akzent/` on port 4392; production preview uses 4391.

For changes affecting the learner's work, build and run `npm run test:browser`.
It uses installed Playwright Chromium and Firefox, operates desktop and 375px,
and retains actual artifacts under `test-results/browser/`.

Changes to observations, accents, excerpts, or historical claims need
page-level evidence and an update to `docs/model-and-sources.md`. Preserve
the distinction between observations, predictions, and fictional forms.
Do not edit the resistant comparisons to improve a count.

Do not refresh the retained-file manifest merely to make verification pass.
Explain and review replacement provenance first. New excerpts need original
translations or a compatible translation license.

Notebook JSON is versioned. Earlier predictions retain their original rule.
Changes to this behavior need round-trip, rejection, and export-snapshot
checks. Standalone HTML must escape learner text and work without a network.

Keep runtime dependencies absent unless a concrete need justifies one.
There are no accounts, analytics, or externally loaded page assets.

# Initial 0.1 local review — 2026-10-30

**Historical record:** this review describes the edition at `43bbba6`.
The current examples have since been regenerated for 0.2. See the
[current audit](audit.md) for recovery fixes, inverse learning and publication
evidence. The receipts in `review/` belong to that earlier local edition.

Akzent is a completed local workshop, with an editable notebook and portable
reading. It has not been pushed or hosted. The source, local build, browser
behavior, and printed artifacts below are separate receipts.

## The actual learner journey

Start with Gothic _fadar_ and _brōþar_. Choose the two branches of a dental
rule, keep a prediction for an unseen comparison, uncover the observation,
and inspect a resistant case on the complete source page. A prediction keeps
its own rule when the current rule changes.

Move the accent through Verner's explicitly fictional _akasatam_. All four
outcomes match the table printed on p. 115. Move accent before voicing and
the four outcomes collapse to one. The environment experiment separately
shows the medial-position, voiced-neighbor, and preceding-accent conditions.
Its settings are retained in the notebook and portable reading.

The sample exports were made through the actual application. They preserve
an initial failed prediction for ‘under’, a revised successful prediction,
and a resistant prediction for ‘which of two’, followed by source citations
and an explanation that leaves the remaining historical questions open.

| Sample artifact                                      | Use                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| [Editable JSON](../examples/akzent-notebook.json)    | Reopen the three fixed predictions and continue                |
| [Standalone HTML](../examples/akzent-reading.html)   | Read without the server or a connection                        |
| [Printed PDF](../examples/akzent-reading.pdf)        | Inspect the actual 21-page A4 reading                          |
| [Comparison CSV](../examples/akzent-comparisons.csv) | Distinguish current judgments from earlier predictions         |
| [Experiment SVG](../examples/akzent-experiment.svg)  | Keep the chosen accent, event order, and hypothetical endpoint |

## Commands and evidence

| Check                                                         | Result                                                                                                                               | Receipt                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Fresh local clone, Node 24.22.1: `npm ci` and `npm run check` | Install, lint, strict typing, eight substantive checks, source verification and build passed                                         | [Clean-build inventory](review/clean-build.json) |
| Working checkout, Node 26.7.0: `npm run check`                | Same checks passed; all 24 output files match the clean Node 24 build byte for byte                                                  | [Clean-build inventory](review/clean-build.json) |
| `npm run test:browser`                                        | Chromium and Firefox, 1440px and 375px; operated controls, real downloads, reopening, portable HTML and actual origin outages passed | [Browser receipt](review/browser.json)           |
| Light/dark accessibility in all four browser configurations   | No axe violations in the exercised states                                                                                            | [Browser receipt](review/browser.json)           |
| `npm run test:audit`                                          | Both browsers: late source, fixed export snapshot, same-length corruption refusal, and two-page offline loss/recovery passed         | [Audit receipt](review/audit.json)               |
| `npm run example`, with production preview running            | JSON, CSV, SVG, standalone HTML and PDF exported through the application                                                             | [Artifact hashes](review/artifacts.json)         |
| Clean Node 24 development server                              | Actual prediction and source-page load passed in Chromium/Firefox at 320px without page overflow or page errors                      | Manual command review in this session            |

The build command is **`npm run build`**; output is **`dist/`**, base path
**`/akzent/`**. The generated worker installs 23 application files; the full
output has 24 files including the worker. It checks the whole edition before
reporting offline availability.

The browser driver checks actual source PNG hashes, embedded source bytes in
the portable HTML, every accent/event-order combination, fixed prediction
history, failed JSON imports, and local reopening. Origin connections are
refused during reload and export while `navigator.onLine` remains true.
Online and offline illustrated-reading downloads have identical bytes.

The focused audit holds an older source response, selects a later page, then
releases the older response and verifies the current image and full-size state.
It stalls an export while changing the live note, rule, citation, and accent;
the artifact keeps the original snapshot. A same-length image alteration is
refused both by the viewer and by the illustrated-reading export.

For offline loss/recovery, the audit damages a cached source and refuses
origin connections. Both open pages withdraw their availability claim.
Reconnection repairs the exact expected bytes and restores both pages' status.

## Printed reading

The sample PDF is **21 A4 pages**, tagged, with no PDF JavaScript. Poppler
reports all used fonts embedded. Six complete source images were extracted
from the PDF and compared with the retained PNGs after decoding to RGB:
their dimensions and every pixel agree. Source images and citations stay
together on their pages. Text extraction contains the explanation, accented
comparisons, environment account, and font-license text.

Receipts: [PDF metadata](review/pdf-info.txt), [embedded fonts](review/pdf-fonts.txt),
[source-image inventory](review/pdf-images.txt), and
[pixel comparisons and artifact hashes](review/artifacts.json).

This does not certify PDF/UA or screen-reader playback. Physical printing
and independent philological peer review have not been performed.

## Visual review

All retained screenshots were opened and inspected. The word pair is legible
at desktop and phone widths; the movable syllables and event sequence remain
operable on phones. The source viewer starts with a complete-page fit; its
full-size control and keyboard panning expose the retained pixels. The
German excerpt stays readable independently of the scan's initial scale.

| View                     | Screenshot                                      |
| ------------------------ | ----------------------------------------------- |
| Opening, desktop         | [Workshop](assets/workshop-desktop.png)         |
| Opening, phone           | [Workshop](assets/workshop-mobile.png)          |
| Invented word, desktop   | [Accent experiment](assets/fiction-desktop.png) |
| Invented word, phone     | [Accent experiment](assets/fiction-mobile.png)  |
| Original source, desktop | [Reading and source](assets/source-desktop.png) |
| Original source, phone   | [Source controls](assets/source-mobile.png)     |
| Dark theme               | [Workshop](assets/workshop-dark.png)            |

## Boundaries and repository description

This selected worksheet is not a general etymology generator. Its six
agreements and two resistant comparisons do not constitute a proof or an
accuracy estimate for a historical sound law. Sanskrit accent is a comparison,
not an automatically correct ancestral accent. See the
[source concordance](model-and-sources.md) for each claim's boundaries.

No GitHub repository was created and nothing was pushed or published.
CI/Pages workflows are prepared; there is no remote-CI or hosted-byte claim.

Suggested GitHub description:

> Test Verner's accent rule on Gothic and Sanskrit, then move the accent through his invented word.

Suggested topics: `historical-linguistics`, `etymology`, `sanskrit`, `gothic`,
`verners-law`, `education`, `offline-first`.

Implementation commits:

```text
2fb59e7 test: audit source integrity and retain reproducible notebook exports
b57aba4 fix: preserve the environment test in saved notebooks
000022a test: exercise real word predictions, source artifacts and offline reading
a69d3f0 feat: build Verner accent and word-comparison workshop
```

# Akzent: source, learner work and recovery audit

The audit of the initial edition reproduced two losses in both Chromium and
Firefox: a second tab replaced the first tab's stored argument, and a delayed
JSON read replaced edits made after the import began. The revised edition keeps
competing drafts and delayed-import choices, and adds a way to ask which older
accents the consonants actually determine.

## Try the actual work

Open the [published workshop](https://antonsoo.github.io/akzent/).
1. Change “After an unaccented syllable” to **d / becomes voiced**. Test **under /
   within**. The fixed prediction agrees with Gothic _undar_.
2. Test [which of two](https://antonsoo.github.io/akzent/?word=which#selected-title).
   That same rule predicts **d**, but _hvaþar_ has **þ**. Inspect the complete
   p. 119 and compare Sanskrit _katará-_ with Greek _πότερος_. The mismatch
   remains; neither daughter language's accent is declared ancestral by fiat.
3. In the invented word, put the older accent on syllable 3. The endpoint is
   **\*agazaþ(am)**. Fix accent on the first syllable **before** voicing instead:
   the endpoint becomes **\*ahazad(am)**. The forms are Verner's fiction, not
   reconstructed actual lexical items.
4. At [the inverse bench](https://antonsoo.github.io/akzent/#infer), set evidence
   to **h / z / d**. With voicing under the older accent, position **1** fits.
   Allow **either order**: positions **1, 2, 3, 4** fit. Check a proposal and then
   change the evidence. The earlier account keeps its own assumptions.
5. Try **g / z / þ** with either order: only position **3** fits. Try **h / s / ?**:
   no scenario fits. Inspect the per-consonant reasons. Save the accent-account
   CSV and illustrated reading, then reopen the editable JSON.
6. Open two tabs, write a different explanation in each, and reload both. Each
   keeps its own explanation. Choose which copy to share, open a recovery, or
   start a new notebook and restore the previous one. Save JSON to keep an
   editable copy outside browser storage.

## What changed and why

| Finding or learning gap                                        | Revised behavior                                                                                          | Actual check                                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Other tab overwrote a stored explanation                       | Each tab keeps a session copy; conflicting shared writes retain a recovery and require an explicit choice | Divergent and simultaneous edits, reload, shared replacement, closed-tab recovery |
| Slow file read erased later edits                              | Import waits for a choice if the notebook changed; superseded reads are ignored                           | Delayed File.text, edits during read, explicit apply, undo, two racing imports    |
| Prediction cap said to start over without an action            | New notebook keeps the previous notebook for undo                                                         | Import 32 predictions, reach cap, start, predict, restore, reload                 |
| Unfamiliar stored schema was replaced at startup               | Preserve its raw bytes; keep new work separately                                                          | Version 999 remains untouched, then downloads exactly after explicit replacement  |
| A forward result could look like a uniquely recoverable accent | Enumerate all allowed inverse scenarios and display the assumptions                                       | Unique, ambiguous and impossible evidence, partial consonants and either order    |
| An account changed when the evidence changed                   | Checked proposal retains its evidence/order/accent snapshot                                               | Change draft, export, reopen, restore the checked account                         |

The old losses were reproduced against `43bbba6` before changing the code;
[the before receipt](audit/before-data-loss.json) records both browsers.
The revised [notebook-recovery receipt](audit/notebook-recovery.json) includes
unavailable local storage, unavailable session storage and unavailable Web Locks.
Browser retention is finite and can be cleared. Recovery copies improve ordinary
editing; separately downloaded JSON remains the portable editable record.

The shared slot is compared with the tab's known base under a named Web Lock
when supported. A separate recovery is retained when locking or session storage
is unavailable. Session copies are per tab, not a claim of transactional
localStorage. See [Web Locks](https://www.w3.org/TR/web-locks/) and
[Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html).

## Evidence and limits

| Boundary                                                                                          | Receipt                                                                                                   |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Four forward endpoints and eight lexical observations                                             | [Page-level concordance](model-and-sources.md), [20 retained-file identities](../src/asset-manifest.json) |
| Every one of 81 partial-evidence/order combinations                                               | [Independent literal-table checks](../tests/inference.test.ts)                                            |
| Local forward workflow, two browsers at 1440/375px; actual origin refuses connections             | [Local browser receipt](audit/browser-local.json)                                                         |
| Local inverse workflow, fixed proposal, actual artifacts, offline reopening, both themes          | [Inverse receipt](audit/inference-local.json)                                                             |
| Late source, fixed export snapshot, same-length corruption refusal, two-tab cache loss and repair | [Source/offline receipt](audit/source-and-offline.json)                                                   |
| Sample JSON, both CSVs, SVG, HTML and PDF; exact embedded asset bytes and printed source pixels   | [Artifact receipt](audit/artifacts.json)                                                                  |
| Clean Node 24 install/check/build and full output equality                                        | [Clean-build receipt](audit/clean-build.json)                                                             |

The local forward driver refuses actual origin connections while
`navigator.onLine` remains true. Public runs use browser network-offline mode;
these are distinct outage checks. No screenshot or HTTP 200 alone establishes
offline completeness or publication identity.

The [current sample reading](../examples/akzent-reading.html) contains the
learner's failed first prediction, revised rule, resistant comparison and
checked inverse account. Its [printed PDF](../examples/akzent-reading.pdf) has
**23 A4 pages**. All nine embedded image/font assets match their retained bytes;
both font licenses are included exactly. Seven source images extracted from the
PDF match the original dimensions and every decoded RGB pixel. Poppler reports
all used fonts embedded and no PDF JavaScript. This is not PDF/UA certification.

Reproduce locally with Node 24+, `npm ci`, `npm run check`, and the documented
browser drivers. `npm run test:browser` serves its own build; the inverse and
draft drivers use `npm run preview`. `npm run example` creates real application
downloads. With Poppler and Python Pillow installed,
`python3 scripts/verify-reading.py` inspects those actual artifacts.

## Visual review

The screenshots below were opened and inspected at their actual sizes. The
inverse table scrolls within a keyboard-accessible region on a phone; the page
itself does not overflow. Native selects and the proposal control work in both
browsers. Light and dark exercised states have no axe violations.

| View                    | Actual screenshot                                              |
| ----------------------- | -------------------------------------------------------------- |
| Inverse, desktop        | [Consonants to possible accents](assets/inference-desktop.png) |
| Inverse, 375px          | [Phone controls and result](assets/inference-mobile.png)       |
| Inverse, dark           | [Dark account](assets/inference-dark.png)                      |
| Competing drafts, 375px | [Explicit saved-copy choices](assets/notebook-recovery.png)    |

## Publication boundary

Source synchronization, canonical hosted bytes, public browser behavior and
remote CI are recorded separately in [publication evidence](publication.md).
The application is a selected comparative-language worksheet and a modern
intervention on Verner's fictional argument. Neither the inverse model nor
the six agreements in eight selected rows establishes a general historical
law, an acoustic reconstruction or a genetic-ancestry claim.

## Independent primary-volume check

A fresh download of the original volume, its SHA-256 and full fresh page
renders were checked separately from the application’s own manifest. All
**12** current retained PNGs match fresh complete-page renders byte for byte
and in every decoded RGB pixel. The [receipt](audit/primary-page-renders.json)
records the PDF identity, Poppler version, page mapping and dimensions.

Manual reading found that the early _-fadi-_ example was cited one page late.
It is on p. **98**, while the later mismatch is on p. **119**. The current
word card and CSV correct that reference; the portable HTML and viewer now offer
the complete p. 98. The previously recorded 0.2 build/browser receipts above
belong to the pre-erratum 24-file edition; follow-up receipts distinguish the
corrected 25-file edition. No learner prediction is rewritten by the citation fix.

Reproduce the independent render comparison with Poppler and Pillow:
`python3 scripts/verify-source-pages.py PATH_TO_77512.pdf`. The script requires
the downloaded PDF to match the declared identity before rendering.

# Published Akzent: edition receipts

## Citation correction: 0.2.1

The current public edition corrects the early _-fadi-_ page reference from 99
to 98 and makes that complete page available in both the viewer and portable
reading. The later p. 119 resistant comparison and the predictions are unchanged.

| Boundary                 | Result                                                                                                                                    | Receipt                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Original source identity | New 30,161,319-byte download matches the PDF identity; all 12 fresh complete-page renders are byte/pixel identical to retained PNGs       | [Primary-volume comparison](audit/primary-page-renders.json) |
| Clean build              | Fresh Node 24 clone at `fbbaaa7`; install/check/build pass; all 25 output files match the working build                                   | [Corrected clean inventory](audit/clean-build-021.json)      |
| Static deployment        | `f6115a9` is a normal descendant of the earlier static branch; old hashed assets remain                                                   | Actual branch history; no force push                         |
| Public files             | Canonical entry/index and all 25 expected files match the clean build after browser work                                                  | [Current hosted bytes](audit/hosted-021-after-browser.json)  |
| Public operation         | Both browsers at both widths; corrected citation, actual p. 98 download, seven embedded source pages, same reading offline                | [Current browser receipt](audit/browser-021-public.json)     |
| Old to new edition       | Three old tabs stay coherent while the update waits; after the last closes, the new edition retains the argument and serves p. 98 offline | [Live update receipt](audit/update-021.json)                 |
| Portable sample          | Actual 23-page PDF; nine embedded font/image assets and seven extracted source images match                                               | [Current artifact inspection](audit/artifacts.json)          |

The 0.2 receipts below are retained as the earlier publication record. Current
source synchronization is checked separately after the audit documentation is
committed. No remote-CI success is inferred from local or hosted verification.

## Initial 0.2 publication

The [source repository](https://github.com/antonsoo/akzent) and
[live workshop](https://antonsoo.github.io/akzent/) are public. This report keeps
source, build, hosted bytes, browser behavior and remote jobs as distinct checks.

| Boundary                                | Observed result                                                                                                                          | Receipt                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Clean build                             | Fresh local clone at `521887a`, Node 24.22.1, install/check/build pass; all 24 output files match the reviewed working build             | [Build inventory](audit/clean-build.json)              |
| Static publication                      | Reviewed output pushed as `gh-pages` commit `b03d90f`; Pages uses that branch at `/`                                                     | [Pages/job metadata](audit/remote-jobs.json)           |
| Hosted identity after browser operation | Canonical `/akzent/`, `index.html` and all 24 expected files match the clean build by length and SHA-256                                 | [Hosted-file receipt](audit/hosted-after-browser.json) |
| Public forward workshop                 | Chromium/Firefox, 1440/375px; fixed predictions, resistant words, source pixels, downloads, portable HTML, offline reload/export         | [Forward browser receipt](audit/browser-public.json)   |
| Public inverse workshop                 | Both browsers and widths; unique/ambiguous/impossible evidence, checked/draft distinction, JSON/CSV/HTML downloads and offline reopening | [Inverse browser receipt](audit/inference-public.json) |
| Public notebook recovery                | Both browsers; competing tabs/reloads/recovery, delayed imports, undo, prediction limit, unavailable storage/locks and unknown formats   | [Recovery receipt](audit/notebook-public.json)         |
| Source CI                               | Check and Pages workflow jobs failed with empty step lists                                                                               | [Jobs receipt](audit/remote-jobs.json)                 |

The successful legacy `pages-build-deployment` run is a static-host deployment
result. It does not make the unexecuted source checks pass. The application has
no runtime dependencies, account or analytics; no package registry release or
version tag was created.

Local offline tests refuse actual origin connections with `navigator.onLine`
still true. Public offline tests disable the browser network after verified
worker control. Public workflows do not redirect requests to a local build.
The illustrated reading is opened separately on `file://` with its fonts and
source pages embedded and no HTTP requests. The local cache-damage/repair audit
is reported separately in [the source/offline receipt](audit/source-and-offline.json).

The source-publication audit compares the final clean local branch with
`origin/main` and fetches the immutable review and sample artifacts without
credentials. This is separate from the hosted-build identity above. Documentation
and receipts may advance after the build's source commit; that does not change
its captured 24-file application inventory.

## Deployment follow-up

The initial Pages template replaced the static branch with a force push.
It now copies the reviewed build into a worktree of the existing `gh-pages`
branch and pushes a normal descendant only when files change. Older hashed
assets remain for readers with a cached entry document. The workflow also
checks canonical hosted bytes after publishing.

The copy/stage procedure was exercised locally against the actual served
`b03d90f` branch and produced no changes for the already reviewed output.
That local rehearsal is not a successful execution of the remote workflow.

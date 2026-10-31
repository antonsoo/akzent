# Published Akzent 0.2

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

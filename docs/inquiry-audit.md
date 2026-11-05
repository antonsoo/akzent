# Consonant inquiry: adversarial audit

This review follows the first local inquiry, rather than treating its earlier
checks as proof that nothing else could fail. Publication evidence is recorded
separately below after the reviewed build is delivered.

## Findings and changes

| Reproduced finding                                                                                   | Consequence                                                                                          | Revised behavior                                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A fixed 20-second source deadline rejected a correctly flowing PNG in both browsers                  | A slow connection lost the page and could not finish its offline edition                             | Reader and generated worker share a streaming reader: 20 seconds of silence, a three-minute overall ceiling, exact retained size and SHA-256 |
| Illustrated reading saves had no cancel action                                                       | Seven source/font reads could keep a save pending while the learner wanted to continue               | Cancel stops the save's reads, keeps the notebook and independent source reader, and returns keyboard focus to Save                          |
| The scenario ranking did not display the accent ranking beside it                                    | A good next test for complete explanations could be mistaken for a guarantee of recovering an accent | Every test now displays both worst cases and both sets of ties; the CSV retains distinct accent positions                                    |
| Conditional branches and prepared examples replaced the working inputs without an immediate reversal | Trying an inconsistent branch required reconstructing earlier inputs                                 | One-step inquiry undo restores the previous consonants and event-order assumption; checked proposals remain fixed                            |

## Two questions, two rankings

With every consonant withheld and either event order allowed:

| Read this position | Scenario counts in its two branches | Largest scenario branch | Distinct accent counts | Largest accent branch |
| ------------------ | ----------------------------------- | ----------------------- | ---------------------- | --------------------- |
| First: h or g      | 5 / 3                               | 5                       | 4 / 3                  | 4                     |
| Second: s or z     | 1 / 7                               | 7                       | 1 / 4                  | 4                     |
| Third: thorn or d  | 1 / 7                               | 7                       | 1 / 4                  | 4                     |

`thorn` denotes `þ`. The first test is the one-step minimax choice for scenarios.
For the older accent, all three tests tie: **none guarantees fewer than four
positions**. A favorable observation can still narrow the accent. This comparison
does not assume probabilities or an equally likely historical prior.

The complete-output grouping is unchanged. All five explanations of h/z/d have
the same spelling, despite spanning four older accents. Distinguishing event
order from accent position is part of the exercise; it is not a new claim about
Verner's actual comparative evidence.

## Real transfer reproduction

The original loader rejected a flowing page at 20.030 seconds in Chromium and
20.640 seconds in Firefox. The local server was sending the retained PNG one
chunk per second and had delivered over 110 kB when each reader aborted it.
The [before receipt](audit/inquiry-transfer-before.json) records both failures.

The corrected readers accepted the same PNG in 31.148 and 31.143 seconds.
The Chromium ceiling case stopped a still-flowing body at 180.020 seconds.
The revised transfer driver uses real streamed HTTP bodies, not a timer-only
mock or an already warm cache. It checks:
- A correct page whose body takes over thirty seconds remains readable.
- Canceling a simultaneous illustrated save closes that save's body while the
  source reader continues to its own checked image.
- Choosing another page closes the superseded body promptly.
- A body that sends headers and a small prefix, then falls silent, is stopped.
- An oversized body is refused before retaining bytes beyond its declared size.
- An optional three-minute run keeps sending bytes but still reaches the overall
  ceiling. This is different from a silence timeout.
- A fresh browser profile installs the offline edition with the same slow source
  and retains its exact bytes. Reader success does not stand in for worker success.

The shared import-free TypeScript transport is compiled into the generated
worker by the installed Vite transformer. Its source participates in the
edition hash. Concurrent worker requests for the same file share one verified
transfer; each caller receives an independent Response clone. Older installed
workers remain active for their existing tabs during an update.

Reproduce the full ceiling run with:

```sh
npm run build
TRANSFER_CEILING=1 npm run test:transfers
```

It intentionally takes several minutes. The ordinary command omits the
three-minute ceiling case but retains active, silent, canceled, oversized and
cold-install transfers. The transport also has direct byte/cancellation checks
in [transfer.test.ts](../tests/transfer.test.ts).

## State and artifact review

Inquiry undo is limited to this visit and one prior inquiry change. Opening a
notebook clears it; changing the working inputs elsewhere invalidates it. It
never replaces the learner's explanation, citations, fixed word predictions or
checked accent proposal. JSON continues to use the existing version-1 schema.
The saved current inputs remain portable; the transient undo action is not
presented as a saved history.

Both rankings appear in the illustrated reading and reading-plan CSV. The
source-verified PNGs and embedded fonts remain the same retained artifacts. The
saved route explicitly follows the scenario criterion and opens for printing.
The independently parsed CSV checks now include the accent sets and worst-case
accent counts, rather than merely comparing scenario totals with application code.

A fresh Node 24 installation and the working Node 26 environment produce the
same complete static build. The existing forward/inverse lessons, changed-tab
notebooks, import races, source corruption, offline damage and repair are also
operated separately from the new inquiry.

## Evidence

- [Before transfer failure](audit/inquiry-transfer-before.json)
- [Revised real transfers](audit/inquiry-transfer-audit.json)
- [Inquiry browser journeys](audit/inquiry-audited-local.json)
- [Independent actual-download audit](audit/inquiry-audited-artifacts.json)
- [Fresh Node 24 build identity](audit/inquiry-node24-build.json)

The printed source and four fictional endpoints remain unchanged. New English
and German notes have no independent philological review. This audit supports
the stated finite model and observed browser cases, not every browser, network
failure, or assistive technology.


## Publication boundary

The reviewed source and complete static build are prepared for publication.
Hosted-byte identity, old-tab upgrade behavior and public discovery remain
separate checks; their receipts will be recorded here after delivery.

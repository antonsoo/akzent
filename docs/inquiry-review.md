# Which consonant would you read next?

This extension is **local source work, not a published edition**. Start Akzent
with `npm run dev`, choose **Next reading**, and allow either event order.
The live Pages site and the Officina catalogue have not been changed by this work.

## The learning gap

The earlier inverse bench listed every accent/order scenario fitting a partial
output. It did not show whether another consonant could separate the survivors.
That distinction matters: missing data and information erased by the model need
different explanations.

The new inquiry compares both possible observations of each missing consonant,
shows exactly which scenarios each would retain, and lets the learner try a
conditional branch. It does not turn that trial into a historical observation.
The earlier checked proposal retains its own evidence and assumptions.

## Try the investigation

1. Choose **Allow either order**, then **Withhold all three consonants**.
   Eight scenarios remain: four accent positions under each of two event orders.
2. Compare the first-consonant branches. Reading **h** leaves five scenarios;
   **g** leaves three. Either other consonant has a one-versus-seven split.
   The first consonant minimizes the largest next branch for these inputs.
3. Try **g**, then **z**, then **þ**. The survivors decrease from three to two
   to one: accent 3 with voicing under the older accent first.
4. Choose **Try the shared complete output**. All of **h / z / d** is supplied,
   but five scenarios remain. Four have the early accent move, with any older
   accent; the fifth has voicing first and older accent 1.
5. Withhold all consonants again and try **h**. The missing **s/z** and **þ/d**
   positions now give no separation. Try **s** anyway: the working inputs become
   inconsistent. Impossible observations remain available as a deliberate test.
6. Inspect the four printed outputs on complete page 115. The accompanying
   German reading starts on page 114. These are two pages of one thought experiment.
7. Save the reading plan CSV, editable JSON and illustrated reading. The reading
   embeds the JSON and three CSV downloads. Reopen its JSON in Akzent to keep
   working; open or print the reading directly without scripts or a connection.

The first possible route with either order allowed is:

```text
Read first consonant
+-- h --> *ahazad(am): 5 scenarios; accents 1, 2, 3, 4
|         No remaining consonant separates them.
+-- g --> Read second consonant
          +-- s --> *agasad(am): 1 scenario; accent 2
          +-- z --> Read third consonant
                    +-- thorn --> *agazath(am): 1 scenario; accent 3
                    +-- d     --> *agazad(am): 1 scenario; accent 4
```

`thorn` / `th` in this ASCII diagram represents the printed dental sign `þ`;
the application, CSV, SVG and readings retain that sign.

## Source and model boundaries

The four outputs are printed at the top of Verner's
[complete p. 115](../public/sources/verner-115.png), continuing
[p. 114](../public/sources/verner-114.png).
[Scan provenance](../public/sources/provenance.json) identifies the original
volume and page mapping. The
[University of Texas comparative translation](https://lrc.la.utexas.edu/books/reader/11-k-verner)
provides another way to read the argument.

Withholding letters, choosing conditional observations, enumerating inverse
scenarios and comparing partitions are **modern instructional operations**.
No damaged historical witness, newly recovered accent, or probabilistic dating
of sound changes is claimed. The early-accent alternative is an intervention
on the explanation, not another set of attested words.

A scenario contains **both accent and order**. Five scenarios do not mean five
accent positions. The criterion minimizes the largest **scenario count**;
it does not minimize the largest count of distinct accents, assign equal
probabilities, maximize expected information, or prove a globally optimal tree.
At each step the route repeats that one-step rule and breaks ties in printed
consonant order. All tied tests remain marked as tied in the live comparison.

The complete-output groups make the ceiling visible. Scenarios in the same
group predict every consonant identically. Additional spelling from this word
cannot distinguish them under these assumptions. Independent evidence about
accent or event order would be a different input, outside this exercise.

## Design

The investigation extends Akzent's existing design: Gentium carries the word
forms and questions; Hanken carries controls and accounts. Light paper
`#faf9ff`, ink `#302342`, violet `#634087`, and teal `#17665c` retain their existing
roles; dark paper `#211a2c` and ink `#f1edf8` use the existing theme.

The new visual device is a grouping of named scenarios, rather than decorative
statistics. `1V` and `1A` share an accent position but differ in event order.
Every group has its count and accent positions in text. Branches sit alongside
each other on desktop and stack on phones. The inquiry has its own navigation
link and a nearby event-order control, so the learner can change that assumption
without scrolling back through the scenario ledger.

Keyboard branch actions move focus to the result notice after rerendering.
Source inspection focuses the existing source reader. Saved readings expand
the route and output groups; the print edition starts the inquiry on a new page.

## Verification

| Boundary                                     | Current evidence                                                                                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every partial-input combination              | Independent literal-endpoint checks in [inquiry.test.ts](../tests/inquiry.test.ts), all 81 evidence/order states                                                                                                                  |
| Actual inquiry in two browsers at 1440/375px | [Local inquiry receipt](audit/inquiry-local.json); navigation, branches, contradiction, unchanged proposal, keyboard focus, light/dark accessibility and overflow                                                                 |
| Exact downloaded accounts                    | [Independent artifact receipt](audit/inquiry-artifacts.json); standard-library Python reads the real CSVs without importing TypeScript                                                                                            |
| Portable work                                | JSON restored after changes; native embedded JSON and CSV downloads byte-compared; seven source images and both fonts checked; reading opened from disk with HTTP requests refused                                                |
| Offline operation                            | Actual preview process stopped and an independent fetch refused; controlled reload, inquiry, CSV, JSON and source inspection all worked                                                                                           |
| Primary source identity                      | [Fresh PDF render receipt](audit/inquiry-primary-renders.json); independently downloaded original PDF, all twelve complete retained images reproduced                                                                             |
| Existing workflows                           | [Forward reader](audit/inquiry-forward-regression.json), [inverse bench](audit/inquiry-inverse-regression.json), [source/offline](audit/inquiry-source-regression.json), [notebook recovery](audit/inquiry-draft-regression.json) |
| Clean installation and build                 | [Clean-build comparison](audit/inquiry-clean-build.json), including all deployed file hashes                                                                                                                                      |

Reproduce with Node 24+, Python 3, the installed Playwright browsers, and Poppler
for source/PDF inspection:

```sh
npm ci
npm run check
npm run test:inquiry
npm run verify:inquiry-artifacts
```

The inquiry browser driver starts and stops its own production preview server.
The ordinary inverse regression driver uses `npm run preview` on port 4391.
The independent CSV audit uses a separate literal transcription of the four
endpoints, not the application's inference or partition functions.

## Kept artifacts and remaining limits

[Reading plan JSON](../examples/inquiry/reading-plan.json),
[reading plan CSV](../examples/inquiry/reading-plan.csv),
[complete-output CSV](../examples/inquiry/shared-output.csv),
[illustrated PDF](../examples/inquiry/reading-plan.pdf) and the
[gzip-compressed HTML](../examples/inquiry/reading-plan.html.gz) are actual browser
downloads. Decompress the HTML before opening it:

```sh
gzip -dc examples/inquiry/reading-plan.html.gz > /tmp/akzent-reading-plan.html
```

This is a small finite model, not an etymology generator. The literal-table
oracle checks the computational consequences of the transcribed outputs; it
cannot independently certify a translation. New English and German phrase
notes have no second philological review. Automated accessibility results do
not establish usability for every learner or assistive technology.

Build with **`npm run build`**; the complete static output is **`dist/`**, with
base **`/akzent/`**. No push, deployment, release or remote CI success is claimed.
Existing catalogue entries continue to describe their earlier published lessons.


## Repository metadata

Suggested description: Read Verner’s sound law, compare possible accents, and
find which observations can distinguish the remaining explanations.

Topics: `historical-linguistics`, `etymology`, `verners-law`, `gothic`,
`sanskrit`, `interactive-learning`, `typescript`.

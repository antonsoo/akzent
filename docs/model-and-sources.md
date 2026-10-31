# Source concordance and boundaries

Karl Verner's _Eine ausnahme der ersten lautverschiebung_, volume 23 (1877),
pp. 97–130, is a nineteenth-century argument about ancient languages, not an
ancient linguistic text. It ends “Kopenhagen, juli 1875.” The workshop uses the
volume date while preserving that distinction.

## Eight comparisons

The selected target is the inherited dental only. Input accents are the
Sanskrit comparisons printed by Verner, normalized to modern IAST. The
predictor asks what follows **if that accent is used as the older accent**.
It does not reconstruct the correct older accent independently.

| Meaning        | Sanskrit display | Gothic display | Preceding syllable | Conventional prediction | Observation | Printed pages |
| -------------- | ---------------- | -------------- | ------------------ | ----------------------- | ----------- | ------------- |
| Father         | pitár-           | fadar          | Unaccented         | d                       | d           | 101, 117      |
| Brother        | bhrā́tar-         | brōþar         | Accented           | þ                       | þ           | 101, 117      |
| Other          | ántara-          | anþar          | Accented           | þ                       | þ           | 118           |
| Under / within | antár            | undar          | Unaccented         | d                       | d           | 118           |
| Hundred        | śatám            | hund           | Unaccented         | d                       | d           | 117           |
| There          | tátra            | þaþro          | Accented           | þ                       | þ           | 119           |
| Which of two   | katará-          | hvaþar         | Unaccented         | d                       | þ           | 99, 119       |
| Lord / husband | páti-            | -fadi-         | Accented           | þ                       | d           | 98, 119       |

For _there_, test the **second** dental. The first is word-initial, outside
medial voicing. _Hundred_ uses citation forms beside Verner's śatá-/hunda-;
its initial consonant, nasal, vowels and inflection are not derived by this
dental test. _-fadi-_ is a compound member, not an independently accented
Gothic noun here; Verner cites _brūþ-fadi-_ ‘bridegroom’.

The last two are not silently repaired. Verner explicitly includes them
in his resistant list on p. 119. A mismatch does not by itself refute the
historical law: Sanskrit accent can have its own history, compounds can
have different accent histories, and analogy can alter inherited patterns.
These possibilities also do not automatically explain a particular mismatch.
More comparative evidence is needed.

Greek _πότερος_, cited beside Sanskrit _katará-_, has a different accent.
The lesson exposes that disagreement. It does not declare one daughter
language's accent ancestral by fiat. Nor does it display _mōdar_ as attested
Gothic ‘mother’: Verner's Germanic comparison and Gothic lexical evidence
are different claims, as his discussion on p. 102 illustrates.

## The fictional word

The word is Verner's own “fingirtes indogermanisches wort” on p. 114.
Its four hypothetical spellings continue on p. 115:

| Older accent position | Hypothetical endpoint |
| --------------------- | --------------------- |
| 1                     | *ahazad(am)           |
| 2                     | *agasad(am)           |
| 3                     | *agazaþ(am)           |
| 4                     | *agazad(am)           |

The model assumes the first fricativization and represents its input to
voicing with modern _x s θ_. The accented preceding vowel protects its
following fricative; other medial fricatives voice to _ɣ z ð_. The endpoint
uses Verner's spelling, not a narrow phonetic transcription of Gothic.
Parenthesized _(am)_ follows his notation; its later development is not modeled.

```text
Older accent on syllable 3

*akasátam -> *aɣazáθam -> *áɣazaθam -> *agazaþ(am)
                |             |
          after voicing  after accent moves

Move the accent before voicing instead

*akasátam -> *ákasatam -> *áxazaðam -> *ahazad(am)
```

All forms here are **fictional**. An asterisk marks unattested status; it
does not make this invented word a reconstructed actual lexeme. The order
control demonstrates information loss within the schematic explanation.
It does not establish absolute dates or resolve the relative chronology
of every phase of Grimm's and Verner's laws.

## Inverse constraints on the fictional word

The inverse bench is a modern teaching exercise, not another quotation or a
claim that Verner reconstructed a word's accent this way. It enumerates the four
accent positions under each allowed event order. A question mark supplies no
constraint; each known consonant must equal its scenario's printed endpoint.
The account lists every mismatch, and distinguishes a fitting proposal from a
uniquely determined accent.

| Evidence  | Allowed order               | Possible old accents |
| --------- | --------------------------- | -------------------- |
| h / z / d | Voicing before accent moves | 1                    |
| h / z / d | Either order                | 1, 2, 3, 4           |
| g / z / þ | Either order                | 3                    |
| h / s / ? | Either order                | None                 |

The second row includes the four accent-first scenarios: fixing initial accent
before voicing discards the old accent before it can condition the consonants.
The last row asks for two protected consonants after distinct vowels, which
this one-accent model cannot supply. Neither result is a universal statement
about possible words or accent systems. All candidate forms remain fictional.

The checked proposal stores its own evidence, order assumption and accent.
Changing the current controls does not revise that earlier account. The CSV
and standalone reading preserve this distinction.

## Reading-to-page mapping

| Reading                   | Page    | Evidence                                                         |
| ------------------------- | ------- | ---------------------------------------------------------------- |
| What conditions the sound | 114     | Medial position, voiced environment, preceding accented syllable |
| Invented word             | 114–115 | Explicit fictional status and four outcomes                      |
| A rule must travel        | 117     | Requirement to explain cases beyond the initial evidence         |
| Resistant evidence        | 119     | Introductory sentence to the list of mismatches                  |
| Accent and loudness       | 115     | Sentence from the pitch/force footnote                           |
| Earlier accent            | 130     | Author's summary connecting the split to older accent            |

New English translations come from the retained German pages. The University
of Texas LRC's 1967 translation was consulted for comparison, not reused.
The German excerpts normalize line breaks and the dental type to þ; the
fictional-word excerpt marks omitted notation with an ellipsis. Complete
page images preserve the printed context. This is not a diplomatic edition.

## Retained-file identities

`public/sources/provenance.json` identifies the PDF by SHA-256 and records
printed/PDF/leaf mappings. Printed page n maps to PDF page n+6 or leaf n+5.
Complete pages were rendered with Poppler pdftoppm to grayscale PNG, longest
edge 2600px, without cropping or retouching.

`src/asset-manifest.json` pins sources, fonts, licenses, and provenance.
`npm run verify:sources` checks inventory, byte length, and SHA-256.
The source, translated excerpts, Gothic spellings, and symbolic reconstructions
remain separately inspectable claims.

## Primary-page audit and citation correction

A new download of the original 30,161,319-byte PDF matches the declared
SHA-256. Fresh complete-page Poppler renders match every retained PNG byte
for byte and every decoded RGB pixel. See the [render receipt](audit/primary-page-renders.json).

This reading found an early citation error: the Gothic compound example
_brūþ-fadi-_ and Sanskrit _páti-_ are on printed **98**, not 99. The later
resistant comparison remains on **119**. Page 98 is now retained and selectable;
the word card and CSV source references use **98, 119**. The portable reading
now embeds the complete p. 98 alongside the other six selected pages. The _katará-_
comparison correctly remains on **99, 119**. Normalizations and predictions are
unchanged. The volume title page prints 1877; p. 130 signs July 1875.

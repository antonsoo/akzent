import type { READING_IDS } from "./core/record.ts";

export interface Reading {
  id: (typeof READING_IDS)[number];
  title: string;
  page: number;
  german: string;
  english: string;
  notes: readonly { phrase: string; gloss: string }[];
}

/** New English translations from the retained German pages, not the 1967 translation. */
export const readings: readonly Reading[] = [
  {
    id: "rule",
    title: "What actually conditions the sound?",
    page: 114,
    german:
      "die so entstandenen tonlosen fricativae nebst der vom indogermanischen ererbten tonlosen fricativa s wurden weiter inlautend bei tönender nachbarschaft selbst tönend, erhielten sich aber als tonlose im nachlaute betonter silben.",
    english:
      "The voiceless fricatives that had arisen in this way, together with the voiceless fricative s inherited from Indo-European, further became voiced themselves inside a word in a voiced environment, but remained voiceless after accented syllables.",
    notes: [
      {
        phrase: "tonlosen / tönend",
        gloss:
          "Voiceless / voiced. These refer to vocal-fold vibration, not to quiet / loud. Modern German uses stimmlos / stimmhaft.",
      },
      {
        phrase: "inlautend",
        gloss:
          "Inside a word. A word-initial fricative is not licensed for this voicing simply because its word is unaccented.",
      },
      {
        phrase: "betonter silben",
        gloss:
          "Accented syllables. The immediately preceding syllable matters; an accent somewhere earlier in the word is not enough.",
      },
    ],
  },
  {
    id: "fiction",
    title: "A deliberately invented word",
    page: 114,
    german:
      "Ein fingirtes indogermanisches wort *akasatam entwickelte sich auf germanischem gebiete erst zu … je nachdem der accent auf der ersten, zweiten, dritten oder vierten silbe ruhte.",
    english:
      "An invented Indo-European word *akasatam developed in the Germanic area first into … according to whether the accent rested on the first, second, third, or fourth syllable.",
    notes: [
      {
        phrase: "fingirtes",
        gloss:
          "Invented, hypothetical. This word is a controlled thought experiment in Verner's article, not a recovered ancient word.",
      },
      {
        phrase: "je nachdem",
        gloss:
          "Depending on whether. The omitted middle contains his phonetic notation and alternatives; see the complete page and the continuation on p. 115.",
      },
    ],
  },
  {
    id: "test",
    title: "A rule has to travel beyond its first examples",
    page: 117,
    german:
      "Soll die regel allgemeine gültigkeit haben, so muss sie auch die differenzirung in allen übrigen fällen erklären können",
    english:
      "If the rule is to have general validity, it must also be able to explain the differentiation in all the other cases.",
    notes: [
      {
        phrase: "allgemeine gültigkeit",
        gloss:
          "General validity. Matching the starting pair is weaker than accounting for new material. Even eight comparisons do not establish a universal historical claim.",
      },
      {
        phrase: "übrigen fällen",
        gloss:
          "The remaining cases. Verner derived his account from verbal alternations before extending it to vocabulary and endings. This workshop reverses that teaching order.",
      },
    ],
  },
  {
    id: "exception",
    title: "Keep the resistant evidence",
    page: 119,
    german: "Von wörtern, bei denen die regel nicht passt, habe ich folgende notirt:",
    english: "Of words for which the rule does not fit, I have noted the following:",
    notes: [
      {
        phrase: "nicht passt",
        gloss:
          "Does not fit. The following list includes katará- beside Gothic hvaþar, and páti- beside the compound member -fadi-. The comparison's difficulty is part of the evidence.",
      },
      {
        phrase: "notirt",
        gloss:
          "Recorded; modern spelling notiert. An acknowledged mismatch is not permission to edit an observed form or assign an unattested accent without an argument.",
      },
    ],
  },
  {
    id: "accent",
    title: "Accent need not be loudness",
    page: 115,
    german:
      "Entweder geschieht das hervorheben einer silbe dadurch, dass die stimmbänder stärker gespannt werden; es entsteht dadurch ein höherer ton dem niedrigeren tone der unaccentuirten silben gegenüber.",
    english:
      "Either a syllable is made prominent by the vocal folds being tightened more strongly; this produces a higher pitch compared with the lower pitch of the unaccented syllables.",
    notes: [
      {
        phrase: "höherer ton",
        gloss:
          "Higher pitch. Verner's footnote distinguishes pitch from greater force. The movable mark in this workshop represents position, not a recording or a reconstruction of accent's acoustic realization.",
      },
      {
        phrase: "accentus / προσῳδία",
        gloss:
          "Verner cites these Latin and Greek names in the same note. Greek προσῳδία gives English prosody. Their presence does not make Sanskrit, Latin, or Greek the parent of Gothic.",
      },
    ],
  },
  {
    id: "conclusion",
    title: "The earlier accent leaves evidence",
    page: 130,
    german:
      "Wenn idg. k t p im inlaute sich im germanischen bald als h þ f, bald als g d b wiederfinden, so ist dies durch jene ältere accentuation bedingt.",
    english:
      "When Indo-European k t p inside a word appear in Germanic sometimes as h þ f, sometimes as g d b, this is conditioned by that earlier accentuation.",
    notes: [
      {
        phrase: "jene ältere accentuation",
        gloss:
          "That earlier accentuation. Later accent position can conceal the conditioning of an earlier change. This is an inference from comparative evidence, not a sound recording.",
      },
      {
        phrase: "idg.",
        gloss:
          "Indogermanisch, Indo-European. This is a historical language-family label. It is not a classification of people's genomes or ethnic identities.",
      },
    ],
  },
];

export function reading(id: string): Reading {
  const result = readings.find((item) => item.id === id);
  if (!result) throw new Error(`Unknown reading: ${id}`);
  return result;
}

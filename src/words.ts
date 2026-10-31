export interface Word {
  id: string;
  meaning: string;
  sanskrit: readonly [string, string, string];
  gothic: readonly [string, "þ" | "d", string];
  precedingAccented: boolean;
  group: "starting" | "unseen" | "resistant";
  pages: readonly number[];
  note: string;
  comparison?: { language: string; lang: string; form: string; note: string };
}

export const words: readonly Word[] = [
  {
    id: "father",
    meaning: "father",
    sanskrit: ["pi", "t", "ár-"],
    gothic: ["fa", "d", "ar"],
    precedingAccented: false,
    group: "starting",
    pages: [101, 117],
    note: "The Sanskrit stem has its accent after the dental. Gothic d is a spelling; between vowels it need not mean a modern English stop [d]. The initial f has a separate history.",
    comparison: {
      language: "Greek",
      lang: "grc",
      form: "πατήρ",
      note: "The nominative also has a late accent. This is a cognate, not a source from which Gothic was borrowed.",
    },
  },
  {
    id: "brother",
    meaning: "brother",
    sanskrit: ["bhrā́", "t", "ar-"],
    gothic: ["brō", "þ", "ar"],
    precedingAccented: true,
    group: "starting",
    pages: [101, 117],
    note: "The Sanskrit stem bears its accent before the dental. Gothic þ writes a voiceless dental fricative, like the th in English thin.",
    comparison: {
      language: "Latin",
      lang: "la",
      form: "frāter",
      note: "A cognate. The macron marks vowel length, not the inherited accent being tested here.",
    },
  },
  {
    id: "other",
    meaning: "other",
    sanskrit: ["án", "t", "ara-"],
    gothic: ["an", "þ", "ar"],
    precedingAccented: true,
    group: "unseen",
    pages: [118],
    note: "The preceding nasal n is voiced. The relevant question is the accent of the preceding syllable, not simply whether two vowels surround the consonant.",
  },
  {
    id: "under",
    meaning: "under / within",
    sanskrit: ["an", "t", "ár"],
    gothic: ["un", "d", "ar"],
    precedingAccented: false,
    group: "unseen",
    pages: [118],
    note: "Verner compares Sanskrit antár ‘within, under’ with Germanic undar. Contrast ántara- ‘other’: a similar-looking segment sequence with a different accent.",
    comparison: {
      language: "Latin",
      lang: "la",
      form: "inter",
      note: "Verner also cites Latin inter. Latin's own accent rules are not a substitute for the older accent in this comparison.",
    },
  },
  {
    id: "hundred",
    meaning: "hundred",
    sanskrit: ["śa", "t", "ám"],
    gothic: ["hun", "d", ""],
    precedingAccented: false,
    group: "unseen",
    pages: [117],
    note: "The selected target is the dental only. Verner prints the Sanskrit stem śatá- and Gothic hunda-; this display uses the citation forms śatám and hund. The initial consonants and syllabic nasal require other sound changes.",
    comparison: {
      language: "Greek",
      lang: "grc",
      form: "ἑκατόν",
      note: "The late Greek accent supplies another comparison; the first syllables do not have identical histories.",
    },
  },
  {
    id: "there",
    meaning: "there",
    sanskrit: ["tá", "t", "ra"],
    gothic: ["þa", "þ", "ro"],
    precedingAccented: true,
    group: "unseen",
    pages: [119],
    note: "Test the second dental. The first þ is word-initial and is outside the medial voicing condition. Verner compares tátra with Gothic þaþro; vowel quantity is not part of this test.",
  },
  {
    id: "which",
    meaning: "which of two",
    sanskrit: ["ka", "t", "ará-"],
    gothic: ["hva", "þ", "ar"],
    precedingAccented: false,
    group: "resistant",
    pages: [99, 119],
    note: "The accent is on the last syllable; the syllable immediately before t is unaccented. The simple comparison predicts d, but Gothic has þ. Verner explicitly lists this among words where the comparison does not fit. The workshop does not invent a missing accent to make it agree.",
    comparison: {
      language: "Greek",
      lang: "grc",
      form: "πότερος",
      note: "Greek has a different accent from Sanskrit katará-. Divergent daughter-language accents need explanation; Sanskrit is evidence for reconstruction, not the ancestral language itself.",
    },
  },
  {
    id: "lord",
    meaning: "lord / husband (in a compound)",
    sanskrit: ["pá", "t", "i-"],
    gothic: ["-fa", "d", "i-"],
    precedingAccented: true,
    group: "resistant",
    pages: [98, 119],
    note: "Gothic -fadi- occurs as the last member of a compound, for example brūþ-fadi- ‘bridegroom’. Comparing it with the independently accented Sanskrit páti- predicts þ, whereas the cited compound member has d. Compound accent is a relevant issue; these rows alone do not settle its history.",
    comparison: {
      language: "Greek",
      lang: "grc",
      form: "πόσις",
      note: "‘Husband, lord.’ This related form keeps an early accent. The comparison is with a Gothic compound member, not an identically used free word.",
    },
  },
];

export function word(id: string): Word {
  const found = words.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown word: ${id}`);
  return found;
}

export const form = (parts: readonly string[]): string => parts.join("");

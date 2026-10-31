export type Outcome = "voiceless" | "voiced";
export interface Rule {
  accented: Outcome;
  unaccented: Outcome;
}
export type Accent = 0 | 1 | 2 | 3;
export type Order = "sounds-first" | "accent-first";

export const INITIAL_RULE: Rule = { accented: "voiceless", unaccented: "voiceless" };
export const VERNER_RULE: Rule = { accented: "voiceless", unaccented: "voiced" };

export function predictDental(rule: Rule, precedingAccented: boolean): "þ" | "d" {
  return rule[precedingAccented ? "accented" : "unaccented"] === "voiced" ? "d" : "þ";
}

export interface Experiment {
  accent: Accent;
  order: Order;
  effectiveAccent: Accent;
  fricatives: readonly ["h" | "g", "s" | "z", "þ" | "d"];
  intermediate: string;
  later: string;
  endpoint: string;
}

/** A modern symbolic implementation of Verner's expressly fictional *akasatam, pp. 114–115. */
export function experiment(accent: Accent, order: Order): Experiment {
  const effectiveAccent = order === "accent-first" ? 0 : accent;
  const fricatives = [
    effectiveAccent === 0 ? "h" : "g",
    effectiveAccent === 1 ? "s" : "z",
    effectiveAccent === 2 ? "þ" : "d",
  ] as const;
  const [k, s, t] = fricatives;
  const vowels = ["a", "a", "a", "am"];
  const sounds = [k === "h" ? "x" : "ɣ", s, t === "þ" ? "θ" : "ð"];
  const phonetic = (position: Accent): string =>
    `*${vowels.map((vowel, index) => `${index === position ? vowel.replace("a", "á") : vowel}${sounds[index] ?? ""}`).join("")}`;
  const intermediate = phonetic(effectiveAccent);
  return {
    accent,
    order,
    effectiveAccent,
    fricatives,
    intermediate,
    later: phonetic(0),
    endpoint: `*a${k}a${s}a${t}(am)`,
  };
}

export interface Conditions {
  initial: boolean;
  voicedNeighbors: boolean;
  precedingAccented: boolean;
}

/** Scope conditions are independent of a lexical comparison's agreement. */
export function voiceFricative(conditions: Conditions): { voiced: boolean; reason: string } {
  if (conditions.initial)
    return {
      voiced: false,
      reason: "A word-initial fricative is outside this medial voicing rule.",
    };
  if (!conditions.voicedNeighbors)
    return {
      voiced: false,
      reason: "A voiceless neighbor blocks the voiced environment assumed here.",
    };
  if (conditions.precedingAccented)
    return { voiced: false, reason: "The immediately preceding syllable bears the older accent." };
  return {
    voiced: true,
    reason: "Medial, voiced neighbors, and no older accent immediately before.",
  };
}

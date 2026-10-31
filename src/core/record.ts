import { words } from "../words.ts";
import type { Accent, Conditions, Order, Outcome, Rule } from "./model.ts";
import { INITIAL_RULE, predictDental } from "./model.ts";

export interface Trial {
  word: string;
  rule: Rule;
  prediction: "þ" | "d";
}
export interface Notebook {
  schema: "akzent-notebook";
  version: 1;
  rule: Rule;
  selected: string;
  revealed: string[];
  trials: Trial[];
  accent: Accent;
  order: Order;
  conditions: Conditions;
  citations: string[];
  note: string;
}

export function initialNotebook(): Notebook {
  return {
    schema: "akzent-notebook",
    version: 1,
    rule: { ...INITIAL_RULE },
    selected: "father",
    revealed: ["father", "brother"],
    trials: [],
    accent: 0,
    order: "sounds-first",
    conditions: { initial: false, voicedNeighbors: true, precedingAccented: false },
    citations: [],
    note: "",
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("The notebook must contain an object.");
  return value as Record<string, unknown>;
}
function outcome(value: unknown): Outcome {
  if (value !== "voiced" && value !== "voiceless") throw new Error("Unknown rule outcome.");
  return value;
}
function rule(value: unknown): Rule {
  const item = object(value);
  return { accented: outcome(item.accented), unaccented: outcome(item.unaccented) };
}
function wordId(value: unknown): string {
  if (typeof value !== "string" || !words.some((item) => item.id === value))
    throw new Error("The notebook names a word outside this edition.");
  return value;
}

export const READING_IDS = [
  "rule",
  "fiction",
  "test",
  "exception",
  "accent",
  "conclusion",
] as const;
export function parseNotebook(value: unknown): Notebook {
  const item = object(value);
  if (item.schema !== "akzent-notebook" || item.version !== 1)
    throw new Error("Choose an Akzent version-1 notebook JSON file.");
  const conditions =
    item.conditions === undefined ? initialNotebook().conditions : object(item.conditions);
  if (
    typeof conditions.initial !== "boolean" ||
    typeof conditions.voicedNeighbors !== "boolean" ||
    typeof conditions.precedingAccented !== "boolean"
  )
    throw new Error("The environment test requires three yes/no conditions.");
  if (!Array.isArray(item.revealed) || item.revealed.length > words.length)
    throw new Error("The revealed-word list is invalid.");
  const revealed = item.revealed.map(wordId);
  if (
    new Set(revealed).size !== revealed.length ||
    !revealed.includes("father") ||
    !revealed.includes("brother")
  )
    throw new Error("The revealed words must be unique and include the starting pair.");
  if (!Array.isArray(item.trials) || item.trials.length > 32)
    throw new Error("Keep at most 32 prediction records in a notebook.");
  const trials = item.trials.map((entry): Trial => {
    const trial = object(entry);
    const id = wordId(trial.word);
    const source = words.find((entry) => entry.id === id);
    const savedRule = rule(trial.rule);
    if (!source) throw new Error("Unknown prediction source.");
    const prediction = predictDental(savedRule, source.precedingAccented);
    if (trial.prediction !== prediction)
      throw new Error("A saved prediction does not follow from its saved rule.");
    if (!revealed.includes(id)) throw new Error("A tested word must also be revealed.");
    return { word: id, rule: savedRule, prediction };
  });
  if (![0, 1, 2, 3].includes(item.accent as number))
    throw new Error("Choose one of the four accents.");
  if (item.order !== "sounds-first" && item.order !== "accent-first")
    throw new Error("Unknown event order.");
  if (
    !Array.isArray(item.citations) ||
    item.citations.length > READING_IDS.length ||
    !item.citations.every((id) => READING_IDS.includes(id)) ||
    new Set(item.citations).size !== item.citations.length
  )
    throw new Error("The notebook contains invalid or repeated reading references.");
  if (typeof item.note !== "string" || item.note.length > 8000)
    throw new Error("Keep your explanation within 8,000 characters.");
  return {
    schema: "akzent-notebook",
    version: 1,
    rule: rule(item.rule),
    selected: wordId(item.selected),
    revealed,
    trials,
    accent: item.accent as Accent,
    order: item.order,
    conditions: {
      initial: conditions.initial,
      voicedNeighbors: conditions.voicedNeighbors,
      precedingAccented: conditions.precedingAccented,
    },
    citations: [...item.citations],
    note: item.note,
  };
}

export function readNotebook(text: string): Notebook {
  if (text.length > 100_000) throw new Error("Choose a notebook smaller than 100 KB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON. The current notebook has been kept.");
  }
  return parseNotebook(value);
}

export function snapshot(value: Notebook): Notebook {
  return parseNotebook(JSON.parse(JSON.stringify(value)));
}

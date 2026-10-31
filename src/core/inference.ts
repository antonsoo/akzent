import { type Accent, experiment, type Order } from "./model.ts";

export interface Evidence {
  dorsal: "?" | "h" | "g";
  sibilant: "?" | "s" | "z";
  dental: "?" | "þ" | "d";
}
export type AssumedOrder = Order | "unknown";
export interface Proposal {
  evidence: Evidence;
  order: AssumedOrder;
  accent: Accent;
}
export interface InferenceState {
  evidence: Evidence;
  order: AssumedOrder;
  accent: Accent;
  submitted: Proposal | null;
}
export interface Scenario {
  accent: Accent;
  order: Order;
  endpoint: string;
  fits: boolean;
  conflicts: string[];
}

export function initialInference(): InferenceState {
  return {
    evidence: { dorsal: "?", sibilant: "?", dental: "?" },
    order: "sounds-first",
    accent: 0,
    submitted: null,
  };
}

/** Enumerate the small thought experiment; no lexical or ancestral reconstruction is inferred. */
export function inferAccents(evidence: Evidence, assumed: AssumedOrder): Scenario[] {
  const orders: Order[] = assumed === "unknown" ? ["sounds-first", "accent-first"] : [assumed];
  const scenarios: Scenario[] = [];
  for (const order of orders)
    for (const accent of [0, 1, 2, 3] as const) {
      const result = experiment(accent, order);
      const comparisons = [
        { name: "First consonant", observed: evidence.dorsal, actual: result.fricatives[0] },
        { name: "Second consonant", observed: evidence.sibilant, actual: result.fricatives[1] },
        { name: "Third consonant", observed: evidence.dental, actual: result.fricatives[2] },
      ];
      const conflicts = comparisons
        .filter((item) => item.observed !== "?" && item.observed !== item.actual)
        .map((item) => `${item.name}: evidence ${item.observed}, model ${item.actual}.`);
      scenarios.push({
        accent,
        order,
        endpoint: result.endpoint,
        fits: conflicts.length === 0,
        conflicts,
      });
    }
  return scenarios;
}

export function inferenceSummary(evidence: Evidence, order: AssumedOrder): string {
  const fits = inferAccents(evidence, order).filter((item) => item.fits);
  const accents = [...new Set(fits.map((item) => item.accent))];
  if (!fits.length)
    return "No scenario fits. These consonants cannot coexist under this one-accent model and the selected event order.";
  if (accents.length === 1)
    return `Only older accent position ${(accents[0] ?? 0) + 1} fits the selected evidence in this model.`;
  return `Older accent positions ${accents.map((accent) => accent + 1).join(", ")} remain possible. The selected consonants and order assumption do not identify one older accent.`;
}

export function checkProposal(proposal: Proposal): string {
  const scenarios = inferAccents(proposal.evidence, proposal.order);
  const matching = scenarios.filter((item) => item.accent === proposal.accent);
  if (!matching.some((item) => item.fits))
    return `Position ${proposal.accent + 1} is excluded. ${matching.map((item) => `${item.order === "sounds-first" ? "Voicing first" : "Accent first"}: ${item.conflicts.join(" ")}`).join(" ")}`;
  const other = scenarios.some((item) => item.fits && item.accent !== proposal.accent);
  return other
    ? `Position ${proposal.accent + 1} is compatible, but other older accents also fit. A compatible proposal is not uniquely determined.`
    : `Position ${proposal.accent + 1} is the only older accent compatible with the selected evidence and order assumption. This result belongs to Verner's fictional word.`;
}

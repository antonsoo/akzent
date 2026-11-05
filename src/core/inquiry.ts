import { type AssumedOrder, type Evidence, inferAccents, type Scenario } from "./inference.ts";
import { experiment } from "./model.ts";

export const consonants = [
  { key: "dorsal", label: "First consonant", values: ["h", "g"], index: 0 },
  { key: "sibilant", label: "Second consonant", values: ["s", "z"], index: 1 },
  { key: "dental", label: "Third consonant", values: ["þ", "d"], index: 2 },
] as const;
export type Consonant = (typeof consonants)[number];
export interface ObservationBranch {
  value: string;
  scenarios: Scenario[];
}
export interface ReadingTest {
  consonant: Consonant;
  branches: ObservationBranch[];
  worst: number;
  informative: boolean;
  recommended: boolean;
  worstAccents: number;
  accentInformative: boolean;
  recommendedForAccent: boolean;
}
export interface EndpointGroup {
  output: string;
  scenarios: Scenario[];
}
export interface Inquiry {
  scenarios: Scenario[];
  tests: ReadingTest[];
  endpoints: EndpointGroup[];
}

export const accentCount = (scenarios: Scenario[]): number =>
  new Set(scenarios.map((item) => item.accent)).size;

/** A finite partition of explanations, not a probability distribution over historical events. */
export function planInquiry(evidence: Evidence, order: AssumedOrder): Inquiry {
  const scenarios = inferAccents(evidence, order).filter((item) => item.fits);
  const tests = consonants
    .filter((consonant) => evidence[consonant.key] === "?")
    .map((consonant) => {
      const branches = consonant.values.map((value) => ({
        value,
        scenarios: scenarios.filter(
          (item) => experiment(item.accent, item.order).fricatives[consonant.index] === value,
        ),
      }));
      const worst = Math.max(...branches.map((branch) => branch.scenarios.length));
      return {
        consonant,
        branches,
        worst,
        informative: branches.filter((branch) => branch.scenarios.length > 0).length > 1,
        recommended: false,
        worstAccents: Math.max(...branches.map((branch) => accentCount(branch.scenarios))),
        accentInformative: branches.some(
          (branch) =>
            branch.scenarios.length > 0 && accentCount(branch.scenarios) < accentCount(scenarios),
        ),
        recommendedForAccent: false,
      };
    });
  const best = Math.min(...tests.filter((item) => item.informative).map((item) => item.worst));
  for (const item of tests) item.recommended = item.informative && item.worst === best;
  const bestAccent = Math.min(
    ...tests.filter((item) => item.accentInformative).map((item) => item.worstAccents),
  );
  for (const item of tests)
    item.recommendedForAccent = item.accentInformative && item.worstAccents === bestAccent;
  const endpoints: EndpointGroup[] = [];
  for (const scenario of scenarios) {
    const group = endpoints.find((item) => item.output === scenario.endpoint);
    if (group) group.scenarios.push(scenario);
    else endpoints.push({ output: scenario.endpoint, scenarios: [scenario] });
  }
  return { scenarios, tests, endpoints };
}

export interface ReadingRoute {
  scenarios: Scenario[];
  test: Consonant | null;
  branches: { value: string; route: ReadingRoute }[];
}

/** Follow the smallest largest branch at each step; ties keep printed consonant order.
 * This is a one-step minimax rule, not a claim that every resulting tree is globally optimal.
 */
export function readingRoute(evidence: Evidence, order: AssumedOrder): ReadingRoute {
  const plan = planInquiry(evidence, order);
  const next = plan.tests.find((item) => item.recommended);
  return {
    scenarios: plan.scenarios,
    test: next?.consonant ?? null,
    branches: next
      ? next.branches
          .filter((branch) => branch.scenarios.length > 0)
          .map((branch) => ({
            value: branch.value,
            route: readingRoute({ ...evidence, [next.consonant.key]: branch.value }, order),
          }))
      : [],
  };
}

export function inquiryCsv(evidence: Evidence, order: AssumedOrder): string {
  const plan = planInquiry(evidence, order);
  const header = [
    "kind",
    "first_evidence",
    "second_evidence",
    "third_evidence",
    "order_assumption",
    "test",
    "possible_observation",
    "older_accent",
    "event_order",
    "hypothetical_output",
    "branch_scenarios",
    "largest_branch",
    "recommended",
    "branch_accent_positions",
    "largest_accent_branch",
    "recommended_for_accent",
  ];
  const rows: (string | number | boolean)[][] = [];
  const prefix = [evidence.dorsal, evidence.sibilant, evidence.dental, order];
  for (const test of plan.tests) {
    for (const branch of test.branches) {
      const suffix = [
        branch.scenarios.length,
        test.worst,
        test.recommended,
        [...new Set(branch.scenarios.map((item) => item.accent + 1))].sort().join(";"),
        test.worstAccents,
        test.recommendedForAccent,
      ];
      if (!branch.scenarios.length)
        rows.push([
          "possible-reading",
          ...prefix,
          test.consonant.key,
          branch.value,
          "",
          "",
          "",
          ...suffix,
        ]);
      for (const scenario of branch.scenarios)
        rows.push([
          "possible-reading",
          ...prefix,
          test.consonant.key,
          branch.value,
          scenario.accent + 1,
          scenario.order,
          scenario.endpoint,
          ...suffix,
        ]);
    }
  }
  for (const group of plan.endpoints)
    for (const scenario of group.scenarios)
      rows.push([
        "complete-output",
        ...prefix,
        "all-consonants",
        "",
        scenario.accent + 1,
        scenario.order,
        group.output,
        group.scenarios.length,
        "",
        "",
        [...new Set(group.scenarios.map((item) => item.accent + 1))].sort().join(";"),
        "",
        "",
      ]);
  if (!plan.scenarios.length)
    rows.push(["inconsistent-evidence", ...prefix, "", "", "", "", "", 0, "", "", "", "", ""]);
  const source = "Karl Verner, Eine ausnahme der ersten lautverschiebung, 23 (1877), pp. 114-115";
  const scope = "Modern conditional exercise on fictional outputs; counts are not probabilities";
  const complete = [[...header, "source", "scope"], ...rows.map((row) => [...row, source, scope])];
  return `\uFEFF${complete.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n")}\r\n`;
}

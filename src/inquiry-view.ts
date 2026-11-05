import type { AssumedOrder, Evidence, Scenario } from "./core/inference.ts";
import { planInquiry, type ReadingRoute, readingRoute } from "./core/inquiry.ts";
import { escapeHtml as e } from "./html.ts";

const count = (n: number): string => `${n} scenario${n === 1 ? "" : "s"}`;
const accents = (scenarios: Scenario[]): string =>
  [...new Set(scenarios.map((item) => item.accent + 1))].sort().join(", ");
function tokens(scenarios: Scenario[]): string {
  return `<span class="scenario-tokens">${scenarios.map((item) => `<span class="scenario-token" aria-label="Accent ${item.accent + 1}, ${item.order === "sounds-first" ? "voicing first" : "accent fixed first"}">${item.accent + 1}${item.order === "sounds-first" ? "V" : "A"}</span>`).join("")}</span>`;
}
function routeMarkup(route: ReadingRoute): string {
  if (!route.test)
    return `<p class="route-leaf">${route.scenarios.length ? `<span class="word">${e(route.scenarios[0]?.endpoint ?? "")}</span>: ${count(route.scenarios.length)}; older accent ${accents(route.scenarios)}.${route.scenarios.length > 1 ? " All three consonants are identical across these scenarios." : " One explanation remains within this model."}` : "No scenario fits these inputs."}</p>`;
  return `<p>Read the ${route.test.label.toLowerCase()}.</p><ul>${route.branches.map((branch) => `<li><strong>If ${e(branch.value)}</strong>${routeMarkup(branch.route)}</li>`).join("")}</ul>`;
}

export function inquiryMarkup(
  evidence: Evidence,
  order: AssumedOrder,
  interactive = false,
): string {
  const plan = planInquiry(evidence, order);
  const informative = plan.tests.some((item) => item.informative);
  const ambiguous = plan.endpoints.filter((item) => item.scenarios.length > 1);
  const all = [evidence.dorsal, evidence.sibilant, evidence.dental].every((item) => item !== "?");
  const summary = !plan.scenarios.length
    ? "No next reading can rescue these inputs within the selected model. Revisit a selected consonant or the event-order assumption."
    : plan.scenarios.length === 1
      ? "One explanation remains in this model. The missing consonants, if any, only check its predictions."
      : informative
        ? "Different readings leave different explanations. Compare their largest branches."
        : all
          ? "Every consonant is supplied, yet different explanations remain. More complete spelling cannot separate them in this model."
          : "The remaining scenarios predict the same complete output. Reading the missing consonants cannot separate them in this model.";
  return `<p class="inquiry-context">Working evidence <strong>${e(evidence.dorsal)} / ${e(evidence.sibilant)} / ${e(evidence.dental)}</strong> leaves ${count(plan.scenarios.length)}. A scenario pairs an older accent with an event order.</p><p class="inquiry-summary">${summary}</p>
${plan.scenarios.length ? `<p class="token-key">Each tile names an accent position and an order: <b>V</b> = voicing first; <b>A</b> = accent fixed first.</p>` : ""}
${plan.scenarios.length && plan.tests.length ? `<p class="small">A smaller largest branch keeps fewer explanations in the least favorable outcome. Ties stay tied. Counts are not probabilities.</p><ol class="reading-tests">${plan.tests.map((test) => `<li><div class="test-heading"><h4>${test.consonant.label}</h4><p>${test.recommended ? "Smallest largest branch" : test.informative ? "Larger worst case" : "No separation"}: <strong>${count(test.worst)}</strong></p></div><div class="reading-outcomes">${test.branches.map((branch) => `<div class="reading-outcome"><p class="outcome-title">If <strong class="word">${e(branch.value)}</strong>: ${count(branch.scenarios.length)}</p>${branch.scenarios.length ? `${tokens(branch.scenarios)}<p class="small">Older accent ${accents(branch.scenarios)}</p>` : '<p class="small">Would contradict the current inputs and model.</p>'}${interactive ? `<button type="button" data-inquiry-key="${test.consonant.key}" data-inquiry-value="${e(branch.value)}">Try ${e(branch.value)} here</button>` : ""}</div>`).join("")}</div></li>`).join("")}</ol>` : ""}
${plan.scenarios.length ? `<details class="reading-route"${interactive ? "" : " open"}><summary>A possible route through the remaining readings</summary><p class="small">At each step, use a test with the smallest largest branch; ties use the first consonant in printed order. This route stops when every surviving scenario has the same complete output. It may still leave several older accents.</p>${routeMarkup(readingRoute(evidence, order))}</details><details class="output-groups"${ambiguous.length || !interactive ? " open" : ""}><summary>What if every consonant were known?</summary><p>Group the surviving scenarios by their complete hypothetical output. A shared output cannot distinguish its explanations, even with perfect reading.</p><ul>${plan.endpoints.map((group) => `<li><strong class="word">${e(group.output)}</strong>${tokens(group.scenarios)}<p>${count(group.scenarios.length)}; older accent ${accents(group.scenarios)}.</p></li>`).join("")}</ul>${ambiguous.length ? "<p>The ambiguity is built into the chosen event-order model. Independent evidence about the older accent or the order of changes would be needed; this fictional spelling supplies neither.</p>" : "<p>Each remaining complete output identifies one scenario within these assumptions.</p>"}</details>` : ""}`;
}

import type { Accent, Order, Rule } from "./core/model.ts";
import { experiment, predictDental } from "./core/model.ts";
import type { Notebook } from "./core/record.ts";
import { escapeHtml as e } from "./html.ts";
import { form, word } from "./words.ts";

export const ruleDescription = (rule: Rule): string =>
  `After an accented syllable: ${predictDental(rule, true)}; after an unaccented syllable: ${predictDental(rule, false)}.`;

export function chunks(parts: readonly string[], lang: string): string {
  return `<span class="word" lang="${lang}">${e(parts[0] ?? "")}<mark>${e(parts[1] ?? "")}</mark>${e(parts[2] ?? "")}</span>`;
}

export function accentedWord(accent: Accent): string {
  return ["a", "ka", "sa", "tam"]
    .map((part, index) => (index === accent ? part.replace("a", "á") : part))
    .join("");
}

export function experimentMarkup(accent: Accent, order: Order): string {
  const result = experiment(accent, order);
  const rows =
    order === "sounds-first"
      ? [
          [
            "Older accent",
            `*${accentedWord(accent)}`,
            "A fictional input; the selected accent has not moved.",
          ],
          [
            "Medial voicing",
            result.intermediate,
            "Only the fricative immediately after the old accent stays voiceless.",
          ],
          [
            "Later accent",
            result.later,
            "Moving the accent now does not undo the consonant differences.",
          ],
          [
            "Verner’s spelling",
            result.endpoint,
            "His hypothetical Gothic endpoint; (am) brackets the ending.",
          ],
        ]
      : [
          [
            "Older accent",
            `*${accentedWord(accent)}`,
            "The same fictional input as in the other order.",
          ],
          [
            "Earlier accent move",
            "*ákasatam",
            "All four starting accents collapse to one before the voicing test.",
          ],
          [
            "Medial voicing",
            result.intermediate,
            "Only the first fricative now follows the accented syllable.",
          ],
          [
            "Hypothetical spelling",
            result.endpoint,
            "This order loses the older accent contrast in the consonants.",
          ],
        ];
  return `<ol class="stages">${rows.map(([label, value, note]) => `<li><span>${e(label ?? "")}</span><strong>${e(value ?? "")}</strong><p>${e(note ?? "")}</p></li>`).join("")}</ol>`;
}

export function experimentSvg(accent: Accent, order: Order): string {
  const result = experiment(accent, order);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="480" viewBox="0 0 1100 480" role="img" aria-labelledby="title desc">
<title id="title">Verner’s invented word, accent ${accent + 1}</title>
<desc id="desc">${e(order === "sounds-first" ? "Voicing under the older accent, then the later accent move." : "Accent fixed to the first syllable before voicing.")} ${e(result.endpoint)}. All forms are hypothetical.</desc>
<rect width="1100" height="480" fill="#faf9ff"/>
<g fill="#302342" font-family="Gentium,Georgia,serif"><text x="55" y="65" font-size="26">Akzent / Verner’s explicitly invented word</text>
<text x="55" y="150" font-size="58">*${e(accentedWord(accent))}</text>
<text x="490" y="150" font-size="58">${e(result.endpoint)}</text>
<text x="55" y="205" font-size="22">Older accent on syllable ${accent + 1}</text>
<text x="490" y="205" font-size="22">Hypothetical endpoint</text>
<text x="55" y="275" font-size="24">${e(order === "sounds-first" ? "Voice under the old accent; move the accent later." : "Fix the first-syllable accent; apply voicing afterwards.")}</text>
<text x="55" y="325" font-size="22">Medial fricatives: ${e(result.intermediate)}</text>
<text x="55" y="380" font-size="19">A modern symbolic reworking of pp. 114–115. No form here is attested.</text>
<text x="55" y="420" font-size="19">Karl Verner, Eine ausnahme der ersten lautverschiebung, volume 23 (1877).</text></g>
<path d="M355 135h95m-18-12 18 12-18 12" fill="none" stroke="#634087" stroke-width="3"/>
</svg>`;
}

export function ledgerMarkup(state: Notebook): string {
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="Word comparisons; arrow keys scroll the table"><table><caption>Current rule against revealed observations</caption><thead><tr><th scope="col">Meaning</th><th scope="col">Sanskrit comparison</th><th scope="col">Prediction</th><th scope="col">Gothic observation</th><th scope="col">Result</th></tr></thead><tbody>${state.revealed
    .map((id) => {
      const item = word(id);
      const prediction = predictDental(state.rule, item.precedingAccented);
      const agrees = prediction === item.gothic[1];
      return `<tr><th scope="row">${e(item.meaning)}</th><td lang="sa-Latn">${e(form(item.sanskrit))}</td><td>${prediction}</td><td lang="got-Latn">${e(form(item.gothic))}</td><td>${agrees ? "Agrees" : "Resists"}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}

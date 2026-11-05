import { asset, dataUrl, verifiedBytes } from "./assets.ts";
import { type AssumedOrder, type Evidence, inferAccents } from "./core/inference.ts";
import { inquiryCsv } from "./core/inquiry.ts";
import { predictDental, voiceFricative } from "./core/model.ts";
import { type Notebook, snapshot } from "./core/record.ts";
import { escapeHtml as e } from "./html.ts";
import { inquiryMarkup } from "./inquiry-view.ts";
import {
  experimentMarkup,
  experimentSvg,
  inferenceMarkup,
  ledgerMarkup,
  ruleDescription,
} from "./presentation.ts";
import { readings } from "./readings.ts";
import { form, word } from "./words.ts";

export function comparisonCsv(state: Notebook): string {
  const rows: (string | number)[][] = [
    [
      "kind",
      "word",
      "meaning",
      "sanskrit",
      "gothic",
      "preceding_syllable_accented",
      "after_accented",
      "after_unaccented",
      "prediction",
      "observation",
      "agrees",
      "source_pages",
    ],
    ...state.revealed.map((id) => {
      const entry = word(id);
      const prediction = predictDental(state.rule, entry.precedingAccented);
      return [
        "current-rule",
        id,
        entry.meaning,
        form(entry.sanskrit),
        form(entry.gothic),
        String(entry.precedingAccented),
        state.rule.accented,
        state.rule.unaccented,
        prediction,
        entry.gothic[1],
        String(prediction === entry.gothic[1]),
        entry.pages.join(";"),
      ];
    }),
    ...state.trials.map((trial) => {
      const entry = word(trial.word);
      return [
        "fixed-prediction",
        trial.word,
        entry.meaning,
        form(entry.sanskrit),
        form(entry.gothic),
        String(entry.precedingAccented),
        trial.rule.accented,
        trial.rule.unaccented,
        trial.prediction,
        entry.gothic[1],
        String(trial.prediction === entry.gothic[1]),
        entry.pages.join(";"),
      ];
    }),
  ];
  return `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n")}\r\n`;
}

export function inferenceCsv(state: Notebook): string {
  const rows: (string | number)[][] = [
    [
      "account",
      "first_evidence",
      "second_evidence",
      "third_evidence",
      "order_assumption",
      "candidate_older_accent",
      "candidate_order",
      "hypothetical_output",
      "fits",
      "conflicts",
      "proposed_older_accent",
    ],
  ];
  const append = (kind: string, evidence: Evidence, order: AssumedOrder, accent: number) => {
    for (const item of inferAccents(evidence, order))
      rows.push([
        kind,
        evidence.dorsal,
        evidence.sibilant,
        evidence.dental,
        order,
        item.accent + 1,
        item.order,
        item.endpoint,
        String(item.fits),
        item.conflicts.join(" "),
        accent + 1,
      ]);
  };
  append(
    "current-evidence",
    state.inference.evidence,
    state.inference.order,
    state.inference.accent,
  );
  const saved = state.inference.submitted;
  if (saved) append("checked-proposal", saved.evidence, saved.order, saved.accent);
  return `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n")}\r\n`;
}

export async function notebookHtml(input: Notebook, signal?: AbortSignal): Promise<string> {
  // Capture before the first asset request. Editing the live page cannot change this export.
  const state = snapshot(input);
  const pages = [98, 114, 115, 117, 118, 119, 130];
  const [gentium, sans, images] = await Promise.all([
    dataUrl(asset("fonts/gentium.ttf"), signal),
    dataUrl(asset("fonts/hanken-latin.woff2"), signal),
    Promise.all(
      pages.map(async (page) => ({
        page,
        file: asset(`sources/verner-${page}.png`),
        url: await dataUrl(asset(`sources/verner-${page}.png`), signal),
      })),
    ),
  ]);
  const licenses = await Promise.all(
    ["gentium-OFL.txt", "hanken-OFL.txt"].map(async (name) => {
      const file = asset(`fonts/${name}`);
      return { name, text: new TextDecoder().decode(await verifiedBytes(file, signal)) };
    }),
  );
  signal?.throwIfAborted();
  const fixed = state.trials
    .map((trial, index) => {
      const item = word(trial.word);
      return `<li><strong>Prediction ${index + 1}: ${e(item.meaning)}</strong><p>${e(ruleDescription(trial.rule))} Predicted ${trial.prediction}; observed ${e(form(item.gothic))}.</p></li>`;
    })
    .join("");
  const retainedDownload = (name: string, mime: string, content: string, label: string): string =>
    `<a download="${name}" href="data:${mime};charset=utf-8,${encodeURIComponent(content)}">${label}</a>`;
  const downloads = [
    retainedDownload(
      "akzent-notebook.json",
      "application/json",
      JSON.stringify(state, null, 2),
      "Editable notebook JSON",
    ),
    retainedDownload(
      "akzent-reading-plan.csv",
      "text/csv",
      inquiryCsv(state.inference.evidence, state.inference.order),
      "Reading plan CSV",
    ),
    retainedDownload(
      "akzent-accent-account.csv",
      "text/csv",
      inferenceCsv(state),
      "Accent account CSV",
    ),
    retainedDownload(
      "akzent-comparisons.csv",
      "text/csv",
      comparisonCsv(state),
      "Word comparisons CSV",
    ),
  ];
  const json = JSON.stringify(state, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Akzent / a comparison notebook</title><style>
@font-face{font-family:Gentium;src:url('${gentium}')}@font-face{font-family:Hanken;src:url('${sans}')}*{box-sizing:border-box}body{max-width:1050px;margin:auto;padding:40px 24px;background:#faf9ff;color:#302342;font:18px/1.55 Hanken,sans-serif}h1,h2,h3,.word,[lang=de],[lang=sa-Latn],[lang=got-Latn],[lang=grc],[lang=la]{font-family:Gentium,serif}h1{font-size:48px}h2{font-size:34px;margin-top:2em}a{color:#634087}p{max-width:76ch}table{border-collapse:collapse;width:100%;font-size:16px}th,td{padding:10px;text-align:left;border-bottom:1px solid #a99ab9}caption{text-align:left;font-weight:bold}.table-scroll{overflow:auto}.stages{padding-left:24px}.stages strong{font:30px Gentium,serif;margin-left:20px}blockquote{margin:24px 0;padding:20px;background:#ebe5f6}blockquote p{margin:8px 0}.notes{white-space:pre-wrap;overflow-wrap:anywhere}.source-page{max-width:100%;height:auto}.scenario-tokens{display:inline-flex;gap:5px;flex-wrap:wrap;margin:4px 12px}.scenario-token{border:1px solid #a99ab9;padding:2px 7px}.reading-tests{padding-left:24px}.reading-tests>li{margin:24px 0;break-inside:avoid}.reading-outcomes{display:grid;grid-template-columns:1fr 1fr;gap:12px}.reading-outcome{border-left:2px solid #a99ab9;padding:0 14px}.output-groups li{margin:14px 0}.reading-route ul{border-left:1px solid #a99ab9}.source-caption{font-size:15px;overflow-wrap:anywhere}svg{width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}figure{margin:30px 0}section{break-inside:auto}@media print{#inquiry{break-before:page}.retained-downloads{display:none}body{background:white;padding:0;font-size:11pt}h1{font-size:30pt}h2{font-size:22pt;break-after:avoid}table{font-size:9pt}thead{display:table-header-group}tr,blockquote,figure{break-inside:avoid}figure.source{break-before:page}.source-page{max-height:215mm;object-fit:contain}figure.source{margin:0}.source-caption{font-size:8pt;line-height:1.25}a{color:inherit}details{display:block}details>*{display:block}.table-scroll{overflow:visible}svg{max-height:110mm}}@page{size:A4;margin:17mm}
</style></head><body><header><p>Akzent / a comparison notebook</p><h1>A consonant remembers an accent</h1><p>A local snapshot of the learner's rule, fixed predictions, source citations, and fictional-word experiment. All fonts and seven complete source pages are embedded. This file makes no network requests.</p></header>
<main><section class="retained-downloads"><h2>Keep working from this reading</h2><p>These files are embedded in this document. Save the JSON and reopen it in Akzent to continue editing; the CSVs keep the exact accounts without running scripts.</p><ul>${downloads.map((link) => `<li>${link}</li>`).join("")}</ul></section><section><h2>The current rule</h2><p>${e(ruleDescription(state.rule))}</p><p>The target is an older medial t in a voiced environment. Sanskrit accent is comparative evidence; Sanskrit is not Gothic's ancestor. Gothic d and þ are spellings, not a complete phonetic transcription.</p>${ledgerMarkup(state)}</section>
<section><h2>Predictions kept at the time of testing</h2>${fixed ? `<ol>${fixed}</ol>` : "<p>No fixed predictions were recorded.</p>"}<p>Changing the current rule does not revise these earlier records.</p></section>
<section><h2>My explanation</h2><p class="notes">${e(state.note || "No explanation entered.")}</p><p>Cited readings: ${state.citations.length ? state.citations.map((id) => e(readings.find((entry) => entry.id === id)?.title ?? id)).join("; ") : "none selected"}.</p></section>
<section><h2>Verner's invented word</h2><p>All forms in this experiment are hypothetical. An asterisk indicates an unattested form; it does not make this particular invented word a reconstruction of an actual lexical item. The stages below isolate consonants and accent, not the entire development of Gothic.</p>${experimentSvg(state.accent, state.order)}${experimentMarkup(state.accent, state.order)}<p>The displayed event order is an instructional intervention on Verner's explanation. A real language cannot be rerun, and this experiment is not independent evidence dating the historical changes.</p></section>
<section><h2>German readings with new English</h2><p>Selected excerpts are normalized, not diplomatic transcriptions. þ replaces the historical dental type; an ellipsis in the fictional-word excerpt omits his phonetic notation. Sanskrit forms elsewhere use modern IAST.</p>${readings.map((entry) => `<article id="${entry.id}"><h3>${e(entry.title)} / p. ${entry.page}${state.citations.includes(entry.id) ? " / cited" : ""}</h3><blockquote><p lang="de">${e(entry.german)}</p><p>${e(entry.english)}</p></blockquote><dl>${entry.notes.map((note) => `<dt>${e(note.phrase)}</dt><dd>${e(note.gloss)}</dd>`).join("")}</dl></article>`).join("")}</section>
<section><h2>Inferring the older accent</h2><p>This is an inverse experiment on the fictional word. Question marks withhold a consonant; a fitting scenario is not necessarily uniquely identified.</p>${inferenceMarkup(state.inference)}</section>
<section id="inquiry"><h2>Which consonant would you read next?</h2><p>A modern exercise on Verner’s fictional outputs, not a damaged historical witness. Possible readings below are conditional predictions of the selected model, not new observations. Counts do not imply probabilities.</p>${inquiryMarkup(state.inference.evidence, state.inference.order)}</section>
<section><h2>The saved environment test</h2><p>Word-initial: ${state.conditions.initial ? "yes" : "no"}; voiced neighbors: ${state.conditions.voicedNeighbors ? "yes" : "no"}; immediately preceding syllable accented: ${state.conditions.precedingAccented ? "yes" : "no"}.</p><p>θ becomes ${voiceFricative(state.conditions).voiced ? "ð" : "θ"}. ${e(voiceFricative(state.conditions).reason)}</p></section>
<section><h2>What this evidence can support</h2><p>This is a deliberately small, selected comparison set, not a representative sample or a proof of a sound law. The resistant rows are retained. Sanskrit accent may have its own history; analogy, compounds, inflection, and other changes need separate evidence. This is a study of language histories, not ancestry or identity of peoples.</p><p>The underlying sequence begins with an assumed inherited dental; it does not derive Gothic from Sanskrit or Latin. Later English developments are outside the model. No recorded pronunciation or ancient acoustic reconstruction is supplied.</p></section>
<section><h2>Complete source pages</h2><p>Karl Verner, <cite lang="de">Eine ausnahme der ersten lautverschiebung</cite>, <cite>Zeitschrift für vergleichende Sprachforschung</cite> 23 (1877), pp. 97–130. Signed Copenhagen, July 1875. <a href="https://archive.org/details/india.history.resource.77512">Original volume</a>; <a href="https://lrc.la.utexas.edu/books/reader/11-k-verner">1967 translation for comparison</a> (not reproduced here).</p>${images.map(({ page, file, url }) => `<figure class="source"><img class="source-page" src="${url}" alt="Complete scanned page ${page} of Verner's article"><figcaption class="source-caption">Printed p. ${page}; PDF page ${page + 6}. SHA-256: ${file.sha256}. Complete grayscale rendering; public domain.</figcaption></figure>`).join("")}</section>
<section><h2>Embedded notebook data</h2><p>The separate JSON download reopens in the workshop. The same data are preserved here for inspection.</p><pre>${e(JSON.stringify(state, null, 2))}</pre><script type="application/json" id="akzent-record">${json}</script></section>
<section><h2>Licenses</h2><p>Code, new translations and drawings: PolyForm Noncommercial, Copyright (c) 2026 Anthony Mercer. Historical source: public domain. Gentium Plus and Hanken Grotesk: SIL Open Font License 1.1.</p>${licenses.map((license) => `<details open><summary>${e(license.name)}</summary><pre>${e(license.text)}</pre></details>`).join("")}</section></main></body></html>`;
}

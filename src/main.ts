import "./style.css";
import { asset, verifiedBytes } from "./assets.ts";
import type { AssumedOrder, Evidence } from "./core/inference.ts";
import { inquiryCsv } from "./core/inquiry.ts";
import type { Accent, Order, Outcome } from "./core/model.ts";
import { experiment, predictDental, voiceFricative } from "./core/model.ts";
import { initialNotebook, type Notebook, readNotebook, snapshot } from "./core/record.ts";
import { download, escapeHtml as e, required } from "./html.ts";
import { inquiryMarkup } from "./inquiry-view.ts";
import { comparisonCsv, inferenceCsv, notebookHtml } from "./notebook.ts";
import { installOffline } from "./offline.ts";
import { NotebookStorage, SHARED_KEY } from "./persistence.ts";
import {
  chunks,
  experimentMarkup,
  experimentSvg,
  inferenceMarkup,
  ledgerMarkup,
  ruleDescription,
} from "./presentation.ts";
import { reading, readings } from "./readings.ts";
import { form, word, words } from "./words.ts";

const persistence = new NotebookStorage();
let state = persistence.initial;
const linkedWord = new URL(location.href).searchParams.get("word");
if (linkedWord && words.some((item) => item.id === linkedWord)) state.selected = linkedWord;
const storageNotice = persistence.initialNotice;
try {
  const theme = localStorage.getItem("akzent-theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {
  /* An explicit theme still works for this page. */
}

required("#app").innerHTML = `
<header class="masthead"><a href="#top" class="brand">Akzent<span aria-hidden="true">´</span></a><nav aria-label="Workshop"><a href="#words">Words</a><a href="#invented">Invented word</a><a href="#inquiry">Next reading</a><a href="#source">Source</a><a href="#notebook">Notebook</a></nav><button id="theme" type="button">Change theme</button></header>
<main id="top"><section id="words" class="opening" aria-labelledby="word-title"><div class="intro"><h1 id="word-title">Why did t split in two?</h1><p>Gothic has <i lang="got-Latn">fadar</i> ‘father’, but <i lang="got-Latn">brōþar</i> ‘brother’. Both middle consonants continue an older <i>t</i>. Use Sanskrit’s accent to investigate the difference.</p></div>
<div class="pair"><article><p class="meaning">Gothic / father</p><div class="hero-word">${chunks(word("father").gothic, "got-Latn")}</div><div class="comparandum"><span>Sanskrit stem</span>${chunks(word("father").sanskrit, "sa-Latn")}</div><p>The accent comes <strong>after</strong> the dental.</p></article><article><p class="meaning">Gothic / brother</p><div class="hero-word">${chunks(word("brother").gothic, "got-Latn")}</div><div class="comparandum"><span>Sanskrit stem</span>${chunks(word("brother").sanskrit, "sa-Latn")}</div><p>The accent comes <strong>before</strong> the dental.</p></article></div>
<p class="notation"><b>´</b> marks accent. <b>ā</b> marks vowel length. <b>þ</b> is the <i>th</i> in <i>thin</i>. Sanskrit and Gothic are relatives; neither is derived from the other.</p>
<div class="rule-builder"><div><h2>Make a rule for the split</h2><p>For an older <i>t</i> inside a word, in a voiced environment, predict a Gothic spelling:</p></div><div class="rule-fields"><label for="accented-rule">After an accented syllable<select id="accented-rule"><option value="voiceless">þ / stays voiceless</option><option value="voiced">d / becomes voiced</option></select></label><label for="unaccented-rule">After an unaccented syllable<select id="unaccented-rule"><option value="voiceless">þ / stays voiceless</option><option value="voiced">d / becomes voiced</option></select></label></div><p id="rule-result" role="status"></p></div>
<div class="word-work"><div class="choose-word"><h2>Risk it on another word</h2><p>Pick a comparison, keep your prediction, then uncover the Gothic consonant.</p><div class="word-buttons" aria-label="Word comparisons">${words.map((item) => `<button type="button" data-word="${item.id}" aria-pressed="false">${e(item.meaning)}</button>`).join("")}</div><button id="reveal-all" class="quiet" type="button">Show all eight observations</button></div><article class="word-sheet" aria-labelledby="selected-title"><div id="word-details"></div><button id="test-word" type="button" class="primary">Keep prediction & reveal</button><p id="trial-status" role="status"></p></article></div>
<div id="ledger"></div><details class="history"><summary id="history-summary">Predictions you kept</summary><div id="history"></div></details>
<aside class="limit-note"><h3>An agreement is not a proof</h3><p>This small set was selected to expose a problem. Sanskrit accent is evidence for an earlier accent, not a guarantee that every form preserves it. Two comparisons come from Verner’s own list of resistant cases. Keep their disagreement in the account.</p><a href="#source" id="read-exception">Read his resistant evidence</a></aside></section>

<section id="invented" class="invented" aria-labelledby="invented-title"><div class="section-intro"><h2 id="invented-title">Move one accent.<br>Change three consonants.</h2><p>Verner invented <i>*akasatam</i> to isolate the mechanism. It was never an ancient word. Move its accent and follow what happens to <i>k</i>, <i>s</i>, and <i>t</i>.</p></div>
<div class="accent-board"><p id="accent-label">Put the older accent on a syllable</p><div class="syllables" aria-labelledby="accent-label">${["a", "ka", "sa", "tam"].map((part, index) => `<button type="button" data-accent="${index}" aria-pressed="false"><span>${part}</span><small>Syllable ${index + 1}</small></button>`).join("")}</div><p class="fiction-label">* means unattested. Here, the entire word is deliberately fictional.</p></div>
<fieldset class="event-order"><legend>Try changing the order of events</legend><label><input type="radio" name="order" value="sounds-first"> Voice under the old accent; fix the first-syllable accent later</label><label><input type="radio" name="order" value="accent-first"> Fix the first-syllable accent before the voicing test</label></fieldset>
<div id="experiment"></div><p id="experiment-result" class="experiment-result" role="status"></p><p class="method-note">The first consonant change is assumed: <i>*k, *t</i> become fricatives, while inherited <i>*s</i> is already one. The trace uses modern symbols <i>x, ɣ, θ, ð</i>; the endpoint uses Verner’s hypothetical spellings. It isolates consonants, not the full history of a word. Reordering is an experiment on this explanation, not independent evidence for historical dates.</p>
<details><summary>Compare with Verner’s four printed outcomes</summary><div class="table-scroll" tabindex="0" role="region" aria-label="Verner’s four fictional outcomes; arrow keys scroll the table"><table><caption>Original thought experiment, pp. 114–115</caption><thead><tr><th>Older accent</th><th>Hypothetical spelling</th></tr></thead><tbody><tr><td>First syllable</td><td>*ahazad(am)</td></tr><tr><td>Second syllable</td><td>*agasad(am)</td></tr><tr><td>Third syllable</td><td>*agazaþ(am)</td></tr><tr><td>Fourth syllable</td><td>*agazad(am)</td></tr></tbody></table></div></details>
<div id="infer" class="inference-bench" aria-labelledby="infer-title"><div class="section-intro"><h3 id="infer-title">Can the consonants give the accent back?</h3><p>Keep only some consonants from the fictional output. Which older accents could have left them? A question mark means no evidence for that consonant.</p></div><div class="evidence-controls"><label for="evidence-dorsal">First consonant<select id="evidence-dorsal"><option value="?">? / unknown</option><option value="h">h / voiceless</option><option value="g">g / voiced</option></select></label><label for="evidence-sibilant">Second consonant<select id="evidence-sibilant"><option value="?">? / unknown</option><option value="s">s / voiceless</option><option value="z">z / voiced</option></select></label><label for="evidence-dental">Third consonant<select id="evidence-dental"><option value="?">? / unknown</option><option value="þ">þ / voiceless</option><option value="d">d / voiced</option></select></label></div><label for="evidence-order">What do you assume about event order?<select id="evidence-order"><option value="sounds-first">Voicing uses the old accent; accent moves later</option><option value="accent-first">Accent fixed on the first syllable before voicing</option><option value="unknown">Allow either order</option></select></label><button id="copy-evidence" type="button">Use the current hypothetical output</button><p id="inference-action-status" role="status"></p><div id="inference-results"></div><div class="proposal-controls"><label for="proposed-accent">My proposed older accent<select id="proposed-accent"><option value="0">Position 1</option><option value="1">Position 2</option><option value="2">Position 3</option><option value="3">Position 4</option></select></label><button id="check-accent" type="button" class="primary">Check my accent proposal</button><button id="restore-proposal" type="button">Restore the checked evidence</button><button id="save-evidence-csv" type="button">Save accent account CSV</button></div><p class="method-note">These are constraints on Verner’s invented word, not a recovered ancient text. A compatible accent need not be uniquely identified. No match means this one-accent model and order assumption cannot produce those consonants together.</p></div>
<section id="inquiry" class="inquiry" aria-labelledby="inquiry-title"><h3 id="inquiry-title">Which consonant would you read next?</h3><p>Withhold part of Verner’s invented word. Which missing consonant would separate the explanations that still fit? Compare both outcomes, then try a reading.</p><p class="small">A modern thought experiment; no historical copy is damaged. <a href="#infer">Edit consonants or check a proposal</a>.</p><label class="inquiry-order" for="inquiry-order">Event order for this inquiry<select id="inquiry-order"><option value="sounds-first">Voicing uses the old accent; accent moves later</option><option value="accent-first">Accent fixed on the first syllable before voicing</option><option value="unknown">Allow either order</option></select></label><div class="inquiry-actions"><button id="inquiry-start" type="button">Withhold all three consonants</button><button id="inquiry-erasure" type="button">Try the shared complete output</button></div><p id="inquiry-status" role="status" tabindex="-1"></p><div id="inquiry-results"></div><div class="inquiry-actions"><button id="save-inquiry-csv" type="button">Save reading plan CSV</button><button id="inquiry-source" type="button">Inspect Verner’s four outputs</button></div></section>
<div class="conditions"><div><h3>Accent alone is not the condition</h3><p>Test a schematic dental fricative. The older accent only matters inside a word and among voiced sounds.</p></div><fieldset><legend>Change its environment</legend><label><input id="initial" type="checkbox"> At the start of a word</label><label><input id="neighbors" type="checkbox" checked> Neighbors are voiced</label><label><input id="preceding" type="checkbox"> Immediately preceding syllable accented</label></fieldset><p id="condition-result" role="status"></p></div></section>

<section id="source" class="source" aria-labelledby="source-title"><div class="section-intro"><h2 id="source-title">Read the claim.<br>Keep the difficult line.</h2><p>Karl Verner, <cite lang="de">Eine ausnahme der ersten lautverschiebung</cite>, volume 23 (1877), pp. 97–130. Signed Copenhagen, July 1875. New English translations accompany normalized German excerpts.</p></div><div class="reading-buttons" aria-label="Source readings">${readings.map((entry) => `<button type="button" data-reading="${entry.id}" aria-pressed="false">${e(entry.title)}</button>`).join("")}</div>
<div class="reader-grid"><article class="reading"><div id="reading-copy"></div><div id="phrase-buttons" class="phrase-buttons"></div><p id="phrase-note" role="status"></p><label class="cite"><input id="cite-reading" type="checkbox"> Cite this reading in my notebook</label><p class="small">The excerpts normalize the dental sign to þ and use an ellipsis where marked. The complete pages preserve the printed notation and surrounding argument.</p></article><figure class="scan"><div class="scan-controls"><label for="source-page">Printed page<select id="source-page">${[97, 98, 99, 100, 101, 102, 114, 115, 117, 118, 119, 130].map((page) => `<option value="${page}">${page}</option>`).join("")}</select></label><button type="button" id="zoom-source" aria-pressed="false">Full size</button><button type="button" id="save-source">Save page PNG</button></div><p id="source-status" role="status"></p><div class="scan-window" tabindex="0" role="region" aria-label="Complete source page; arrow keys pan at full size"><img id="source-image" alt="" hidden></div><figcaption id="source-caption"></figcaption></figure></div>
<p class="source-links"><a href="./sources/NOTICE.txt">Source and normalization notice</a><a href="./sources/provenance.json">Scan provenance</a><a href="https://archive.org/details/india.history.resource.77512">Original volume</a><a href="https://lrc.la.utexas.edu/books/reader/11-k-verner">1967 translation for comparison</a></p></section>

<section id="notebook" class="notebook" aria-labelledby="notebook-title"><div class="section-intro"><h2 id="notebook-title">Leave with an argument.</h2><p>Your notebook keeps the rule, earlier predictions, citations, and accent experiment. Explain what your evidence supports and which comparison still needs an account.</p></div><label for="explanation">My explanation</label><textarea id="explanation" rows="6" maxlength="8000" placeholder="Which observation changed your rule? What would you need to explain a resistant comparison?"></textarea><p id="citation-list"></p><p id="storage-status" class="small">${e(storageNotice)}</p><div id="storage-conflict" class="draft-notice" hidden><p>The saved browser copy differs from this notebook. Your current work is still here.</p><div class="draft-actions"><button id="keep-tab" type="button">Use this tab as the saved copy</button><button id="open-shared" type="button">Open the other saved copy</button></div><p class="small">The replaced browser copy remains available under recovery copies.</p></div><div id="import-pending" class="draft-notice" hidden><p id="import-pending-message"></p><div class="draft-actions"><button id="apply-import" type="button">Open the selected notebook</button><button id="cancel-import" type="button">Keep editing this notebook</button></div></div><div class="draft-actions"><button id="new-notebook" type="button">Start a new notebook</button><button id="undo-notebook" type="button" disabled>Restore previous notebook</button></div><details class="recovery"><summary>Browser recovery copies</summary><p class="small">Copies preserved when tabs disagree or one saved copy replaces another. Save JSON for a copy outside this browser.</p><label for="recovery-choice">Choose a copy<select id="recovery-choice"></select></label><button id="open-recovery" type="button">Open recovery copy</button><button id="save-recovery" type="button">Save raw recovery JSON</button><p id="recovery-status" role="status"></p></details><div class="exports"><button id="save-json" type="button" class="primary">Save editable JSON</button><button id="save-html" type="button">Save illustrated reading</button><button id="save-csv" type="button">Save comparison CSV</button><button id="save-svg" type="button">Save experiment SVG</button><label class="file-label" for="open-notebook">Reopen JSON<input id="open-notebook" type="file" accept=".json,application/json"></label></div><p id="export-status" role="status"></p><p class="small">The illustrated HTML embeds the current notebook, seven complete source pages, fonts, and their licenses. It opens without a connection and prints through your browser. JSON reopens here; CSV preserves current comparisons and fixed predictions. Downloads take a snapshot when you press the button.</p></section>
<section class="scope" aria-labelledby="scope-title"><h2 id="scope-title">What remains outside the experiment</h2><p>This is a bounded reading of Verner’s argument, not a general etymology generator. It does not identify cognates from spelling, reconstruct entire words, or derive Gothic from Sanskrit. The dental test ignores other sound changes and inflection. Compound accent, analogy, competing daughter-language accents, and later English changes require additional evidence.</p><p>Gothic d is an observed spelling, while *ð is a schematic reconstructed sound. The older accent’s exact acoustic realization is not simulated. Language relationships do not establish a person’s genetic ancestry, ethnicity, or identity.</p></section></main>
<footer><p id="offline-status" role="status">Preparing the offline edition…</p><p>Anthony Mercer / <a href="https://praviel.com">PRAVIEL</a> / <a href="https://github.com/antonsoo/akzent">Source code</a></p><p>Code and new translations: PolyForm Noncommercial. Historical pages: public domain. Fonts: SIL OFL.</p></footer>`;

const accentedSelect = required<HTMLSelectElement>("#accented-rule");
const unaccentedSelect = required<HTMLSelectElement>("#unaccented-rule");
const explanation = required<HTMLTextAreaElement>("#explanation");
let currentReading = "rule";
let currentPage = 114;
let imageUrl: string | undefined;
let sourceRequest = 0;
let sourceController: AbortController | undefined;

let changeCount = 0;
let saveRequest = 0;
let importRequest = 0;
let pendingImport: Notebook | undefined;

function renderRecoveries(): void {
  const select = required<HTMLSelectElement>("#recovery-choice");
  const previous = select.value;
  const copies = persistence.recoveries();
  select.innerHTML = copies.length
    ? copies.map((copy) => `<option value="${e(copy.key)}">${e(copy.label)}</option>`).join("")
    : '<option value="">No recovery copies</option>';
  if (copies.some((copy) => copy.key === previous)) select.value = previous;
  required<HTMLButtonElement>("#open-recovery").disabled = copies.length === 0;
  required<HTMLButtonElement>("#save-recovery").disabled = copies.length === 0;
  try {
    required<HTMLButtonElement>("#undo-notebook").disabled = !persistence.previous();
  } catch {
    required<HTMLButtonElement>("#undo-notebook").disabled = true;
  }
}

function save(force = false): void {
  ++changeCount;
  const request = ++saveRequest;
  void persistence
    .save(snapshot(state), force)
    .then((result) => {
      if (request !== saveRequest) return;
      required("#storage-status").textContent = result.message;
      required<HTMLElement>("#storage-conflict").hidden = !result.conflict;
      renderRecoveries();
    })
    .catch(() => {
      if (request === saveRequest)
        required("#storage-status").textContent =
          "The browser could not save this work. Save editable JSON for a separate copy.";
    });
}

function replaceNotebook(opened: Notebook, message: string): void {
  try {
    persistence.keepPrevious(snapshot(state));
  } catch {
    required("#storage-status").textContent =
      "The previous notebook could not be kept in this tab. Save JSON before leaving the page.";
  }
  state = snapshot(opened);
  syncControls();
  renderWord();
  renderLedger();
  renderExperiment();
  renderCitations();
  renderConditions();
  renderInference();
  save();
  renderRecoveries();
  required("#trial-status").textContent = "";
  required("#export-status").textContent = message;
}

function renderWord(): void {
  const item = word(state.selected);
  const revealed = state.revealed.includes(item.id);
  const prediction = predictDental(state.rule, item.precedingAccented);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-word]"))
    button.setAttribute("aria-pressed", String(button.dataset.word === item.id));
  required("#word-details").innerHTML =
    `<h3 id="selected-title">${e(item.meaning)}</h3><p class="selected-sanskrit">${chunks(item.sanskrit, "sa-Latn")}<span>Sanskrit ${item.sanskrit[2].endsWith("-") ? "stem" : "form"}</span></p><p>The immediately preceding syllable is <strong>${item.precedingAccented ? "accented" : "unaccented"}</strong>.</p><div class="prediction-pair"><div><span>Your rule predicts</span><strong>${prediction}</strong></div><div><span>Gothic ${revealed ? "writes" : "observation"}</span><strong ${revealed ? 'lang="got-Latn"' : ""}>${revealed ? e(form(item.gothic)) : "Covered"}</strong></div></div>${revealed ? `<p class="word-note">${e(item.note)}</p>${item.comparison ? `<p>${e(item.comparison.language)} <i lang="${item.comparison.lang}">${e(item.comparison.form)}</i>: ${e(item.comparison.note)}</p>` : ""}<p class="small">Verner, printed pp. ${item.pages.join(", ")}. <button type="button" class="text-button" data-evidence="${item.pages.at(-1)}">Inspect source page</button></p>` : "<p>The source and observation will appear when you keep the prediction.</p>"}`;
  required<HTMLButtonElement>("#test-word").textContent = revealed
    ? "Keep another prediction"
    : "Keep prediction & reveal";
  const evidence = document.querySelector<HTMLButtonElement>("[data-evidence]");
  evidence?.addEventListener("click", () => {
    void showPage(Number(evidence.dataset.evidence));
    required("#source").scrollIntoView({ block: "start" });
    required<HTMLSelectElement>("#source-page").focus({ preventScroll: true });
  });
}

function renderLedger(): void {
  const agrees = state.revealed.filter(
    (id) => predictDental(state.rule, word(id).precedingAccented) === word(id).gothic[1],
  ).length;
  required("#rule-result").textContent =
    `Your rule agrees with ${agrees} of ${state.revealed.length} revealed comparisons. That is a result for these selected rows, not a proof of a sound law.`;
  required("#ledger").innerHTML = ledgerMarkup(state);
  required("#history-summary").textContent = `Predictions you kept (${state.trials.length})`;
  required("#history").innerHTML = state.trials.length
    ? `<ol>${state.trials.map((trial, index) => `<li><div><b>${index + 1}. ${e(word(trial.word).meaning)}</b><p>${e(ruleDescription(trial.rule))} Predicted <b>${trial.prediction}</b>; observed <b>${e(form(word(trial.word).gothic))}</b>.</p></div><button type="button" data-restore="${index}">Restore this rule</button></li>`).join("")}</ol><p>These records stay fixed when your current rule changes. At most 32 predictions are kept.</p>`
    : "<p>No prediction has been kept yet. Test a word to preserve the rule you used at that moment.</p>";
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-restore]"))
    button.addEventListener("click", () => {
      const trial = state.trials[Number(button.dataset.restore)];
      if (!trial) return;
      state.rule = { ...trial.rule };
      state.selected = trial.word;
      syncControls();
      renderWord();
      renderLedger();
      save();
      required("#trial-status").textContent =
        "Restored the rule and word from that prediction. The recorded prediction is unchanged.";
      accentedSelect.focus();
    });
}

function renderExperiment(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-accent]")) {
    const selected = Number(button.dataset.accent) === state.accent;
    button.setAttribute("aria-pressed", String(selected));
    const part = ["a", "ka", "sa", "tam"][Number(button.dataset.accent)] ?? "";
    const span = button.querySelector("span");
    if (span) span.textContent = selected ? part.replace("a", "á") : part;
  }
  required("#experiment").innerHTML = experimentMarkup(state.accent, state.order);
  required("#experiment-result").textContent =
    state.order === "sounds-first"
      ? `Accent on syllable ${state.accent + 1}: ${experiment(state.accent, state.order).endpoint}. The consonants retain a difference after the accent has moved.`
      : `All four starting accents now give ${experiment(state.accent, state.order).endpoint}. Moving the accent early erased the distinction before it could affect the consonants.`;
}

function renderInference(): void {
  required("#inquiry-status").textContent = "";
  required<HTMLSelectElement>("#evidence-dorsal").value = state.inference.evidence.dorsal;
  required<HTMLSelectElement>("#evidence-sibilant").value = state.inference.evidence.sibilant;
  required<HTMLSelectElement>("#evidence-dental").value = state.inference.evidence.dental;
  required<HTMLSelectElement>("#evidence-order").value = state.inference.order;
  required<HTMLSelectElement>("#inquiry-order").value = state.inference.order;
  required<HTMLSelectElement>("#proposed-accent").value = String(state.inference.accent);
  required<HTMLButtonElement>("#restore-proposal").disabled = state.inference.submitted === null;
  required("#inference-results").innerHTML = inferenceMarkup(state.inference);
  required("#inquiry-results").innerHTML = inquiryMarkup(
    state.inference.evidence,
    state.inference.order,
    true,
  );
}

function renderConditions(): void {
  const result = voiceFricative(state.conditions);
  required("#condition-result").innerHTML =
    `<strong>θ becomes ${result.voiced ? "ð / voiced" : "θ / stays voiceless"}</strong><span>${e(result.reason)}</span>`;
}

function renderCitations(): void {
  required<HTMLInputElement>("#cite-reading").checked = state.citations.includes(currentReading);
  required("#citation-list").textContent = state.citations.length
    ? `Cited readings: ${state.citations.map((id) => `${reading(id).title} (p. ${reading(id).page})`).join("; ")}.`
    : "No readings cited yet. Select a source reading above and check ‘Cite this reading’.";
}

function renderReading(id: string): void {
  currentReading = id;
  const entry = reading(id);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-reading]"))
    button.setAttribute("aria-pressed", String(button.dataset.reading === id));
  required("#reading-copy").innerHTML =
    `<p class="small">Printed p. ${entry.page}</p><h3>${e(entry.title)}</h3><blockquote lang="de">${e(entry.german)}</blockquote><p class="translation">${e(entry.english)}</p>`;
  required("#phrase-buttons").innerHTML = entry.notes
    .map(
      (note, index) =>
        `<button type="button" data-phrase="${index}" aria-pressed="false">${e(note.phrase)}</button>`,
    )
    .join("");
  required("#phrase-note").textContent = "Choose a phrase to read it closely.";
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-phrase]"))
    button.addEventListener("click", () => {
      for (const other of document.querySelectorAll("[data-phrase]"))
        other.setAttribute("aria-pressed", String(other === button));
      required("#phrase-note").textContent =
        entry.notes[Number(button.dataset.phrase)]?.gloss ?? "";
    });
  renderCitations();
  void showPage(entry.page);
}

async function showPage(page: number): Promise<void> {
  const file = asset(`sources/verner-${page}.png`);
  currentPage = page;
  required<HTMLSelectElement>("#source-page").value = String(page);
  const request = ++sourceRequest;
  sourceController?.abort();
  sourceController = new AbortController();
  const controller = sourceController;
  const img = required<HTMLImageElement>("#source-image");
  img.hidden = true;
  required("#source-caption").textContent = "";
  required("#source-status").textContent = `Loading and checking complete page ${page}…`;
  required(".scan-window").classList.remove("full-size");
  required("#zoom-source").setAttribute("aria-pressed", "false");
  required("#zoom-source").textContent = "Full size";
  let pendingUrl: string | undefined;
  try {
    const bytes = await verifiedBytes(file, controller.signal);
    if (request !== sourceRequest || controller.signal.aborted) return;
    pendingUrl = URL.createObjectURL(new Blob([bytes], { type: file.mime }));
    const candidate = new Image();
    candidate.src = pendingUrl;
    await candidate.decode();
    if (request !== sourceRequest || controller.signal.aborted) {
      URL.revokeObjectURL(pendingUrl);
      return;
    }
    const old = imageUrl;
    imageUrl = pendingUrl;
    img.src = pendingUrl;
    img.alt = `Complete printed page ${page} of Verner’s article, including surrounding text and notes.`;
    img.hidden = false;
    if (old) URL.revokeObjectURL(old);
    required("#source-caption").innerHTML =
      `Printed p. ${page} / PDF p. ${page + 6}. Full grayscale rendering, no crop. <a href="https://archive.org/details/india.history.resource.77512/page/n${page + 5}/mode/1up">Original page</a>. <span class="hash">SHA-256 ${file.sha256}</span>`;
    required("#source-status").textContent =
      `Page ${page} checked against this edition’s retained bytes.`;
  } catch (error) {
    if (pendingUrl && pendingUrl !== imageUrl) URL.revokeObjectURL(pendingUrl);
    if (request !== sourceRequest || controller.signal.aborted) return;
    required("#source-status").textContent =
      `Page ${page} could not be shown. ${error instanceof Error ? error.message : "Reconnect and choose the page again."}`;
  }
}

function syncControls(): void {
  accentedSelect.value = state.rule.accented;
  unaccentedSelect.value = state.rule.unaccented;
  explanation.value = state.note;
  required<HTMLInputElement>("#initial").checked = state.conditions.initial;
  required<HTMLInputElement>("#neighbors").checked = state.conditions.voicedNeighbors;
  required<HTMLInputElement>("#preceding").checked = state.conditions.precedingAccented;
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="order"]'))
    radio.checked = radio.value === state.order;
}

accentedSelect.addEventListener("change", updateRule);
unaccentedSelect.addEventListener("change", updateRule);
function updateRule(): void {
  state.rule = {
    accented: accentedSelect.value as Outcome,
    unaccented: unaccentedSelect.value as Outcome,
  };
  renderWord();
  renderLedger();
  save();
  required("#trial-status").textContent =
    "The current prediction changed. Earlier kept predictions retain their own rule.";
}
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-word]"))
  button.addEventListener("click", () => {
    state.selected = button.dataset.word ?? "father";
    renderWord();
    save();
    required("#trial-status").textContent = "";
  });
required("#test-word").addEventListener("click", () => {
  if (state.trials.length >= 32) {
    required("#trial-status").textContent =
      "The notebook already keeps 32 predictions. Save it, then start a separate notebook if you need more.";
    return;
  }
  const item = word(state.selected);
  const prediction = predictDental(state.rule, item.precedingAccented);
  state.trials.push({ word: item.id, rule: { ...state.rule }, prediction });
  if (!state.revealed.includes(item.id)) state.revealed.push(item.id);
  renderWord();
  renderLedger();
  save();
  required("#trial-status").textContent =
    prediction === item.gothic[1]
      ? `Kept prediction ${state.trials.length}: ${prediction}. The Gothic ${form(item.gothic)} agrees. An agreement in this row is not a general proof.`
      : `Kept prediction ${state.trials.length}: ${prediction}. Gothic ${form(item.gothic)} writes ${item.gothic[1]}. This comparison resists the current rule; inspect its source.`;
});
required("#reveal-all").addEventListener("click", () => {
  state.revealed = words.map((item) => item.id);
  renderWord();
  renderLedger();
  save();
});
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-accent]"))
  button.addEventListener("click", () => {
    state.accent = Number(button.dataset.accent) as Accent;
    renderExperiment();
    save();
  });
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="order"]'))
  radio.addEventListener("change", () => {
    state.order = radio.value as Order;
    renderExperiment();
    save();
  });
for (const id of [
  "evidence-dorsal",
  "evidence-sibilant",
  "evidence-dental",
  "evidence-order",
  "proposed-accent",
]) {
  required(`#${id}`).addEventListener("change", () => {
    state.inference.evidence = {
      dorsal: required<HTMLSelectElement>("#evidence-dorsal").value as Evidence["dorsal"],
      sibilant: required<HTMLSelectElement>("#evidence-sibilant").value as Evidence["sibilant"],
      dental: required<HTMLSelectElement>("#evidence-dental").value as Evidence["dental"],
    };
    state.inference.order = required<HTMLSelectElement>("#evidence-order").value as AssumedOrder;
    required("#inquiry-status").textContent = "";
    state.inference.accent = Number(
      required<HTMLSelectElement>("#proposed-accent").value,
    ) as Accent;
    renderInference();
    save();
    required("#inference-action-status").textContent =
      "Changed the working evidence. The last checked proposal keeps its original inputs.";
  });
}
required("#inquiry-results").addEventListener("click", (event) => {
  const button =
    event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>("[data-inquiry-key]")
      : null;
  if (!button) return;
  const key = button.dataset.inquiryKey as keyof Evidence;
  const value = button.dataset.inquiryValue;
  // Buttons are generated from the finite partition, never from imported markup.
  state.inference.evidence = { ...state.inference.evidence, [key]: value };
  renderInference();
  save();
  required("#inquiry-status").textContent =
    `Tried ${value} as a hypothetical reading of the ${key === "dorsal" ? "first" : key === "sibilant" ? "second" : "third"} consonant. No historical observation was added. The checked proposal is unchanged.`;
  required("#inquiry-status").focus({ preventScroll: true });
  required("#inquiry-status").scrollIntoView({ block: "nearest" });
});
required("#inquiry-order").addEventListener("change", () => {
  state.inference.order = required<HTMLSelectElement>("#inquiry-order").value as AssumedOrder;
  renderInference();
  save();
  required("#inquiry-status").textContent =
    "Changed the inquiry’s event-order assumption. The working consonants and checked proposal are kept.";
});
required("#inquiry-start").addEventListener("click", () => {
  state.inference.evidence = { dorsal: "?", sibilant: "?", dental: "?" };
  renderInference();
  save();
  required("#inquiry-status").textContent =
    "Withheld all three consonants. Kept your event-order assumption and last checked proposal. Compare the branches below.";
});
required("#inquiry-erasure").addEventListener("click", () => {
  state.inference.evidence = { dorsal: "h", sibilant: "z", dental: "d" };
  state.inference.order = "unknown";
  renderInference();
  save();
  required("#inquiry-status").textContent =
    "Example: h / z / d with either event order allowed. All consonants are supplied; five explanations still fit. The checked proposal is unchanged.";
});
required("#save-inquiry-csv").addEventListener("click", () => {
  download(
    "akzent-reading-plan.csv",
    inquiryCsv(state.inference.evidence, state.inference.order),
    "text/csv;charset=utf-8",
  );
  required("#inquiry-status").textContent =
    "Saved hypothetical reading branches and complete-output groups for the current inputs. Counts are not probabilities.";
});
required("#inquiry-source").addEventListener("click", () => {
  renderReading("fiction");
  void showPage(115);
  required("#source").scrollIntoView({ block: "start" });
  required<HTMLSelectElement>("#source-page").focus({ preventScroll: true });
});
required("#copy-evidence").addEventListener("click", () => {
  const [dorsal, sibilant, dental] = experiment(state.accent, state.order).fricatives;
  state.inference.evidence = { dorsal, sibilant, dental };
  renderInference();
  save();
  required("#inference-action-status").textContent =
    "Copied the current hypothetical output. The order assumption below remains your choice.";
});
required("#check-accent").addEventListener("click", () => {
  state.inference.submitted = {
    evidence: { ...state.inference.evidence },
    order: state.inference.order,
    accent: state.inference.accent,
  };
  renderInference();
  save();
  required("#inference-action-status").textContent =
    "Checked and kept this proposal with its evidence and order assumption.";
});
required("#restore-proposal").addEventListener("click", () => {
  const saved = state.inference.submitted;
  if (!saved) return;
  state.inference.evidence = { ...saved.evidence };
  state.inference.order = saved.order;
  state.inference.accent = saved.accent;
  renderInference();
  save();
  required("#inference-action-status").textContent =
    "Restored the evidence and order from the last checked proposal.";
});
required("#save-evidence-csv").addEventListener("click", () => {
  download("akzent-accent-account.csv", inferenceCsv(snapshot(state)), "text/csv;charset=utf-8");
  required("#inference-action-status").textContent =
    "Saved every candidate scenario for the current evidence and the last checked proposal.";
});
for (const id of ["initial", "neighbors", "preceding"])
  required(`#${id}`).addEventListener("change", () => {
    state.conditions = {
      initial: required<HTMLInputElement>("#initial").checked,
      voicedNeighbors: required<HTMLInputElement>("#neighbors").checked,
      precedingAccented: required<HTMLInputElement>("#preceding").checked,
    };
    renderConditions();
    save();
  });
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-reading]"))
  button.addEventListener("click", () => renderReading(button.dataset.reading ?? "rule"));
required("#read-exception").addEventListener("click", () => {
  renderReading("exception");
});
required("#cite-reading").addEventListener("change", () => {
  const checked = required<HTMLInputElement>("#cite-reading").checked;
  state.citations = state.citations.filter((id) => id !== currentReading);
  if (checked) state.citations.push(currentReading);
  renderCitations();
  save();
});
required<HTMLSelectElement>("#source-page").addEventListener("change", (event) => {
  void showPage(Number((event.target as HTMLSelectElement).value));
});
required("#zoom-source").addEventListener("click", () => {
  const full = required(".scan-window").classList.toggle("full-size");
  required("#zoom-source").setAttribute("aria-pressed", String(full));
  required("#zoom-source").textContent = full ? "Fit width" : "Full size";
  required<HTMLElement>(".scan-window").focus();
});
required("#save-source").addEventListener("click", async () => {
  const page = currentPage;
  try {
    download(
      `verner-${page}.png`,
      await verifiedBytes(asset(`sources/verner-${page}.png`)),
      "image/png",
    );
  } catch (error) {
    required("#source-status").textContent =
      error instanceof Error ? error.message : "The source page could not be saved.";
  }
});
explanation.addEventListener("input", () => {
  state.note = explanation.value;
  save();
});
required("#save-json").addEventListener("click", () => {
  download("akzent-notebook.json", JSON.stringify(snapshot(state), null, 2), "application/json");
  required("#export-status").textContent =
    "Editable notebook saved. Reopen the JSON here to continue.";
});
required("#save-csv").addEventListener("click", () => {
  download("akzent-comparisons.csv", comparisonCsv(snapshot(state)), "text/csv;charset=utf-8");
  required("#export-status").textContent =
    "Saved current comparisons and fixed predictions as separate CSV records.";
});
required("#save-svg").addEventListener("click", () => {
  download("akzent-experiment.svg", experimentSvg(state.accent, state.order), "image/svg+xml");
  required("#export-status").textContent =
    "Saved the current accent and event order as an SVG drawing.";
});
required<HTMLButtonElement>("#save-html").addEventListener("click", async () => {
  const button = required<HTMLButtonElement>("#save-html");
  const captured = snapshot(state);
  button.disabled = true;
  required("#export-status").textContent =
    "Checking and embedding seven source pages, fonts, and your notebook…";
  try {
    download("akzent-reading.html", await notebookHtml(captured), "text/html;charset=utf-8");
    required("#export-status").textContent =
      "Illustrated reading saved. Open the HTML without a connection, or print it to PDF through your browser.";
  } catch (error) {
    required("#export-status").textContent =
      `The reading was not saved. ${error instanceof Error ? error.message : "Check the retained files and try again."}`;
  } finally {
    button.disabled = false;
  }
});
required<HTMLInputElement>("#open-notebook").addEventListener("change", async () => {
  const input = required<HTMLInputElement>("#open-notebook");
  const file = input.files?.[0];
  if (!file) return;
  const request = ++importRequest;
  const before = changeCount;
  pendingImport = undefined;
  required<HTMLElement>("#import-pending").hidden = true;
  try {
    if (file.size > 100_000) throw new Error("Choose a JSON notebook smaller than 100 KB.");
    const opened = readNotebook(await file.text());
    if (request !== importRequest) return;
    if (changeCount !== before) {
      pendingImport = opened;
      required("#import-pending-message").textContent =
        `The file “${file.name}” is ready, but this notebook changed while it was being read. Choose which work to continue.`;
      required<HTMLElement>("#import-pending").hidden = false;
      required("#export-status").textContent =
        "Your later edits have been kept. The selected notebook is ready to open when you choose.";
    } else
      replaceNotebook(
        opened,
        `Reopened the notebook with ${opened.trials.length} fixed predictions. Restore previous notebook returns to your earlier work.`,
      );
  } catch (error) {
    if (request === importRequest)
      required("#export-status").textContent =
        `${error instanceof Error ? error.message : "The notebook could not be read."} The current work has been kept.`;
  } finally {
    if (request === importRequest) input.value = "";
  }
});
required("#apply-import").addEventListener("click", () => {
  if (!pendingImport) return;
  const opened = pendingImport;
  pendingImport = undefined;
  required<HTMLElement>("#import-pending").hidden = true;
  replaceNotebook(
    opened,
    "Opened the selected notebook. Restore previous notebook returns to the work you just left.",
  );
});
required("#cancel-import").addEventListener("click", () => {
  pendingImport = undefined;
  required<HTMLElement>("#import-pending").hidden = true;
  required("#export-status").textContent = "Kept the current notebook and its later edits.";
});
required("#new-notebook").addEventListener("click", () =>
  replaceNotebook(
    initialNotebook(),
    "Started a new notebook. Restore previous notebook returns to the work you just left.",
  ),
);
required("#undo-notebook").addEventListener("click", () => {
  try {
    const previous = persistence.previous();
    if (previous)
      replaceNotebook(
        previous,
        "Restored the previous notebook. You can switch back with the same button.",
      );
  } catch {
    required("#export-status").textContent =
      "The previous notebook could not be read. The current work has been kept.";
  }
});
required("#keep-tab").addEventListener("click", () => save(true));
required("#open-shared").addEventListener("click", async () => {
  const before = changeCount;
  try {
    const other = await persistence.shared();
    if (changeCount !== before) {
      required("#export-status").textContent =
        "This notebook changed while the other copy was being opened. Your edits remain here; choose again when ready.";
      return;
    }
    persistence.acceptShared(other.raw);
    replaceNotebook(
      other.notebook,
      "Opened the other saved copy. Restore previous notebook returns to this tab's earlier work.",
    );
  } catch (error) {
    required("#export-status").textContent =
      error instanceof Error ? error.message : "The other copy could not be opened.";
  }
});
required("#open-recovery").addEventListener("click", () => {
  const key = required<HTMLSelectElement>("#recovery-choice").value;
  const copy = persistence.recoveries().find((entry) => entry.key === key);
  if (copy?.notebook)
    replaceNotebook(
      copy.notebook,
      "Opened the recovery copy. Your previous notebook can still be restored.",
    );
  else
    required("#recovery-status").textContent = copy
      ? "That copy uses an unreadable notebook format. Save the raw recovery JSON to preserve it; current work has been kept."
      : "That recovery copy is no longer available. The current work has been kept.";
});
required("#save-recovery").addEventListener("click", () => {
  const key = required<HTMLSelectElement>("#recovery-choice").value;
  const copy = persistence.recoveries().find((entry) => entry.key === key);
  if (copy) {
    download("akzent-browser-recovery.json", copy.raw, "application/json");
    required("#recovery-status").textContent =
      "Saved the recovery text without changing its notebook format.";
  }
});
window.addEventListener("storage", (event) => {
  if (event.key === SHARED_KEY && persistence.changedOutside(JSON.stringify(state))) save();
  else renderRecoveries();
});

required("#theme").addEventListener("click", () => {
  const current =
    document.documentElement.dataset.theme ??
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const theme = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("akzent-theme", theme);
  } catch {
    /* Keep the current page choice. */
  }
});

syncControls();
renderWord();
renderLedger();
renderExperiment();
renderConditions();
renderReading(currentReading);
renderInference();
renderRecoveries();
save();
installOffline(required("#offline-status"));

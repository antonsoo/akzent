import assert from "node:assert/strict";
import test from "node:test";
import {
  type Accent,
  experiment,
  predictDental,
  VERNER_RULE,
  voiceFricative,
} from "../src/core/model.ts";
import { initialNotebook, parseNotebook, readNotebook, snapshot } from "../src/core/record.ts";
import { comparisonCsv } from "../src/notebook.ts";
import { word, words } from "../src/words.ts";

test("four fictional endpoints match the spellings on the scanned p. 115", () => {
  // Manually transcribed from the page, independently of the implementation's segment mapping.
  const printed = ["*ahazad(am)", "*agasad(am)", "*agazaþ(am)", "*agazad(am)"];
  for (const accent of [0, 1, 2, 3] as const) {
    assert.equal(experiment(accent, "sounds-first").endpoint, printed[accent]);
    assert.equal(experiment(accent, "accent-first").endpoint, "*ahazad(am)");
  }
});

test("the source concordance preserves agreements and both resistant comparisons", () => {
  const source: Record<string, readonly [boolean, "þ" | "d", "þ" | "d"]> = {
    father: [false, "d", "d"],
    brother: [true, "þ", "þ"],
    other: [true, "þ", "þ"],
    under: [false, "d", "d"],
    hundred: [false, "d", "d"],
    there: [true, "þ", "þ"],
    which: [false, "þ", "d"],
    lord: [true, "d", "þ"],
  };
  // Fresh reading of primary PDF p. 104 (= printed 98), bottom paragraph:
  // fadi- and bruþ-fadi-. Printed 99 instead contains the early katará- entry.
  assert.deepEqual(word("lord").pages, [98, 119]);
  assert.deepEqual(word("which").pages, [99, 119]);
  assert.equal(words.length, Object.keys(source).length);
  for (const [id, [accented, observed, predicted]] of Object.entries(source)) {
    const entry = word(id);
    assert.equal(entry.precedingAccented, accented, id);
    assert.equal(entry.gothic[1], observed, id);
    assert.equal(predictDental(VERNER_RULE, entry.precedingAccented), predicted, id);
    assert.equal(entry.group === "resistant", predicted !== observed, id);
  }
});

test("all scope combinations require medial position, voiced neighbors, and an unaccented predecessor", () => {
  for (const initial of [true, false])
    for (const voicedNeighbors of [true, false])
      for (const precedingAccented of [true, false]) {
        const result = voiceFricative({ initial, voicedNeighbors, precedingAccented });
        assert.equal(result.voiced, !initial && voicedNeighbors && !precedingAccented);
        assert.ok(result.reason.length > 30);
      }
});

test("a saved prediction keeps its own rule after live edits and can reopen", () => {
  const state = initialNotebook();
  state.revealed.push("under");
  state.trials.push({ word: "under", rule: { ...state.rule }, prediction: "þ" });
  state.rule = { ...VERNER_RULE };
  state.note = "The first prediction failed; the new rule agrees.";
  const restored = readNotebook(JSON.stringify(state));
  assert.equal(restored.trials[0]?.prediction, "þ");
  assert.equal(restored.trials[0]?.rule.unaccented, "voiceless");
  assert.equal(restored.rule.unaccented, "voiced");
  assert.deepEqual(restored, state);
});

test("snapshots do not share arrays or nested rules with the live notebook", () => {
  const state = initialNotebook();
  state.trials.push({ word: "father", rule: { ...state.rule }, prediction: "þ" });
  const captured = snapshot(state);
  state.note = "Changed after export began";
  const first = state.trials[0];
  assert.ok(first);
  first.rule.unaccented = "voiced";
  state.revealed.push("which");
  assert.equal(captured.note, "");
  assert.equal(captured.trials[0]?.rule.unaccented, "voiceless");
  assert.deepEqual(captured.revealed, ["father", "brother"]);
});

test("malformed imports cannot turn an edited or impossible prediction into history", () => {
  const state = initialNotebook();
  const invalid: unknown[] = [
    null,
    [],
    { ...state, version: 2 },
    { ...state, accent: 4 },
    { ...state, accent: "0" },
    { ...state, order: "modern" },
    { ...state, selected: "invented-entry" },
    { ...state, rule: { accented: "voiceless", unaccented: "maybe" } },
    { ...state, revealed: ["father", "father"] },
    { ...state, citations: ["rule", "rule"] },
    { ...state, citations: ["absent-source"] },
    { ...state, note: "x".repeat(8001) },
    { ...state, trials: [{ word: "father", rule: state.rule, prediction: "d" }] },
    { ...state, trials: [{ word: "under", rule: state.rule, prediction: "þ" }] },
  ];
  for (const value of invalid) assert.throws(() => parseNotebook(value));
  assert.throws(() => readNotebook("{"));
  assert.throws(() => readNotebook(" ".repeat(100001)));
});

test("all four rules and both event orders survive a notebook round trip", () => {
  for (const accented of ["voiceless", "voiced"] as const)
    for (const unaccented of ["voiceless", "voiced"] as const) {
      for (let accent = 0; accent < 4; accent++)
        for (const order of ["sounds-first", "accent-first"] as const) {
          const state = {
            ...initialNotebook(),
            rule: { accented, unaccented },
            accent: accent as Accent,
            order,
          };
          assert.deepEqual(readNotebook(JSON.stringify(state)), state);
        }
    }
});

test("CSV distinguishes current judgments from earlier fixed predictions", () => {
  const state = initialNotebook();
  state.trials.push({ word: "father", rule: { ...state.rule }, prediction: "þ" });
  state.rule = { ...VERNER_RULE };
  const csv = comparisonCsv(state);
  assert.match(csv, /"current-rule","father".*"voiceless","voiced","d","d","true"/);
  assert.match(csv, /"fixed-prediction","father".*"voiceless","voiceless","þ","d","false"/);
  assert.equal(csv.split("\r\n").length, 5);
});

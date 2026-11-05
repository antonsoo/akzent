import assert from "node:assert/strict";
import test from "node:test";
import type { AssumedOrder, Evidence, Scenario } from "../src/core/inference.ts";
import { inquiryCsv, planInquiry, type ReadingRoute, readingRoute } from "../src/core/inquiry.ts";
import { inquiryMarkup } from "../src/inquiry-view.ts";

// Independent literal endpoints: printed p. 115; early accent is the stated intervention.
const printed = ["hzd", "gsd", "gzþ", "gzd"];
const identity = (item: Scenario) => `${item.accent + 1}:${item.order}`;
function oracle(evidence: Evidence, order: AssumedOrder) {
  return ["sounds-first", "accent-first"].flatMap((candidate) =>
    candidate !== order && order !== "unknown"
      ? []
      : printed.flatMap((_, index) => {
          const triple = printed[candidate === "accent-first" ? 0 : index] ?? "";
          return [evidence.dorsal, evidence.sibilant, evidence.dental].every(
            (value, i) => value === "?" || value === triple[i],
          )
            ? [{ id: `${index + 1}:${candidate}`, triple }]
            : [];
        }),
  );
}

test("all 81 evidence/order states: every conditional branch and complete-output class agrees with the literal endpoints", () => {
  for (const dorsal of ["?", "h", "g"] as const)
    for (const sibilant of ["?", "s", "z"] as const)
      for (const dental of ["?", "þ", "d"] as const)
        for (const order of ["sounds-first", "accent-first", "unknown"] as const) {
          const evidence = { dorsal, sibilant, dental };
          const expected = oracle(evidence, order);
          const plan = planInquiry(evidence, order);
          assert.deepEqual(
            plan.scenarios.map(identity),
            expected.map((item) => item.id),
          );
          const worsts: number[] = [];
          const accentWorsts: number[] = [];
          for (const test of plan.tests) {
            assert.equal(evidence[test.consonant.key], "?");
            const counts = [];
            for (const branch of test.branches) {
              const selected = expected.filter(
                (item) => item.triple[test.consonant.index] === branch.value,
              );
              assert.deepEqual(
                branch.scenarios.map(identity),
                selected.map((item) => item.id),
              );
              counts.push(selected.length);
            }
            assert.equal(test.worst, Math.max(...counts));
            assert.equal(
              test.informative,
              counts.every((n) => n > 0),
            );
            if (test.informative) worsts.push(test.worst);
            const accentSets = test.branches.map(
              (branch) =>
                new Set(
                  expected
                    .filter((item) => item.triple[test.consonant.index] === branch.value)
                    .map((item) => item.id.split(":")[0]),
                ),
            );
            const allAccents = new Set(expected.map((item) => item.id.split(":")[0]));
            assert.equal(test.worstAccents, Math.max(...accentSets.map((set) => set.size)));
            assert.equal(
              test.accentInformative,
              accentSets.some((set) => set.size > 0 && set.size < allAccents.size),
            );
            if (test.accentInformative) accentWorsts.push(test.worstAccents);
          }
          for (const test of plan.tests)
            assert.equal(test.recommended, test.informative && test.worst === Math.min(...worsts));
          for (const test of plan.tests)
            assert.equal(
              test.recommendedForAccent,
              test.accentInformative && test.worstAccents === Math.min(...accentWorsts),
            );
          const groups = new Map<string, string[]>();
          for (const item of expected)
            groups.set(item.triple, [...(groups.get(item.triple) ?? []), item.id]);
          assert.deepEqual(
            plan.endpoints.map((group) => group.scenarios.map(identity)),
            [...groups.values()],
          );
          const leaves: string[] = [];
          function visit(route: ReadingRoute, used: string[]) {
            if (!route.test) {
              assert.ok(new Set(route.scenarios.map((item) => item.endpoint)).size <= 1);
              leaves.push(...route.scenarios.map(identity));
              return;
            }
            assert.ok(
              !used.includes(route.test.key),
              "a route must never reread a supplied consonant",
            );
            assert.equal(route.branches.length, 2);
            for (const branch of route.branches) visit(branch.route, [...used, route.test.key]);
          }
          visit(readingRoute(evidence, order), []);
          assert.deepEqual(leaves.sort(), expected.map((item) => item.id).sort());
        }
});

test("unknown order makes the first consonant the one-step minimax choice; known order ties all three", () => {
  const evidence: Evidence = { dorsal: "?", sibilant: "?", dental: "?" };
  const either = planInquiry(evidence, "unknown");
  assert.deepEqual(
    either.tests.map((item) => item.branches.map((branch) => branch.scenarios.length)),
    [
      [5, 3],
      [1, 7],
      [1, 7],
    ],
  );
  assert.deepEqual(
    either.tests.map((item) => item.recommended),
    [true, false, false],
  );
  assert.deepEqual(
    planInquiry(evidence, "sounds-first").tests.map((item) => item.recommended),
    [true, true, true],
  );
  assert.deepEqual(
    planInquiry(evidence, "accent-first").tests.map((item) => item.recommended),
    [false, false, false],
  );
  assert.deepEqual(
    either.tests.map((item) => item.worstAccents),
    [4, 4, 4],
  );
  assert.deepEqual(
    either.tests.map((item) => item.recommendedForAccent),
    [true, true, true],
  );
  const full = planInquiry({ dorsal: "h", sibilant: "z", dental: "d" }, "unknown");
  assert.equal(full.tests.length, 0);
  assert.equal(full.endpoints.length, 1);
  assert.equal(full.endpoints[0]?.scenarios.length, 5);
});

test("portable markup has no hypothetical action buttons; CSV retains empty branches and irreducible classes", () => {
  const evidence: Evidence = { dorsal: "h", sibilant: "?", dental: "?" };
  const markup = inquiryMarkup(evidence, "unknown");
  assert.doesNotMatch(markup, /<button/);
  assert.match(markup, /same complete output/);
  assert.match(markup, /V<\/b> \(voicing first/);
  const csv = inquiryCsv(evidence, "unknown");
  assert.match(
    csv,
    /"possible-reading","h","\?","\?","unknown","sibilant","s","","","","0","5","false"/,
  );
  assert.equal(csv.split('"complete-output"').length - 1, 5);
  const bad = inquiryCsv({ dorsal: "h", sibilant: "s", dental: "?" }, "unknown");
  assert.match(bad, /inconsistent-evidence/);
});

import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4391/akzent/";
const output = resolve(process.argv[3] ?? "examples");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForFunction(() =>
    document.querySelector("#offline-status")?.textContent?.includes("available offline"),
  );
  await page.locator('[data-word="under"]').click();
  await page.locator("#test-word").click();
  await page.locator("#unaccented-rule").selectOption("voiced");
  await page.locator("#test-word").click();
  await page.locator('[data-word="which"]').click();
  await page.locator("#test-word").click();
  await page.locator("#reveal-all").click();
  await page.locator('[data-accent="2"]').click();
  await page.locator("#preceding").check();
  for (const id of ["rule", "test", "exception"]) {
    await page.locator(`[data-reading="${id}"]`).click();
    await page.locator("#cite-reading").check();
  }
  await page
    .locator("#explanation")
    .fill(
      "My first prediction gave þ for ‘under’; Gothic undar has d. Changing the unaccented case to d explains that row and the starting pair. The comparison ántara- / anþar beside antár / undar is useful because a similar n-t sequence accompanies two accent positions.\n\nThe rule agrees with six of these eight selected observations. Sanskrit katará- still predicts d where Gothic hvaþar has þ. Greek πότερος has a different accent; Sanskrit is evidence, not an unchanged copy of the ancestral language. The compound member -fadi- also needs a compound-accent account before I can treat páti- as its exact accent comparison. I have not proved such an account.\n\nIn Verner’s fictional word, the third accent protects θ while the other medial fricatives voice. Moving accent to the first syllable afterwards preserves that contrast; moving it before voicing loses the contrast. This is an experiment on the explanation, not an independent historical date. The saved environment test also shows why an accented predecessor blocks voicing.",
    );
  for (const [id, name] of [
    ["json", "akzent-notebook.json"],
    ["csv", "akzent-comparisons.csv"],
    ["svg", "akzent-experiment.svg"],
    ["html", "akzent-reading.html"],
  ]) {
    const pending = page.waitForEvent("download");
    await page.locator(`#save-${id}`).click();
    const file = await pending;
    await file.saveAs(join(output, name));
    assert.equal(await file.failure(), null);
  }
  const portable = await context.newPage();
  await portable.goto(pathToFileURL(join(output, "akzent-reading.html")).href);
  await portable.evaluate(() => document.fonts.ready);
  await portable
    .locator(".source-page")
    .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await portable.pdf({
    path: join(output, "akzent-reading.pdf"),
    format: "A4",
    tagged: true,
    outline: true,
    printBackground: true,
  });
  const data = JSON.parse(await readFile(join(output, "akzent-notebook.json"), "utf8"));
  assert.equal(data.trials.length, 3);
  assert.equal(data.trials[0].prediction, "þ");
  assert.equal(data.trials[1].prediction, "d");
  console.log(
    "Exported a three-prediction notebook, comparison CSV, experiment SVG, standalone reading and printed PDF through the actual workshop.",
  );
} finally {
  await browser.close();
}

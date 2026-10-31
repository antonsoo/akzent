import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4391/akzent/";
const output = resolve(process.argv[3] ?? "test-results/inference");
await mkdir(output, { recursive: true });
const results = [];
const waitText = (page, selector, value) =>
  page.waitForFunction(
    ({ selector, value }) => document.querySelector(selector)?.textContent?.includes(value),
    { selector, value },
  );
async function download(page, selector, path) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const file = await pending;
  await file.saveAs(path);
  assert.equal(await file.failure(), null);
  return readFile(path);
}

for (const [name, engine] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        acceptDownloads: true,
        colorScheme: "light",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(url);
      await waitText(page, "#offline-status", "available offline");
      await page.locator("#evidence-dorsal").selectOption("h");
      await page.locator("#evidence-sibilant").selectOption("z");
      await waitText(page, "#inference-results", "Only older accent position 1");
      await page.locator("#evidence-order").selectOption("unknown");
      await waitText(page, "#inference-results", "positions 1, 2, 3, 4 remain possible");
      assert.equal(await page.locator("#inference-results tbody tr").count(), 8);
      await page.locator("#proposed-accent").selectOption("3");
      await page.locator("#check-accent").focus();
      await page.keyboard.press("Space");
      await waitText(page, ".checked-proposal", "compatible, but other older accents");
      await page.locator("#evidence-dorsal").selectOption("g");
      await page.locator("#evidence-dental").selectOption("d");
      await waitText(page, "#inference-results", "Only older accent position 4");
      await page.locator("#check-accent").click();
      await waitText(page, ".checked-proposal", "only older accent compatible");
      await page.locator("#evidence-dorsal").selectOption("h");
      await page.locator("#evidence-sibilant").selectOption("s");
      await waitText(page, "#inference-results", "No scenario fits");
      await waitText(page, ".checked-proposal", "only older accent compatible");
      await page.locator("#proposed-accent").selectOption("0");
      await page.locator("#check-accent").click();
      await waitText(page, ".checked-proposal", "excluded");
      await page.locator("#restore-proposal").click();
      assert.equal(await page.locator("#evidence-dorsal").inputValue(), "h");
      await page.locator("#evidence-sibilant").selectOption("?");
      await page.locator("#evidence-dental").selectOption("?");
      await page.locator("#evidence-order").selectOption("accent-first");
      await waitText(page, "#inference-results", "positions 1, 2, 3, 4 remain possible");
      await page.locator('[data-accent="2"]').click();
      await page.locator('input[value="sounds-first"]').check();
      await page.locator("#evidence-order").selectOption("unknown");
      await page.locator("#copy-evidence").click();
      assert.equal(await page.locator("#evidence-dental").inputValue(), "þ");
      await waitText(page, "#inference-results", "Only older accent position 3");
      await page.locator("#proposed-accent").selectOption("2");
      await page.locator("#check-accent").click();
      await page
        .locator("#explanation")
        .fill(
          "The g/z/þ output admits only accent 3 in this model, even when either order is allowed. h/z/d was ambiguous across event orders.",
        );
      const folder = join(output, `${name}-${width}`);
      await mkdir(folder, { recursive: true });
      await page
        .locator("#infer")
        .evaluate((element) => element.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: join(folder, "inference.png") });
      const light = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(light.violations, []);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.locator("#theme").click();
      const dark = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(dark.violations, []);
      await page
        .locator("#infer")
        .evaluate((element) => element.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: join(folder, "inference-dark.png") });
      const json = await download(page, "#save-json", join(folder, "notebook.json"));
      const record = JSON.parse(json.toString());
      assert.equal(record.inference.submitted.accent, 2);
      assert.equal(record.inference.order, "unknown");
      const csv = await download(page, "#save-evidence-csv", join(folder, "account.csv"));
      assert.equal(csv.toString().split("\r\n").length, 18);
      await download(page, "#save-html", join(folder, "reading.html"));
      const portable = await context.newPage();
      await portable.goto(pathToFileURL(join(folder, "reading.html")).href);
      await waitText(portable, ".checked-proposal", "Position 3 is the only older accent");
      if (name === "chromium" && width === 1440)
        await portable.pdf({
          path: join(folder, "reading.pdf"),
          format: "A4",
          tagged: true,
          outline: true,
          printBackground: true,
        });
      await portable.close();
      await page.locator("#evidence-dorsal").selectOption("?");
      await page.locator("#open-notebook").setInputFiles(join(folder, "notebook.json"));
      await waitText(page, "#export-status", "Reopened");
      assert.equal(await page.locator("#evidence-dorsal").inputValue(), "g");
      await context.setOffline(true);
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitText(page, "#offline-status", "available offline");
      await waitText(page, "#inference-results", "Only older accent position 3");
      const offline = await download(page, "#save-json", join(folder, "offline-notebook.json"));
      assert.deepEqual(JSON.parse(offline.toString()), record);
      assert.deepEqual(errors, []);
      results.push({
        browser: name,
        width,
        uniquePartialEvidence: true,
        ambiguousAcrossOrders: true,
        impossibleEvidence: true,
        checkedProposalFixed: true,
        csvScenarios: 16,
        jsonReopened: true,
        portableReading: true,
        offlineRestored: true,
        axeLight: light.violations.length,
        axeDark: dark.violations.length,
        pageErrors: errors,
      });
      await context.close();
      console.log(
        `${name} ${width}: unique/ambiguous/impossible accent evidence, fixed proposal, real artifacts, reopening and offline use passed.`,
      );
    }
  } finally {
    await browser.close();
  }
}
await writeFile(join(output, "review.json"), `${JSON.stringify({ url, results }, null, 2)}\n`);

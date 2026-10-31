import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4391/akzent/";
const output = resolve(process.argv[3] ?? "test-results/drafts");
await mkdir(output, { recursive: true });
const results = [];
const text = (page, selector, content) =>
  page.waitForFunction(
    ({ selector, content }) => document.querySelector(selector)?.textContent?.includes(content),
    { selector, content },
  );
const sharedNote = (page, note) =>
  page.waitForFunction(
    (note) => JSON.parse(localStorage.getItem("akzent-notebook-v1") ?? "null")?.note === note,
    note,
  );
async function open(context) {
  const page = await context.newPage();
  await page.goto(url);
  await page.locator("#explanation").waitFor();
  return page;
}

for (const [name, engine] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const a = await open(context),
        b = await open(context);
      await a.locator("#explanation").fill("First tab: an argument I want to keep.");
      await sharedNote(a, "First tab: an argument I want to keep.");
      await b.locator("#explanation").fill("Second tab: a different argument.");
      await b.locator("#storage-conflict").waitFor({ state: "visible" });
      await text(b, "#storage-status", "kept separately");
      await a.reload();
      await b.reload();
      assert.equal(
        await a.locator("#explanation").inputValue(),
        "First tab: an argument I want to keep.",
      );
      assert.equal(
        await b.locator("#explanation").inputValue(),
        "Second tab: a different argument.",
      );
      await b.locator("#keep-tab").click();
      await sharedNote(b, "Second tab: a different argument.");
      await a.locator("#storage-conflict").waitFor({ state: "visible" });
      await a.locator("#open-shared").click();
      await text(a, "#export-status", "Opened the other saved copy");
      assert.equal(
        await a.locator("#explanation").inputValue(),
        "Second tab: a different argument.",
      );
      await a.locator("#undo-notebook").click();
      assert.equal(
        await a.locator("#explanation").inputValue(),
        "First tab: an argument I want to keep.",
      );
      await sharedNote(a, "First tab: an argument I want to keep.");
      await text(b, "#storage-status", "kept separately");
      await b.close();
      const recovery = a
        .locator("#recovery-choice option")
        .filter({ hasText: "Second tab: a different argument." })
        .first();
      await recovery.waitFor({ state: "attached" });
      await a.locator(".recovery summary").click();
      await a.locator("#recovery-choice").selectOption(await recovery.getAttribute("value"));
      await a.locator("#open-recovery").click();
      assert.equal(
        await a.locator("#explanation").inputValue(),
        "Second tab: a different argument.",
      );
      await sharedNote(a, "Second tab: a different argument.");

      const other = await open(context);
      await Promise.all([
        a.locator("#explanation").fill("Concurrent first draft."),
        other.locator("#explanation").fill("Concurrent second draft."),
      ]);
      await text(a, "#storage-status", "browser");
      await text(other, "#storage-status", "browser");
      await a.waitForFunction(() => {
        const shared = JSON.parse(localStorage.getItem("akzent-notebook-v1") ?? "null")?.note;
        const notes = [shared];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("akzent-recovery-v1:"))
            notes.push(JSON.parse(JSON.parse(localStorage.getItem(key)).notebook).note);
        }
        return (
          notes.includes("Concurrent first draft.") && notes.includes("Concurrent second draft.")
        );
      });
      const axe = await new AxeBuilder({ page: a }).analyze();
      assert.deepEqual(axe.violations, []);
      await a
        .locator("#notebook")
        .evaluate((element) => element.scrollIntoView({ block: "start" }));
      await a.screenshot({ path: join(output, `${name}-${width}-drafts.png`) });
      assert.equal(
        await a.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await context.close();
      results.push({
        browser: name,
        width,
        divergentTabsSurviveReload: true,
        explicitReplacementRetainsOtherCopy: true,
        closedTabRecovered: true,
        simultaneousDraftsRetained: true,
        axeViolations: axe.violations.length,
      });
    }

    const delayed = await browser.newContext();
    await delayed.addInitScript(() => {
      const original = File.prototype.text;
      const waiting = new Map();
      File.prototype.text = function () {
        return new Promise((resolve) =>
          waiting.set(this.name, async () => resolve(await original.call(this))),
        );
      };
      window.releaseNotebook = (name) => waiting.get(name)?.();
    });
    const page = await open(delayed);
    const imported = JSON.parse(await readFile("examples/akzent-notebook.json", "utf8"));
    imported.note = "Imported explanation.";
    await page.locator("#open-notebook").setInputFiles({
      name: "delayed.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(imported)),
    });
    await page.locator("#explanation").fill("My edit after reading began.");
    await page.evaluate(() => window.releaseNotebook("delayed.json"));
    await page.locator("#import-pending").waitFor({ state: "visible" });
    assert.equal(await page.locator("#explanation").inputValue(), "My edit after reading began.");
    await page.locator("#apply-import").click();
    assert.equal(await page.locator("#explanation").inputValue(), "Imported explanation.");
    await page.locator("#undo-notebook").click();
    assert.equal(await page.locator("#explanation").inputValue(), "My edit after reading began.");
    for (const file of ["older.json", "newer.json"]) {
      await page.locator("#open-notebook").setInputFiles({
        name: file,
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ ...imported, note: file })),
      });
    }
    await page.evaluate(() => window.releaseNotebook("newer.json"));
    await text(page, "#export-status", "Reopened");
    await page.evaluate(() => window.releaseNotebook("older.json"));
    assert.equal(await page.locator("#explanation").inputValue(), "newer.json");
    await delayed.close();

    const capped = await browser.newContext();
    const full = await open(capped);
    imported.trials = Array.from({ length: 32 }, () => ({
      word: "father",
      rule: { accented: "voiceless", unaccented: "voiceless" },
      prediction: "þ",
    }));
    await full.locator("#open-notebook").setInputFiles({
      name: "full.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(imported)),
    });
    await text(full, "#history-summary", "32");
    await full.locator("#test-word").click();
    await text(full, "#trial-status", "32 predictions");
    await full.locator("#new-notebook").click();
    await text(full, "#history-summary", "0");
    await full.locator("#test-word").click();
    await text(full, "#history-summary", "1");
    await full.locator("#undo-notebook").click();
    await text(full, "#history-summary", "32");
    await full.reload();
    await text(full, "#history-summary", "32");
    await capped.close();

    const blocked = await browser.newContext();
    await blocked.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      }),
    );
    const unavailable = await open(blocked);
    const errors = [];
    unavailable.on("pageerror", (error) => errors.push(error.message));
    await unavailable.locator("#explanation").fill("This draft can still leave the browser.");
    const pending = unavailable.waitForEvent("download");
    await unavailable.locator("#save-json").click();
    const file = await pending;
    const destination = join(output, `${name}-blocked-storage.json`);
    await file.saveAs(destination);
    assert.equal(
      JSON.parse(await readFile(destination, "utf8")).note,
      "This draft can still leave the browser.",
    );
    await unavailable.locator("#new-notebook").click();
    await unavailable.locator("#undo-notebook").click();
    assert.equal(
      await unavailable.locator("#explanation").inputValue(),
      "This draft can still leave the browser.",
    );
    assert.deepEqual(errors, []);
    await blocked.close();
    const unknown = await browser.newContext();
    const raw =
      '{"schema":"akzent-notebook","version":999,"note":"Keep this unfamiliar record exactly."}';
    await unknown.addInitScript((raw) => localStorage.setItem("akzent-notebook-v1", raw), raw);
    const unfamiliar = await open(unknown);
    await text(unfamiliar, "#storage-status", "unreadable browser copy");
    assert.equal(await unfamiliar.evaluate(() => localStorage.getItem("akzent-notebook-v1")), raw);
    await unfamiliar.locator("#explanation").fill("New work beside an unfamiliar record.");
    await unfamiliar.locator("#keep-tab").click();
    await sharedNote(unfamiliar, "New work beside an unfamiliar record.");
    await unfamiliar.locator(".recovery summary").click();
    const rawOption = unfamiliar
      .locator("#recovery-choice option")
      .filter({ hasText: "Unreadable notebook format" })
      .first();
    await unfamiliar
      .locator("#recovery-choice")
      .selectOption(await rawOption.getAttribute("value"));
    const rawPending = unfamiliar.waitForEvent("download");
    await unfamiliar.locator("#save-recovery").click();
    const rawFile = await rawPending;
    const rawPath = join(output, `${name}-unknown-recovery.json`);
    await rawFile.saveAs(rawPath);
    assert.equal(await readFile(rawPath, "utf8"), raw);
    await unknown.close();

    const unlocked = await browser.newContext();
    await unlocked.addInitScript(() =>
      Object.defineProperty(navigator, "locks", { value: undefined }),
    );
    const fallback = await open(unlocked);
    await fallback.locator("#explanation").fill("A separate recovery without Web Locks.");
    await sharedNote(fallback, "A separate recovery without Web Locks.");
    assert.ok(
      await fallback.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key?.startsWith("akzent-recovery-v1:") &&
            JSON.parse(JSON.parse(localStorage.getItem(key)).notebook).note ===
              "A separate recovery without Web Locks."
          )
            return true;
        }
        return false;
      }),
    );
    await unlocked.close();
    const noSession = await browser.newContext();
    await noSession.addInitScript(() =>
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("Tab storage blocked", "SecurityError");
        },
      }),
    );
    const sharedOnly = await open(noSession);
    await sharedOnly
      .locator("#explanation")
      .fill("Keep a recovery when only tab storage is blocked.");
    await sharedNote(sharedOnly, "Keep a recovery when only tab storage is blocked.");
    await text(sharedOnly, "#storage-status", "including a recovery copy");
    assert.ok(
      await sharedOnly.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key?.startsWith("akzent-recovery-v1:") &&
            JSON.parse(JSON.parse(localStorage.getItem(key)).notebook).note ===
              "Keep a recovery when only tab storage is blocked."
          )
            return true;
        }
        return false;
      }),
    );
    await noSession.close();

    const linked = await browser.newContext();
    const linkPage = await linked.newPage();
    const link = new URL(url);
    link.searchParams.set("word", "which");
    link.hash = "selected-title";
    await linkPage.goto(link.href);
    assert.equal(await linkPage.locator("#selected-title").textContent(), "which of two");
    await linkPage.locator("#explanation").fill("A note survives a comparison link.");
    await sharedNote(linkPage, "A note survives a comparison link.");
    link.searchParams.set("word", "nonsense");
    await linkPage.goto(link.href);
    assert.equal(await linkPage.locator("#selected-title").textContent(), "which of two");
    assert.equal(
      await linkPage.locator("#explanation").inputValue(),
      "A note survives a comparison link.",
    );
    await linked.close();
    results.push({
      browser: name,
      lateImportPreservesEdits: true,
      supersededImportIgnored: true,
      importUndo: true,
      newNotebookEscapesPredictionLimit: true,
      storageBlockedStillExports: true,
      unknownStoredFormatPreservedAndDownloaded: true,
      noLocksRetainsSeparateRecovery: true,
      noSessionRetainsSeparateRecovery: true,
      comparisonLinkPreservesNotebookAndIgnoresUnknownWord: true,
    });
    console.log(
      `${name}: divergent/simultaneous drafts, closed-tab recovery, delayed imports, replacement undo, prediction-limit recovery and blocked-storage export passed.`,
    );
  } finally {
    await browser.close();
  }
}
await writeFile(join(output, "review.json"), `${JSON.stringify({ url, results }, null, 2)}\n`);

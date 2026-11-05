import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, firefox } from "playwright";

// Start while the old public edition is still served. Publish the reviewed build,
// verify its canonical bytes, then create the explicit marker supplied below.
const [url, markerPath, outputPath] = process.argv.slice(2);
assert(
  url && markerPath && outputPath,
  "Supply public URL, publication marker and receipt folder.",
);
const marker = resolve(markerPath),
  output = resolve(outputPath);
const expected = (await readFile("dist/index.html", "utf8")).match(
  /name="akzent-edition" content="([a-f0-9]+)"/,
)[1];
const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
await mkdir(output, { recursive: true });
const setups = [],
  browsers = [],
  results = [];
const text = (page, selector, content) =>
  page.waitForFunction(
    ({ selector, content }) => document.querySelector(selector)?.textContent?.includes(content),
    { selector, content },
  );
const edition = (page) => page.locator('meta[name="akzent-edition"]').getAttribute("content");
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch();
    browsers.push(browser);
    for (const width of [1440, 375]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        acceptDownloads: true,
      });
      const control = await context.newPage();
      await control.goto(new URL("/officina/", url).href);
      const a = await context.newPage();
      await a.goto(url);
      await text(a, "#offline-status", "available offline");
      const old = await edition(a);
      assert.notEqual(
        old,
        expected,
        "Start this audit before publication replaces the old edition",
      );
      const note = `${name} ${width}: Keep this older-edition argument through the update.`;
      await a.locator("#explanation").fill(note);
      await a.waitForFunction(
        (note) => JSON.parse(localStorage.getItem("akzent-notebook-v1")).note === note,
        note,
      );
      const b = await context.newPage();
      await b.goto(url);
      await text(b, "#offline-status", "available offline");
      assert.equal(await edition(b), old);
      setups.push({ name, width, context, control, a, b, old, note });
    }
  }
  await writeFile(
    join(output, "old-editions-ready.json"),
    `${JSON.stringify(
      {
        url,
        expected,
        old: setups.map((s) => ({ browser: s.name, width: s.width, edition: s.old })),
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    "Both browsers and widths retain the old edition. Waiting for the explicit publication marker.",
  );
  const deadline = Date.now() + 900_000;
  for (;;) {
    try {
      await readFile(marker);
      break;
    } catch {
      assert.ok(Date.now() < deadline, "No publication marker arrived");
      await new Promise((done) => setTimeout(done, 250));
    }
  }
  for (const setup of setups) {
    const { name, width, context, control, a, b, old, note } = setup;
    await a.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
    });
    await a.waitForFunction(
      async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
      null,
      { timeout: 45_000 },
    );
    assert.equal(await edition(a), old);
    await a.reload();
    await text(a, "#offline-status", "available offline");
    assert.equal(await edition(a), old);
    assert.equal(await a.locator("#explanation").inputValue(), note);
    await b.reload();
    await text(b, "#offline-status", "available offline");
    assert.equal(await edition(b), old);
    const c = await context.newPage();
    await c.goto(url);
    await text(c, "#offline-status", "available offline");
    assert.equal(await edition(c), old);
    await a.close();
    await b.close();
    await c.close();
    // The control page is on the same origin but outside the Akzent worker scope.
    // It can observe registration activation without keeping the old edition alive.
    await control.waitForFunction(
      async () => {
        const registration = await navigator.serviceWorker.getRegistration("/akzent/");
        return Boolean(
          registration?.active?.state === "activated" &&
            !registration.waiting &&
            !registration.installing,
        );
      },
      null,
      { timeout: 30_000 },
    );
    const current = await context.newPage();
    await current.goto(url);
    await text(current, "#offline-status", "available offline");
    assert.equal(await edition(current), expected);
    assert.equal(await current.locator("#explanation").inputValue(), note);
    await current.locator('[data-word="lord"]').click();
    await current.locator("#test-word").click();
    await text(current, "#word-details", "pp. 98, 119");
    await current.locator("#source-page").selectOption("98");
    await text(current, "#source-status", "Page 98 checked");
    await context.setOffline(true);
    await current.reload();
    await text(current, "#offline-status", "available offline");
    await current.locator("#source-page").selectOption("98");
    await text(current, "#source-status", "Page 98 checked");
    const pending = current.waitForEvent("download");
    await current.locator("#save-source").click();
    const file = await pending;
    assert.equal(await file.failure(), null);
    const bytes = await readFile(await file.path());
    const sha = createHash("sha256").update(bytes).digest("hex");
    assert.equal(sha, manifest.find((f) => f.path === "sources/verner-98.png").sha256);
    assert.equal(await current.locator("#explanation").inputValue(), note);
    results.push({
      browser: name,
      version: browsers.find((b) => b.browserType().name() === name).version(),
      width,
      oldEdition: old,
      newEdition: expected,
      waitingUpdateKeptThreeOldTabsCoherent: true,
      oldReloadStillComplete: true,
      activationAfterLastOldTabClosed: true,
      notebookSurvived: true,
      newPrimaryPageAvailableOffline: true,
      newPrimaryPageSha256: sha,
    });
    console.log(
      `${name} ${width}: waiting update, three old tabs, clean activation, retained argument and corrected page 98 offline passed.`,
    );
    await context.close();
  }
  await writeFile(
    join(output, "review.json"),
    `${JSON.stringify(
      {
        checkedAtUtc: new Date().toISOString(),
        url,
        publicationCue: "explicit marker after independent canonical-byte verification",
        results,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await Promise.all(browsers.map((browser) => browser.close()));
}

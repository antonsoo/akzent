import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const output = resolve(process.argv[2] ?? "test-results/audit");
await mkdir(output, { recursive: true });
const root = resolve("dist");
let connected = true;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const server = createServer(async (request, response) => {
  if (!connected) {
    request.socket.destroy();
    return;
  }
  const pathname = new URL(request.url, "http://local").pathname;
  const file = resolve(
    root,
    decodeURIComponent(pathname.replace(/^\/akzent\//, "")) || "index.html",
  );
  if (!pathname.startsWith("/akzent/") || !file.startsWith(`${root}/`)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    response
      .writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".png": "image/png",
            ".woff2": "font/woff2",
            ".ttf": "font/ttf",
            ".svg": "image/svg+xml",
          }[extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      })
      .end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/akzent/`;
const results = [];
const waitText = (page, selector, text) =>
  page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent?.includes(text),
    { selector, text },
  );
function deferred() {
  let finish;
  const promise = new Promise((done) => {
    finish = done;
  });
  return { promise, finish };
}

try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch({ headless: true });
    try {
      connected = true;
      const context = await browser.newContext({
        serviceWorkers: "block",
        viewport: { width: 375, height: 900 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      await page.goto(url);
      await waitText(page, "#source-status", "Page 114 checked");
      const entered = deferred();
      const release = deferred();
      await page.route("**/sources/verner-117.png", async (route) => {
        entered.finish();
        await release.promise;
        try {
          await route.fulfill({
            body: await readFile("public/sources/verner-117.png"),
            contentType: "image/png",
          });
        } catch {
          /* A superseded source request may already have been cancelled. */
        }
      });
      await page.locator("#source-page").selectOption("117");
      await entered.promise;
      await page.locator("#source-page").selectOption("119");
      await waitText(page, "#source-status", "Page 119 checked");
      await page.locator("#zoom-source").click();
      release.finish();
      await page.unroute("**/sources/verner-117.png");
      assert.equal(await page.locator("#source-page").inputValue(), "119");
      assert.equal(await page.locator("#zoom-source").getAttribute("aria-pressed"), "true");
      assert.ok((await page.locator("#source-image").getAttribute("alt")).includes("119"));
      const displayed = await page
        .locator("#source-image")
        .evaluate(async (img) =>
          Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer())),
        );
      assert.equal(
        hash(Buffer.from(displayed)),
        hash(await readFile("public/sources/verner-119.png")),
      );

      await page.locator("#explanation").fill("This was the argument when export began.");
      await page.locator("#unaccented-rule").selectOption("voiced");
      await page.locator('[data-reading="test"]').click();
      await waitText(page, "#source-status", "Page 117 checked");
      await page.locator("#cite-reading").check();
      const exportEntered = deferred();
      const exportRelease = deferred();
      await page.route("**/sources/verner-118.png", async (route) => {
        exportEntered.finish();
        await exportRelease.promise;
        await route.fulfill({
          body: await readFile("public/sources/verner-118.png"),
          contentType: "image/png",
        });
      });
      const downloading = page.waitForEvent("download");
      await page.locator("#save-html").click();
      await exportEntered.promise;
      await page.locator("#explanation").fill("The live argument changed while assets loaded.");
      await page.locator("#unaccented-rule").selectOption("voiceless");
      await page.locator('[data-accent="3"]').click();
      await page.locator("#cite-reading").uncheck();
      exportRelease.finish();
      const artifact = await downloading;
      const path = join(output, `${name}-snapshot.html`);
      await artifact.saveAs(path);
      const html = await readFile(path, "utf8");
      const record = JSON.parse(
        html.match(/<script type="application\/json" id="akzent-record">([\s\S]*?)<\/script>/)[1],
      );
      assert.equal(record.note, "This was the argument when export began.");
      assert.equal(record.rule.unaccented, "voiced");
      assert.deepEqual(record.citations, ["test"]);
      assert.equal(record.accent, 0);
      await page.unroute("**/sources/verner-118.png");

      const bad = Buffer.from(await readFile("public/sources/verner-119.png"));
      bad[bad.length - 30] ^= 1;
      await page.route("**/sources/verner-119.png", (route) =>
        route.fulfill({ body: bad, contentType: "image/png" }),
      );
      await page.locator("#source-page").selectOption("119");
      await waitText(page, "#source-status", "failed its source check");
      assert.equal(await page.locator("#source-image").isVisible(), false);
      await page.locator("#save-html").click();
      await waitText(page, "#export-status", "The reading was not saved");
      assert.equal(
        await page.locator("#explanation").inputValue(),
        "The live argument changed while assets loaded.",
      );
      await page.unroute("**/sources/verner-119.png");
      await page.locator("#source-page").selectOption("118");
      await waitText(page, "#source-status", "Page 118 checked");
      await page.locator("#source-page").selectOption("119");
      await waitText(page, "#source-status", "Page 119 checked");
      await context.close();

      const retained = await browser.newContext();
      const one = await retained.newPage();
      const two = await retained.newPage();
      await one.goto(url);
      await waitText(one, "#offline-status", "available offline");
      await two.goto(url);
      await waitText(two, "#offline-status", "available offline");
      await one.evaluate(async () => {
        const edition = document.querySelector('meta[name="akzent-edition"]').content;
        const cache = await caches.open(`akzent-${edition}`);
        await cache.put(
          new URL("sources/verner-119.png", location.href),
          new Response("damaged-source", { headers: { "Content-Type": "image/png" } }),
        );
      });
      connected = false;
      await one.locator("#source-page").selectOption("119");
      await waitText(one, "#source-status", "could not be shown");
      await waitText(one, "#offline-status", "not fully available");
      await waitText(two, "#offline-status", "not fully available");
      connected = true;
      await one.evaluate(() => dispatchEvent(new Event("online")));
      await waitText(one, "#offline-status", "available offline");
      await waitText(two, "#offline-status", "available offline");
      const repaired = await one.evaluate(async () => {
        const edition = document.querySelector('meta[name="akzent-edition"]').content;
        const response = await caches.match(new URL("sources/verner-119.png", location.href), {
          cacheName: `akzent-${edition}`,
        });
        return Array.from(new Uint8Array(await response.arrayBuffer()));
      });
      assert.equal(
        hash(Buffer.from(repaired)),
        hash(await readFile("public/sources/verner-119.png")),
      );
      await retained.close();
      results.push({
        browser: name,
        lateSourceIgnored: true,
        fullSizePreserved: true,
        snapshotKeptRuleNoteCitationsAndAccent: true,
        sameLengthCorruptionRefused: true,
        exportRefusedCorruptSource: true,
        twoPagesInvalidatedAfterCacheDamage: true,
        twoPagesRecoveredAfterVerifiedRepair: true,
      });
      console.log(
        `${name}: source race, fixed export snapshot, corrupt-source refusal, two-page offline loss/recovery passed.`,
      );
    } finally {
      connected = true;
      await browser.close();
    }
  }
  await writeFile(join(output, "review.json"), `${JSON.stringify({ results }, null, 2)}\n`);
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}

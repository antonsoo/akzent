import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const before = process.env.TRANSFER_BEFORE === "1";
const output = resolve(process.argv[2] ?? `test-results/transfer${before ? "-before" : ""}`);
await mkdir(output, { recursive: true });
const root = resolve("dist");
const events = [];
let mode = "normal";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
const server = createServer(async (request, response) => {
  const path = resolve(
    root,
    decodeURIComponent(new URL(request.url, "http://local").pathname.replace(/^\/akzent\//, "")) ||
      "index.html",
  );
  if (!path.startsWith(`${root}/`)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const bytes = await readFile(path);
    response.writeHead(200, {
      "Content-Type": types[extname(path)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    if (!path.endsWith("sources/verner-115.png") || mode === "normal") {
      response.end(bytes);
      return;
    }
    const transfer = { mode, began: Date.now(), sent: 0, closedAfterMs: null, completed: false };
    events.push(transfer);
    let interval;
    response.on("close", () => {
      clearInterval(interval);
      transfer.closedAfterMs = Date.now() - transfer.began;
    });
    if (mode === "oversize") {
      response.end(Buffer.concat([bytes, Buffer.from([1])]));
      return;
    }
    if (mode === "stall") {
      response.write(bytes.subarray(0, 100));
      transfer.sent = 100;
      return;
    }
    if (mode === "endless") {
      interval = setInterval(() => {
        response.write(bytes.subarray(0, 1));
        transfer.sent++;
      }, 1000);
      return;
    }
    const chunk = Math.ceil(bytes.length / 32);
    response.write(bytes.subarray(0, chunk));
    transfer.sent = chunk;
    interval = setInterval(() => {
      const end = Math.min(bytes.length, transfer.sent + chunk);
      response.write(bytes.subarray(transfer.sent, end));
      transfer.sent = end;
      if (end === bytes.length) {
        clearInterval(interval);
        transfer.completed = true;
        response.end();
      }
    }, 1000);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/akzent/`;
const results = [];
async function waitText(page, selector, text, timeout = 45000) {
  await page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent.includes(text),
    { selector, text },
    { timeout },
  );
}
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch({ headless: true });
    try {
      if (process.env.TRANSFER_REPAIR_ONLY === "1") {
        mode = "normal";
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(url);
        await waitText(page, "#offline-status", "available offline");
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
        await page.evaluate(async () => {
          const edition = document.querySelector('meta[name="akzent-edition"]').content;
          await (await caches.open(`akzent-${edition}`)).delete(
            new URL("sources/verner-115.png", location.href),
          );
        });
        mode = "active";
        const transfersBefore = events.length;
        const at = Date.now();
        await page.locator("#source-page").selectOption("115");
        if (process.env.TRANSFER_BUFFERING_BEFORE === "1") {
          await waitText(page, "#source-status", "No source bytes arrived");
          results.push({
            browser: name,
            flowingWorkerBodyRejected: true,
            afterMs: Date.now() - at,
            message: await page.locator("#source-status").textContent(),
          });
        } else {
          await waitText(page, "#source-status", "Page 115 checked");
          await waitText(page, "#offline-status", "available offline");
          assert.equal(
            events.length - transfersBefore,
            1,
            "Foreground and repair must share one stream",
          );
          results.push({
            browser: name,
            activeWorkerRepairMs: Date.now() - at,
            oneNetworkTransfer: events.length - transfersBefore,
            sourceShown: true,
            offlineReadinessRecovered: true,
          });
        }
        await context.close();
        continue;
      }
      mode = "normal";
      const context = await browser.newContext({
        serviceWorkers: "block",
        viewport: { width: 375, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(url);
      await waitText(page, "#source-status", "Page 114 checked");
      mode = "active";
      const start = Date.now();
      const beforeReader = events.length;
      await page.locator("#source-page").selectOption("115");
      for (let attempt = 0; events.length === beforeReader && attempt < 50; attempt++)
        await new Promise((done) => setTimeout(done, 100));
      assert.equal(events.length, beforeReader + 1);
      if (before) {
        await waitText(page, "#source-status", "took too long");
        results.push({
          browser: name,
          flowingBodyRejected: true,
          afterMs: Date.now() - start,
          message: await page.locator("#source-status").textContent(),
        });
        await context.close();
        continue;
      }
      const readerTransfer = events.at(-1);
      const beforeExport = events.length;
      await page.locator("#save-html").click();
      for (let attempt = 0; events.length === beforeExport && attempt < 50; attempt++)
        await new Promise((done) => setTimeout(done, 100));
      assert.equal(events.length, beforeExport + 1);
      const exportTransfer = events.at(-1);
      await page.locator("#cancel-html").focus();
      await page.keyboard.press("Space");
      await waitText(page, "#export-status", "Reading save canceled");
      assert.equal(await page.evaluate(() => document.activeElement.id), "save-html");
      assert.equal(await page.locator("#source-page").inputValue(), "115");
      assert.equal(readerTransfer.closedAfterMs, null);
      await page.waitForTimeout(300);
      assert.ok(exportTransfer.closedAfterMs < 4000);
      await waitText(page, "#source-status", "Page 115 checked");
      const activeMs = Date.now() - start;
      assert.ok(activeMs > 30000);
      assert.equal(await page.locator("#source-image").isVisible(), true);
      // A new choice cancels an active body and cannot be replaced by its late result.
      mode = "normal";
      await page.locator("#source-page").selectOption("114");
      await waitText(page, "#source-status", "Page 114 checked");
      mode = "active";
      await page.locator("#source-page").selectOption("115");
      await new Promise((done) => setTimeout(done, 1100));
      mode = "normal";
      await page.locator("#source-page").selectOption("119");
      await waitText(page, "#source-status", "Page 119 checked");
      const cancellation = events.at(-1);
      await page.waitForTimeout(300);
      assert.ok(cancellation.closedAfterMs < 4000);
      mode = "stall";
      const stalledAt = Date.now();
      await page.locator("#source-page").selectOption("115");
      await waitText(page, "#source-status", "No source bytes arrived");
      const stallMs = Date.now() - stalledAt;
      assert.ok(stallMs >= 19000 && stallMs < 26000);
      mode = "oversize";
      await page.locator("#source-page").selectOption("114");
      await waitText(page, "#source-status", "Page 114 checked");
      await page.locator("#source-page").selectOption("115");
      await waitText(page, "#source-status", "does not match this edition");
      assert.equal(await page.locator("#source-image").isVisible(), false);
      let ceilingMs = null;
      if (process.env.TRANSFER_CEILING === "1" && name === "chromium") {
        mode = "normal";
        await page.locator("#source-page").selectOption("114");
        await waitText(page, "#source-status", "Page 114 checked");
        mode = "endless";
        const ceilingAt = Date.now();
        await page.locator("#source-page").selectOption("115");
        await waitText(page, "#source-status", "exceeded three minutes", 190000);
        ceilingMs = Date.now() - ceilingAt;
        assert.ok(ceilingMs >= 179000 && ceilingMs < 186000);
      }
      await context.close();
      // Cold worker installation sees the same >30s active stream; no warm cache can conceal it.
      mode = "active";
      const cold = await browser.newContext();
      const coldPage = await cold.newPage();
      const installedAt = Date.now();
      await coldPage.goto(url);
      await waitText(coldPage, "#offline-status", "available offline", 65000);
      assert.ok(Date.now() - installedAt > 30000);
      await coldPage.waitForFunction(() => navigator.serviceWorker.controller !== null);
      mode = "normal";
      await coldPage.locator("#source-page").selectOption("115");
      await waitText(coldPage, "#source-status", "Page 115 checked");
      const inventory = await coldPage.evaluate(async () => {
        const edition = document.querySelector('meta[name="akzent-edition"]').content;
        const cache = await caches.open(`akzent-${edition}`);
        const response = await cache.match(new URL("sources/verner-115.png", location.href));
        return { edition, sourceBytes: (await response.arrayBuffer()).byteLength };
      });
      await cold.close();
      results.push({
        browser: name,
        activeBodyMs: activeMs,
        canceledBodyMs: cancellation.closedAfterMs,
        stalledBodyMs: stallMs,
        oversizedBodyRefused: true,
        cancelSaveKeptSeparateReader: true,
        ceilingMs,
        coldSlowInstallation: true,
        inventory,
      });
      console.log(
        `${name}: active body, cancellation, stalled body, excess bytes and cold slow worker installation passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
await writeFile(
  join(output, "review.json"),
  `${JSON.stringify({ before, workerBufferingBefore: process.env.TRANSFER_BUFFERING_BEFORE === "1", results, transfers: events }, null, 2)}\n`,
);

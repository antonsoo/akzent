import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const output = resolve(process.argv[2] ?? "test-results/browser");
await mkdir(output, { recursive: true });
const root = resolve("dist");
const files = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
let networkAvailable = true;
const server = createServer(async (request, response) => {
  if (!networkAvailable) {
    request.socket.destroy();
    return;
  }
  const url = new URL(request.url, "http://local");
  const name = decodeURIComponent(url.pathname).replace(/^\/akzent\//, "");
  const path = resolve(root, name || "index.html");
  if (!url.pathname.startsWith("/akzent/") || !path.startsWith(`${root}/`)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const bytes = await readFile(path);
    const mime =
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".json": "application/json",
        ".ttf": "font/ttf",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
      }[extname(path)] ?? "text/plain";
    response.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-store" }).end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = `${origin}/akzent/`;
const results = [];
async function textContains(page, selector, value) {
  await page.waitForFunction(
    ({ selector, value }) => document.querySelector(selector)?.textContent?.includes(value),
    { selector, value },
  );
}
async function saveDownload(page, selector, destination) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const download = await pending;
  await download.saveAs(destination);
  assert.equal(await download.failure(), null);
  return readFile(destination);
}

try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const width of [1440, 375]) {
        networkAvailable = true;
        const folder = join(output, `${name}-${width}`);
        await mkdir(folder, { recursive: true });
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          acceptDownloads: true,
          colorScheme: "light",
        });
        const page = await context.newPage();
        const errors = [];
        const external = new Set();
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("request", (request) => {
          if (request.url().startsWith("http") && new URL(request.url()).origin !== origin)
            external.add(request.url());
        });
        await page.goto(url);
        await textContains(page, "#offline-status", "available offline");
        await page.locator("#source-image").waitFor({ state: "visible" });
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        assert.equal(overflow, false, `${name} ${width} overflow`);
        await page.screenshot({ path: join(folder, "opening.png") });

        await textContains(page, "#rule-result", "1 of 2");
        await page.locator("#unaccented-rule").selectOption("voiced");
        await textContains(page, "#rule-result", "2 of 2");
        await page.locator('[data-word="under"]').click();
        await textContains(page, "#word-details", "Covered");
        await page.locator("#test-word").focus();
        await page.keyboard.press("Space");
        await textContains(page, "#trial-status", "undar agrees");
        await page.locator('[data-word="which"]').click();
        await page.locator("#test-word").click();
        await textContains(page, "#trial-status", "resists");
        await textContains(page, "#word-details", "does not invent a missing accent");
        await page.locator("#accented-rule").selectOption("voiced");
        const history = await page.locator("#history").textContent();
        assert.ok(history.includes("After an accented syllable: þ"));
        await page.locator("#accented-rule").selectOption("voiceless");
        await page.locator("#reveal-all").click();
        await textContains(page, "#rule-result", "6 of 8");
        assert.equal(await page.locator("#ledger tbody tr").count(), 8);
        assert.equal(
          await page.locator("#ledger tbody tr").filter({ hasText: "Resists" }).count(),
          2,
        );

        const endpoints = [];
        for (const accent of [0, 1, 2, 3]) {
          await page.locator(`[data-accent="${accent}"]`).focus();
          await page.keyboard.press("Space");
          const endpoint = await page.locator("#experiment li:last-child strong").textContent();
          endpoints.push(endpoint);
        }
        assert.deepEqual(endpoints, ["*ahazad(am)", "*agasad(am)", "*agazaþ(am)", "*agazad(am)"]);
        await page.locator('input[value="accent-first"]').check();
        const reordered = [];
        for (const accent of [0, 1, 2, 3]) {
          await page.locator(`[data-accent="${accent}"]`).click();
          reordered.push(await page.locator("#experiment li:last-child strong").textContent());
        }
        assert.ok(reordered.every((value) => value === "*ahazad(am)"));
        await page.locator('input[value="sounds-first"]').check();
        await page.locator('[data-accent="2"]').click();
        await page.locator("#invented").scrollIntoViewIfNeeded();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        await page.screenshot({ path: join(folder, "invented.png") });
        await textContains(page, "#condition-result", "ð / voiced");
        await page.locator("#initial").check();
        await textContains(page, "#condition-result", "θ / stays voiceless");
        await page.locator("#initial").uncheck();
        await page.locator("#neighbors").uncheck();
        await textContains(page, "#condition-result", "blocks");
        await page.locator("#neighbors").check();
        await page.locator("#preceding").check();
        await textContains(page, "#condition-result", "preceding syllable bears");

        await page.locator('[data-reading="exception"]').click();
        await textContains(page, "#source-status", "Page 119 checked");
        await page.locator('[data-phrase="0"]').click();
        await textContains(page, "#phrase-note", "katará-");
        await page.locator("#cite-reading").check();
        await page.locator("#zoom-source").click();
        const scan = await page.locator("#source-image").evaluate((img) => ({
          natural: img.naturalWidth,
          displayed: img.getBoundingClientRect().width,
        }));
        assert.equal(scan.displayed, scan.natural);
        const pan = page.locator(".scan-window");
        await pan.focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(() => document.querySelector(".scan-window").scrollLeft > 0);
        await page.locator("#zoom-source").click();
        const png = await saveDownload(page, "#save-source", join(folder, "verner-119.png"));
        assert.equal(
          digest(png),
          files.find((file) => file.path === "sources/verner-119.png").sha256,
        );
        await page.locator("#source").scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(folder, "source.png") });

        const note =
          "The accent rule agrees with six selected rows. katará- / hvaþar and páti- / -fadi- still need an account. <script>window.injected=true</script>";
        await page.locator("#explanation").fill(note);
        const json = await saveDownload(page, "#save-json", join(folder, "akzent-notebook.json"));
        const record = JSON.parse(json.toString());
        assert.equal(record.note, note);
        assert.equal(record.trials.length, 2);
        assert.deepEqual(record.citations, ["exception"]);
        assert.equal(record.accent, 2);
        assert.equal(record.conditions.precedingAccented, true);
        assert.equal(record.trials[1].prediction, "d");
        const csv = await saveDownload(page, "#save-csv", join(folder, "akzent-comparisons.csv"));
        assert.equal(csv.toString().split("\r\n").length, 12);
        const svg = await saveDownload(page, "#save-svg", join(folder, "akzent-experiment.svg"));
        assert.ok(svg.toString().includes("*agazaþ(am)"));
        const html = await saveDownload(page, "#save-html", join(folder, "akzent-reading.html"));
        assert.ok(html.toString().includes("&lt;script&gt;"));

        await page.locator("#explanation").fill("temporary change");
        await page.locator("#open-notebook").setInputFiles(join(folder, "akzent-notebook.json"));
        await textContains(page, "#export-status", "Reopened");
        assert.equal(await page.locator("#explanation").inputValue(), note);
        await page.locator("#open-notebook").setInputFiles({
          name: "broken.json",
          mimeType: "application/json",
          buffer: Buffer.from('{"schema":"wrong"}'),
        });
        await textContains(page, "#export-status", "current work has been kept");
        assert.equal(await page.locator("#explanation").inputValue(), note);

        const light = await new AxeBuilder({ page }).analyze();
        await page.locator("#theme").click();
        const dark = await new AxeBuilder({ page }).analyze();
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: join(folder, "dark.png") });
        assert.deepEqual(light.violations, [], `${name}-${width}: light accessibility`);
        assert.deepEqual(dark.violations, [], `${name}-${width}: dark accessibility`);

        // Refuse actual origin connections. Keep navigator.onLine true to exercise a real outage.
        networkAvailable = false;
        await page.reload({ waitUntil: "domcontentloaded" });
        await textContains(page, "#offline-status", "available offline");
        assert.equal(await page.locator("#preceding").isChecked(), true);
        assert.equal(await page.locator("#explanation").inputValue(), note);
        await page.locator('[data-reading="fiction"]').click();
        await textContains(page, "#source-status", "Page 114 checked");
        const offlineHtml = await saveDownload(
          page,
          "#save-html",
          join(folder, "akzent-reading-offline.html"),
        );
        assert.equal(digest(offlineHtml), digest(html));

        // The portable reading itself is opened on file:// and is also forbidden network access.
        const portable = await context.newPage();
        const portableErrors = [];
        const portableRequests = [];
        portable.on("pageerror", (error) => portableErrors.push(error.message));
        portable.on("request", (request) => {
          if (request.url().startsWith("http")) portableRequests.push(request.url());
        });
        await portable.goto(pathToFileURL(join(folder, "akzent-reading.html")).href);
        await portable.evaluate(() => document.fonts.ready);
        assert.equal(await portable.locator(".source-page").count(), 6);
        const embedded = await portable.locator(".source-page").evaluateAll(async (images) => {
          const results = [];
          for (const img of images) {
            await img.decode();
            results.push({ alt: img.alt, base64: img.src.split(",")[1], width: img.naturalWidth });
          }
          return results;
        });
        for (const image of embedded) {
          image.hash = digest(Buffer.from(image.base64, "base64"));
          delete image.base64;
          const pageNumber = Number(image.alt.match(/page (\d+)/)[1]);
          assert.equal(
            image.hash,
            files.find((file) => file.path === `sources/verner-${pageNumber}.png`).sha256,
          );
          assert.ok(image.width > 1400);
        }
        assert.equal(await portable.evaluate(() => window.injected), undefined);
        assert.equal(await portable.locator(".notes").textContent(), note);
        await portable.screenshot({ path: join(folder, "portable.png") });
        if (name === "chromium" && width === 1440)
          await portable.pdf({
            path: join(folder, "akzent-reading.pdf"),
            format: "A4",
            printBackground: true,
            tagged: true,
            outline: true,
          });
        assert.deepEqual(portableErrors, []);
        assert.deepEqual(portableRequests, []);
        await portable.close();
        networkAvailable = true;
        assert.deepEqual(errors, []);
        assert.deepEqual([...external], []);
        results.push({
          browser: name,
          width,
          endpoints,
          reordered,
          revealedComparisons: 8,
          fixedPredictions: 2,
          resistantComparisons: 2,
          sourcePngSha256: digest(png),
          readingSha256: digest(html),
          offlineReadingIdentical: true,
          embeddedSourcePages: embedded,
          axeLightViolations: light.violations.length,
          axeDarkViolations: dark.violations.length,
          pageErrors: errors,
          externalRequests: [...external],
        });
        await context.close();
        console.log(
          `${name} ${width}: words, accent/order, source, downloads, portable reading and real-origin outage passed.`,
        );
      }
    } finally {
      await browser.close();
    }
  }
  await writeFile(
    join(output, "review.json"),
    `${JSON.stringify({ builtAt: new Date().toISOString(), url, results }, null, 2)}\n`,
  );
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}

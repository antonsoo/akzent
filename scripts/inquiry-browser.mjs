import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const publicURL = process.env.AKZENT_PUBLIC_URL;
const output = resolve(process.argv[2] ?? "test-results/inquiry");
await mkdir(output, { recursive: true });
const results = [];
const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function waitText(page, selector, text) {
  await page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent.includes(text),
    { selector, text },
  );
}
async function download(page, selector, file) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const item = await pending;
  await item.saveAs(file);
  assert.equal(await item.failure(), null);
  return readFile(file);
}
async function startServer(port) {
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { stdio: "pipe" },
  );
  let log = "";
  for (const stream of [server.stdout, server.stderr])
    stream.on("data", (bytes) => {
      log += bytes;
    });
  const url = `http://127.0.0.1:${port}/akzent/`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Server stopped: ${log}`);
    try {
      if ((await fetch(url)).ok) return { server, url };
    } catch {
      /* Starting. */
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  server.kill();
  throw new Error(`Preview did not start: ${log}`);
}
async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  const stopped = once(server, "exit");
  server.kill();
  await stopped;
}

for (const [name, engine] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [1440, 375]) {
      const { server, url } = publicURL
        ? { server: null, url: publicURL }
        : await startServer(4394);
      const folder = join(output, `${name}-${width}`);
      await mkdir(folder, { recursive: true });
      const context = await browser.newContext({
        viewport: { width, height: 1100 },
        acceptDownloads: true,
        colorScheme: "light",
      });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(url);
        // Reach the lesson through its real navigation, then operate the mirrored order control.
        await page.getByRole("link", { name: "Next reading", exact: true }).click();
        await page.locator("#inquiry-order").selectOption("unknown");
        await waitText(page, ".inquiry-context", "leaves 8 scenarios");
        assert.equal(await page.locator("#evidence-order").inputValue(), "unknown");
        assert.equal(
          await page.locator(".accent-bound").filter({ hasText: "4 accent positions" }).count(),
          3,
        );
        assert.equal(
          await page
            .locator(".accent-bound")
            .filter({ hasText: "No guaranteed reduction" })
            .count(),
          3,
        );
        await waitText(page, ".inquiry-goals", "rank the readings differently");
        const counts = await page.locator(".outcome-title").allTextContents();
        assert.deepEqual(counts, [
          "If h: 5 scenarios",
          "If g: 3 scenarios",
          "If s: 1 scenario",
          "If z: 7 scenarios",
          "If þ: 1 scenario",
          "If d: 7 scenarios",
        ]);
        assert.equal(
          await page
            .locator(".test-heading")
            .filter({ hasText: "Smallest largest branch" })
            .count(),
          1,
        );
        await page.locator("#proposed-accent").selectOption("3");
        await page.locator("#check-accent").click();
        const fixedProposal = await page.locator(".checked-proposal").textContent();
        await page.locator("#inquiry").scrollIntoViewIfNeeded();
        await page.locator(".reading-route summary").click();
        const route = await page.locator(".reading-route").textContent();
        assert.match(route, /five|5 scenarios/);
        assert.match(route, /same complete output/);
        await page.locator(".reading-route summary").click();
        const unknownCsv = await download(page, "#save-inquiry-csv", join(folder, "unknown.csv"));
        assert.equal(unknownCsv.toString().split("\r\n").length, 34);
        if (name === "chromium" && width === 1440) {
          await download(page, "#save-html", join(folder, "reading-plan.html"));
          await download(page, "#save-json", join(folder, "reading-plan.json"));
        }
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitText(page, ".inquiry-context", "leaves 8 scenarios");
        await page
          .locator("#inquiry")
          .evaluate((element) => element.scrollIntoView({ block: "start" }));
        await page.screenshot({ path: join(folder, "inquiry.png") });
        const light = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(light.violations, []);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        await page.locator("#theme").click();
        await page
          .locator("#inquiry")
          .evaluate((element) => element.scrollIntoView({ block: "start" }));
        await page.screenshot({ path: join(folder, "inquiry-dark.png") });
        const dark = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(dark.violations, []);
        // Keyboard-operated conditional branches must survive rerender and retain the fixed proposal.
        await page.locator('[data-inquiry-key="dorsal"][data-inquiry-value="g"]').focus();
        await page.keyboard.press("Space");
        await waitText(page, ".inquiry-context", "leaves 3 scenarios");
        await page.locator("#inquiry-undo").click();
        await waitText(page, ".inquiry-context", "leaves 8 scenarios");
        assert.equal(await page.locator("#inquiry-undo").isDisabled(), true);
        await page.locator('[data-inquiry-key="dorsal"][data-inquiry-value="g"]').click();
        await waitText(page, ".inquiry-context", "leaves 3 scenarios");
        assert.equal(await page.evaluate(() => document.activeElement.id), "inquiry-status");
        assert.equal(await page.locator("#evidence-dorsal").inputValue(), "g");
        await page.locator('[data-inquiry-key="sibilant"][data-inquiry-value="z"]').click();
        await waitText(page, ".inquiry-context", "leaves 2 scenarios");
        await page.locator('[data-inquiry-key="dental"][data-inquiry-value="þ"]').click();
        await waitText(page, ".inquiry-summary", "One explanation remains");
        assert.equal(await page.locator(".checked-proposal").textContent(), fixedProposal);
        // Empty branches remain usable as a deliberate contradiction, not silently discarded.
        await page.locator("#inquiry-erasure").click();
        await page.locator("#evidence-sibilant").selectOption("s");
        await waitText(page, ".inquiry-summary", "No next reading can rescue");
        await download(page, "#save-inquiry-csv", join(folder, "impossible.csv"));
        await page.locator("#inquiry-erasure").click();
        await page.locator("#inquiry-start").click();
        await page.locator('[data-inquiry-key="dorsal"][data-inquiry-value="h"]').click();
        await waitText(page, ".inquiry-summary", "Reading the missing consonants cannot separate");
        assert.equal(
          await page.locator(".test-heading").filter({ hasText: "No separation" }).count(),
          2,
        );
        assert.equal(await page.locator(".output-groups .scenario-token").count(), 5);
        // Every outcome remains selectable, including outcomes the model rules out.
        await page.locator('[data-inquiry-key="sibilant"][data-inquiry-value="s"]').click();
        await waitText(page, ".inquiry-context", "leaves 0 scenarios");
        await page.locator("#inquiry-erasure").click();
        await waitText(page, ".inquiry-summary", "Every consonant is supplied");
        assert.equal(await page.locator(".reading-tests").count(), 0);
        await download(page, "#save-inquiry-csv", join(folder, "shared-output.csv"));
        // Source navigation exposes the actual p. 115 and its four printed outputs.
        await page.locator("#inquiry-source").click();
        await waitText(page, "#source-status", "Page 115 checked");
        const png = await download(page, "#save-source", join(folder, "verner-115.png"));
        assert.equal(
          hash(png),
          manifest.find((item) => item.path === "sources/verner-115.png").sha256,
        );
        await page
          .locator("#explanation")
          .fill(
            "A complete h/z/d output still leaves five scenarios with either order. Reading more letters cannot restore a distinction erased before voicing.",
          );
        const json = await download(page, "#save-json", join(folder, "notebook.json"));
        const record = JSON.parse(json.toString());
        assert.equal(record.inference.submitted.accent, 3);
        const html = await download(page, "#save-html", join(folder, "reading.html"));
        assert.doesNotMatch(
          html.toString().split('<section id="inquiry">')[1].split("</section>")[0],
          /<button/,
        );
        // Read the saved file directly, with all HTTP requests refused.
        const portable = await context.newPage();
        const httpRequests = [];
        portable.on("request", (request) => {
          if (/^https?:/.test(request.url())) httpRequests.push(request.url());
        });
        await portable.route(/^https?:/, (route) => route.abort());
        await portable.goto(pathToFileURL(join(folder, "reading.html")).href);
        await waitText(portable, "#inquiry", "Every consonant is supplied");
        assert.equal(await portable.locator("#inquiry .scenario-token").count(), 5);
        assert.equal(await portable.locator("#inquiry .route-leaf").isVisible(), true);
        assert.equal(await portable.locator(".source-page").count(), 7);
        assert.equal(
          await portable
            .locator("img")
            .evaluateAll((images) =>
              images.every((image) => image.complete && image.naturalWidth > 0),
            ),
          true,
        );
        assert.deepEqual(httpRequests, []);
        const embeddedJson = await download(
          portable,
          'a[download="akzent-notebook.json"]',
          join(folder, "embedded-notebook.json"),
        );
        assert.deepEqual(JSON.parse(embeddedJson.toString()), record);
        const embeddedCsv = await download(
          portable,
          'a[download="akzent-reading-plan.csv"]',
          join(folder, "embedded-reading-plan.csv"),
        );
        assert.equal(
          embeddedCsv.toString(),
          (await readFile(join(folder, "shared-output.csv"))).toString(),
        );
        if (name === "chromium" && width === 1440)
          await portable.pdf({
            path: join(folder, "reading.pdf"),
            format: "A4",
            tagged: true,
            outline: true,
            printBackground: true,
          });
        if (name === "chromium" && width === 1440) {
          await portable.goto(pathToFileURL(join(folder, "reading-plan.html")).href);
          assert.equal(await portable.locator("#inquiry .route-leaf").count(), 4);
          assert.equal(await portable.locator("#inquiry .route-leaf").first().isVisible(), true);
          await portable.pdf({
            path: join(folder, "reading-plan.pdf"),
            format: "A4",
            tagged: true,
            outline: true,
            printBackground: true,
          });
        }
        await portable.close();
        // Restore an actual downloaded JSON after changing its evidence.
        await page.locator("#inquiry-start").click();
        await page.locator("#open-notebook").setInputFiles(join(folder, "notebook.json"));
        await waitText(page, "#export-status", "Reopened");
        await waitText(page, ".inquiry-summary", "Every consonant is supplied");
        await waitText(page, "#offline-status", "available offline");
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
        const edition = await page.locator('meta[name="akzent-edition"]').getAttribute("content");
        await stopServer(server);
        if (server) await assert.rejects(fetch(url), /fetch failed/);
        else await context.setOffline(true);
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitText(page, "#offline-status", "available offline");
        await waitText(page, ".inquiry-summary", "Every consonant is supplied");
        assert.equal(
          await page.locator('meta[name="akzent-edition"]').getAttribute("content"),
          edition,
        );
        const offlineJson = await download(
          page,
          "#save-json",
          join(folder, "offline-notebook.json"),
        );
        assert.deepEqual(JSON.parse(offlineJson.toString()), record);
        await page.locator("#inquiry-start").click();
        await waitText(page, ".inquiry-context", "leaves 8 scenarios");
        await download(page, "#save-inquiry-csv", join(folder, "offline-unknown.csv"));
        await page.locator("#inquiry-source").click();
        await waitText(page, "#source-status", "Page 115 checked");
        assert.deepEqual(errors, []);
        results.push({
          browser: name,
          width,
          edition,
          conditionalPartitions: counts,
          keyboardFocusRetained: true,
          checkedProposalFixed: true,
          impossibleReadingRetained: true,
          completeOutputScenarios: 5,
          sourcePngVerified: true,
          jsonRoundTrip: true,
          scriptFreeReadingWithoutHttp: true,
          originStopped: !publicURL,
          browserNetworkOffline: Boolean(publicURL),
          offlineReloadAndOperation: true,
          lightViolations: light.violations.length,
          darkViolations: dark.violations.length,
          pageErrors: errors,
        });
        console.log(
          `${name} ${width}: inquiry, conditional branches, fixed proposal, source, CSV/JSON/HTML, themes, accessibility and ${publicURL ? "browser-network-offline" : "stopped-origin"} operation passed.`,
        );
      } finally {
        await context.close();
        await stopServer(server);
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  join(output, "review.json"),
  `${JSON.stringify({ publication: publicURL ? "canonical public edition; browser network disabled for offline steps" : "local only; no push or deployment", results }, null, 2)}\n`,
);

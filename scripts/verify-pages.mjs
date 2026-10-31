// Compare an actual canonical static site with one local build. No cache-busting
// URL, deployment mutation, registry operation, or inferred source/release status.
import { createHash } from "node:crypto";
import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function buildInventory(directory) {
  const root = resolve(directory);
  if (!(await lstat(root)).isDirectory())
    throw new Error("Build root must be a regular directory.");
  const files = [];
  async function scan(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        throw new Error(
          "Build contains repository or dependency metadata; pass the static output directory.",
        );
      }
      const path = resolve(folder, entry.name);
      if (entry.isDirectory()) await scan(path);
      else if (entry.isFile()) {
        const bytes = await readFile(path);
        files.push({
          path: relative(root, path).split(sep).join("/"),
          bytes: bytes.byteLength,
          sha256: sha256(bytes),
        });
      } else
        throw new Error(
          "Build contains a symlink or non-regular entry; materialize the static artifact first.",
        );
    }
  }
  await scan(root);
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  if (!files.some((file) => file.path === "index.html"))
    throw new Error("Build has no index.html.");
  return { files, sha256: sha256(JSON.stringify(files)) };
}

async function checkURL(url, expected, timeoutMs) {
  let observedBytes = 0;
  let httpStatus;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    httpStatus = response.status;
    if (response.status !== 200) {
      await response.body?.cancel();
      return {
        ...expected,
        url,
        state: "unavailable",
        httpStatus,
        error: "Expected a complete HTTP 200 response.",
      };
    }
    const digest = createHash("sha256");
    const reader = response.body?.getReader();
    if (reader) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          observedBytes += value.byteLength;
          if (observedBytes > expected.bytes) {
            await reader.cancel().catch(() => undefined);
            return {
              ...expected,
              url,
              state: "mismatch",
              httpStatus,
              observedBytesAtLeast: observedBytes,
              observedSha256: null,
              error:
                "Response exceeds the expected length; full body and digest were not retained.",
            };
          }
          digest.update(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const observedSha256 = digest.digest("hex");
    return {
      ...expected,
      url,
      httpStatus,
      observedBytes,
      observedSha256,
      state:
        observedBytes === expected.bytes && observedSha256 === expected.sha256
          ? "verified"
          : "mismatch",
    };
  } catch (error) {
    return {
      ...expected,
      url,
      state: "unavailable",
      httpStatus: httpStatus ?? null,
      receivedBytesBeforeFailure: observedBytes,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function mapConcurrent(items, count, visit) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(count, items.length) }, async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await visit(items[index]);
      }
    }),
  );
  return results;
}

export async function verifyPages({
  baseURL,
  directory,
  waitMs = 0,
  pollMs = 5000,
  requestTimeoutMs = 10000,
  concurrency = 6,
}) {
  const base = new URL(baseURL);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    !base.pathname.endsWith("/") ||
    base.search ||
    base.hash ||
    base.username ||
    base.password
  ) {
    throw new Error("Use an HTTP(S) base URL ending in /, without query, fragment or credentials.");
  }
  if (
    !Number.isFinite(waitMs) ||
    waitMs < 0 ||
    !Number.isSafeInteger(pollMs) ||
    pollMs < 1 ||
    !Number.isSafeInteger(requestTimeoutMs) ||
    requestTimeoutMs < 1 ||
    !Number.isSafeInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 32
  ) {
    throw new Error("Invalid retry, timeout or concurrency setting.");
  }
  const inventory = await buildInventory(directory);
  const index = inventory.files.find((file) => file.path === "index.html");
  const started = Date.now();
  let attempts = 0;
  let result;
  do {
    attempts++;
    const timeout =
      waitMs === 0
        ? requestTimeoutMs
        : Math.max(1, Math.min(requestTimeoutMs, Math.floor(waitMs - (Date.now() - started))));
    const rootBefore = await checkURL(base.href, index, timeout);
    let files = [];
    let rootAfter = null;
    if (rootBefore.state === "verified") {
      files = await mapConcurrent(inventory.files, concurrency, (file) =>
        checkURL(
          new URL(file.path.split("/").map(encodeURIComponent).join("/"), base).href,
          file,
          timeout,
        ),
      );
      // The real entry URL and explicit index.html can occupy different CDN
      // cache entries. Check both and re-check the entry after the asset pass.
      rootAfter = await checkURL(base.href, index, timeout);
    }
    const observations = [rootBefore, ...files, ...(rootAfter ? [rootAfter] : [])];
    const state = observations.some((file) => file.state === "mismatch")
      ? "mismatch"
      : observations.some((file) => file.state === "unavailable")
        ? "unavailable"
        : "verified";
    result = {
      schemaVersion: 1,
      node: process.version,
      requestTimeoutMs,
      retryWindowMs: waitMs,
      pollIntervalMs: pollMs,
      concurrency,
      baseURL: base.href,
      state,
      attempts,
      startedAtUtc: new Date(started).toISOString(),
      checkedAtUtc: new Date().toISOString(),
      buildManifestSha256: inventory.sha256,
      expectedFileCount: inventory.files.length,
      checkedFileCount: files.length,
      verifiedFileCount: files.filter((file) => file.state === "verified").length,
      rootBefore,
      rootAfter,
      files,
      scope:
        "Compares canonical responses with this captured build inventory during the recorded pass. Extra hosted files, browser behavior, public source, registry releases and deployment provenance are not established.",
    };
    if (state === "verified" || Date.now() - started >= waitMs) break;
    await new Promise((done) =>
      setTimeout(done, Math.max(0, Math.min(pollMs, waitMs - (Date.now() - started)))),
    );
  } while (Date.now() - started < waitMs);
  return result;
}

async function main(args) {
  if (args.includes("--help")) {
    console.log(
      "Usage: node scripts/verify-pages.mjs BASE_URL BUILD_DIR [--out RECEIPT.json] [--wait SECONDS]\nChecks canonical root/index and every local build file. Exit 0 only when all bytes match.",
    );
    return;
  }
  const [baseURL, directory, ...flags] = args;
  if (!baseURL || !directory) throw new Error("BASE_URL and BUILD_DIR are required; use --help.");
  let output;
  let waitMs = 0;
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    const value = flags[++i];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
    if (flag === "--out") output = resolve(value);
    else if (flag === "--wait" && /^\d+(?:\.\d+)?$/.test(value) && Number(value) <= 600)
      waitMs = Number(value) * 1000;
    else throw new Error(`Unknown option or invalid value: ${flag}.`);
  }
  if (output) {
    const location = relative(resolve(directory), output);
    if (
      location === "" ||
      (!location.startsWith(`..${sep}`) && location !== ".." && !isAbsolute(location))
    ) {
      throw new Error(
        "Write the receipt outside the build directory so it cannot change the inventory.",
      );
    }
  }
  const result = await verifyPages({ baseURL, directory, waitMs });
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (output) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, json);
  }
  console.log(json.trimEnd());
  if (result.state !== "verified") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}

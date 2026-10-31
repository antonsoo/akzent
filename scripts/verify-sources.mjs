import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
async function walk(path) {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...(await walk(join(path, entry.name))));
    else files.push(join(path, entry.name).slice(7));
  }
  return files;
}
const actual = (await walk("public")).filter((path) => path !== "icon.svg").sort();
const expected = manifest.map((entry) => entry.path).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected))
  throw new Error("Retained-file inventory changed.");
for (const entry of manifest) {
  const bytes = await readFile(join("public", entry.path));
  if (
    bytes.length !== entry.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256
  )
    throw new Error(`Retained file differs: ${entry.path}`);
}
console.log(
  `Verified ${manifest.length} retained sources, fonts, licenses and provenance records.`,
);

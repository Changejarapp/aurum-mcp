#!/usr/bin/env node
/**
 * Fetch the latest manifest from the live aurum-android gallery and write
 * it to data/manifest.json. Idempotent: if the local copy already matches,
 * no-op.
 *
 * Used by the `sync-manifest.yml` GitHub Actions workflow and by the local
 * `make manifest-fetch` target.
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "..", "data", "manifest.json");
const SOURCE_URL = "https://changejarapp.github.io/aurum-android/data/manifest.json";

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${url}`);
  }
  return await res.text();
}

async function readIfExists(path) {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function main() {
  console.log(`Fetching ${SOURCE_URL}`);
  const remote = await fetchText(SOURCE_URL);
  // Re-serialise to canonical form (matches generate.py's output).
  const parsed = JSON.parse(remote);
  const canonical = JSON.stringify(parsed, null, 2) + "\n";

  const local = await readIfExists(DATA_PATH);
  if (local === canonical) {
    console.log("✓ already up to date — no change");
    return;
  }

  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, canonical);
  const livenSha = parsed.meta?.manifestSha?.slice(0, 8) ?? "?";
  console.log(`✓ wrote data/manifest.json — aurum ${parsed.aurum?.version} (sha ${livenSha})`);
  console.log(`  components: ${parsed.components?.length ?? 0}, icons: ${parsed.icons?.length ?? 0}`);
}

main().catch((err) => {
  console.error("✗ manifest:fetch failed:", err.message);
  process.exit(1);
});

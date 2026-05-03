/**
 * Manifest loader. v0.1 reads the bundled `data/manifest.json` baked into the
 * package at publish time. v0.2 will add a `--mode=live` path that fetches
 * the manifest from the public gallery URL with the bundled copy as fallback.
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Manifest } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve the bundled manifest's location relative to this module. */
function bundledManifestPath(): string {
  // From dist/manifest.js (CI build) or src/manifest.ts (dev), the data
  // directory is two levels up.
  return resolve(__dirname, "..", "data", "manifest.json");
}

let cached: Manifest | null = null;

export async function loadManifest(): Promise<Manifest> {
  if (cached) return cached;
  const path = bundledManifestPath();
  const raw = await readFile(path, "utf8");
  cached = JSON.parse(raw) as Manifest;
  return cached;
}

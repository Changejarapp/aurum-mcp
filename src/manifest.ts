/**
 * Manifest loader. Reads the bundled `data/manifest.json` baked into the
 * package at publish time.
 *
 * v0.3 accepts either schemaVersion "1" or "2". v2 adds optional
 * component.intendedUse, component.usage, component.relatedTokens, and
 * icon.tags fields — when absent, the reader and downstream tools
 * degrade gracefully (no error, just no enrichment block in responses).
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Manifest } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPPORTED_SCHEMA_VERSIONS = new Set(["1", "2"]);

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
  const parsed = JSON.parse(raw) as Manifest;
  if (!SUPPORTED_SCHEMA_VERSIONS.has(parsed.schemaVersion)) {
    throw new Error(
      `Unsupported manifest schemaVersion "${parsed.schemaVersion}" — ` +
        `expected one of ${[...SUPPORTED_SCHEMA_VERSIONS].join(", ")}. ` +
        `Update aurum-mcp to a newer version.`,
    );
  }
  cached = parsed;
  return cached;
}

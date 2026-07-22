#!/usr/bin/env node
/**
 * Fetch the live aurum-android AND aurum-ios gallery manifests, merge them
 * into ONE multi-platform manifest, and write it to data/manifest.json.
 *
 * Deterministic: the merge derives `meta.generatedAt` from the LATER of the
 * two inputs' timestamps (never "now") and `meta.manifestSha` from the merged
 * content, so identical inputs produce byte-identical output — the sync cron
 * only commits when an upstream gallery actually redeployed. Idempotent
 * no-op when the local copy already matches.
 *
 * Fail-closed: if EITHER live manifest is unreachable this script exits 1.
 * sync-manifest.yml then goes loud-red rather than silently serving a
 * partial catalog; drift-check.yml wraps the call in its own soft-skip.
 *
 * Merge shape (schema stays "2" — all merged fields are additive; contract:
 * aurum-android/tooling/manifest/schema.json):
 *   - aurum: library "aurum", version mirrors android (primary),
 *     platforms ["android","ios"], sources {android:{version,sha}, ios:{…}}.
 *   - components: union by name. Overlaps keep android's top-level fields
 *     (primary) and carry per-platform detail in component.sources.
 *   - icons: union by (category-lowercased, name); each entry gains
 *     platforms[]. Android's entry wins on overlap (currentColor SVGs).
 *   - codeConnect: concatenation; each entry gains platform.
 *   - tokens: android's (parity with ios is checked and WARNED on drift —
 *     transient drift is expected while release cadences differ).
 *   - changelog: android's (primary); changelogs {android, ios} carry both.
 *
 * Used by `sync-manifest.yml`, `drift-check.yml`, and `pnpm manifest:fetch`.
 */

import { createHash } from "node:crypto";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "..", "data", "manifest.json");

const SOURCES = {
  android: "https://changejarapp.github.io/aurum-android/data/manifest.json",
  ios: "https://changejarapp.github.io/aurum-ios/data/manifest.json",
};

async function fetchJson(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${url}`);
  }
  return await res.json();
}

async function readIfExists(path) {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/** Sorted-key deep copy, so the content hash is key-order independent. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  }
  return value;
}

function sha256(obj) {
  return createHash("sha256").update(JSON.stringify(canonical(obj))).digest("hex");
}

/** Per-platform component detail for component.sources — only what the
 *  platform's generator actually emitted (aurum-ios has no signature/params
 *  yet; the schema keeps every field but sourcePath optional for exactly
 *  this reason). */
function componentSource(c) {
  const s = { sourcePath: c.sourcePath };
  if (c.signature) s.signature = c.signature;
  if (c.params?.length) s.params = c.params;
  if (c.kdoc) s.kdoc = c.kdoc;
  if (c.codeConnectPath != null) s.codeConnectPath = c.codeConnectPath;
  if (c.galleryUrl != null) s.galleryUrl = c.galleryUrl;
  if (c.previews?.length) s.previews = c.previews;
  return s;
}

function sourceVersion(aurum) {
  const v = { version: aurum.version };
  if (aurum.sha) v.sha = aurum.sha;
  return v;
}

/** Token parity is a cross-repo contract (token-path parity invariant in
 *  both CLAUDEs). Drift between the two live manifests is usually just
 *  release-cadence lag — report it loudly, don't fail the sync. */
function tokenParityWarnings(android, ios) {
  const warnings = [];
  // The generators encode alpha differently — android bakes it into an
  // 8-digit hex, ios keeps a 6-digit hex + separate `alpha` field.
  // Normalise to rgb@alphaByte so only REAL drift is reported.
  const normSwatch = (sw) => {
    const hex = sw.hex.toUpperCase();
    const rgb = hex.slice(0, 7);
    const alphaByte =
      hex.length === 9 ? parseInt(hex.slice(7, 9), 16) : Math.round((sw.alpha ?? 1) * 255);
    return `${rgb}@${alphaByte}`;
  };
  const flat = (tokens) => {
    const out = new Map();
    for (const [group, swatches] of Object.entries(tokens.color.semantic)) {
      for (const sw of swatches) out.set(`color.${group}.${sw.name}`, normSwatch(sw));
    }
    for (const cat of ["spacing", "radius", "borderWidth", "iconSize"]) {
      for (const t of tokens[cat]) out.set(`${cat}.${t.name}`, String(t.dp));
    }
    for (const t of tokens.typography) {
      out.set(`typography.${t.name}`, `${t.sizeSp}/${t.lineHeightSp}/${t.weight}`);
    }
    return out;
  };
  const a = flat(android.tokens);
  const i = flat(ios.tokens);
  for (const [name, value] of a) {
    if (!i.has(name)) warnings.push(`android-only token: ${name}`);
    else if (i.get(name) !== value) {
      warnings.push(`value drift: ${name} — android ${value} vs ios ${i.get(name)}`);
    }
  }
  for (const name of i.keys()) {
    if (!a.has(name)) warnings.push(`ios-only token: ${name}`);
  }
  return warnings;
}

export function mergeManifests(android, ios) {
  if (android.meta.figmaFileKey !== ios.meta.figmaFileKey) {
    throw new Error(
      `figmaFileKey mismatch: android ${android.meta.figmaFileKey} vs ios ${ios.meta.figmaFileKey} — ` +
        `every node deeplink in a merged manifest must reference one file.`,
    );
  }

  const iosByName = new Map(ios.components.map((c) => [c.name, c]));
  const androidNames = new Set(android.components.map((c) => c.name));
  const components = [];
  for (const a of android.components) {
    const i = iosByName.get(a.name);
    if (i) {
      components.push({
        ...a,
        platforms: ["android", "ios"],
        figmaNodeId: a.figmaNodeId ?? i.figmaNodeId ?? null,
        figmaUrl: a.figmaUrl ?? i.figmaUrl ?? null,
        sources: { android: componentSource(a), ios: componentSource(i) },
      });
    } else {
      components.push({ ...a, sources: { android: componentSource(a) } });
    }
  }
  for (const i of ios.components) {
    if (!androidNames.has(i.name)) {
      components.push({ ...i, sources: { ios: componentSource(i) } });
    }
  }
  components.sort(
    (x, y) => x.family.localeCompare(y.family) || x.name.localeCompare(y.name),
  );

  const iconKey = (ic) => `${ic.category.toLowerCase()}/${ic.name}`;
  const iosIconKeys = new Set(ios.icons.map(iconKey));
  const androidIconKeys = new Set(android.icons.map(iconKey));
  const icons = android.icons.map((ic) => ({
    ...ic,
    platforms: iosIconKeys.has(iconKey(ic)) ? ["android", "ios"] : ["android"],
  }));
  for (const ic of ios.icons) {
    if (!androidIconKeys.has(iconKey(ic))) icons.push({ ...ic, platforms: ["ios"] });
  }

  const codeConnect = [
    ...android.codeConnect.map((m) => ({ ...m, platform: "android" })),
    ...ios.codeConnect.map((m) => ({ ...m, platform: "ios" })),
  ];

  const generatedAt = [android.meta.generatedAt, ios.meta.generatedAt].sort(
    (x, y) => Date.parse(x) - Date.parse(y),
  )[1];

  const manifest = {
    schemaVersion: "2",
    aurum: {
      library: "aurum",
      version: android.aurum.version,
      sha: android.aurum.sha ?? "",
      platforms: ["android", "ios"],
      sources: {
        android: sourceVersion(android.aurum),
        ios: sourceVersion(ios.aurum),
      },
    },
    meta: {
      generatedAt,
      figmaFileKey: android.meta.figmaFileKey,
      galleryUrl: android.meta.galleryUrl,
    },
    components,
    tokens: android.tokens,
    icons,
    codeConnect,
    changelog: android.changelog,
    changelogs: { android: android.changelog, ios: ios.changelog },
  };
  manifest.meta = {
    generatedAt,
    manifestSha: sha256(manifest),
    figmaFileKey: android.meta.figmaFileKey,
    galleryUrl: android.meta.galleryUrl,
  };
  return manifest;
}

async function main() {
  const [android, ios] = await Promise.all(
    Object.entries(SOURCES).map(async ([name, url]) => {
      console.log(`Fetching ${name}: ${url}`);
      return fetchJson(url);
    }),
  );

  for (const w of tokenParityWarnings(android, ios).slice(0, 20)) {
    console.warn(`⚠ token parity: ${w}`);
  }

  const merged = mergeManifests(android, ios);
  const serialized = JSON.stringify(merged, null, 2) + "\n";

  const local = await readIfExists(DATA_PATH);
  if (local === serialized) {
    console.log("✓ already up to date — no change");
    return;
  }

  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, serialized);
  const overlap = merged.components.filter(
    (c) => c.platforms.length > 1,
  ).length;
  console.log(
    `✓ wrote data/manifest.json — android ${android.aurum.version} + ios ${ios.aurum.version} ` +
      `(sha ${merged.meta.manifestSha.slice(0, 8)})`,
  );
  console.log(
    `  components: ${merged.components.length} (${overlap} on both platforms), ` +
      `icons: ${merged.icons.length}, codeConnect: ${merged.codeConnect.length}`,
  );
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => {
    console.error("✗ manifest:fetch failed:", err.message);
    process.exit(1);
  });
}

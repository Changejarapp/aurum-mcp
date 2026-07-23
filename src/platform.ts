/**
 * Session-platform detection — "which lens is this session looking through?"
 *
 * aurum-mcp serves a MERGED android+ios catalog, but a given Claude Code /
 * MCP session usually runs inside ONE platform repo (jar-android,
 * jar-ios, aurum-android, aurum-ios). A Compose developer should never be
 * handed SwiftUI snippets by default, and vice versa — so tools that take
 * a `platform` argument default it to the SESSION platform resolved here.
 * An explicit `platform` argument always wins; `"all"` is always available.
 *
 * Resolution order (first hit wins):
 *   1. `AURUM_MCP_PLATFORM` env var — `android` | `ios` | `all`. Set it in
 *      the repo's `.mcp.json` `env` block for a guaranteed lens; `all`
 *      explicitly disables detection.
 *   2. Working-directory fingerprints. MCP stdio servers inherit cwd from
 *      the client (Claude Code spawns them at the project root), so the
 *      repo the developer opened is directly observable:
 *        android → gradlew · settings.gradle(.kts) · build.gradle(.kts)
 *        ios     → Package.swift · Podfile · *.xcodeproj · *.xcworkspace
 *      Both kinds present (a monorepo) or neither → no lens.
 *   3. No signal → null: tools fall back to their historical defaults
 *      (`all` for listings, `android` for snippet/changelog primaries).
 *
 * Resolved once at import time — the lens is a property of the session,
 * not of a request.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { Platform } from "./types.js";

export type SessionPlatformSource = "env" | "cwd" | "none";

const ANDROID_MARKERS = [
  "gradlew",
  "settings.gradle",
  "settings.gradle.kts",
  "build.gradle",
  "build.gradle.kts",
];
const IOS_MARKERS = ["Package.swift", "Podfile", "Podfile.lock"];

function detectFromCwd(cwd: string): Platform | null {
  let android = ANDROID_MARKERS.some((m) => existsSync(join(cwd, m)));
  let ios = IOS_MARKERS.some((m) => existsSync(join(cwd, m)));
  if (!ios) {
    // *.xcodeproj / *.xcworkspace are directories with variable names.
    try {
      ios = readdirSync(cwd).some(
        (entry) => entry.endsWith(".xcodeproj") || entry.endsWith(".xcworkspace"),
      );
    } catch {
      // unreadable cwd — treat as no signal
    }
  }
  if (android && !ios) return "android";
  if (ios && !android) return "ios";
  return null; // neither, or an ambiguous monorepo
}

function resolve(): { platform: Platform | null; source: SessionPlatformSource } {
  const env = (process.env.AURUM_MCP_PLATFORM ?? "").trim().toLowerCase();
  if (env === "android" || env === "ios") {
    return { platform: env, source: "env" };
  }
  if (env === "all") {
    return { platform: null, source: "env" };
  }
  const fromCwd = detectFromCwd(process.cwd());
  if (fromCwd) return { platform: fromCwd, source: "cwd" };
  return { platform: null, source: "none" };
}

const resolved = resolve();

/** The session's platform lens, or null when no lens applies. */
export const SESSION_PLATFORM: Platform | null = resolved.platform;
/** How the lens was resolved — for footers/banners, so it's never mystifying. */
export const SESSION_PLATFORM_SOURCE: SessionPlatformSource = resolved.source;

/** One-line human description for banners and the version tool. */
export function describeSessionPlatform(): string {
  if (!SESSION_PLATFORM) return "none (serving both platforms)";
  const via = SESSION_PLATFORM_SOURCE === "env" ? "AURUM_MCP_PLATFORM" : "cwd fingerprint";
  return `${SESSION_PLATFORM} (via ${via})`;
}

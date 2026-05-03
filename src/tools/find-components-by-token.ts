import type { ToolDef } from "./index.js";
import type { Component, Manifest } from "../types.js";
import { withFooter } from "../format.js";

interface ComponentMatch {
  name: string;
  family: string;
  summary: string;
  /** Where the token reference was found. For schema-v2 manifests we get
   *  exact matches via `relatedTokens[]`; for v1 we fall back to a regex
   *  scan and report which fields the regex hit. */
  matchedIn: Array<"relatedTokens" | "signature" | "kdoc" | "param-default">;
  galleryUrl: string | null;
  sourcePath: string;
}

type Mode = "related-tokens" | "regex";

/** Build a regex that matches the qualified-or-bare token name surrounded
 *  by non-identifier characters. Used as the v1 fallback when the manifest
 *  doesn't carry `component.relatedTokens[]`. */
function tokenRefRegex(qualified: string): RegExp {
  const escaped = qualified.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^A-Za-z0-9_])${escaped}(?:[^A-Za-z0-9_]|$)`, "i");
}

/** Schema v2: precise match against the static-analyzed `relatedTokens[]`.
 *  Accepts both the qualified form (`surface.bgPageBase`) and bare leaf
 *  (`bgPageBase`) — bare leaf matches any qualified token whose suffix is
 *  the leaf, useful when the user doesn't remember the namespace. */
function searchRelatedTokens(c: Component, query: string): ComponentMatch | null {
  if (!c.relatedTokens || c.relatedTokens.length === 0) return null;
  const q = query.toLowerCase();
  const isQualified = q.includes(".");
  const hit = c.relatedTokens.some((t) => {
    const tl = t.toLowerCase();
    if (isQualified) return tl === q;
    // bare leaf: match any token whose final segment equals the query
    return tl === q || tl.endsWith("." + q);
  });
  if (!hit) return null;
  return {
    name: c.name,
    family: c.family,
    summary: c.summary,
    matchedIn: ["relatedTokens"],
    galleryUrl: c.galleryUrl,
    sourcePath: c.sourcePath,
  };
}

/** Schema v1 fallback: regex over signature / KDoc / param defaults. */
function searchRegex(c: Component, re: RegExp): ComponentMatch | null {
  const matchedIn: ComponentMatch["matchedIn"] = [];
  if (c.signature && re.test(c.signature)) matchedIn.push("signature");
  if (c.kdoc && re.test(c.kdoc)) matchedIn.push("kdoc");
  if (c.params) {
    for (const p of c.params) {
      if (p.default && re.test(p.default)) {
        if (!matchedIn.includes("param-default")) matchedIn.push("param-default");
        break;
      }
    }
  }
  if (matchedIn.length === 0) return null;
  return {
    name: c.name,
    family: c.family,
    summary: c.summary,
    matchedIn,
    galleryUrl: c.galleryUrl,
    sourcePath: c.sourcePath,
  };
}

function findMatches(manifest: Manifest, qualified: string): { matches: ComponentMatch[]; mode: Mode } {
  // Prefer relatedTokens[] when ANY component carries it (schema v2 indicator).
  const v2 = manifest.components.some((c) => c.relatedTokens && c.relatedTokens.length > 0);
  if (v2) {
    const out: ComponentMatch[] = [];
    for (const c of manifest.components) {
      const m = searchRelatedTokens(c, qualified);
      if (m) out.push(m);
    }
    return { matches: out, mode: "related-tokens" };
  }

  const re = tokenRefRegex(qualified);
  const out: ComponentMatch[] = [];
  for (const c of manifest.components) {
    const m = searchRegex(c, re);
    if (m) out.push(m);
  }
  return { matches: out, mode: "regex" };
}

export const findComponentsByTokenTool: ToolDef = {
  name: "aurum_find_components_by_token",
  description:
    "Reverse index: given a token name (qualified like `interactive.bgPrimary`, or bare leaf like " +
    "`bgPrimary`), return Aurum components that consume it. " +
    "Use to answer 'what components use `surface.bgPageBase`?' or 'where is `spacing.s12` used?'. " +
    "Do NOT use to look up a token's value — that's `aurum_get_token_value`. " +
    "On schema-v2 manifests this is an exact lookup against the static-analyzed " +
    "`component.relatedTokens[]` field; on v1 manifests it falls back to a best-effort " +
    "regex over signature, KDoc, and param defaults. The response includes the `mode` so you " +
    "know which path was used.",
  annotations: {
    title: "Find Components by Token",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    required: ["token"],
    properties: {
      token: {
        type: "string",
        description: "Token name. Qualified (`surface.bgPageBase`) or bare leaf (`bgPageBase`).",
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["token", "matches", "count", "mode"],
    properties: {
      token: { type: "string" },
      matches: { type: "array", items: { type: "object" } },
      count: { type: "integer" },
      mode: { type: "string", enum: ["related-tokens", "regex"] },
    },
  },
  async handler(manifest, args) {
    const token = String(args.token ?? "").trim();
    if (!token) {
      return {
        content: [{ type: "text", text: "Missing required `token` argument." }],
        isError: true,
      };
    }
    const { matches, mode } = findMatches(manifest, token);

    if (matches.length === 0) {
      const tail = mode === "related-tokens"
        ? " (exact match against `component.relatedTokens[]`)."
        : " (regex scan over signature / KDoc / param defaults — schema v1).";
      return {
        content: [{ type: "text", text: `No components reference \`${token}\`${tail}` }],
        structuredContent: { token, matches: [], count: 0, mode },
      };
    }

    const sourceLabel = mode === "related-tokens"
      ? "exact match against `component.relatedTokens[]` (schema v2)"
      : "regex over signature / KDoc / param defaults (schema v1)";
    const lines: string[] = [
      `# Components using \`${token}\``,
      "",
      `${matches.length} match${matches.length === 1 ? "" : "es"} · ${sourceLabel}`,
      "",
    ];
    for (const m of matches) {
      lines.push(`- **${m.name}** (${m.family}) — ${m.summary}`);
      lines.push(`  - Matched in: ${m.matchedIn.join(", ")}`);
      if (m.galleryUrl) lines.push(`  - Gallery: ${m.galleryUrl}`);
    }

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: { token, matches, count: matches.length, mode },
    };
  },
};

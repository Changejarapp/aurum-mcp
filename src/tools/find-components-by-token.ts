import type { ToolDef } from "./index.js";
import type { Component, Manifest } from "../types.js";
import { withFooter } from "../format.js";

interface ComponentMatch {
  name: string;
  family: string;
  summary: string;
  /** Where in the source the token reference was found. */
  matchedIn: Array<"signature" | "kdoc" | "param-default">;
  galleryUrl: string | null;
  sourcePath: string;
}

/** Build a regex that matches `AurumColors.<group>.<leaf>`, `AurumSpacing.<leaf>`,
 *  `AurumRadius.<leaf>`, or the leaf name preceded by a token-namespace dot.
 *  Schema-v1 manifests don't carry a `relatedTokens[]` field, so we pattern-match
 *  the in-manifest source-derived strings (signature, KDoc, param defaults). */
function tokenRefRegex(qualified: string): RegExp {
  // qualified can be `surface.bgPageBase`, `spacing.s12`, `bgPageBase` (bare leaf)
  const escaped = qualified.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^A-Za-z0-9_])${escaped}(?:[^A-Za-z0-9_]|$)`, "i");
}

function searchComponent(c: Component, re: RegExp): ComponentMatch | null {
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

function findMatches(manifest: Manifest, qualified: string): ComponentMatch[] {
  const re = tokenRefRegex(qualified);
  const out: ComponentMatch[] = [];
  for (const c of manifest.components) {
    const m = searchComponent(c, re);
    if (m) out.push(m);
  }
  return out;
}

export const findComponentsByTokenTool: ToolDef = {
  name: "aurum_find_components_by_token",
  description:
    "Reverse index: given a token name (qualified like `interactive.bgPrimary`, or bare leaf like " +
    "`bgPrimary`), return Aurum components whose source / KDoc / param defaults reference it. " +
    "Use to answer 'what components consume `surface.bgPageBase`?' or 'where is `spacing.s12` used?'. " +
    "Do NOT use to look up a token's value — that's `aurum_get_token_value`. " +
    "On v1 manifests this is a best-effort regex over the manifest's component metadata; " +
    "schema-v2 will surface a precise `component.relatedTokens[]` field that this tool will switch to.",
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
      mode: { type: "string", description: "regex (v1 manifest) or related-tokens (v2 manifest)" },
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
    const matches = findMatches(manifest, token);

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: `No components reference \`${token}\` in their signature, KDoc, or param defaults.` }],
        structuredContent: { token, matches: [], count: 0, mode: "regex" },
      };
    }

    const lines: string[] = [
      `# Components using \`${token}\``,
      "",
      `${matches.length} match${matches.length === 1 ? "" : "es"} (regex over signature / KDoc / param defaults — v1 manifest)`,
      "",
    ];
    for (const m of matches) {
      lines.push(`- **${m.name}** (${m.family}) — ${m.summary}`);
      lines.push(`  - Matched in: ${m.matchedIn.join(", ")}`);
      if (m.galleryUrl) lines.push(`  - Gallery: ${m.galleryUrl}`);
    }

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: { token, matches, count: matches.length, mode: "regex" },
    };
  },
};

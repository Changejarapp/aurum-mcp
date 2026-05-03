import lunr from "lunr";

import type { ToolDef } from "./index.js";
import type { Manifest } from "../types.js";
import { withFooter } from "../format.js";

interface SearchDoc {
  id: string;
  kind: "component" | "token" | "icon" | "changelog";
  title: string;
  body: string;
  next: string;
}

let cachedIndex: lunr.Index | null = null;
let cachedDocs: Map<string, SearchDoc> = new Map();
let cachedManifestSha = "";

function buildIndex(manifest: Manifest): { index: lunr.Index; docs: Map<string, SearchDoc> } {
  const docs: SearchDoc[] = [];

  for (const c of manifest.components) {
    docs.push({
      id: `component:${c.name}`,
      kind: "component",
      title: c.name,
      body: `${c.summary} ${c.family} ${c.kdoc ?? ""} ${(c.params ?? []).map((p) => p.name + " " + p.type).join(" ")}`,
      next: `Call \`aurum_get_component({ name: "${c.name}" })\``,
    });
  }

  for (const group of Object.keys(manifest.tokens.color.semantic)) {
    for (const s of manifest.tokens.color.semantic[group]) {
      docs.push({
        id: `token:semantic:${s.name}`,
        kind: "token",
        title: `${group}.${s.name}`,
        body: `${s.path} ${s.hex} ${group}`,
        next: `Call \`aurum_get_token_value({ name: "${group}.${s.name}" })\``,
      });
    }
  }
  for (const family of Object.keys(manifest.tokens.color.visual)) {
    for (const s of manifest.tokens.color.visual[family]) {
      docs.push({
        id: `token:visual:${s.name}`,
        kind: "token",
        title: `palette.${s.name}`,
        body: `${family} ${s.hex}`,
        next: `Call \`aurum_list_tokens({ category: "color" })\``,
      });
    }
  }
  for (const cat of ["spacing", "radius", "borderWidth", "iconSize"] as const) {
    for (const d of manifest.tokens[cat]) {
      docs.push({
        id: `token:${cat}:${d.name}`,
        kind: "token",
        title: `${cat}.${d.name}`,
        body: `${d.dp}dp ${d.comment ?? ""}`,
        next: `Call \`aurum_get_token_value({ name: "${cat}.${d.name}" })\``,
      });
    }
  }
  for (const t of manifest.tokens.typography) {
    docs.push({
      id: `token:typography:${t.name}`,
      kind: "token",
      title: `typography.${t.name}`,
      body: `${t.sizeSp}/${t.lineHeightSp}sp ${t.weight} ${t.family}`,
      next: `Call \`aurum_get_token_value({ name: "typography.${t.name}" })\``,
    });
  }
  for (const e of manifest.tokens.elevation) {
    docs.push({
      id: `token:elevation:${e.name}`,
      kind: "token",
      title: `elevation.${e.name}`,
      body: `offsetY ${e.offsetY} blur ${e.blur} tint ${e.tintName}`,
      next: `Call \`aurum_get_token_value({ name: "elevation.${e.name}" })\``,
    });
  }

  for (const ic of manifest.icons) {
    const tagsBody = ic.tags && ic.tags.length > 0 ? ic.tags.join(" ") : "";
    docs.push({
      id: `icon:${ic.category}.${ic.name}`,
      kind: "icon",
      title: `${ic.category}.${ic.name}`,
      body: `${ic.lineDrawable} ${ic.fillDrawable} ${ic.category} ${tagsBody}`.trim(),
      next: `Call \`aurum_get_icon({ name: "${ic.name}" })\``,
    });
  }

  for (const e of manifest.changelog.entries) {
    const flat = Object.entries(e.sections)
      .map(([section, bullets]) => `${section}: ${bullets.join(" ")}`)
      .join(" ");
    docs.push({
      id: `changelog:${e.version}`,
      kind: "changelog",
      title: `Changelog ${e.version}`,
      body: flat,
      next: `Call \`aurum_get_changelog({ version: "${e.version}" })\``,
    });
  }

  const docMap = new Map(docs.map((d) => [d.id, d]));
  const index = lunr(function () {
    this.ref("id");
    this.field("title", { boost: 4 });
    this.field("body");
    for (const d of docs) this.add(d);
  });
  return { index, docs: docMap };
}

function ensureIndex(manifest: Manifest): { index: lunr.Index; docs: Map<string, SearchDoc> } {
  if (cachedIndex && cachedManifestSha === manifest.meta.manifestSha) {
    return { index: cachedIndex, docs: cachedDocs };
  }
  const built = buildIndex(manifest);
  cachedIndex = built.index;
  cachedDocs = built.docs;
  cachedManifestSha = manifest.meta.manifestSha;
  return built;
}

export const searchTool: ToolDef = {
  name: "aurum_search",
  description:
    "Free-text search across all Aurum content — components, tokens, icons, and changelog entries — " +
    "powered by a lunr.js index over titles + bodies. Returns the top hits with a `next-tool-to-call` " +
    "hint per result. Use this as the starting point for vague queries ('I need something for showing " +
    "negative feedback', 'is there a chip-like component?'). " +
    "Do NOT use this for icon-shaped queries — `aurum_search_icons` has stronger name-token matching and " +
    "returns Figma metadata. For known component names use `aurum_get_component` directly. " +
    "The `query` accepts lunr's syntax: boosts (`field:term^2`), fuzzy (`term~1`), prefix (`term*`).",
  annotations: {
    title: "Search Aurum",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "Free-text query. Supports lunr's syntax (boosts, fuzzy with `~`, prefix with `*`).",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 20,
        default: 5,
        description: "Maximum number of results.",
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["query", "results", "count"],
    properties: {
      query: { type: "string" },
      results: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "kind", "next"],
          properties: {
            title: { type: "string" },
            kind: { type: "string", enum: ["component", "token", "icon", "changelog"] },
            next: { type: "string" },
            score: { type: "number" },
          },
        },
      },
      count: { type: "integer" },
    },
  },
  async handler(manifest, args) {
    const query = String(args.query ?? "").trim();
    const limit = Math.min(20, Math.max(1, Number(args.limit ?? 5)));
    if (!query) {
      return { content: [{ type: "text", text: "Missing required `query`." }], isError: true };
    }
    const { index, docs } = ensureIndex(manifest);
    let results: lunr.Index.Result[] = [];
    try {
      results = index.search(query).slice(0, limit);
    } catch {
      // Lunr rejects some characters in non-prefix queries — try a forgiving fallback.
      const escaped = query.replace(/[+\-=&|!(){}\[\]^"~*?:\\\/]/g, " ").trim();
      if (escaped) results = index.search(escaped).slice(0, limit);
    }
    if (results.length === 0) {
      return {
        content: [{ type: "text", text: `No matches for \`${query}\`.` }],
        structuredContent: { query, results: [], count: 0 },
      };
    }
    const lines: string[] = [`# Search · "${query}"`, "", `${results.length} result${results.length === 1 ? "" : "s"}`, ""];
    const structured: Array<{ title: string; kind: string; next: string; score: number }> = [];
    for (const r of results) {
      const doc = docs.get(r.ref);
      if (!doc) continue;
      lines.push(`### ${doc.title} _(${doc.kind})_`);
      lines.push(`${doc.next}`);
      lines.push("");
      structured.push({ title: doc.title, kind: doc.kind, next: doc.next, score: r.score });
    }
    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: { query, results: structured, count: structured.length },
    };
  },
};

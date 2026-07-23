import type { ToolDef } from "./index.js";
import type { Component, Platform } from "../types.js";
import { withFooter } from "../format.js";
import { SESSION_PLATFORM } from "../platform.js";

export const listComponentsTool: ToolDef = {
  name: "aurum_list_components",
  description:
    "Return the full Aurum component catalog: composable name, family, one-line summary, and platforms. " +
    "Use as the first step in any component-discovery flow — typically followed by `aurum_get_component` " +
    "for the canonical signature/snippet, or `aurum_search` if the user gave a vague description. " +
    "Do NOT use this for design-token lookups (use `aurum_list_tokens` / `aurum_get_token_value`) or " +
    "icon queries (use `aurum_search_icons`). " +
    "The catalog is merged across platforms (Compose android + SwiftUI ios) — filter with `platform`, " +
    "or read each entry's `platforms` to see where it exists.",
  annotations: {
    title: "List Aurum Components",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      platform: {
        type: "string",
        enum: ["android", "ios", "all"],
        description:
          "Restrict results to a single platform. Defaults to the SESSION's platform (auto-detected " +
          "from the repo the session runs in, or AURUM_MCP_PLATFORM), else 'all'.",
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["components", "count", "platform"],
    properties: {
      components: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "family", "summary", "platforms"],
          properties: {
            name: { type: "string" },
            family: { type: "string" },
            summary: { type: "string" },
            platforms: { type: "array", items: { type: "string" } },
          },
        },
      },
      count: { type: "integer" },
      platform: { type: "string" },
    },
  },
  async handler(manifest, args) {
    const platform = (args.platform as string | undefined) ?? SESSION_PLATFORM ?? "all";
    const filtered = manifest.components.filter((c) =>
      platform === "all" ? true : c.platforms.includes(platform as Platform),
    );

    const byFamily = new Map<string, Component[]>();
    for (const c of filtered) {
      if (!byFamily.has(c.family)) byFamily.set(c.family, []);
      byFamily.get(c.family)!.push(c);
    }
    const families = Array.from(byFamily.keys()).sort();

    const lines: string[] = [
      `# Aurum components (${filtered.length})`,
      "",
      `Filtered: \`platform = ${platform}\``,
      "",
    ];
    for (const family of families) {
      const items = byFamily.get(family)!;
      lines.push(`## ${family} (${items.length})`);
      lines.push("");
      for (const c of items) {
        const platforms = c.platforms.join(", ");
        lines.push(`- **${c.name}** (\`${platforms}\`) — ${c.summary}`);
      }
      lines.push("");
    }

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: {
        components: filtered.map((c) => ({
          name: c.name,
          family: c.family,
          summary: c.summary,
          platforms: c.platforms,
        })),
        count: filtered.length,
        platform,
      },
    };
  },
};

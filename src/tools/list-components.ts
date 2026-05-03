import type { ToolDef } from "./index.js";
import type { Platform } from "../types.js";
import { withFooter } from "../format.js";

export const listComponentsTool: ToolDef = {
  name: "list_components",
  description:
    "List every Aurum component in the current manifest, with one-line descriptions and family grouping. " +
    "Optionally filter to a specific platform (`android`, `ios`, or `all`). " +
    "Use this as a starting point for navigation; follow up with `get_component` for full details.",
  inputSchema: {
    type: "object",
    properties: {
      platform: {
        type: "string",
        enum: ["android", "ios", "all"],
        default: "all",
        description: "Restrict results to a single platform. Omit or pass 'all' for everything.",
      },
    },
    additionalProperties: false,
  },
  async handler(manifest, args) {
    const platform = (args.platform as string | undefined) ?? "all";
    const filtered = manifest.components.filter((c) =>
      platform === "all" ? true : c.platforms.includes(platform as Platform),
    );

    // Group by family for readability.
    const byFamily = new Map<string, typeof filtered>();
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
    };
  },
};

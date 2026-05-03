import type { ToolDef } from "./index.js";
import { withFooter } from "../format.js";

export const searchIconsTool: ToolDef = {
  name: "aurum_search_icons",
  description:
    "Substring search across the Aurum icon catalog by name fragment and/or category. Returns each match " +
    "with both line and fill drawable resource names, paired Figma node IDs, and Compose accessor. " +
    "Use this — NOT `aurum_search` — for any icon-shaped query (e.g. 'find the trash icon', 'do we have " +
    "an arrow-right icon?'); `aurum_search` indexes icons too but with weaker name-token boosting and " +
    "without the per-variant Figma metadata. " +
    "Both `query` and `category` are matched case-insensitively. Pass an empty `query` with a `category` " +
    "filter to enumerate every icon in that category.",
  annotations: {
    title: "Search Aurum Icons",
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
        description: "Substring to match against icon name or category (case-insensitive). May be empty when paired with a `category` filter.",
      },
      category: {
        type: "string",
        description: "Optional category filter (e.g. `Navigation`, `Action`, `Content`). Case-insensitive.",
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["query", "icons", "count"],
    properties: {
      query: { type: "string" },
      category: { type: ["string", "null"] },
      icons: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "category", "lineDrawable", "fillDrawable"],
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            lineDrawable: { type: "string" },
            fillDrawable: { type: "string" },
            lineFigmaNodeId: { type: ["string", "null"] },
            fillFigmaNodeId: { type: ["string", "null"] },
            lineFigmaUrl: { type: ["string", "null"] },
            fillFigmaUrl: { type: ["string", "null"] },
            composeAccessor: { type: "string" },
          },
        },
      },
      count: { type: "integer" },
    },
  },
  async handler(manifest, args) {
    const query = String(args.query ?? "").toLowerCase().trim();
    const category = args.category as string | undefined;

    const matches = manifest.icons.filter((ic) => {
      if (category && ic.category.toLowerCase() !== category.toLowerCase()) return false;
      const hay = `${ic.name} ${ic.category}`.toLowerCase();
      return query === "" || hay.includes(query);
    });

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: `No icons matched \`${query}\`${category ? " in category " + category : ""}.` }],
        structuredContent: { query, category: category ?? null, icons: [], count: 0 },
      };
    }

    const lines: string[] = [
      `# Icon search · "${query}"${category ? ` (${category})` : ""}`,
      "",
      `${matches.length} match${matches.length === 1 ? "" : "es"}`,
      "",
    ];
    for (const ic of matches) {
      lines.push(`### ${ic.category}.${ic.name}`);
      lines.push("");
      lines.push(`- **Drawables:** \`${ic.lineDrawable}\` (line), \`${ic.fillDrawable}\` (fill)`);
      if (ic.lineFigmaUrl) lines.push(`- **Figma (line):** [${ic.lineFigmaNodeId}](${ic.lineFigmaUrl})`);
      if (ic.fillFigmaUrl) lines.push(`- **Figma (fill):** [${ic.fillFigmaNodeId}](${ic.fillFigmaUrl})`);
      lines.push(`- **Compose:** \`AurumIcons.${ic.category}.${ic.name}\``);
      lines.push("");
    }

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: {
        query,
        category: category ?? null,
        icons: matches.map((ic) => ({
          name: ic.name,
          category: ic.category,
          lineDrawable: ic.lineDrawable,
          fillDrawable: ic.fillDrawable,
          lineFigmaNodeId: ic.lineFigmaNodeId,
          fillFigmaNodeId: ic.fillFigmaNodeId,
          lineFigmaUrl: ic.lineFigmaUrl,
          fillFigmaUrl: ic.fillFigmaUrl,
          composeAccessor: `AurumIcons.${ic.category}.${ic.name}`,
        })),
        count: matches.length,
      },
    };
  },
};

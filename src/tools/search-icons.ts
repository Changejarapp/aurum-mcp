import type { ToolDef } from "./index.js";
import { withFooter } from "../format.js";

export const searchIconsTool: ToolDef = {
  name: "search_icons",
  description:
    "Search Aurum's icon catalog by name fragment or category. Returns matching icons with their " +
    "drawable resource names, paired line/fill Figma node IDs, and deeplinks. " +
    "Use this when a designer or engineer is looking for the right icon to use.",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "Substring to match against icon name or category (case-insensitive).",
      },
      category: {
        type: "string",
        description: "Optional category filter (Navigation, Action, Content, etc.).",
      },
    },
    additionalProperties: false,
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

    return { content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }] };
  },
};

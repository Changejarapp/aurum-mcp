import type { ToolDef } from "./index.js";
import type { TokenCategory } from "../types.js";
import { mdTable, withFooter } from "../format.js";

const ALL_CATEGORIES: TokenCategory[] = [
  "color", "spacing", "radius", "borderWidth", "iconSize", "elevation", "typography",
];

export const listTokensTool: ToolDef = {
  name: "list_tokens",
  description:
    "List Aurum design tokens by category: color (semantic + visual palette), spacing, radius, borderWidth, iconSize, elevation, typography. " +
    "Omit `category` to get a summary of all categories with counts. Pass a category for the full table.",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ALL_CATEGORIES,
        description: "Token category to expand. Omit for a summary across all categories.",
      },
    },
    additionalProperties: false,
  },
  async handler(manifest, args) {
    const category = args.category as TokenCategory | undefined;

    if (!category) {
      const t = manifest.tokens;
      const semCount = Object.values(t.color.semantic).reduce((a, b) => a + b.length, 0);
      const visCount = Object.values(t.color.visual).reduce((a, b) => a + b.length, 0);
      const lines: string[] = [
        "# Aurum tokens (summary)",
        "",
        `- **color.semantic**: ${semCount} swatches across ${Object.keys(t.color.semantic).length} groups`,
        `- **color.visual**: ${visCount} swatches across ${Object.keys(t.color.visual).length} families`,
        `- **spacing**: ${t.spacing.length} steps`,
        `- **radius**: ${t.radius.length} steps`,
        `- **borderWidth**: ${t.borderWidth.length} steps`,
        `- **iconSize**: ${t.iconSize.length} steps`,
        `- **elevation**: ${t.elevation.length} levels`,
        `- **typography**: ${t.typography.length} roles`,
        "",
        "Call `list_tokens({ category: \"...\" })` for a specific table.",
      ];
      return { content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }] };
    }

    const lines: string[] = [`# Aurum tokens · ${category}`, ""];

    if (category === "color") {
      lines.push("## Semantic colours");
      lines.push("");
      for (const group of Object.keys(manifest.tokens.color.semantic).sort()) {
        const swatches = manifest.tokens.color.semantic[group];
        lines.push(`### ${group} (${swatches.length})`);
        lines.push("");
        lines.push(mdTable([
          ["name", "hex", "alpha", "figma path"],
          ...swatches.map((s) => [`\`${s.name}\``, `\`${s.hex}\``, s.alpha === 1 ? "1" : s.alpha.toFixed(2), `\`${s.path}\``]),
        ]));
        lines.push("");
      }
      lines.push("## Visual palette");
      lines.push("");
      for (const family of Object.keys(manifest.tokens.color.visual).sort()) {
        const swatches = manifest.tokens.color.visual[family];
        lines.push(`### ${family} (${swatches.length})`);
        lines.push("");
        lines.push(mdTable([
          ["name", "hex"],
          ...swatches.map((s) => [`\`${s.name}\``, `\`${s.hex}\``]),
        ]));
        lines.push("");
      }
    } else if (category === "elevation") {
      lines.push(mdTable([
        ["name", "offsetY (dp)", "blur (dp)", "tint"],
        ...manifest.tokens.elevation.map((e) => [`\`${e.name}\``, e.offsetY.toString(), e.blur.toString(), `\`${e.tintName}\``]),
      ]));
    } else if (category === "typography") {
      lines.push(mdTable([
        ["name", "size (sp)", "lineHeight (sp)", "weight", "family"],
        ...manifest.tokens.typography.map((t) => [`\`${t.name}\``, t.sizeSp.toString(), t.lineHeightSp.toString(), t.weight, t.family]),
      ]));
    } else {
      // spacing | radius | borderWidth | iconSize — all DimensionToken
      const items = manifest.tokens[category];
      lines.push(mdTable([
        ["name", "dp", "comment"],
        ...items.map((d) => [`\`${d.name}\``, d.dp.toString(), d.comment ?? ""]),
      ]));
    }

    return { content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }] };
  },
};

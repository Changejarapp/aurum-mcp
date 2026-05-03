import type { ToolDef } from "./index.js";
import type { TokenCategory } from "../types.js";
import { mdTable, withFooter } from "../format.js";

const ALL_CATEGORIES: TokenCategory[] = [
  "color", "spacing", "radius", "borderWidth", "iconSize", "elevation", "typography",
];

export const listTokensTool: ToolDef = {
  name: "aurum_list_tokens",
  description:
    "List Aurum design tokens by category: `color` (semantic + visual palette), `spacing`, `radius`, " +
    "`borderWidth`, `iconSize`, `elevation`, `typography`. Use when the user wants the full table for a " +
    "category (e.g. 'show me all the spacing values'); for a single-token point-lookup, use " +
    "`aurum_get_token_value` instead — it's much cheaper. Use to answer 'is there a token for X?' or " +
    "to enumerate semantic groups. " +
    "Omit `category` for a counts-only summary across all categories. Hex values include alpha when alpha < 1 (8-digit form).",
  annotations: {
    title: "List Aurum Tokens",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
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
  outputSchema: {
    type: "object",
    properties: {
      category: { type: ["string", "null"] },
      tokens: {
        description: "Either a category-keyed summary (when category omitted) or the raw token group for that category.",
      },
    },
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
        "Call `aurum_list_tokens({ category: \"...\" })` for a specific table, or `aurum_get_token_value({ name: \"...\" })` for a single token.",
      ];
      return {
        content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
        structuredContent: {
          category: null,
          tokens: {
            colorSemanticGroups: Object.keys(t.color.semantic).length,
            colorSemanticCount: semCount,
            colorVisualFamilies: Object.keys(t.color.visual).length,
            colorVisualCount: visCount,
            spacing: t.spacing.length,
            radius: t.radius.length,
            borderWidth: t.borderWidth.length,
            iconSize: t.iconSize.length,
            elevation: t.elevation.length,
            typography: t.typography.length,
          },
        },
      };
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

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: {
        category,
        tokens: manifest.tokens[category],
      },
    };
  },
};

import type { ToolDef } from "./index.js";
import { withFooter } from "../format.js";

export const getIconTool: ToolDef = {
  name: "aurum_get_icon",
  description:
    "Fetch full details for a single Aurum icon by name: drawable resource paths, Compose accessor " +
    "(`AurumIcons.<Category>.<Name>`), paired line/fill Figma node IDs, deeplinks, and a ready-to-paste " +
    "`AurumIcon(...)` Compose snippet. Use after `aurum_search_icons` to get the canonical usage block. " +
    "Do NOT use this for browsing — use `aurum_search_icons` to enumerate or filter. " +
    "The `name` argument is case-insensitive and matches against the icon name only (not category). " +
    "Pass `weight: 'fill'` to render the snippet against the filled variant; default is both variants.",
  annotations: {
    title: "Get Aurum Icon",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        description: "Icon name, e.g. `ChevronRight`. Case-insensitive.",
      },
      weight: {
        type: "string",
        enum: ["line", "fill", "both"],
        default: "both",
        description: "Which weight to highlight (`line`, `fill`, or `both`).",
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      icon: {
        type: "object",
        required: ["name", "category", "lineDrawable", "fillDrawable", "composeAccessor"],
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
      weight: { type: "string" },
    },
  },
  async handler(manifest, args) {
    const name = String(args.name ?? "").trim();
    if (!name) {
      return {
        content: [{ type: "text", text: "Missing required `name` argument." }],
        isError: true,
      };
    }
    const weight = (args.weight as string | undefined) ?? "both";
    const ic = manifest.icons.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!ic) {
      const hits = manifest.icons
        .filter((x) => x.name.toLowerCase().includes(name.toLowerCase()))
        .slice(0, 5)
        .map((x) => `\`${x.category}.${x.name}\``)
        .join(", ");
      const hint = hits ? ` Did you mean ${hits}?` : "";
      return {
        content: [{ type: "text", text: `No icon named \`${name}\`.${hint}` }],
        isError: true,
      };
    }

    const lines: string[] = [
      `# AurumIcons.${ic.category}.${ic.name}`,
      "",
      `**Category:** ${ic.category}  `,
      "",
    ];
    if (weight === "line" || weight === "both") {
      lines.push(`### Line variant`);
      lines.push(`- Drawable: \`${ic.lineDrawable}\``);
      if (ic.lineFigmaUrl) lines.push(`- Figma: [${ic.lineFigmaNodeId}](${ic.lineFigmaUrl})`);
      lines.push("");
    }
    if (weight === "fill" || weight === "both") {
      lines.push(`### Fill variant`);
      lines.push(`- Drawable: \`${ic.fillDrawable}\``);
      if (ic.fillFigmaUrl) lines.push(`- Figma: [${ic.fillFigmaNodeId}](${ic.fillFigmaUrl})`);
      lines.push("");
    }
    lines.push(`### Compose usage`);
    lines.push("```kotlin");
    lines.push(`AurumIcon(`);
    lines.push(`    imageVector = AurumIcons.${ic.category}.${ic.name}${weight === "fill" ? "Filled" : ""},`);
    lines.push(`    contentDescription = null,`);
    lines.push(`)`);
    lines.push("```");

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: {
        icon: {
          name: ic.name,
          category: ic.category,
          lineDrawable: ic.lineDrawable,
          fillDrawable: ic.fillDrawable,
          lineFigmaNodeId: ic.lineFigmaNodeId,
          fillFigmaNodeId: ic.fillFigmaNodeId,
          lineFigmaUrl: ic.lineFigmaUrl,
          fillFigmaUrl: ic.fillFigmaUrl,
          composeAccessor: `AurumIcons.${ic.category}.${ic.name}`,
        },
        weight,
      },
    };
  },
};

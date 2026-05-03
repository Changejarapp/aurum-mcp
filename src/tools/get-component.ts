import type { ToolDef } from "./index.js";
import { fence, withFooter } from "../format.js";

export const getComponentTool: ToolDef = {
  name: "get_component",
  description:
    "Fetch the full details of a single Aurum component by name: KDoc, Compose signature, " +
    "every parameter (with types, defaults, and per-param docs), preview function names, " +
    "Figma deeplink, Code Connect path, and gallery URL. Use after `list_components` or " +
    "`search` to get the canonical snippet for a component.",
  inputSchema: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        description: "Composable name, e.g. `AurumChip`. Case-sensitive.",
      },
      platform: {
        type: "string",
        enum: ["android", "ios", "all"],
        default: "all",
        description: "Reserved for future cross-platform manifests.",
      },
    },
    additionalProperties: false,
  },
  async handler(manifest, args) {
    const name = String(args.name ?? "").trim();
    if (!name) {
      return {
        content: [{ type: "text", text: "Missing required `name` argument." }],
        isError: true,
      };
    }
    const c = manifest.components.find((x) => x.name === name);
    if (!c) {
      const candidates = manifest.components
        .filter((x) => x.name.toLowerCase().includes(name.toLowerCase()))
        .slice(0, 5)
        .map((x) => `\`${x.name}\``)
        .join(", ");
      const hint = candidates ? ` Did you mean ${candidates}?` : "";
      return {
        content: [{ type: "text", text: `No component named \`${name}\`.${hint}` }],
        isError: true,
      };
    }

    const lines: string[] = [
      `# ${c.name}`,
      "",
      `${c.summary}`,
      "",
      `**Family:** ${c.family}  `,
      `**Platforms:** ${c.platforms.join(", ")}  `,
    ];
    if (c.figmaUrl) lines.push(`**Figma:** [${c.figmaNodeId}](${c.figmaUrl})  `);
    if (c.galleryUrl) lines.push(`**Gallery:** ${c.galleryUrl}  `);
    if (c.codeConnectPath) lines.push(`**Code Connect:** \`${c.codeConnectPath}\`  `);
    lines.push(`**Source:** \`${c.sourcePath}\`  `);
    lines.push("");

    if (c.kdoc) {
      lines.push("## Description");
      lines.push("");
      lines.push(c.kdoc);
      lines.push("");
    }

    if (c.signature) {
      lines.push("## Signature");
      lines.push("");
      lines.push(fence("kotlin", c.signature));
      lines.push("");
    }

    if (c.params && c.params.length > 0) {
      lines.push("## Parameters");
      lines.push("");
      for (const p of c.params) {
        const def = p.default ? ` = \`${p.default}\`` : "";
        const doc = p.doc ? ` — ${p.doc}` : "";
        lines.push(`- **${p.name}**: \`${p.type}\`${def}${doc}`);
      }
      lines.push("");
    }

    if (c.previews && c.previews.length > 0) {
      lines.push("## Previews");
      lines.push("");
      lines.push(c.previews.map((p) => `\`${p}\``).join(", "));
      lines.push("");
    }

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
    };
  },
};

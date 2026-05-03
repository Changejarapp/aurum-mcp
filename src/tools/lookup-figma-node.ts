import type { ToolDef } from "./index.js";
import { withFooter } from "../format.js";

const NODE_ID_RE = /(\d+)[:\-](\d+)/;

export const lookupFigmaNodeTool: ToolDef = {
  name: "aurum_lookup_figma_node",
  description:
    "Reverse-lookup from a Figma node ID (`5126:2507` or `5126-2507`) or any Figma URL containing one " +
    "to the matching Aurum content: components, Code Connect mappings, and/or icons that reference that node. " +
    "Designed for the designer flow — 'I'm looking at this Figma node, what code is it?'. Pair with " +
    "`aurum_get_component` or `aurum_get_code_connect_snippet` for full code once a match is found. " +
    "Both `:` and `-` separators are accepted. Pasting a full Figma URL is fine — the node ID is extracted " +
    "from the `node-id=` query param or path.",
  annotations: {
    title: "Look Up Figma Node",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    required: ["nodeIdOrUrl"],
    properties: {
      nodeIdOrUrl: {
        type: "string",
        description: "Figma node ID (`123:456`, `123-456`) or any Figma URL containing one.",
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["nodeId", "components", "icons", "codeConnect"],
    properties: {
      nodeId: { type: "string" },
      components: { type: "array", items: { type: "object" } },
      icons: { type: "array", items: { type: "object" } },
      codeConnect: { type: "array", items: { type: "object" } },
    },
  },
  async handler(manifest, args) {
    const raw = String(args.nodeIdOrUrl ?? "").trim();
    const m = raw.match(NODE_ID_RE);
    if (!m) {
      return {
        content: [{ type: "text", text: `Could not extract a node ID from \`${raw}\`. Expected format: \`123:456\`.` }],
        isError: true,
      };
    }
    const nodeId = `${m[1]}:${m[2]}`;
    const altDash = `${m[1]}-${m[2]}`;

    const matchedComponents = manifest.components.filter((c) => c.figmaNodeId === nodeId);
    const matchedCodeConnect = manifest.codeConnect.filter(
      (cc) => cc.figmaNodeId === nodeId || cc.figmaUrl.includes(altDash),
    );
    const matchedIcons = manifest.icons.filter(
      (ic) => ic.lineFigmaNodeId === nodeId || ic.fillFigmaNodeId === nodeId,
    );

    if (matchedComponents.length + matchedCodeConnect.length + matchedIcons.length === 0) {
      return {
        content: [{ type: "text", text: `No Aurum content references node \`${nodeId}\`.` }],
        structuredContent: { nodeId, components: [], icons: [], codeConnect: [] },
      };
    }

    const lines: string[] = [`# Figma node \`${nodeId}\``, ""];

    if (matchedComponents.length > 0) {
      lines.push("## Aurum components");
      lines.push("");
      for (const c of matchedComponents) {
        lines.push(`- **${c.name}** (${c.family}) — ${c.summary}`);
        if (c.galleryUrl) lines.push(`  - Gallery: ${c.galleryUrl}`);
        lines.push(`  - Source: \`${c.sourcePath}\``);
      }
      lines.push("");
    }
    if (matchedIcons.length > 0) {
      lines.push("## Icons");
      lines.push("");
      for (const ic of matchedIcons) {
        const isLine = ic.lineFigmaNodeId === nodeId;
        const variant = isLine ? "line" : "fill";
        lines.push(`- **AurumIcons.${ic.category}.${ic.name}** (${variant} variant)`);
      }
      lines.push("");
    }
    if (matchedCodeConnect.length > 0) {
      lines.push("## Code Connect mappings");
      lines.push("");
      for (const cc of matchedCodeConnect) {
        lines.push(`- **${cc.component}** → \`${cc.kotlinPath}\``);
      }
      lines.push("");
    }

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: {
        nodeId,
        components: matchedComponents.map((c) => ({
          name: c.name,
          family: c.family,
          summary: c.summary,
          galleryUrl: c.galleryUrl,
          sourcePath: c.sourcePath,
        })),
        icons: matchedIcons.map((ic) => ({
          name: ic.name,
          category: ic.category,
          variant: ic.lineFigmaNodeId === nodeId ? "line" : "fill",
        })),
        codeConnect: matchedCodeConnect.map((cc) => ({
          component: cc.component,
          kotlinPath: cc.kotlinPath,
        })),
      },
    };
  },
};

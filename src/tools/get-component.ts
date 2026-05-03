import type { ToolDef } from "./index.js";
import { fence, withFooter } from "../format.js";

export const getComponentTool: ToolDef = {
  name: "aurum_get_component",
  description:
    "Fetch full details of a single Aurum component by name: KDoc, Compose signature, every parameter " +
    "(types/defaults/per-param docs), preview function names, Figma deeplink, Code Connect path, gallery URL. " +
    "Use after `aurum_list_components` or `aurum_search` once you know the exact composable name; " +
    "this is the primary source for 'how do I use AurumX?'. " +
    "Do NOT use this if the user wants the bare canonical-usage Kotlin snippet only — `aurum_get_code_connect_snippet` " +
    "is leaner. " +
    "The `name` argument is case-sensitive and must match the composable name exactly (e.g. `AurumChip`, not `aurumChip`).",
  annotations: {
    title: "Get Aurum Component",
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
        description: "Composable name, e.g. `AurumChip`. Case-sensitive.",
      },
      platform: {
        type: "string",
        enum: ["android", "ios", "all"],
        default: "all",
        description: "Reserved for future cross-platform manifests. Currently always resolves to `android`.",
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["component"],
    properties: {
      component: {
        type: "object",
        required: ["name", "family", "summary", "platforms", "sourcePath"],
        properties: {
          name: { type: "string" },
          family: { type: "string" },
          summary: { type: "string" },
          platforms: { type: "array", items: { type: "string" } },
          kdoc: { type: "string" },
          signature: { type: "string" },
          params: { type: "array" },
          previews: { type: "array", items: { type: "string" } },
          figmaNodeId: { type: ["string", "null"] },
          figmaUrl: { type: ["string", "null"] },
          codeConnectPath: { type: ["string", "null"] },
          galleryUrl: { type: ["string", "null"] },
          sourcePath: { type: "string" },
          // schema v2 (optional)
          intendedUse: { type: "string" },
          usage: {
            type: "object",
            properties: {
              do: { type: "array", items: { type: "string" } },
              dont: { type: "array", items: { type: "string" } },
            },
          },
          relatedTokens: { type: "array", items: { type: "string" } },
        },
      },
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

    if (c.intendedUse) {
      lines.push("## Intended use");
      lines.push("");
      lines.push(c.intendedUse);
      lines.push("");
    }

    if (c.usage && (c.usage.do.length > 0 || c.usage.dont.length > 0)) {
      lines.push("## Usage");
      lines.push("");
      if (c.usage.do.length > 0) {
        lines.push("**Do**");
        lines.push("");
        for (const item of c.usage.do) lines.push(`- ${item}`);
        lines.push("");
      }
      if (c.usage.dont.length > 0) {
        lines.push("**Don't**");
        lines.push("");
        for (const item of c.usage.dont) lines.push(`- ${item}`);
        lines.push("");
      }
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

    if (c.relatedTokens && c.relatedTokens.length > 0) {
      lines.push("## Related tokens");
      lines.push("");
      lines.push(
        "Tokens this component reads from `Aurum.*`. Look up details with " +
          "`aurum_get_token_value({ name: \"…\" })`.",
      );
      lines.push("");
      for (const t of c.relatedTokens) lines.push(`- \`${t}\``);
      lines.push("");
    }

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: { component: c },
    };
  },
};

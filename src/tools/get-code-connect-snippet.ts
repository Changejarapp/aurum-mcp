import type { ToolDef } from "./index.js";
import { fence } from "../format.js";

export const getCodeConnectSnippetTool: ToolDef = {
  name: "aurum_get_code_connect_snippet",
  description:
    "Return ONLY the canonical Code Connect `Example()` body for an Aurum component as a Kotlin code fence — " +
    "no preamble, no parameter table, no version footer. The snippet is the same string Figma's plugin pastes " +
    "into a designer's clipboard, sourced from the component's `.figma.kt` file. Use when the user just needs " +
    "the call-site code (e.g. 'show me how AurumChip is used' in a tight reply). " +
    "Do NOT use this when the user wants the full API surface (KDoc / params / Figma deeplink) — that's " +
    "`aurum_get_component`. " +
    "The `component` argument is case-sensitive and must match the composable name exactly.",
  annotations: {
    title: "Get Code Connect Snippet",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    required: ["component"],
    properties: {
      component: {
        type: "string",
        description: "Composable name, e.g. `AurumChip`. Case-sensitive.",
      },
    },
    additionalProperties: false,
  },
  async handler(manifest, args) {
    const name = String(args.component ?? "").trim();
    if (!name) {
      return {
        content: [{ type: "text", text: "Missing required `component` argument." }],
        isError: true,
      };
    }
    const mapping = manifest.codeConnect.find((cc) => cc.component === name);
    if (!mapping) {
      const available = manifest.codeConnect
        .filter((cc) => cc.component.toLowerCase().includes(name.toLowerCase()))
        .slice(0, 5)
        .map((cc) => `\`${cc.component}\``)
        .join(", ");
      const hint = available ? ` Did you mean ${available}?` : "";
      return {
        content: [{ type: "text", text: `No Code Connect mapping for \`${name}\`.${hint}` }],
        isError: true,
      };
    }
    if (!mapping.snippet) {
      return {
        content: [{ type: "text", text: `\`${name}\` has a Code Connect mapping at \`${mapping.kotlinPath}\` but no captured snippet.` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: fence("kotlin", mapping.snippet) }],
    };
  },
};

import type { ToolDef } from "./index.js";
import { fence } from "../format.js";

export const getCodeConnectSnippetTool: ToolDef = {
  name: "aurum_get_code_connect_snippet",
  description:
    "Return ONLY the canonical Code Connect `Example()` body for an Aurum component as a code fence — " +
    "no preamble, no parameter table, no version footer. The snippet is the same string Figma's plugin pastes " +
    "into a designer's clipboard, sourced from the component's `.figma.kt` / `.figma.swift` file. Use when the " +
    "user just needs the call-site code (e.g. 'show me how AurumChip is used' in a tight reply). " +
    "Do NOT use this when the user wants the full API surface (doc / params / Figma deeplink) — that's " +
    "`aurum_get_component`. " +
    "The `component` argument is case-sensitive and must match the component name exactly. " +
    "`platform` defaults to android; ios mappings exist but do not carry captured snippets yet.",
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
        description: "Component name, e.g. `AurumChip`. Case-sensitive.",
      },
      platform: {
        type: "string",
        enum: ["android", "ios"],
        default: "android",
        description: "Which platform's mapping to read. Defaults to android (Kotlin).",
      },
    },
    additionalProperties: false,
  },
  async handler(manifest, args) {
    const name = String(args.component ?? "").trim();
    const platform = String(args.platform ?? "android");
    if (!name) {
      return {
        content: [{ type: "text", text: "Missing required `component` argument." }],
        isError: true,
      };
    }
    const forComponent = manifest.codeConnect.filter((cc) => cc.component === name);
    // Single-platform manifests carry no `platform` field — treat those
    // entries as belonging to the manifest's own (android-primary) platform.
    const mapping = forComponent.find((cc) => (cc.platform ?? "android") === platform);
    if (!mapping) {
      if (forComponent.length > 0) {
        const platforms = [...new Set(forComponent.map((cc) => cc.platform ?? "android"))].join(", ");
        return {
          content: [{
            type: "text",
            text: `\`${name}\` has no ${platform} Code Connect mapping (available: ${platforms}).`,
          }],
          isError: true,
        };
      }
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
        content: [{ type: "text", text: `\`${name}\` has a ${platform} Code Connect mapping at \`${mapping.kotlinPath}\` but no captured snippet.` }],
        isError: true,
      };
    }
    const lang = platform === "ios" ? "swift" : "kotlin";
    return {
      content: [{ type: "text", text: fence(lang, mapping.snippet) }],
    };
  },
};

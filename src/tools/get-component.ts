import type { ToolDef } from "./index.js";
import type { Platform } from "../types.js";
import { fence, withFooter } from "../format.js";
import { SESSION_PLATFORM } from "../platform.js";

const PLATFORM_LANG: Record<string, string> = { android: "kotlin", ios: "swift", web: "tsx" };

export const getComponentTool: ToolDef = {
  name: "aurum_get_component",
  description:
    "Fetch full details of a single Aurum component by name: doc comment, signature, every parameter " +
    "(types/defaults/per-param docs), preview names, Figma deeplink, Code Connect path, gallery URL — " +
    "for the Compose (android) and/or SwiftUI (ios) implementation. " +
    "Use after `aurum_list_components` or `aurum_search` once you know the exact component name; " +
    "this is the primary source for 'how do I use AurumX?'. " +
    "Do NOT use this if the user wants the bare canonical-usage code snippet only — `aurum_get_code_connect_snippet` " +
    "is leaner. " +
    "The `name` argument is case-sensitive and must match the component name exactly (e.g. `AurumChip`, not `aurumChip`).",
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
        description:
          "Which implementation to render. Defaults to the SESSION's platform (auto-detected from the repo " +
          "the session runs in, or the AURUM_MCP_PLATFORM env var), else `all`. `all` shows the shared doc " +
          "plus a per-platform implementations section; `android` / `ios` swaps in that platform's source " +
          "paths, signature, and gallery link. Errors if the component doesn't exist on the requested platform.",
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

    // Explicit argument wins; otherwise the session lens; otherwise `all`.
    // Session-lens fallback: if the component doesn't exist on the lens
    // platform, degrade to `all` rather than erroring — the developer asked
    // about a component, not about the lens.
    let platform = String(args.platform ?? SESSION_PLATFORM ?? "all") as Platform | "all";
    if (!args.platform && platform !== "all" && !c.platforms.includes(platform as Platform)) {
      platform = "all";
    }
    if (platform !== "all" && !c.platforms.includes(platform)) {
      return {
        content: [{
          type: "text",
          text: `\`${c.name}\` is not available on ${platform} (platforms: ${c.platforms.join(", ")}).`,
        }],
        isError: true,
      };
    }
    // On merged manifests the top-level fields describe the primary platform
    // (android); a specific platform request swaps in that platform's detail.
    const sel = platform !== "all" ? c.sources?.[platform] : undefined;
    const sourcePath = sel?.sourcePath ?? c.sourcePath;
    const codeConnectPath = sel ? sel.codeConnectPath ?? null : c.codeConnectPath;
    const galleryUrl = sel ? sel.galleryUrl ?? null : c.galleryUrl;
    const signature = sel ? sel.signature : c.signature;
    const params = sel ? sel.params : c.params;
    const previews = sel?.previews ?? c.previews;
    const kdoc = sel?.kdoc ?? c.kdoc;
    const lang = platform !== "all" ? PLATFORM_LANG[platform] ?? "kotlin" : "kotlin";

    const lines: string[] = [
      `# ${c.name}${platform !== "all" ? ` (${platform})` : ""}`,
      "",
      `${c.summary}`,
      "",
      `**Family:** ${c.family}  `,
      `**Platforms:** ${c.platforms.join(", ")}  `,
    ];
    if (c.figmaUrl) lines.push(`**Figma:** [${c.figmaNodeId}](${c.figmaUrl})  `);
    if (galleryUrl) lines.push(`**Gallery:** ${galleryUrl}  `);
    if (codeConnectPath) lines.push(`**Code Connect:** \`${codeConnectPath}\`  `);
    lines.push(`**Source:** \`${sourcePath}\`  `);
    lines.push("");

    if (kdoc) {
      lines.push("## Description");
      lines.push("");
      lines.push(kdoc);
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

    if (signature) {
      lines.push("## Signature");
      lines.push("");
      lines.push(fence(lang, signature));
      lines.push("");
    } else if (platform === "ios" && c.signature) {
      lines.push(
        "_The aurum-ios generator does not emit signatures/params yet — see the " +
          "source file above, or the android signature via `platform: \"android\"`._",
      );
      lines.push("");
    }

    if (params && params.length > 0) {
      lines.push("## Parameters");
      lines.push("");
      for (const p of params) {
        const def = p.default ? ` = \`${p.default}\`` : "";
        const doc = p.doc ? ` — ${p.doc}` : "";
        lines.push(`- **${p.name}**: \`${p.type}\`${def}${doc}`);
      }
      lines.push("");
    }

    if (previews && previews.length > 0) {
      lines.push("## Previews");
      lines.push("");
      lines.push(previews.map((p) => `\`${p}\``).join(", "));
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

    if (platform === "all" && c.sources && Object.keys(c.sources).length > 1) {
      lines.push("## Platform implementations");
      lines.push("");
      for (const [p, src] of Object.entries(c.sources)) {
        if (!src) continue;
        lines.push(`### ${p}`);
        lines.push("");
        lines.push(`- **Source:** \`${src.sourcePath}\``);
        if (src.codeConnectPath) lines.push(`- **Code Connect:** \`${src.codeConnectPath}\``);
        if (src.galleryUrl) lines.push(`- **Gallery:** ${src.galleryUrl}`);
        if (src.signature) {
          lines.push("");
          lines.push(fence(PLATFORM_LANG[p] ?? "kotlin", src.signature));
        }
        lines.push("");
      }
      lines.push(
        "_Pass `platform: \"android\"` or `platform: \"ios\"` to render one implementation's full detail._",
      );
      lines.push("");
    }

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: { component: c },
    };
  },
};

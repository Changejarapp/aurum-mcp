import type { ToolDef } from "./index.js";
import { withFooter } from "../format.js";

export const getAurumVersionTool: ToolDef = {
  name: "aurum_get_aurum_version",
  description:
    "Return the Aurum library version, source SHA, manifest SHA, generation timestamp, platform coverage, " +
    "and gallery URL of the snapshot this MCP currently serves. Use this when the user asks 'what version " +
    "are we on?', or to record provenance before quoting a specific component/token answer in a long " +
    "conversation. " +
    "Do NOT use this for content lookups — every other tool's footer already prints the version inline. " +
    "Takes no arguments.",
  annotations: {
    title: "Get Aurum Version",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["aurum", "meta"],
    properties: {
      aurum: {
        type: "object",
        properties: {
          library: { type: "string" },
          version: { type: "string" },
          sha: { type: "string" },
          platforms: { type: "array", items: { type: "string" } },
        },
      },
      meta: {
        type: "object",
        properties: {
          generatedAt: { type: "string" },
          manifestSha: { type: "string" },
          figmaFileKey: { type: "string" },
          galleryUrl: { type: "string" },
        },
      },
    },
  },
  async handler(manifest, _args) {
    const { aurum, meta } = manifest;
    const lines = [
      "# aurum-mcp version info",
      "",
      `- **Library:** ${aurum.library}`,
      `- **Version:** ${aurum.version}`,
      `- **Source SHA:** ${aurum.sha || "(unknown)"}`,
      `- **Platforms:** ${aurum.platforms.join(", ")}`,
    ];
    // Per-platform source versions, when this is a merged multi-platform
    // manifest (aurum-android + aurum-ios). Each source has its own cadence;
    // aurum-mcp's own SemVer is independent of all of them.
    if (aurum.sources) {
      for (const [platform, src] of Object.entries(aurum.sources)) {
        if (src) {
          const sha = src.sha ? ` (\`${src.sha.slice(0, 8)}\`)` : "";
          lines.push(`  - **${platform}:** ${src.version}${sha}`);
        }
      }
    }
    lines.push(
      `- **Manifest SHA:** ${meta.manifestSha}`,
      `- **Generated at:** ${meta.generatedAt}`,
      `- **Figma file:** ${meta.figmaFileKey}`,
      `- **Gallery:** ${meta.galleryUrl}`,
    );
    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: { aurum, meta },
    };
  },
};

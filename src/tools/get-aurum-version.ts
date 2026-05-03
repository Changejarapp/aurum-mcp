import type { ToolDef } from "./index.js";

export const getAurumVersionTool: ToolDef = {
  name: "get_aurum_version",
  description:
    "Return the Aurum library version, manifest SHA, generation timestamp, and platform coverage. " +
    "Use this to verify which Aurum snapshot you are reasoning about before answering version-specific questions.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
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
      `- **Manifest SHA:** ${meta.manifestSha}`,
      `- **Generated at:** ${meta.generatedAt}`,
      `- **Figma file:** ${meta.figmaFileKey}`,
      `- **Gallery:** ${meta.galleryUrl}`,
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
};

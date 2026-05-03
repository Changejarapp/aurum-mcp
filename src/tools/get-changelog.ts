import type { ToolDef } from "./index.js";
import { withFooter } from "../format.js";

export const getChangelogTool: ToolDef = {
  name: "get_changelog",
  description:
    "Return one or more Aurum changelog entries as markdown. Default returns the [Unreleased] section. " +
    "Pass a specific version (e.g. `0.1.5`) for that release, or `all` for the full history.",
  inputSchema: {
    type: "object",
    properties: {
      version: {
        type: "string",
        description: "Version to fetch (`Unreleased`, a semver string, or `all`). Defaults to `Unreleased`.",
      },
    },
    additionalProperties: false,
  },
  async handler(manifest, args) {
    const requested = (args.version as string | undefined)?.trim() || "Unreleased";

    if (requested.toLowerCase() === "all") {
      const lines: string[] = ["# Aurum changelog (full)", ""];
      for (const e of manifest.changelog.entries) {
        const date = e.date ? ` — ${e.date}` : "";
        lines.push(`## [${e.version}]${date}`);
        lines.push("");
        for (const [section, bullets] of Object.entries(e.sections)) {
          lines.push(`### ${section}`);
          lines.push("");
          for (const b of bullets) lines.push(`- ${b}`);
          lines.push("");
        }
      }
      return { content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }] };
    }

    const entry = manifest.changelog.entries.find(
      (e) => e.version.toLowerCase() === requested.toLowerCase(),
    );
    if (!entry) {
      const available = manifest.changelog.entries.map((e) => `\`${e.version}\``).join(", ");
      return {
        content: [{ type: "text", text: `No changelog entry for \`${requested}\`. Available: ${available}.` }],
        isError: true,
      };
    }

    const date = entry.date ? ` — ${entry.date}` : "";
    const lines: string[] = [`# [${entry.version}]${date}`, ""];
    for (const [section, bullets] of Object.entries(entry.sections)) {
      lines.push(`## ${section}`);
      lines.push("");
      for (const b of bullets) lines.push(`- ${b}`);
      lines.push("");
    }

    return { content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }] };
  },
};

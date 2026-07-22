import type { ToolDef } from "./index.js";
import { withFooter } from "../format.js";

export const getChangelogTool: ToolDef = {
  name: "aurum_get_changelog",
  description:
    "Return one or more Aurum changelog entries as markdown. Default returns the `[Unreleased]` section. " +
    "Pass a specific version (e.g. `0.1.5`) for that release, or `all` for the full history. Use to answer " +
    "'what changed in vX?', 'is feature Y shipped?', or 'what's pending in the next release?'. " +
    "Do NOT use this to browse the implementation — use `aurum_get_component` for the current API surface " +
    "of a specific component. " +
    "Version strings are case-insensitive (`unreleased`, `Unreleased`, `UNRELEASED` all work). " +
    "Each platform library keeps its own release history — `platform` picks which log to read (default android).",
  annotations: {
    title: "Get Aurum Changelog",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      version: {
        type: "string",
        description: "Version to fetch (`Unreleased`, a semver string, or `all`). Defaults to `Unreleased`.",
      },
      platform: {
        type: "string",
        enum: ["android", "ios"],
        default: "android",
        description: "Which library's changelog to read (each has its own release cadence). Defaults to android.",
      },
    },
    additionalProperties: false,
  },
  async handler(manifest, args) {
    const requested = (args.version as string | undefined)?.trim() || "Unreleased";
    const platform = String(args.platform ?? "android");

    // Merged manifests carry per-platform logs in `changelogs`; the
    // top-level `changelog` mirrors android (primary) for back-compat.
    const log = platform === "android"
      ? manifest.changelogs?.android ?? manifest.changelog
      : manifest.changelogs?.[platform as "ios"];
    if (!log) {
      return {
        content: [{
          type: "text",
          text: `This manifest has no ${platform} changelog (platforms: ${manifest.aurum.platforms.join(", ")}).`,
        }],
        isError: true,
      };
    }

    if (requested.toLowerCase() === "all") {
      const lines: string[] = [`# Aurum ${platform} changelog (full)`, ""];
      for (const e of log.entries) {
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

    const entry = log.entries.find(
      (e) => e.version.toLowerCase() === requested.toLowerCase(),
    );
    if (!entry) {
      const available = log.entries.map((e) => `\`${e.version}\``).join(", ");
      return {
        content: [{ type: "text", text: `No ${platform} changelog entry for \`${requested}\`. Available: ${available}.` }],
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

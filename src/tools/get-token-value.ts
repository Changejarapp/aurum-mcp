import type { ToolDef } from "./index.js";
import type { Manifest } from "../types.js";
import { withFooter } from "../format.js";

interface ResolvedToken {
  /** Fully-qualified accessor path the user passed in. */
  name: string;
  /** Token kind. */
  kind:
    | "color.semantic"
    | "color.visual"
    | "spacing"
    | "radius"
    | "borderWidth"
    | "iconSize"
    | "elevation"
    | "typography";
  /** Compose accessor in Kotlin source (e.g. `AurumColors.surface.bgPageBase`). */
  composeAccessor: string;
  /** Render-relevant fields, kind-dependent. */
  value: Record<string, unknown>;
}

const COLOR_NS_TO_GETTER: Record<string, string> = {
  surface: "surface",
  interactive: "interactive",
  feedback: "feedback",
  text: "text",
  decorative: "decorative",
};

function resolveToken(manifest: Manifest, raw: string): ResolvedToken | null {
  const name = raw.trim();
  if (!name) return null;
  const parts = name.split(".");

  // color.semantic.{group}.{name} OR {group}.{name} (group ∈ surface/interactive/...)
  if (parts.length === 2 || (parts.length === 3 && parts[0] === "color")) {
    const group = parts.length === 3 ? parts[1] : parts[0];
    const leaf = parts[parts.length - 1];
    const semGroup = manifest.tokens.color.semantic[group];
    if (semGroup) {
      const s = semGroup.find((x) => x.name === leaf);
      if (s) {
        const accessor = `AurumColors.${COLOR_NS_TO_GETTER[group] ?? group}.${leaf}`;
        return {
          name,
          kind: "color.semantic",
          composeAccessor: accessor,
          value: { hex: s.hex, alpha: s.alpha, figmaPath: s.path, group },
        };
      }
    }
    const visGroup = manifest.tokens.color.visual[group];
    if (visGroup) {
      const s = visGroup.find((x) => x.name === leaf);
      if (s) {
        return {
          name,
          kind: "color.visual",
          composeAccessor: `AurumPalette.${group}.${leaf}`,
          value: { hex: s.hex, alpha: s.alpha, figmaPath: s.path, family: group },
        };
      }
    }
  }

  // spacing.{name} | radius.{name} | borderWidth.{name} | iconSize.{name}
  if (parts.length === 2) {
    const [cat, leaf] = parts;
    if (cat === "spacing" || cat === "radius" || cat === "borderWidth" || cat === "iconSize") {
      const t = manifest.tokens[cat].find((x) => x.name === leaf);
      if (t) {
        const accessorRoot = cat === "spacing" ? "AurumSpacing"
          : cat === "radius" ? "AurumRadius"
          : cat === "borderWidth" ? "AurumBorder"
          : "AurumIconSize";
        return {
          name,
          kind: cat,
          composeAccessor: `${accessorRoot}.${leaf}`,
          value: { dp: t.dp, comment: t.comment ?? null },
        };
      }
    }
    if (cat === "elevation") {
      const e = manifest.tokens.elevation.find((x) => x.name === leaf);
      if (e) {
        return {
          name,
          kind: "elevation",
          composeAccessor: `AurumElevation.${leaf}`,
          value: { offsetY: e.offsetY, blur: e.blur, tintName: e.tintName },
        };
      }
    }
    if (cat === "typography") {
      const t = manifest.tokens.typography.find((x) => x.name === leaf);
      if (t) {
        return {
          name,
          kind: "typography",
          composeAccessor: `AurumTypography.${leaf}`,
          value: {
            sizeSp: t.sizeSp,
            lineHeightSp: t.lineHeightSp,
            weight: t.weight,
            family: t.family,
          },
        };
      }
    }
  }

  // bare leaf — fall back to fuzzy lookup across categories
  return null;
}

function fuzzyCandidates(manifest: Manifest, raw: string): string[] {
  const q = raw.toLowerCase();
  const out: string[] = [];
  for (const [group, swatches] of Object.entries(manifest.tokens.color.semantic)) {
    for (const s of swatches) {
      if (s.name.toLowerCase().includes(q)) out.push(`${group}.${s.name}`);
    }
  }
  for (const cat of ["spacing", "radius", "borderWidth", "iconSize"] as const) {
    for (const t of manifest.tokens[cat]) {
      if (t.name.toLowerCase().includes(q)) out.push(`${cat}.${t.name}`);
    }
  }
  for (const t of manifest.tokens.typography) {
    if (t.name.toLowerCase().includes(q)) out.push(`typography.${t.name}`);
  }
  for (const e of manifest.tokens.elevation) {
    if (e.name.toLowerCase().includes(q)) out.push(`elevation.${e.name}`);
  }
  return out.slice(0, 5);
}

export const getTokenValueTool: ToolDef = {
  name: "aurum_get_token_value",
  description:
    "Point-lookup a single Aurum token by qualified name (e.g. `surface.bgPageBase`, `spacing.s12`, " +
    "`typography.bodyMRegular`, `elevation.level1`) and return its value (hex/dp/sp), Compose accessor, " +
    "and Figma path. Use this in preference to `aurum_list_tokens` whenever the user already names a " +
    "specific token — it returns ~30 tokens worth of context, not 100+. " +
    "Do NOT use this for browsing/discovery — use `aurum_list_tokens` for the full table or `aurum_search` " +
    "for free-text. " +
    "The qualifier (`surface.`, `spacing.`, etc.) is required; bare leaf names trigger a fuzzy-candidate hint.",
  annotations: {
    title: "Get Aurum Token Value",
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
        description: "Qualified token name, e.g. `surface.bgPageBase`, `spacing.s12`, `typography.bodyMRegular`.",
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      token: {
        type: "object",
        required: ["name", "kind", "composeAccessor", "value"],
        properties: {
          name: { type: "string" },
          kind: { type: "string" },
          composeAccessor: { type: "string" },
          value: { type: "object" },
        },
      },
    },
  },
  async handler(manifest, args) {
    const raw = String(args.name ?? "").trim();
    if (!raw) {
      return {
        content: [{ type: "text", text: "Missing required `name` argument." }],
        isError: true,
      };
    }
    const resolved = resolveToken(manifest, raw);
    if (!resolved) {
      const candidates = fuzzyCandidates(manifest, raw);
      const hint = candidates.length > 0
        ? ` Did you mean: ${candidates.map((c) => `\`${c}\``).join(", ")}?`
        : "";
      return {
        content: [{ type: "text", text: `No token matches \`${raw}\`.${hint}` }],
        isError: true,
      };
    }

    const lines: string[] = [
      `# ${resolved.name}`,
      "",
      `**Kind:** \`${resolved.kind}\`  `,
      `**Compose:** \`${resolved.composeAccessor}\`  `,
      "",
      "## Value",
      "",
    ];
    for (const [k, v] of Object.entries(resolved.value)) {
      if (v === null || v === undefined || v === "") continue;
      lines.push(`- **${k}:** \`${v}\``);
    }

    return {
      content: [{ type: "text", text: withFooter(manifest, lines.join("\n")) }],
      structuredContent: { token: resolved },
    };
  },
};

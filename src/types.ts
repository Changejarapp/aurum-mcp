/**
 * TypeScript types mirroring `tooling/manifest/schema.json` in the
 * `Changejarapp/aurum-android` repo. Keep the two in sync — schema is the
 * canonical contract; this file is a TypeScript projection of it.
 */

export type Platform = "android" | "ios" | "web";

export interface Manifest {
  /** "1" — original schema; "2" — adds optional component.intendedUse,
   *  component.usage, component.relatedTokens, icon.tags. v0.3 readers
   *  accept either; tools degrade gracefully when v2 fields are absent. */
  schemaVersion: "1" | "2";
  aurum: {
    library: string;
    version: string;
    sha: string;
    platforms: Platform[];
    /**
     * Per-platform source versions — the forward-compatible shape for a
     * MERGED, multi-platform manifest (aurum-android + aurum-ios later),
     * each on its own release cadence. aurum-mcp itself keeps a SEPARATE
     * SemVer (it aggregates these sources); it is NOT pinned to any one.
     *
     * Absent on single-platform manifests today — readers fall back to
     * `library`/`version`/`platforms` above. When present it is
     * authoritative; `version` then mirrors the primary platform's version
     * for back-compat. Generated downstream by the gallery once a second
     * platform ships; see `tooling/manifest/schema.json` (`aurum.sources`).
     */
    sources?: Partial<Record<Platform, { version: string; sha?: string }>>;
  };
  meta: {
    generatedAt: string;
    manifestSha: string;
    figmaFileKey: string;
    galleryUrl: string;
  };
  components: Component[];
  tokens: Tokens;
  icons: Icon[];
  codeConnect: CodeConnectMapping[];
  /** On merged multi-platform manifests this is the PRIMARY platform's
   *  (android) changelog; per-platform logs live in `changelogs`. */
  changelog: Changelog;
  /** Merged manifests only: per-platform changelogs — each source library
   *  keeps its own release history and cadence. Absent on single-platform
   *  manifests; readers fall back to `changelog`. */
  changelogs?: Partial<Record<Platform, Changelog>>;
}

export interface Changelog {
  raw: string;
  entries: ChangelogEntry[];
}

export interface Component {
  name: string;
  family: string;
  platforms: Platform[];
  summary: string;
  kdoc?: string;
  signature?: string;
  params?: Param[];
  previews?: string[];
  figmaNodeId: string | null;
  figmaUrl: string | null;
  codeConnectPath: string | null;
  galleryUrl: string | null;
  sourcePath: string;
  // ─── schema v2 additions (all optional) ─────────────────────────────────
  /** When-to-reach-for prose authored in `@AurumIntendedUse` KDoc. */
  intendedUse?: string;
  /** Do/Don't guardrails authored in `@AurumDo` / `@AurumDont` KDoc. */
  usage?: { do: string[]; dont: string[] };
  /** Qualified token names this component reads (e.g. `surface.bgPageBase`,
   *  `spacing.s12`, `typography.bodyMRegular`). Static-analyzed by the
   *  gallery generator; round-trips through `aurum_get_token_value`. */
  relatedTokens?: string[];
  /** The @AurumFigma doc-tag deeplink authored on the component; validated
   *  upstream to equal `figmaUrl`. Null / absent for code-only components. */
  figmaTagUrl?: string | null;
  /** Merged manifests only: per-platform implementation detail. When a
   *  component exists on more than one platform, the top-level fields above
   *  describe the PRIMARY platform (android) and each platform's own
   *  signature/paths live here. Written by the merge step, never by the
   *  single-platform generators. */
  sources?: Partial<Record<Platform, ComponentSource>>;
}

/** One platform's implementation of a component (`component.sources`).
 *  Everything but sourcePath is optional because the platforms' generators
 *  emit different levels of detail (aurum-ios has no signature/params yet). */
export interface ComponentSource {
  sourcePath: string;
  signature?: string;
  params?: Param[];
  kdoc?: string;
  codeConnectPath?: string | null;
  galleryUrl?: string | null;
  previews?: string[];
}

export interface Param {
  name: string;
  type: string;
  default: string | null;
  doc: string;
}

export interface Swatch {
  name: string;
  hex: string;
  alpha: number;
  path: string;
}

export interface DimensionToken {
  name: string;
  dp: number;
  comment?: string;
}

export interface ElevationToken {
  name: string;
  offsetY: number;
  blur: number;
  tintName: string;
}

export interface TypographyToken {
  name: string;
  sizeSp: number;
  lineHeightSp: number;
  weight: "Normal" | "Medium" | "SemiBold" | "Bold";
  family: "display" | "primary";
}

export interface Tokens {
  color: {
    semantic: Record<string, Swatch[]>;
    visual: Record<string, Swatch[]>;
  };
  spacing: DimensionToken[];
  radius: DimensionToken[];
  borderWidth: DimensionToken[];
  iconSize: DimensionToken[];
  elevation: ElevationToken[];
  typography: TypographyToken[];
}

export type TokenCategory =
  | "color"
  | "spacing"
  | "radius"
  | "borderWidth"
  | "iconSize"
  | "elevation"
  | "typography";

export interface Icon {
  name: string;
  category: string;
  lineDrawable: string;
  fillDrawable: string;
  lineFigmaNodeId: string | null;
  fillFigmaNodeId: string | null;
  lineFigmaUrl: string | null;
  fillFigmaUrl: string | null;
  lineSvg?: string;
  fillSvg?: string;
  /** schema v2: hand-curated synonyms for icon search (e.g. `Delete` →
   *  `["trash","remove","bin"]`). Sourced from `aurum/icons/tags.yaml`. */
  tags?: string[];
  /** Merged manifests only: platforms whose icon catalogs include this
   *  icon. Absent on single-platform manifests. */
  platforms?: Platform[];
}

export interface CodeConnectMapping {
  component: string;
  figmaNodeId: string;
  figmaUrl: string;
  /** Android-era field name — on ios entries it carries the .figma.swift
   *  path (v3 rename to `sourcePath` is tracked upstream). */
  kotlinPath: string;
  snippet?: string;
  /** Merged manifests only: which platform this mapping belongs to. */
  platform?: Platform;
}

export interface ChangelogEntry {
  version: string;
  date: string | null;
  sections: Record<string, string[]>;
}

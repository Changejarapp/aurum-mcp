/**
 * TypeScript types mirroring `tooling/manifest/schema.json` in the
 * `Changejarapp/aurum-android` repo. Keep the two in sync — schema is the
 * canonical contract; this file is a TypeScript projection of it.
 */

export type Platform = "android" | "ios" | "web";

export interface Manifest {
  schemaVersion: "1";
  aurum: {
    library: string;
    version: string;
    sha: string;
    platforms: Platform[];
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
  changelog: {
    raw: string;
    entries: ChangelogEntry[];
  };
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
}

export interface CodeConnectMapping {
  component: string;
  figmaNodeId: string;
  figmaUrl: string;
  kotlinPath: string;
  snippet?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string | null;
  sections: Record<string, string[]>;
}

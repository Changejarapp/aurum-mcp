/**
 * Markdown formatting helpers shared across tools.
 */

import type { Manifest } from "./types.js";

/** Standard footer attached to every content tool's response — gives the LLM
 *  a self-check signal of which Aurum version it's reasoning about. */
export function versionFooter(manifest: Manifest): string {
  const sha = manifest.meta.manifestSha.slice(0, 8);
  const generated = manifest.meta.generatedAt.replace("T", " ").replace(/\+.*$/, "").slice(0, 19) + " UTC";
  return `\n\n---\n*aurum ${manifest.aurum.library}@${manifest.aurum.version} · manifest sha \`${sha}\` · generated ${generated}*`;
}

/** Wrap a tool's body markdown with the version footer. */
export function withFooter(manifest: Manifest, body: string): string {
  return body + versionFooter(manifest);
}

/** Clean a Kotlin code block — trims trailing whitespace per line. */
export function fence(language: string, code: string): string {
  return "```" + language + "\n" + code.trimEnd() + "\n```";
}

/** Render a markdown table from rows (first row is the header). */
export function mdTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const header = rows[0];
  const sep = header.map(() => "---");
  const lines = [
    "| " + header.join(" | ") + " |",
    "| " + sep.join(" | ") + " |",
    ...rows.slice(1).map((r) => "| " + r.join(" | ") + " |"),
  ];
  return lines.join("\n");
}

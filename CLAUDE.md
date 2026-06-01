# CLAUDE.md — aurum-mcp

A read-only MCP server that surfaces the **Aurum design system** (components, tokens, icons, Figma-node mappings, Code Connect, changelog) to LLM tooling. It is a *thin renderer* over a single bundled JSON manifest (`data/manifest.json`) generated upstream. Full detail is in `README.md` (`## Versioning`, `## How content gets here`, `## CI workflows`) and `architecture.md` — this file is the short list of invariants that are easy to get wrong.

## What this repo is (and isn't)
- **It serves a manifest, it does not author content.** `data/manifest.json` is **generated** by `aurum-android`'s gallery (`tooling/gallery/generate.py`) from `AurumIcons.kt`, the drawables, KDoc, Code Connect, etc. **Never hand-edit `data/manifest.json`** — run `pnpm manifest:fetch` (pulls the live gallery manifest at `changejarapp.github.io/aurum-android/data/manifest.json`). The schema contract lives in `aurum-android/tooling/manifest/schema.json`; `src/types.ts` is its TypeScript projection — keep the two in sync.
- **The manifest is bundled into the server.** `src/manifest.ts` reads the manifest baked into the published package, so the **served catalog only changes when a new version is published** (`release.yml`) — committing a fresh manifest to `main` is necessary but not sufficient.

## Versioning (the part people get wrong)
- **aurum-mcp has its OWN SemVer, independent of any source library.** It is an **aggregator** — today `aurum-android`, later `aurum-ios`, each on its own cadence. **Never pin the MCP version to a source library version**, and never `npm version` it to match Aurum. The per-tool footer + `aurum_get_aurum_version` already print the source version(s).
- **Multi-platform shape (scaffolded):** the manifest's `aurum` block has `platforms: Platform[]` and an optional `aurum.sources` map (`{ android: {version,sha}, ios: {version,sha} }`) for merged manifests. Absent today; readers fall back to `aurum.version`. `aurum_get_aurum_version` renders each source when present.

## Drift is the failure mode — keep it loud
- The bundled manifest **silently fell ~1 month / 28 icons behind** the gallery once (served 0.1.5, repo 0.2.0, gallery 0.3.5) because **every sync link failed green**: the notify dispatch 403'd, the cron's auto-merge PR never merged (`GITHUB_TOKEN` PRs don't trigger workflows), and `drift-check` only ran on PRs so it never saw `main` fall behind. Result: the MCP told a consumer "no star icon exists" when `AurumIcons.Content.Star` had shipped.
- **Guardrails now:** `sync-manifest.yml` **direct-pushes** the manifest to `main` (no PR); `drift-check.yml` runs on a **daily schedule** and **files an issue** on real drift. If you touch the sync chain, keep it **fail-closed and loud** — no `exit 0`/`::warning::` silent skips.
- **When in doubt, trust the gallery, not the bundle.** If a consumer reports a missing/wrong icon/component/token, compare against the **live gallery manifest** (or `aurum-android` sources) before concluding it doesn't exist.

## Local dev
`pnpm dev` (run server) · `pnpm build` (tsc) · `pnpm smoke` (real MCP handshake) · `pnpm manifest:fetch` (re-pull the manifest). Releases are **manual** (`release.yml`, `bump: patch|minor|major`) — humans own the cadence.

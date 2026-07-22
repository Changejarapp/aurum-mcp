# Changelog

All notable changes to `aurum-mcp` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] — iOS ingestion: the merged android + ios catalog

### Added
- **iOS ingestion — the manifest is now a MERGED android + ios catalog.**
  `scripts/fetch-manifest.mjs` fetches both live gallery manifests
  (aurum-android + aurum-ios) and merges them deterministically (same
  inputs → byte-identical output; fail-closed if either gallery is
  unreachable): `aurum.sources` carries each library's version+sha,
  overlapping components (37 of 39 at merge time) carry per-platform
  `component.sources` (sourcePath / signature / params / kdoc /
  codeConnectPath / galleryUrl / previews), codeConnect entries carry
  `platform` (android `.figma.kt` + ios `.figma.swift`, 395 mappings),
  icons carry `platforms`, and each library's release history lives in
  `changelogs`. Schema stays v2 — all merged fields are additive
  (contract: `aurum-android/tooling/manifest/schema.json`).
- **Platform-aware tools.** `aurum_get_component` renders a chosen
  platform's implementation (`platform: "ios"` swaps in the SwiftUI
  source/gallery/Code Connect paths) or a per-platform section under
  `all`; `aurum_get_changelog` and `aurum_get_code_connect_snippet`
  take `platform`; the version footer names both sources
  (`*aurum android 0.3.28 + ios 0.2.2 · …*`).
- **Token parity check at merge time** — alpha-normalised comparison of
  the two platforms' token sets, WARNED (not fatal) on drift so
  release-cadence lag doesn't block syncs but real drift is loud.

### Changed
- `drift-check.yml` re-runs the merge against both live galleries and
  compares scrubbed content (bytes can't be compared to one source
  anymore); `sync-manifest.yml` commit messages name both versions.

## [0.3.0] — Schema-v2 enrichment surfaces

### Added
- **Schema-v2 manifest support.** `data/manifest.json` is now `schemaVersion: "2"`,
  bringing the four enrichment fields the v2 reader (shipped silently in
  v0.2.x) was waiting on:
  - `component.intendedUse` — when-to-reach-for prose authored upstream as
    `@AurumIntendedUse` KDoc tags. 6 priority components carry it today
    (AurumChip / AurumButton / AurumRadioButton / AurumRadioGroup /
    AurumTopAppBar / AurumOtpInput); others remain ungilded.
  - `component.usage.do[]` / `component.usage.dont[]` — guardrail bullets
    authored as `@AurumDo` / `@AurumDont` KDoc tags. 3 + 3 per priority
    component.
  - `component.relatedTokens[]` — qualified token names statically analyzed
    from each component's `Aurum.<accessor>.<leaf>` references. 235 total
    references across all 24 components, all round-trip through
    `aurum_get_token_value`.
  - `icon.tags[]` — hand-curated synonyms for all 60 icons (222 tags
    total) sourced from `aurum/icons/tags.toml` upstream. Powers the
    "find the trash icon" → `Action.Delete` routing in `aurum_search_icons`.

### Surfaces
- **`aurum_get_component`** now renders three new sections when the
  upstream content exists: `## Intended use`, `## Usage` (Do/Don't), and
  `## Related tokens` (with `aurum_get_token_value` cross-references).
- **`aurum_find_components_by_token`** switches from best-effort regex to
  exact lookup against `relatedTokens[]` whenever any component carries
  the field. Response shape gains `mode: "related-tokens" | "regex"` so
  callers know which path was used.
- **`aurum_search_icons`** matches `query` against `tags[]` (case-
  insensitive substring) and renders matched tags in the response. The
  broader `aurum_search` lunr index also folds tags into the icon doc
  body so synonyms route correctly there too.
- **`aurum_get_icon`** adds a `**Tags:**` line when the icon carries
  synonyms.

### Pipeline
- The upstream pages workflow now publishes `data/manifest.json` to
  `https://changejarapp.github.io/aurum-android/data/manifest.json`,
  which closes the cross-repo sync gap that left `drift-check` soft-
  failing on every PR. `sync-manifest.yml`'s daily cron now functions.

## [0.2.0] — Enrichment pass

### Added
- **3 new tools.**
  - `aurum_get_token_value` — point-lookup a single token by qualified
    name (`surface.bgPageBase`, `spacing.s12`, …) and return its value,
    Compose accessor, and Figma path.
  - `aurum_find_components_by_token` — reverse index from a token name
    to components that consume it (best-effort regex on v1 manifest;
    will switch to precise `relatedTokens[]` on schema v2).
  - `aurum_get_code_connect_snippet` — return ONLY the canonical
    `Example()` body for a component as a Kotlin code fence — no
    preamble, no parameter table, no version footer.
- **Tool annotations** on all 12 tools (`readOnlyHint`,
  `idempotentHint`, `destructiveHint: false`, `openWorldHint: false`,
  human-readable `title`). Lets clients skip auto-approve prompts.
- **`outputSchema` + `structuredContent`** on 10/12 tools — models
  with structured-output support get a parsable JSON payload alongside
  the markdown text in one tool call.
- **Server `instructions` block** surfaced once on `initialize`
  (`src/playbook.ts`) — lands cross-tool routing rules in the model's
  system context for the whole connection.
- **`docs/tools.md`** rewritten as a full per-tool reference with
  example prompts, common follow-ups, and lunr query syntax.
- **`docs/cookbook.md`** — ready-to-paste prompts grouped by use case.
- **`docs/quickstart.md`** — 60-second flow for each of the 5
  supported clients (Claude Code, Cursor, Copilot CLI, Gemini, Claude
  Desktop) including the Windows / Linux config paths.

### Changed
- **Breaking: tool names prefixed `aurum_*`.** All 9 existing tools
  renamed (`list_components` → `aurum_list_components`, `search` →
  `aurum_search`, …). Future-proofs against name collisions in
  multi-MCP setups (shadcn, Stripe, MUI all ship a `search`).
- **Tool descriptions rewritten** to the Anthropic 3–4 sentence
  template (what / when to use / when NOT to use / param format).
  Adds explicit cross-references (e.g. "use `aurum_search_icons`,
  not this, for icon queries").
- `aurum_get_aurum_version` now wraps its response in the version
  footer for consistency with every other content tool, and emits
  `structuredContent: { aurum, meta }`.
- README rewritten with a 60-second tour table mapping natural-language
  prompts to the tool the model picks, plus links to the new
  cookbook/quickstart.
- `scripts/smoke.mjs` extended to verify `initialize.instructions` is
  non-empty, all tools are `aurum_*` prefixed, all 12 carry
  annotations, ≥9 declare `outputSchema`, and 10/12 emit
  `structuredContent`.

## [0.1.1] — 2026-04-26

- First org release at `Changejarapp/aurum-mcp` after migration from
  the personal sandbox `atri-jar/aurum-mcp`.

## [0.1.0] — 2026-04-26

- Initial release. 9 tools, 24 components, 60 icons, 128 Code Connect
  mappings, 8 changelog entries. Distributed via `npx`-from-Git
  (`github:Changejarapp/aurum-mcp#latest-stable`).

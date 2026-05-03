# Changelog

All notable changes to `aurum-mcp` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

# Architecture

## Pipeline

```
                Figma Variables
                       │
                       ▼
      aurum-android/aurum/design-tokens/figma-export/*.json
                       │ (codegen)
                       ▼
      aurum-android/aurum/.../token/AurumLight*.kt   (@generated)
      aurum-android/aurum/.../component/Aurum*.kt    (hand-written + KDoc)
      aurum-android/aurum/.../component/.../*.figma.kt (Code Connect)
      aurum-android/aurum/CHANGELOG.md
      aurum-android/tooling/icons/import_from_figma.py (icon manifest)
                       │
                       ▼
      aurum-android/tooling/gallery/generate.py
              ├─►  build/gallery/*.html  (humans)
              └─►  build/gallery/data/manifest.json  (agents)
                       │
                       ├─► published to GitHub Pages (live URL)
                       │
                       └─► fetched on every release into
                                aurum-mcp/data/manifest.json
                                       │
                                       ▼
                       aurum-mcp/src/server.ts (this repo)
                                       │
                                       ▼
                          stdio MCP server, 12 tools
                                       │
                                       ▼
                          Claude Code / Cursor / Copilot CLI / etc.
```

## Source of truth

[`tooling/manifest/schema.json`](https://github.com/Changejarapp/aurum-android/blob/main/tooling/manifest/schema.json)
in `aurum-android` is the contract. Both producer (gallery generator)
and consumer (this MCP) validate against it. Adding a new content
category — say, design-decision docs or per-component migration guides
— is a 3-PR change: schema update, generator emit, MCP tool. The
architecture doesn't move.

## Cross-platform

Each component carries a `platforms[]` field. v0.1/v0.2 set it to
`["android"]` for everything. When `aurum-ios` ships, its gallery
generator emits a sibling manifest. This MCP's
`sync-manifest.yml` workflow merges both into a single
`data/manifest.json` keyed by platform. Tools that already accept
`platform` (e.g. `aurum_list_components`, `aurum_get_component`) start
returning iOS data. Same install URL, same tools, no architectural
change.

## Tool surface

12 tools, all read-only and prefixed `aurum_`. See
[`tools.md`](tools.md) for the per-tool reference and
[`cookbook.md`](cookbook.md) for prompt patterns.

Each tool descriptor (advertised on `tools/list`) carries:

- **`description`** — 3–4 sentence Anthropic-template prose:
  what it does, when to use, when NOT to use, param format quirks.
- **`inputSchema`** — JSON Schema for arguments.
- **`outputSchema`** — JSON Schema for the structured payload (10/12
  tools; the two narrative tools `aurum_get_changelog` and
  `aurum_get_code_connect_snippet` are markdown-only).
- **`annotations`** — `readOnlyHint: true`, `idempotentHint: true`,
  `destructiveHint: false`, `openWorldHint: false`, plus a
  human-readable `title`. Clients use these to skip auto-approve
  prompts.

Each `tools/call` response carries:

- **`content[]`** — the markdown text block (every tool).
- **`structuredContent`** — the parsable JSON object matching the
  declared `outputSchema` (10/12 tools). Models that support
  structured output get both in one call.

The server also advertises a server-level `instructions` block on
`initialize` (`src/playbook.ts`) that ~tells the model the routing
rules between tools. Concise (~1 KB) so it doesn't dominate the
system context on every connection.

## Schema versioning

The bundled manifest is validated against
[`tooling/manifest/schema.json`](https://github.com/Changejarapp/aurum-android/blob/main/tooling/manifest/schema.json)
in `aurum-android`. v0.2 reads `schemaVersion: "1"`. Planned
schema-v2 additions:

- `component.intendedUse: string` — when-to-reach-for copy
- `component.usage: { do: string[]; dont: string[] }` — guardrails
- `component.relatedTokens: string[]` — exact reverse-index for
  `aurum_find_components_by_token` (today: best-effort regex)
- `icon.tags: string[]` — search synonyms
- `previews[*].snapshotUrl: string` — direct gallery PNG links

All optional and additive — v0.2 stays forward-compatible. The MCP
will surface the new fields once schema-v2 lands upstream and the
manifest is regenerated.

## Distribution

`npx`-from-public-Git, not public npm. Reasons, ranked:

1. **Zero new infrastructure to govern.** No npm org, no `NPM_TOKEN`
   rotation, no 2FA recovery, no 72-hour publish-permanence anxiety.
2. **Branch-based testing.** Engineers can `npx -y github:.../aurum-mcp#feat/foo`
   to test a feature branch without polluting an npm registry with
   permanent alpha tags.
3. **Same auth users already have.** Public repo, no PAT, no `~/.npmrc`.
4. **Repo is the artefact.** One source of truth. Tags are immutable
   (Git's content-addressable storage).

The cost is ~5–10 s of extra first-spawn time (clone + `tsc` via npm's
`prepare` hook). Cached spawns are identical to the npm path. Worth
the trade-off for our team-internal use case.

If brand-on-npm ever becomes valuable (recruiting, conference talk,
public partner integration), an npm shim wrapping the Git install is
a one-day add. Not before.

## Versioning

`aurum-mcp@x.y.z` ships the manifest from `aurum@x.y.z`. The mapping
removes ambiguity: "what version of Aurum am I asking about?" = the
version you have installed.

The `release.yml` workflow handles bumps via `workflow_dispatch` —
**no automatic version bumps.** Per the upstream Aurum policy, humans
own release cadence. Auto-PRs from `sync-manifest.yml` update the
manifest content but never tag.

## The `#latest-stable` floating tag

A CI-managed Git tag that always points at the newest stable release.
After every `release.yml` run:

```bash
git tag -f latest-stable v0.1.6
git push -f origin latest-stable
```

Users who paste the default README snippet get auto-updates on each
fresh `npx` cache miss. Users who pin `#v0.1.6` are reproducible.
Documented as the README's primary install snippet.

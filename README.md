# aurum-mcp

> Talk to the **Aurum Design System** from your LLM client.
> Components · tokens · icons · Figma node IDs · changelog — all queryable
> from Claude Code, Cursor, Copilot CLI, Gemini, and Claude Desktop.

`aurum-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io/)
server that surfaces the Aurum design system catalogue to LLMs. It reads a
bundled JSON manifest (auto-synced from
[`changejarapp.github.io/aurum-android`](https://changejarapp.github.io/aurum-android/))
and exposes **12 tools** the LLM can call to answer questions like:

- *"Show me how to use AurumChip."*
- *"What hex value is `surface.bgPageBase`?"*
- *"Which Aurum components consume `interactive.bgPrimary`?"*
- *"Find the back-arrow icon."*
- *"What's the Figma node for AurumTopAppBar?"*
- *"What changed in the latest release?"*

---

## Install (one paste, every client)

Pick your client below, paste the snippet into the matching config file,
restart the client.

### Claude Code (`.mcp.json` in your project root, or `~/.claude.json`)

```jsonc
{
  "mcpServers": {
    "aurum": {
      "command": "npx",
      "args": ["-y", "github:Changejarapp/aurum-mcp#latest-stable"]
    }
  }
}
```

### Cursor (`~/.cursor/mcp.json`)

```jsonc
{
  "mcpServers": {
    "aurum": {
      "command": "npx",
      "args": ["-y", "github:Changejarapp/aurum-mcp#latest-stable"]
    }
  }
}
```

### Copilot CLI (`~/.copilot/mcp.json`)

```jsonc
{
  "mcpServers": {
    "aurum": {
      "command": "npx",
      "args": ["-y", "github:Changejarapp/aurum-mcp#latest-stable"]
    }
  }
}
```

### Gemini CLI (`~/.gemini/settings.json` under `mcpServers`)

```jsonc
{
  "mcpServers": {
    "aurum": {
      "command": "npx",
      "args": ["-y", "github:Changejarapp/aurum-mcp#latest-stable"]
    }
  }
}
```

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)

Same shape — drop the snippet above into `mcpServers`. Restart the app.

That's it. **No npm registry, no `~/.npmrc`, no PAT, no environment
variables.** Public Git, public `npx`. See
[`docs/quickstart.md`](docs/quickstart.md) for the 60-second flow per
client, including where each config file lives on Windows.

---

## 60-second tour

After installing, restart your client and try these natural-language
prompts. The model picks the right tool from the description hints — you
don't need to call them by name.

| Ask… | …and the model calls |
|---|---|
| "List all Aurum components." | `aurum_list_components` |
| "How do I use `AurumChip`?" | `aurum_search` → `aurum_get_component` |
| "What hex is `surface.bgPageBase`?" | `aurum_get_token_value` |
| "Which components use `interactive.bgPrimary`?" | `aurum_find_components_by_token` |
| "Show me an icon for delete/trash." | `aurum_search_icons` → `aurum_get_icon` |
| "I'm looking at Figma node `5126:2507`, what code is it?" | `aurum_lookup_figma_node` |
| "Just paste the canonical `AurumChip` usage code." | `aurum_get_code_connect_snippet` |
| "What changed in the most recent release?" | `aurum_get_changelog` |
| "What version of Aurum am I on?" | `aurum_get_aurum_version` |

The full prompt cookbook lives in [`docs/cookbook.md`](docs/cookbook.md).

---

## Tools

All tools are read-only, side-effect-free, and prefixed `aurum_` for
collision-proofing in mixed-MCP setups.

| Tool | Purpose |
|---|---|
| `aurum_list_components` | Enumerate components grouped by family with one-line summaries |
| `aurum_get_component` | Full component spec — KDoc, signature, params, Figma deeplink, Code Connect path |
| `aurum_list_tokens` | Token tables: color (semantic + visual), spacing, radius, borderWidth, iconSize, elevation, typography |
| `aurum_get_token_value` | Point-lookup a single token by qualified name (`surface.bgPageBase`, `spacing.s12`, …) |
| `aurum_find_components_by_token` | Reverse index: given a token, return components that consume it |
| `aurum_search_icons` | Find icons by name fragment and/or category — returns line+fill drawables and Figma IDs |
| `aurum_get_icon` | Single icon: drawables, Compose accessor, line+fill Figma deeplinks, ready-to-paste snippet |
| `aurum_get_changelog` | Per-version changelog as markdown — defaults to `[Unreleased]` |
| `aurum_lookup_figma_node` | Reverse-lookup: Figma node ID / URL → matching components and icons |
| `aurum_get_code_connect_snippet` | The canonical `Example()` body for a component as a Kotlin code fence — no preamble |
| `aurum_search` | Free-text search across all content with next-tool-to-call hints |
| `aurum_get_aurum_version` | Manifest provenance: version, source SHA, manifest SHA, generation timestamp |

Every content tool returns a markdown response, plus a parsable
`structuredContent` JSON payload (declared via `outputSchema`) for the
9 enumerable tools — clients that support structured output get both
in one call. Each response ends with a version footer:

```
---
*aurum aurum-android@0.1.5 · manifest sha `9af3b21c` · generated 2026-05-03 12:00:00 UTC*
```

Full per-tool reference with example prompts, params, and example
responses: [`docs/tools.md`](docs/tools.md).

---

## Versioning

The default snippet uses `#latest-stable` — a CI-managed Git tag that
always points at the newest stable release. Behaves like npm's
`@latest` dist-tag: you get auto-updates on each fresh `npx` cache miss
(~10 min to a few hours, depending on your client's cache).

For reproducibility — automated scripts, audited setups — pin to an
explicit tag:

```jsonc
"args": ["-y", "github:Changejarapp/aurum-mcp#v0.2.0"]
```

**MCP version vs Aurum library version.** These are two independent
SemVer tracks. Up through `aurum-mcp@v0.1.x` they happened to match
1:1; from v0.2.0 onward, MCP-side work (description rewrites, new
tools, schema readers) drove the MCP ahead of the library while the
Aurum library version moves on its own cadence. The version footer on
every tool response prints **both** so any conversation is traceable:

```
*aurum aurum-android@0.1.5 · manifest sha 9af3b21c · generated 2026-05-04 04:22 UTC*
```

Or call `aurum_get_aurum_version` from your LLM client for the full
provenance block.

---

## How content gets here (manifest pipeline)

`aurum-mcp` is a thin renderer over a single JSON manifest produced
upstream by the Aurum library. Here's how a component / token / icon
change in `Changejarapp/aurum-android` reaches a developer's editor:

```
                       Push to aurum-android main
                                    │
                                    ▼
                check.yml  ─►  pages.yml
                              (gradle)    (gallery + manifest)
                                    │
                                    ▼
            https://changejarapp.github.io/aurum-android/data/manifest.json
                                    │
                ┌───────────────────┼─────────────────────┐
                │                   │                     │
        repository_dispatch    daily cron          workflow_dispatch
        (~1 min, instant)      (06:00 UTC)            (manual)
                │                   │                     │
                └───────────────────┴──────────┬──────────┘
                                               ▼
                       aurum-mcp/sync-manifest.yml
                                               │
                                               ▼
                opens "chore: sync manifest to aurum@X.Y.Z" auto-PR
                                               │
                          👤 human reviews + clicks Merge
                                               │
                                               ▼
                              main carries new manifest
                                               │
                          👤 human dispatches release.yml
                          (Actions → Release → Run workflow → bump)
                                               │
                                               ▼
            tag vX.Y.Z + force-move latest-stable + GitHub Release
                                               │
                                               ▼
              users on `#latest-stable` pick up on next npx cache miss
                          (~10 min on Claude Code)
```

**What's automatic vs manual**:

| Step | Automatic | Manual |
|---|---|---|
| Aurum gallery rebuild | ✅ on push | |
| Manifest URL refresh | ✅ ~10 min | |
| Cross-repo dispatch | ✅ via `notify-mcp.yml` | |
| Sync-manifest auto-PR | ✅ | |
| Auto-PR review + merge | | 👤 |
| Release dispatch | | 👤 |
| Tag / latest-stable / Release | ✅ on dispatch | |
| User picks up new content | ✅ npx cache miss | |

**Why release is manual**: a half-baked Aurum change shouldn't
auto-broadcast to every team-member's editor at 06:00 UTC. Manual
dispatch lets you batch several manifest syncs into one release and
gives a human moment to review the CHANGELOG before users see new
behaviour.

**Stale-main safety valve**: a weekday cron (`stale-main.yml`) opens
a tracking issue when `main` is ≥7 days ahead of the latest release on
release-relevant paths — gentle nudge, not a hard gate. Auto-closes
when a fresh release lands.

For the upstream side of this pipeline (how component changes reach
the manifest URL), see
[`Changejarapp/aurum-android`'s README — Manifest pipeline section](https://github.com/Changejarapp/aurum-android#manifest-pipeline-feeding-aurum-mcp).

---

## Why `npx`-from-Git, not npm?

We considered three distribution channels (public npm, GitHub Packages,
`npx`-from-Git) and chose the third because for a team-internal tool
optimising for **simplicity, full ownership, and zero new infrastructure**:

- **Zero new accounts to govern.** No npm org, no `NPM_TOKEN` rotation,
  no 2FA recovery, no 72-hour publish-permanence anxiety. The repo IS
  the artefact, end-to-end.
- **Branch-based testing for free.** Want to try a feature branch?
  Just change the snippet to `#feat/branch-name` — done. With npm
  you'd publish a pre-release tag that lives in the registry forever.
- **Same auth users already have.** This repo is public; team members
  have GitHub access; nothing new to configure.
- **Marginal install delay.** First-spawn is ~5–10 s of clone + build
  vs. ~2–5 s for npm. Cached spawns are identical.

Trade-offs we accept: less polished version-pinning UX (Git tags vs.
semver ranges) and no public-npm discoverability. The full reasoning
lives in [`docs/architecture.md`](docs/architecture.md#distribution).

---

## Local development

```bash
git clone https://github.com/Changejarapp/aurum-mcp.git
cd aurum-mcp
pnpm install
pnpm dev          # run the server via tsx + stdio
pnpm inspect      # spawn the official MCP Inspector UI
pnpm build        # tsc → dist/
pnpm smoke        # end-to-end tools/list + tools/call test (12 tools)
```

The server reads `data/manifest.json` (committed). To pull the latest
manifest from the live Aurum gallery and update the bundled copy:

```bash
make manifest-fetch
```

CI does this automatically (see `.github/workflows/sync-manifest.yml`).

---

## Architecture in one paragraph

The Aurum design system lives in
[`Changejarapp/aurum-android`](https://github.com/Changejarapp/aurum-android)
(private) and ships a public gallery at
[`changejarapp.github.io/aurum-android`](https://changejarapp.github.io/aurum-android/).
Its `tooling/gallery/generate.py` script aggregates components, tokens,
icons, Code Connect mappings, and the changelog from a single set of
parsers. We added a `--emit-manifest` flag that produces a structured
JSON projection of the same data — the contract is
`tooling/manifest/schema.json` in `aurum-android`. This MCP server is
the JSON's read-side: it loads the manifest at boot, indexes it, and
serves the 12 tools above. One source of truth, two render targets
(HTML for humans, JSON for agents). When `aurum-ios` ships, its
manifest plugs in as a sibling source — the MCP code is platform-
agnostic.

Full pipeline diagram: [`docs/architecture.md`](docs/architecture.md).

---

## Contributing

Issues and PRs welcome. See [`docs/contributing.md`](docs/contributing.md)
for the workflow (manifest sync, drift-check, release process). Code
style: TypeScript strict, Prettier defaults; no business logic in
markdown formatters.

## License

MIT — see [`LICENSE`](LICENSE).

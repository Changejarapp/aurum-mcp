# aurum-mcp

> Talk to the **Aurum Design System** from your LLM client.
> Components · tokens · icons · Figma node IDs · changelog — all queryable
> from Claude Code, Cursor, Copilot CLI, Gemini, and Claude Desktop.

`aurum-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io/)
server that surfaces the Aurum design system catalogue to LLMs. It reads a
bundled JSON manifest (auto-synced from
[`changejarapp.github.io/aurum-android`](https://changejarapp.github.io/aurum-android/))
and exposes 9 tools the LLM can call to answer questions like:

- "Show me how to use AurumChip."
- "What colour token do we have for negative-feedback text?"
- "What's the Figma node for AurumTopAppBar?"
- "Give me the icon for a back arrow."
- "What changed in the most recent release?"

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
variables.** Public Git, public `npx`.

---

## Versioning

The default snippet uses `#latest-stable` — a CI-managed Git tag that
always points at the newest stable release. Behaves like npm's
`@latest` dist-tag: you get auto-updates on each fresh `npx` cache miss
(~10 min to a few hours, depending on your client's cache).

For reproducibility — automated scripts, audited setups — pin to an
explicit tag:

```jsonc
"args": ["-y", "github:Changejarapp/aurum-mcp#v0.1.0"]
```

Every version of `aurum-mcp` ships the manifest from the matching Aurum
library version (`@aurum-mcp:0.1.6` ⇄ `aurum:0.1.6`). Call
`get_aurum_version` from your LLM client to see exactly what you're
talking to.

---

## Tools

| Tool | Purpose |
|---|---|
| `list_components` | Enumerate all Aurum components, grouped by family |
| `get_component` | Full component spec — KDoc, signature, params, Figma deeplink |
| `list_tokens` | Token tables: color (semantic + visual), spacing, radius, borderWidth, iconSize, elevation, typography |
| `search_icons` | Find icons by name fragment or category |
| `get_icon` | Single icon: drawables, Compose path, line+fill Figma deeplinks |
| `get_changelog` | Per-version changelog as markdown — defaults to `[Unreleased]` |
| `lookup_figma_node` | Reverse-lookup: Figma node ID / URL → matching Aurum components & icons |
| `search` | Free-text search across all content with next-tool suggestions |
| `get_aurum_version` | Manifest provenance: version, SHA, generation timestamp |

See [`docs/tools.md`](docs/tools.md) for full input schemas and example
responses.

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
pnpm smoke        # end-to-end tools/list + tools/call test
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
serves the 9 tools above. One source of truth, two render targets
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

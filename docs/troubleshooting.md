# Troubleshooting

## "First spawn is slow"

Expected. `npx` is cloning the public Git repo (~2-5 MB shallow), then
running `npm install` and `tsc` via the package's `prepare` hook.
Total: ~10-15 seconds on a decent connection. Subsequent spawns hit
the `npx` cache and start in under a second.

## "Manifest seems stale"

Two layers of caching: `npx`'s install cache (~10 min default) and the
MCP server's in-memory copy (until the process exits). Restart your
LLM client to bust both.

If you want guaranteed-latest, pin to `#main` instead of
`#latest-stable`. (Stable is the default because `main` may carry
unreleased work.)

To verify the version your client is actually talking to, ask:

> What aurum-mcp version is loaded?

It should call `aurum_get_aurum_version` and report the manifest
version + SHA + timestamp.

## "I want to test a branch / WIP feature"

Change the install snippet's ref:

```jsonc
"args": ["-y", "github:Changejarapp/aurum-mcp#feat/your-branch"]
```

This is the killer feature of `npx`-from-Git: branch refs are
immediate, free, and don't pollute any registry.

## "How do I roll back?"

Pin to an older tag:

```jsonc
"args": ["-y", "github:Changejarapp/aurum-mcp#v0.1.0"]
```

Tags are immutable — every `v*` will exist in the repo forever.

## "Tool returns error: missing field"

The bundled manifest (in `data/manifest.json`) was generated against a
specific Aurum version. If the tool expects a field that's only in
newer manifests, your `npx` cache is serving an older `aurum-mcp`
version. Restart your LLM client to refresh.

## "Server boots but no tools list"

Most likely: your client isn't sending the `initialize` handshake
correctly. Run with the inspector:

```bash
git clone https://github.com/Changejarapp/aurum-mcp.git
cd aurum-mcp && pnpm install && pnpm inspect
```

The MCP Inspector UI walks through every step of the handshake and
shows you the wire-protocol traffic.

## "Build fails locally"

Run `pnpm install` from a clean state:

```bash
rm -rf node_modules dist .tsbuildinfo
pnpm install
pnpm build
```

If TypeScript still complains, check that you're on Node ≥ 18.18 (the
`engines` field). The MCP SDK requires modern ESM.

## "I want to run aurum-mcp against a custom manifest"

Drop your manifest at `data/manifest.json` and run `pnpm dev`.
Useful for testing schema changes before they land in `aurum-android`.

## Filing issues

Bug reports → <https://github.com/Changejarapp/aurum-mcp/issues> (or, after
the org migration, `Changejarapp/aurum-mcp`). Include:

- Output of `aurum_get_aurum_version` (run it from your LLM client)
- Your client name + version (Claude Code / Cursor / Copilot CLI / Gemini)
- The full mcp.json snippet you're using
- The `aurum-mcp ready ...` line your client prints to stderr on startup

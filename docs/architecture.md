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
                          stdio MCP server, 9 tools
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

Each component carries a `platforms[]` field. v0.1 sets it to
`["android"]` for everything. When `aurum-ios` ships, its gallery
generator emits a sibling manifest. This MCP's
`sync-manifest.yml` workflow merges both into a single
`data/manifest.json` keyed by platform. Tools that already accept
`platform` (e.g. `list_components`, `get_component`) start returning
iOS data. Same install URL, same tools, no architectural change.

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

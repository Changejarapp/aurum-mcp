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

## CI workflows

Seven workflows in [`.github/workflows/`](.github/workflows/) cover PR
validation, content propagation from `aurum-android`, releases, and a
release-cadence safety valve. Mirrors the producer-side inventory in
[`Changejarapp/aurum-android`](https://github.com/Changejarapp/aurum-android#ci-workflows).
The summary table is the at-a-glance view; the per-workflow notes
below cover edge cases, secrets / permissions, and what each workflow
explicitly *doesn't* do.

| Workflow | Triggers | What it does |
|---|---|---|
| [`build.yml`](.github/workflows/build.yml) | PR · push `main` | TypeScript compile · `pnpm smoke` (real MCP handshake against the in-tree `dist/`). Concurrency cancels superseded runs. |
| [`smoke-test.yml`](.github/workflows/smoke-test.yml) | PR | Real `npx -y github:Changejarapp/aurum-mcp#<sha>` install on a fresh Ubuntu runner with Node 24, then JSON-RPC handshake — exactly the path real users hit. Asserts ≥7 tools and acceptable response shape. |
| [`drift-check.yml`](.github/workflows/drift-check.yml) | PR | Compares bundled `data/manifest.json` against the live gallery URL (<https://changejarapp.github.io/aurum-android/data/manifest.json>) — content-aware via `jq` filter that scrubs the provenance fields (`aurum.sha`, `meta.generatedAt`, `meta.manifestSha`) which change on every upstream gallery deploy without affecting MCP behaviour. Soft-skips with a warning when the URL is 404 (an upstream gap, not a per-PR concern). |
| [`sync-manifest.yml`](.github/workflows/sync-manifest.yml) | `repository_dispatch: aurum-content-changed` from aurum-android · cron `0 6 * * *` (06:00 UTC daily) · manual | Fetches the live manifest, diffs against bundled, opens an auto-PR (`auto/manifest-sync` branch, labelled `manifest-sync` + `auto-merge`) if anything changed. |
| [`release.yml`](.github/workflows/release.yml) | manual dispatch only (`bump: patch \| minor \| major`) | `npm version` bump → tag → force-move `latest-stable` → create GitHub Release with auto-generated notes. The single source of `package.json` version changes. |
| [`stale-main.yml`](.github/workflows/stale-main.yml) | weekday cron `0 9 * * 1-5` (09:00 UTC) · manual | Opens (or updates) a single `release-stale`-labelled tracking issue when `main` is ≥7 days ahead of latest tag on release-relevant paths. Auto-closes any open issue when fresh. |
| [`docs.yml`](.github/workflows/docs.yml) | push `main` (paths `docs/**`, `README.md`, this workflow) · manual | Builds `README.md` + `docs/` via `actions/jekyll-build-pages` and deploys to <https://changejarapp.github.io/aurum-mcp/>. |

### Per-workflow notes

#### [`build.yml`](.github/workflows/build.yml) — local-shape compile + smoke

PR-time gate that runs `tsc` followed by `pnpm smoke` (a real MCP handshake against the just-built `dist/server.js`). **Doesn't** commit `dist/` — it's gitignored on dev branches and rebuilt on demand by the package's `prepare` hook on user installs. **Doesn't** test the real npx-from-Git install path — that's `smoke-test.yml`.

#### [`smoke-test.yml`](.github/workflows/smoke-test.yml) — real-install verification

Pinned to **Node 24** because Node 22 ships npm 10, which has a known GitFetcher/Arborist bug that breaks `npx -y github:...#sha` installs whose `prepare` hook runs `tsc`. This bug doesn't affect tag installs (where users hit a tagged ref whose `dist/` is committed at tag-time), only the PR-branch path the smoke test exercises. The JSON-RPC parser is order-independent (`awk … | jq -s 'map(select(.result.tools)) …'`) — newer `@modelcontextprotocol/sdk` versions emit `{"result":...,"jsonrpc":"2.0","id":N}` rather than the older field ordering, and the previous brittle prefix grep was silently dropping responses.

#### [`drift-check.yml`](.github/workflows/drift-check.yml) — manifest currency gate

Soft-skips on 404 because the upstream Pages manifest URL hasn't always existed historically; failing every PR over an upstream gap was net-negative. When the URL is reachable, comparison is **content-aware**: a `jq` filter (`del(.aurum.sha, .meta.generatedAt, .meta.manifestSha)`) scrubs the provenance fields that change on every upstream gallery deploy regardless of content, then `jq --sort-keys` canonicalises both sides before `diff`. Without this scrub the gate would fail every aurum-mcp PR opened after any aurum-android push to main, even when the actual content was byte-identical — that turned out to be intrinsically noisy once branch protection made `drift` a hard required check. [`scripts/fetch-manifest.mjs`](scripts/fetch-manifest.mjs) preserves the upstream's raw bytes (rather than re-serializing through `JSON.parse → JSON.stringify`) so Python-emitted `1.0` doesn't normalise to `1` and break the diff in unrelated ways. **Doesn't** auto-fix drift — it forces the auto-PR from `sync-manifest.yml` to merge first.

#### [`sync-manifest.yml`](.github/workflows/sync-manifest.yml) — content propagation

Three triggers, in order of latency: (1) `repository_dispatch` from `aurum-android/notify-mcp.yml` (~1 min, requires the upstream PAT to be properly scoped), (2) daily cron at 06:00 UTC (≤24 h, the safety net), (3) manual `workflow_dispatch` (instant, useful for ad-hoc syncs). The repo's "Allow GitHub Actions to create and approve pull requests" setting is currently **off**, so the workflow successfully pushes the `auto/manifest-sync` branch but its PR-creation step exits failure — recovery is one `gh pr create --head auto/manifest-sync` from a maintainer. **Doesn't** bump `package.json` (the original `npm version <aurum_version>` step was deliberately removed — the MCP and Aurum library versions are independent SemVer tracks; the version footer on tool responses already prints both). Permissions: `contents: write`, `pull-requests: write`.

#### [`release.yml`](.github/workflows/release.yml) — the only place version changes

Manual `workflow_dispatch` only by design — humans own release cadence (matches the upstream Aurum policy). Steps after dispatch: `pnpm install --frozen-lockfile` → `pnpm build && pnpm smoke` (gate before tagging) → `npm version <bump>` → `git push --follow-tags` → `git tag -f latest-stable <new-tag> && git push -f origin latest-stable` → `softprops/action-gh-release@v2` with `generate_release_notes: true`. **Doesn't** auto-fire on any event. **Doesn't** publish to npm (we're npx-from-Git, not npm registry — see `docs/architecture.md`). **Doesn't** edit `data/manifest.json` (that's `sync-manifest.yml`'s job).

#### [`stale-main.yml`](.github/workflows/stale-main.yml) — release-cadence safety valve

Counts commits ahead of the latest `v*.*.*` tag on `data/manifest.json`, `src/**`, `package.json`, `CHANGELOG.md` only — non-release-relevant changes don't count (no point nagging about a workflow tweak). Weekday-only cron so weekends don't generate Saturday-morning issue spam. Single tracking issue updated in place rather than spawning duplicates daily; auto-closes after a fresh release lands. **Doesn't** auto-release (the whole point — release stays manual).

#### [`docs.yml`](.github/workflows/docs.yml) — public docs site

GitHub Pages with "Source: GitHub Actions" doesn't auto-run Jekyll — `actions/upload-pages-artifact@v5` serves whatever directory it's pointed at, verbatim. We invoke `actions/jekyll-build-pages@v1` explicitly to render markdown to HTML before upload. Path-filtered to `docs/**` / `README.md` / this workflow so unrelated PR merges don't trigger redeploys. Permissions: `pages: write`, `id-token: write`.

### Labels

Curated to the small set we actually use. Most GitHub default labels (`enhancement`, `good first issue`, `wontfix`, etc.) were unused noise and have been removed.

| Label | Color | What it does |
|---|---|---|
| `manifest-sync` | green | **Bot marker** — applied by [`sync-manifest.yml`](.github/workflows/sync-manifest.yml) to every auto-PR it opens. Lets maintainers filter "PRs from the sync bot" in the PR list. |
| `auto-merge` | blue | **Bot marker** — also applied by `sync-manifest.yml`. Decorative until the repo's `allow_auto_merge` setting is flipped on (currently `false`); when it is, GitHub will pick this label up and auto-merge sync PRs after CI green. |
| `release-stale` | yellow | **Tracking marker** — applied by [`stale-main.yml`](.github/workflows/stale-main.yml) to its single tracking issue when `main` is ≥7 days ahead of the latest release on release-relevant paths. Auto-closes when a fresh release lands. |
| `breaking-change` | red | **Release-time signal** — apply to PRs that change tool names, remove tools, or change response shape in ways that force consumers to update their LLM client config or prompts. Drives the `bump: major` choice when `release.yml` is dispatched. |
| `bug`, `documentation` | red, blue | Issue-tracker conventions. Used sparingly — most work goes through PRs directly. |

`stale-main.yml` calls `gh issue create --label release-stale` which 422s on a missing label — so `release-stale` is **required to exist** (not just a marker). Same for the other workflow-applied labels: pre-creating them avoids first-fire surprises.

Other labels intentionally NOT used: `feat`/`fix`/`chore`/`docs` type labels (Keep-a-Changelog headings already organise this), priority labels (overhead vs value at our PR volume), area labels (small enough surface that grep wins).

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

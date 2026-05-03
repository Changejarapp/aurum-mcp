# Contributing

## Setup

```bash
git clone https://github.com/Changejarapp/aurum-mcp.git
cd aurum-mcp
pnpm install
make help
```

## Daily workflow

Most code changes: edit `src/`, run `pnpm inspect` (spawns the server
under the official MCP Inspector UI to drive it), iterate, run
`pnpm smoke` to verify nothing regressed, push. `pnpm dev` runs the
server alone over stdio if you want to drive it from a manual JSON-RPC
client.

The `dist/` directory is gitignored — `pnpm dev` runs TypeScript via
`tsx` directly, no build needed. CI runs `pnpm build` to verify the
full TypeScript compile passes; users get `dist/` built at install
time via the package's `prepare` hook.

## Adding a new tool

1. Create `src/tools/<your-tool>.ts` exporting `<yourTool>Tool: ToolDef`.
2. Add it to the `tools` array in `src/tools/index.ts`.
3. Add a row to `docs/tools.md`.
4. Add a corresponding step in `scripts/smoke.mjs` so the smoke test
   exercises it.
5. PR.

## Adding a new content category

The MCP can only surface what the manifest carries. New content
categories require a coordinated change in `Changejarapp/aurum-android`:

1. Update `tooling/manifest/schema.json` — add the new top-level key
   (or sub-key) with its required fields. Bump `schemaVersion` if
   the change is breaking.
2. Update `tooling/gallery/generate.py` — add a parser + serializer
   that writes the new section.
3. Open the PR. The `aurum-android` PR's auto-pages-deploy republishes
   the gallery's `data/manifest.json` with the new content.
4. In this repo, update `src/types.ts` to mirror the schema change.
5. Add the tool that surfaces the new content.

## Manifest sync

CI handles this automatically. The `sync-manifest.yml` workflow:

- Fires on `repository_dispatch` from `aurum-android` (Stage 2 — once
  the org migration is done; until then, cron + manual dispatch).
- Fires on a daily safety-net cron at 06:00 UTC.
- Fires on manual `workflow_dispatch`.

The workflow fetches
`https://changejarapp.github.io/aurum-android/data/manifest.json`,
diffs against the committed `data/manifest.json`. If different, opens
an auto-merging PR + bumps `package.json` to the new Aurum version.

A maintainer then dispatches `release.yml` to tag + create a GitHub
Release. **Tagging is intentionally manual** — humans own release
cadence (the same rule the upstream Aurum library follows).

## Drift check

Every PR runs `drift-check.yml`, which fails if the bundled manifest
is out of sync with the live gallery URL. Fix: run the sync workflow
(or `make manifest-fetch` locally) and merge that PR before the
unrelated change can land.

## Smoke test

Every PR runs `smoke-test.yml`, which performs a real
`npx -y github:Changejarapp/aurum-mcp#${{ github.sha }}` install on a
fresh Ubuntu runner, then pipes a `tools/list` + a `tools/call` JSON-RPC
request and verifies the server returns valid responses. This catches
install-format regressions (subdirectory syntax, `prepare` hook
breakage, missing `bin` field, etc.) before they reach users.

## Release process

A release is a single dispatch:

1. Open `Actions` → `release.yml` → Run workflow.
2. Pick `bump`: `patch`, `minor`, or `major`.
3. CI bumps `package.json`, creates a tag, force-moves
   `latest-stable`, and creates a GitHub Release with auto-generated
   notes.
4. Users on `#latest-stable` pick up the new version on next
   MCP-client restart (after `npx` cache TTL).

There is no `npm publish` step. The repo IS the artefact.

## Code style

- TypeScript strict mode (`tsconfig.json`).
- ESM only (`"type": "module"` in package.json; `.js` import
  extensions in source — TypeScript's `Bundler` resolution mode).
- Prefer simple data flow over abstraction. Tools are pure functions
  of `(manifest, args) → markdown string`.
- Keep markdown formatters in `src/format.ts`; never inline complex
  formatting in tool handlers.
- No business logic inside markdown templates. If a tool's response
  has logic, that logic lives in the handler with named helpers.

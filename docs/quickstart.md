# Quickstart

A 60-second flow to get `aurum-mcp` running in any of the five
supported clients. After install, restart the client and try one of
the prompts from [`cookbook.md`](cookbook.md).

The default install snippet uses the `#latest-stable` floating Git
tag — you'll auto-receive new tools and bug fixes on the next `npx`
cache miss without re-pasting anything. For pinned installs (audited
setups, scripts), see [Pinning](#pinning) at the end.

---

## Claude Code

**Where:** `.mcp.json` at the root of the project you're working on,
or your home-level `~/.claude.json` for global availability.

**What:**
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

**Verify:** `/mcp` inside Claude Code lists `aurum` with 12 tools.

---

## Cursor

**Where:** `~/.cursor/mcp.json`.

**What:** same snippet as above.

**Verify:** Cursor → Settings → MCP → `aurum` shows green and lists
the tools.

---

## Copilot CLI (`gh copilot`)

**Where:** `~/.copilot/mcp.json`.

**What:** same snippet.

**Verify:** `gh copilot mcp list` shows `aurum` connected.

---

## Gemini CLI

**Where:** `~/.gemini/settings.json`. Put the `mcpServers` block at
the top level alongside any other Gemini settings:

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

**Verify:** inside the `gemini` CLI, `/mcp` lists `aurum`.

---

## Claude Desktop

**Where:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**What:** same `mcpServers` snippet, then **fully quit and reopen
Claude Desktop** (a window-close isn't enough — use the menu bar
"Quit").

**Verify:** the MCP slider in the message composer toggles `aurum` on,
and you see the 12 tools in the picker.

---

## First prompts

After verifying, try one of these to confirm the wiring end-to-end:

> What version of Aurum am I on?

(Calls `aurum_get_aurum_version`. If you see the version + manifest
SHA + generation timestamp, you're done.)

> List every Aurum component grouped by family.

(Calls `aurum_list_components`. ≥24 components grouped by family.)

> What's the hex of `surface.bgPageBase`?

(Calls `aurum_get_token_value`. Returns hex + alpha + Compose
accessor.)

For more, see [`cookbook.md`](cookbook.md).

---

## Pinning

Replace `#latest-stable` with a tag for reproducibility:

```jsonc
"args": ["-y", "github:Changejarapp/aurum-mcp#v0.2.0"]
```

`aurum-mcp@0.2.0` ships the manifest from `aurum@0.1.5` (or whichever
matched-version snapshot was bundled). The version footer on every
content tool's response prints the exact pair — never guess.

---

## Troubleshooting

If a client shows `aurum` as failed, see
[`troubleshooting.md`](troubleshooting.md). The most common causes:

1. **Stale `npx` cache.** Run `npx clear-npx-cache` (or
   `rm -rf ~/.npm/_npx`) and restart the client.
2. **Node version too old.** `aurum-mcp` needs Node ≥ 18.18 — check
   with `node --version`.
3. **Stuck on a previous version.** If you previously installed via
   a pinned tag and want to switch back to `#latest-stable`, restart
   the client after editing the config.

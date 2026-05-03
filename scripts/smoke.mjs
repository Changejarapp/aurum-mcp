#!/usr/bin/env node
/**
 * Smoke-test: spawn `dist/server.js`, do a real MCP handshake (initialize +
 * initialized + tools/list + tools/call), and verify each tool returns a
 * non-empty text response. Exits non-zero on the first failure.
 *
 * Run after `pnpm build`. Used by CI's smoke-test.yml.
 */

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const SERVER_CMD = process.argv[2] || "dist/server.js";

let nextId = 1;
function send(child, method, params) {
  const id = nextId++;
  const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
  child.stdin.write(msg);
  return id;
}

function notify(child, method, params) {
  const msg = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
  child.stdin.write(msg);
}

async function main() {
  const child = spawn("node", [SERVER_CMD], { stdio: ["pipe", "pipe", "inherit"] });

  const responses = new Map();
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const m = JSON.parse(line);
        if (m.id != null) responses.set(m.id, m);
      } catch { /* ignore non-JSON lines */ }
    }
  });

  async function call(method, params, timeoutMs = 5000) {
    const id = send(child, method, params);
    const start = Date.now();
    while (!responses.has(id)) {
      if (Date.now() - start > timeoutMs) throw new Error(`Timeout waiting for ${method}`);
      await delay(50);
    }
    const r = responses.get(id);
    if (r.error) throw new Error(`${method} error: ${JSON.stringify(r.error)}`);
    return r.result;
  }

  try {
    // Handshake — confirm `instructions` is exposed on initialize.
    const initResult = await call("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "aurum-mcp-smoke", version: "0.2.0" },
    });
    if (!initResult.instructions || initResult.instructions.length < 50) {
      throw new Error(`initialize.instructions missing or too short (${initResult.instructions?.length ?? 0} chars)`);
    }
    console.log(`✓ initialize: instructions ${initResult.instructions.length} chars`);
    notify(child, "notifications/initialized", {});

    // tools/list — confirm count + annotations + outputSchema presence.
    const tools = await call("tools/list", {});
    if (!tools.tools || tools.tools.length === 0) {
      throw new Error("tools/list returned no tools");
    }
    console.log(`✓ tools/list: ${tools.tools.length} tools`);
    let withAnnotations = 0;
    let withOutputSchema = 0;
    for (const t of tools.tools) {
      if (!t.name.startsWith("aurum_")) {
        throw new Error(`tool ${t.name} is not aurum_* prefixed`);
      }
      if (t.annotations) withAnnotations++;
      if (t.outputSchema) withOutputSchema++;
      console.log(`  - ${t.name}${t.annotations ? " [annotations]" : ""}${t.outputSchema ? " [outputSchema]" : ""}`);
    }
    if (withAnnotations !== tools.tools.length) {
      throw new Error(`expected all ${tools.tools.length} tools to have annotations, got ${withAnnotations}`);
    }
    if (withOutputSchema < 9) {
      throw new Error(`expected ≥9 tools with outputSchema, got ${withOutputSchema}`);
    }
    console.log(`✓ ${withAnnotations}/${tools.tools.length} annotated · ${withOutputSchema}/${tools.tools.length} with outputSchema`);

    // tools/call: hit each tool with a minimal valid input
    const calls = [
      { name: "aurum_list_components", args: {} },
      { name: "aurum_get_component", args: { name: "AurumChip" } },
      { name: "aurum_list_tokens", args: { category: "color" } },
      { name: "aurum_get_token_value", args: { name: "surface.bgPageBase" } },
      { name: "aurum_find_components_by_token", args: { token: "bgPageBase" } },
      { name: "aurum_search_icons", args: { query: "arrow" } },
      { name: "aurum_get_icon", args: { name: "ChevronRight" } },
      { name: "aurum_get_changelog", args: { version: "Unreleased" } },
      { name: "aurum_lookup_figma_node", args: { nodeIdOrUrl: "5126:2507" } },
      { name: "aurum_get_code_connect_snippet", args: { component: "AurumChip" } },
      { name: "aurum_search", args: { query: "negative feedback" } },
      { name: "aurum_get_aurum_version", args: {} },
    ];
    for (const { name, args } of calls) {
      const result = await call("tools/call", { name, arguments: args });
      const text = result?.content?.[0]?.text;
      if (!text || text.length === 0) {
        throw new Error(`${name} returned empty text`);
      }
      const isError = result.isError ? " (isError)" : "";
      const struct = result.structuredContent ? " [structuredContent]" : "";
      console.log(`✓ tools/call ${name}: ${text.length} chars${struct}${isError}`);
    }

    console.log("\nALL TOOLS GREEN");
  } finally {
    child.kill();
  }
}

main().catch((err) => {
  console.error("✗ smoke test failed:", err.message);
  process.exit(1);
});

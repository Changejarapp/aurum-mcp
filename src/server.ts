#!/usr/bin/env node
/**
 * aurum-mcp — Model Context Protocol server for the Aurum Design System.
 *
 * Exposes the Aurum component catalog, design tokens, icon set, Figma node
 * mappings, and changelog as a small set of LLM-friendly tools. The data
 * source is a bundled manifest (`data/manifest.json`) generated upstream by
 * `tooling/gallery/generate.py --emit-manifest` in `Changejarapp/aurum-android`,
 * fetched into this package by CI on every release.
 *
 * Distribution: public repo + `npx`-from-Git (no npm registry). Users install
 * with a single `mcp.json` snippet — see README.md.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadManifest } from "./manifest.js";
import { tools, dispatchTool } from "./tools/index.js";

async function main(): Promise<void> {
  const manifest = await loadManifest();

  const server = new Server(
    {
      name: "aurum-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return dispatchTool(manifest, request.params.name, request.params.arguments ?? {});
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Logged to stderr so MCP clients (which read stdout for JSON-RPC) don't
  // see this. The line is the canonical "ready" signal for ad-hoc smoke tests.
  process.stderr.write(
    `aurum-mcp ready · aurum ${manifest.aurum.version} · ${manifest.components.length} components, ${manifest.icons.length} icons\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`aurum-mcp fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

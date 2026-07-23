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

import { createRequire } from "node:module";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadManifest } from "./manifest.js";
import { tools, dispatchTool } from "./tools/index.js";
import { AURUM_PLAYBOOK } from "./playbook.js";
import { describeSessionPlatform } from "./platform.js";

// The real package version — serverInfo must never lag behind releases
// (a hardcoded "0.2.0" shipped in initialize responses for four releases).
const PKG_VERSION: string =
  createRequire(import.meta.url)("../package.json").version ?? "0.0.0";

async function main(): Promise<void> {
  const manifest = await loadManifest();

  const server = new Server(
    {
      name: "aurum-mcp",
      version: PKG_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: AURUM_PLAYBOOK,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema, outputSchema, annotations }) => {
      const descriptor: Record<string, unknown> = { name, description, inputSchema };
      if (outputSchema) descriptor.outputSchema = outputSchema;
      if (annotations) descriptor.annotations = annotations;
      return descriptor;
    }),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return dispatchTool(manifest, request.params.name, request.params.arguments ?? {});
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Logged to stderr so MCP clients (which read stdout for JSON-RPC) don't
  // see this. The line is the canonical "ready" signal for ad-hoc smoke tests.
  process.stderr.write(
    `aurum-mcp ${PKG_VERSION} ready · aurum ${manifest.aurum.version} · ` +
      `${manifest.components.length} components, ${manifest.icons.length} icons · ` +
      `platform lens: ${describeSessionPlatform()}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`aurum-mcp fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

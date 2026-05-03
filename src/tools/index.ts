/**
 * Tool registry + dispatch. Each tool is a small module exporting its
 * MCP descriptor (name, description, inputSchema) and a handler. This
 * file wires them all together for the server.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { Manifest } from "../types.js";

/** Alias the SDK's tool-result type so all handlers share a single contract.
 *  The SDK's type is broader (image / resource content, streaming progress,
 *  etc.); we only ever emit text + isError, but typing the alias as the full
 *  union lets `setRequestHandler` accept it without a cast. */
export type ToolResult = CallToolResult;

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: object;
  handler: (manifest: Manifest, args: Record<string, unknown>) => Promise<ToolResult>;
}

// Tool implementations are imported below; this list is the single
// place that determines what `tools/list` returns.
import { listComponentsTool } from "./list-components.js";
import { getComponentTool } from "./get-component.js";
import { listTokensTool } from "./list-tokens.js";
import { searchIconsTool } from "./search-icons.js";
import { getIconTool } from "./get-icon.js";
import { getChangelogTool } from "./get-changelog.js";
import { lookupFigmaNodeTool } from "./lookup-figma-node.js";
import { searchTool } from "./search.js";
import { getAurumVersionTool } from "./get-aurum-version.js";

export const tools: ToolDef[] = [
  listComponentsTool,
  getComponentTool,
  listTokensTool,
  searchIconsTool,
  getIconTool,
  getChangelogTool,
  lookupFigmaNodeTool,
  searchTool,
  getAurumVersionTool,
];

const byName = new Map(tools.map((t) => [t.name, t]));

export async function dispatchTool(
  manifest: Manifest,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const tool = byName.get(name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    return await tool.handler(manifest, args);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Tool '${name}' failed: ${message}` }],
      isError: true,
    };
  }
}

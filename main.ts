/**
 * Entry point for the Excalidraw MCP server (stdio transport only).
 * Run with: node dist/index.js
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { closeBrowser } from "./renderer.js";

async function main() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

async function shutdown() {
  await closeBrowser();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

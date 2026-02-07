import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
/**
 * Registers all Excalidraw tools on the given McpServer.
 */
export declare function registerTools(server: McpServer): void;
/**
 * Creates a new MCP server instance with Excalidraw drawing tools.
 */
export declare function createServer(): McpServer;

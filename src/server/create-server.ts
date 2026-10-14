import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DEFAULT_SERVER_INFO } from "./capabilities.js";
import { registerMcpResources } from "../mcp/register-resources.js";
import { registerMcpPrompts } from "../mcp/register-prompts.js";
import { registerMcpTools } from "../mcp/register-tools.js";
import type { IToolRegistry } from "../tools/registry.js";

export interface ServerFactoryOptions {
  registry?: IToolRegistry;
}

export function buildMcpServer(options: ServerFactoryOptions = {}): McpServer {
  const server = new McpServer({
    name: DEFAULT_SERVER_INFO.name,
    version: DEFAULT_SERVER_INFO.version,
  });

  registerMcpResources(server);
  registerMcpPrompts(server);

  if (options.registry) {
    registerMcpTools(server, options.registry);
  }

  return server;
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfig } from "../config/env.js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export function registerMcpResources(server: McpServer): void {
  // Resource 1: Architecture documentation
  server.resource(
    "architecture-spec",
    "project://architecture",
    { mimeType: "text/markdown", description: "Architecture specification for the Alexa + MCP Assistant." },
    async (uri) => {
      const config = getConfig();
      const archPath = path.join(config.WORKSPACE_ROOT, "docs", "ARCHITECTURE.md");
      let content = "Architecture documentation is currently being compiled.";
      if (existsSync(archPath)) {
        content = readFileSync(archPath, "utf-8");
      }
      return {
        contents: [
          {
            uri: uri.href,
            text: content,
          },
        ],
      };
    }
  );

  // Resource 2: Live system diagnostic snapshot
  server.resource(
    "system-snapshot",
    "project://system-status",
    { mimeType: "application/json", description: "Live operational snapshot and runtime telemetry." },
    async (uri) => {
      const config = getConfig();
      const snapshot = {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
        environment: config.NODE_ENV,
        configuredModel: config.OLLAMA_MODEL,
        serverPort: config.PORT,
        timestamp: new Date().toISOString(),
      };
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(snapshot, null, 2),
          },
        ],
      };
    }
  );
}

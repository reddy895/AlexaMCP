import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { configureMcpRoutes } from "../../src/server/routes.js";
import { buildMcpServer } from "../../src/server/create-server.js";
import { z } from "zod";
import type { IToolRegistry, ToolDefinition } from "../../src/tools/registry.js";

class SimpleToolRegistry implements IToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }
  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
  async execute(name: string, args: Record<string, unknown>, context: any): Promise<unknown> {
    const t = this.get(name);
    if (!t) throw new Error(`Tool ${name} not found`);
    return t.execute(args, context);
  }
}

describe("MCP Protocol Integration Tests", () => {
  let server: Server;
  let port: number;
  let client: Client;
  let transport: StreamableHTTPClientTransport;

  beforeAll(async () => {
    const registry = new SimpleToolRegistry();
    registry.register({
      name: "echo_tool",
      description: "Echoes input back to client",
      parameters: z.object({ message: z.string() }) as any,
      execute: async (args: any) => ({ echoed: args.message }),
    });

    const app = express();
    app.use(configureMcpRoutes({ serverFactory: () => buildMcpServer({ registry }) }));

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });

    const mcpUrl = new URL(`http://127.0.0.1:${port}/mcp`);
    transport = new StreamableHTTPClientTransport(mcpUrl);
    client = new Client({ name: "mcp-test-client", version: "1.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    try {
      await client.close();
      await transport.close();
    } catch {}
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("completes MCP handshake and tool discovery", async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(1);
    const echoTool = tools.find((t) => t.name === "echo_tool");
    expect(echoTool).toBeDefined();
    expect(echoTool?.description).toBe("Echoes input back to client");
  });

  it("invokes registered tool and returns structured output", async () => {
    const res = await client.callTool({
      name: "echo_tool",
      arguments: { message: "Hello MCP" },
    });

    const contentList = (res as any).content;
    expect(contentList).toBeDefined();
    expect(contentList).toHaveLength(1);
    const textContent = contentList[0].text;
    const parsed = JSON.parse(textContent);
    expect(parsed.echoed).toBe("Hello MCP");
  });

  it("returns 405 Method Not Allowed on GET /mcp", async () => {
    const resp = await fetch(`http://127.0.0.1:${port}/mcp`, { method: "GET" });
    expect(resp.status).toBe(405);
    const json = await resp.json();
    expect(json.error).toBe("method_not_allowed");
  });

  it("returns 200 on GET /healthz", async () => {
    const resp = await fetch(`http://127.0.0.1:${port}/healthz`);
    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(json.ok).toBe(true);
    expect(json.server).toBe("alexa-mcp-assistant");
  });
});

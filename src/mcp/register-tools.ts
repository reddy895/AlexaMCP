import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IToolRegistry } from "../tools/registry.js";
import { createExecutionContext } from "../core/execution-context.js";
import { logger } from "../observability/logger.js";

export function registerMcpTools(server: McpServer, registry: IToolRegistry): void {
  const tools = registry.list();

  for (const tool of tools) {
    const rawParams = (tool.parameters as any) ?? {};
    const paramShape: Record<string, z.ZodTypeAny> =
      rawParams instanceof z.ZodObject ? rawParams.shape : rawParams;

    server.tool(
      tool.name,
      tool.description,
      paramShape,
      async (args: any) => {
        const context = createExecutionContext({
          query: `MCP tool execution: ${tool.name}`,
          timeoutMs: 30000,
        });

        try {
          logger.info(`MCP tool invoked: ${tool.name}`, { args });
          const output = await tool.execute(args, context);
          const serialized =
            typeof output === "string" ? output : JSON.stringify(output, null, 2);

          return {
            content: [
              {
                type: "text" as const,
                text: serialized,
              },
            ],
          };
        } catch (err: unknown) {
          logger.error(`MCP tool failed: ${tool.name}`, {
            error: err instanceof Error ? err.message : String(err),
          });
          const errorMsg = err instanceof Error ? err.message : String(err);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: errorMsg }, null, 2),
              },
            ],
            isError: true,
          };
        } finally {
          context.cleanup();
        }
      }
    );
  }
}

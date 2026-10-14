import type { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../observability/logger.js";

export interface StreamableTransportHandlerOptions {
  serverFactory: () => McpServer;
}

export function createStreamableTransportHandler(
  serverFactory: () => McpServer
): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    // Normalize accept header for Streamable HTTP compatibility with curl and diverse MCP clients
    if (
      !req.headers.accept ||
      req.headers.accept.includes("*/*") ||
      !req.headers.accept.includes("text/event-stream")
    ) {
      req.headers.accept = "application/json, text/event-stream";
    }

    const server = serverFactory();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      try {
        transport.close();
        server.close();
      } catch (err: unknown) {
        logger.debug("Error during transport close on response end", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err: unknown) {
      logger.error("Error handling Streamable HTTP request", {
        error: err instanceof Error ? err.message : String(err),
      });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error handling MCP transport request.",
          },
          id: null,
        });
      }
    }
  };
}

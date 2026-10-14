import { Router, json, type Request, type Response, type NextFunction } from "express";
import { createStreamableTransportHandler } from "./transport.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DEFAULT_SERVER_INFO } from "./capabilities.js";
import type { AssistantService } from "../core/assistant.js";

export interface RouteOptions {
  serverFactory: () => McpServer;
  assistantService?: AssistantService;
  authMiddleware?: (req: Request, res: Response, next: NextFunction) => void;
}

export function configureMcpRoutes(options: RouteOptions): Router {
  const router = Router();
  router.use(json({ limit: "2mb" }));

  // CORS security headers
  router.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    next();
  });

  // Health endpoint
  router.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({
      ok: true,
      server: DEFAULT_SERVER_INFO.name,
      version: DEFAULT_SERVER_INFO.version,
      timestamp: new Date().toISOString(),
    });
  });

  // Direct programmatic assistant access (no MCP protocol framing required)
  if (options.assistantService) {
    const assistant = options.assistantService;
    router.post("/api/assistant", async (req: Request, res: Response) => {
      try {
        const { query, scope, userId, confirmationToken, timeoutMs } = req.body ?? {};
        if (!query || typeof query !== "string") {
          res.status(400).json({ error: "Query parameter is required and must be a string." });
          return;
        }

        const result = await assistant.process({
          query,
          scope,
          userId,
          confirmationToken,
          timeoutMs,
        });

        res.status(result.status === "failure" ? 500 : 200).json(result);
      } catch (err: unknown) {
        res.status(500).json({
          status: "failure",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  const streamableHandler = createStreamableTransportHandler(options.serverFactory);

  // POST /mcp endpoint
  if (options.authMiddleware) {
    router.post("/mcp", options.authMiddleware, streamableHandler);
  } else {
    router.post("/mcp", streamableHandler);
  }

  // 405 Method Not Allowed for disallowed methods on /mcp
  router.all("/mcp", (req: Request, res: Response) => {
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    res.status(405).json({
      error: "method_not_allowed",
      message: `Method ${req.method} is not supported for MCP Streamable HTTP. Use POST.`,
    });
  });

  return router;
}

import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import type { ILanguageModelProvider } from "../../providers/llm-provider.js";
import { getConfig } from "../../config/env.js";
import { existsSync } from "node:fs";

export const SystemStatusInputSchema = z.object({
  includeDiagnostics: z.boolean().optional().default(true).describe("Include latency and memory metrics."),
});

export interface SystemStatusDeps {
  provider: ILanguageModelProvider;
  toolCount: () => number;
}

export function createSystemStatusTool(deps: SystemStatusDeps): ToolDefinition {
  return {
    name: "get_system_status",
    description:
      "Report the actual health of the model provider, storage database, retrieval engine, and runtime diagnostics.",
    parameters: SystemStatusInputSchema,
    effectClass: "read_only",
    requiresConfirmation: false,
    execute: async (_args: z.infer<typeof SystemStatusInputSchema>) => {
      const config = getConfig();

      // 1. Real provider health check
      const providerHealth = await deps.provider.healthCheck();

      // 2. Storage check
      const dbExists = existsSync(config.DATABASE_PATH);
      const storageHealth = {
        configuredPath: config.DATABASE_PATH,
        isDatabasePresent: dbExists,
        status: dbExists ? "ready" : "pending_initialization",
      };

      // 3. Overall status calculation
      let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
      if (!providerHealth.isHealthy) {
        overallStatus = "degraded";
      }

      return {
        overallStatus,
        serverTime: new Date().toISOString(),
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        registeredToolsCount: deps.toolCount(),
        subsystems: {
          llmProvider: providerHealth,
          storage: storageHealth,
        },
        memory: {
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
          rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        },
      };
    },
  };
}

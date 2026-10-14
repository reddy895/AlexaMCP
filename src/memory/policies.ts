import type { IMemoryService } from "./memory-service.js";
import { logger } from "../observability/logger.js";

export const RETENTION_DURATIONS = {
  SESSION: 60 * 60 * 1000, // 1 hour
  PROJECT: 30 * 24 * 60 * 60 * 1000, // 30 days
  EXTENDED: 90 * 24 * 60 * 60 * 1000, // 90 days
} as const;

export type RetentionTier = keyof typeof RETENTION_DURATIONS | "PERMANENT";

export function calculateExpirationDate(tier: RetentionTier): string | undefined {
  if (tier === "PERMANENT") {
    return undefined;
  }
  const duration = RETENTION_DURATIONS[tier];
  return new Date(Date.now() + duration).toISOString();
}

export async function runRetentionCleanup(memoryService: IMemoryService): Promise<number> {
  try {
    const deletedCount = await memoryService.cleanupExpired();
    if (deletedCount > 0) {
      logger.info(`Retention cleanup: pruned ${deletedCount} expired memories`);
    }
    return deletedCount;
  } catch (err: unknown) {
    logger.error("Error running memory retention cleanup", {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

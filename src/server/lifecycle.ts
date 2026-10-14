import type { Server } from "node:http";
import { logger } from "../observability/logger.js";

export interface DisposableResource {
  close(): void | Promise<void>;
  name?: string;
}

export class ServerLifecycleManager {
  private readonly resources: DisposableResource[] = [];
  private isShuttingDown = false;

  public register(resource: DisposableResource): void {
    this.resources.push(resource);
  }

  public attachProcessHandlers(httpServer?: Server): void {
    if (httpServer) {
      this.register({
        name: "HTTP Server",
        close: () =>
          new Promise<void>((resolve, reject) => {
            httpServer.close((err) => (err ? reject(err) : resolve()));
          }),
      });
    }

    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);

      const timeout = setTimeout(() => {
        logger.error("Graceful shutdown timed out. Forcing process exit.");
        process.exit(1);
      }, 5000);

      try {
        for (const res of this.resources) {
          try {
            await res.close();
            logger.info(`Closed resource: ${res.name ?? "unnamed"}`);
          } catch (err: unknown) {
            logger.error(`Error closing resource ${res.name ?? "unnamed"}`, {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
        clearTimeout(timeout);
        logger.info("Graceful shutdown complete.");
        process.exit(0);
      } catch (err: unknown) {
        clearTimeout(timeout);
        logger.error("Error during graceful shutdown", {
          error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}

export const serverLifecycle = new ServerLifecycleManager();

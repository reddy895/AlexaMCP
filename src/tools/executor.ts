import { z } from "zod";
import type { ToolDefinition } from "./registry.js";
import type { ExecutionContext } from "../core/types.js";
import {
  ToolExecutionError,
  InvalidInputError,
  ConfirmationRequiredError,
  PermissionDeniedError,
} from "../core/errors.js";
import { assertActionConfirmed } from "../security/confirmation.js";
import { logger } from "../observability/logger.js";

export interface ToolExecutorOptions {
  defaultTimeoutMs?: number;
}

export class ToolExecutor {
  private readonly defaultTimeoutMs: number;

  constructor(options: ToolExecutorOptions = {}) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 15000;
  }

  public async executeTool(
    tool: ToolDefinition,
    rawArgs: unknown,
    context: ExecutionContext
  ): Promise<unknown> {
    context.checkDeadline?.();

    // 1. Validate arguments using tool's schema
    let validatedArgs: any = rawArgs;
    const schema = tool.parameters;

    if (schema instanceof z.ZodType) {
      const parsed = schema.safeParse(rawArgs);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
        throw new InvalidInputError(`Validation failed for tool "${tool.name}": ${issues}`);
      }
      validatedArgs = parsed.data;
    } else if (schema && typeof schema === "object") {
      const objectSchema = z.object(schema as Record<string, z.ZodTypeAny>);
      const parsed = objectSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
        throw new InvalidInputError(`Validation failed for tool "${tool.name}": ${issues}`);
      }
      validatedArgs = parsed.data;
    }

    // 2. Check authorization & confirmation if mutating/consequential
    if (tool.requiresConfirmation) {
      assertActionConfirmed(
        {
          actionId: tool.name,
          description: tool.description,
          resource: String((validatedArgs as any)?.key ?? (validatedArgs as any)?.resource ?? tool.name),
          payload: validatedArgs,
          requiresConfirmation: true,
        },
        context
      );
    }

    // 3. Bounded execution with timeout
    const timeout = Math.min(
      this.defaultTimeoutMs,
      Math.max(1000, context.deadlineMs - Date.now())
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      logger.debug(`Executing tool "${tool.name}"`, { args: validatedArgs });
      const result = await Promise.race([
        tool.execute(validatedArgs, context),
        new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new ToolExecutionError(`Tool "${tool.name}" execution timed out after ${timeout}ms.`));
          });
        }),
      ]);

      return result;
    } catch (err: unknown) {
      if (
        err instanceof InvalidInputError ||
        err instanceof ConfirmationRequiredError ||
        err instanceof PermissionDeniedError
      ) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new ToolExecutionError(`Tool "${tool.name}" execution failed: ${msg}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

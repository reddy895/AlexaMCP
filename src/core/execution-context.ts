import { randomUUID } from "node:crypto";
import { InvalidInputError, RequestCancelledError, ProviderTimeoutError } from "./errors.js";
import type { AssistantRequest, ExecutionContext } from "./types.js";
import { getConfig } from "../config/env.js";

export interface ManagedExecutionContext extends ExecutionContext {
  cleanup(): void;
  checkDeadline(): void;
  elapsedMs(): number;
}

export function createExecutionContext(request: AssistantRequest): ManagedExecutionContext {
  const normalizedQuery = request.query?.trim();
  if (!normalizedQuery) {
    throw new InvalidInputError("Request query cannot be empty or whitespace.");
  }

  if (normalizedQuery.length > 100_000) {
    throw new InvalidInputError("Request query exceeds maximum allowed length of 100,000 characters.");
  }

  const config = getConfig();
  const requestId = request.requestId || `req_${randomUUID()}`;
  const timeoutMs = request.timeoutMs ?? config.OLLAMA_TIMEOUT_MS;
  const deadlineMs = Date.now() + timeoutMs;
  const startTime = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new ProviderTimeoutError(`Execution deadline of ${timeoutMs}ms exceeded.`));
  }, timeoutMs);

  const confirmedActions = new Set<string>();
  if (request.confirmationToken) {
    confirmedActions.add(request.confirmationToken);
  }

  return {
    requestId,
    userId: request.userId,
    scope: request.scope ?? "default",
    deadlineMs,
    abortSignal: controller.signal,
    confirmationToken: request.confirmationToken,
    isConfirmed(actionId: string): boolean {
      return confirmedActions.has(actionId);
    },
    checkDeadline(): void {
      if (controller.signal.aborted) {
        throw new RequestCancelledError("Request was cancelled or timed out.");
      }
      if (Date.now() > deadlineMs) {
        throw new ProviderTimeoutError("Execution deadline exceeded.");
      }
    },
    elapsedMs(): number {
      return Date.now() - startTime;
    },
    cleanup(): void {
      clearTimeout(timer);
    },
  };
}

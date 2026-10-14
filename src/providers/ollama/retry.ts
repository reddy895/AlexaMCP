import { AssistantError } from "../../core/errors.js";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
}

export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const maxDelayMs = options.maxDelayMs ?? 1500;

  let attempt = 0;
  while (true) {
    if (options.signal?.aborted) {
      throw new Error("Operation aborted before retry.");
    }

    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const isRetryable =
        (err instanceof AssistantError && err.isRetryable) ||
        (err instanceof Error &&
          (err.message.includes("fetch failed") ||
            err.message.includes("ECONNRESET") ||
            err.message.includes("ETIMEDOUT")));

      if (!isRetryable || attempt > maxRetries) {
        throw err;
      }

      // Exponential backoff with jitter
      const exponential = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 50;
      const delay = Math.min(exponential + jitter, maxDelayMs);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

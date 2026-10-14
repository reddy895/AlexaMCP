import { z } from "zod";
import {
  ProviderUnavailableError,
  ProviderTimeoutError,
  InternalError,
} from "../../core/errors.js";

export const OllamaMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
  tool_calls: z
    .array(
      z.object({
        function: z.object({
          name: z.string(),
          arguments: z.union([z.record(z.unknown()), z.string()]),
        }),
      })
    )
    .optional(),
});

export const OllamaChatResponseSchema = z.object({
  model: z.string(),
  message: OllamaMessageSchema,
  done: z.boolean().optional(),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
});

export const OllamaTagsResponseSchema = z.object({
  models: z.array(
    z.object({
      name: z.string().optional(),
      model: z.string().optional(),
      modified_at: z.string().optional(),
      size: z.number().optional(),
    })
  ),
});

export interface OllamaClientOptions {
  baseUrl: string;
  defaultTimeoutMs?: number;
}

export class OllamaHttpClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;

  constructor(options: OllamaClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30000;
  }

  public async fetchTags(signal?: AbortSignal): Promise<z.infer<typeof OllamaTagsResponseSchema>> {
    const url = `${this.baseUrl}/api/tags`;
    const response = await this.executeFetch(url, { method: "GET", signal });
    const json = await response.json();
    const parsed = OllamaTagsResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new InternalError("Malformed response received from Ollama /api/tags.");
    }
    return parsed.data;
  }

  public async chat(
    payload: Record<string, unknown>,
    signal?: AbortSignal,
    timeoutMs?: number
  ): Promise<z.infer<typeof OllamaChatResponseSchema>> {
    const url = `${this.baseUrl}/api/chat`;
    const response = await this.executeFetch(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      },
      timeoutMs
    );

    const json = await response.json();
    const parsed = OllamaChatResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new InternalError("Malformed response received from Ollama /api/chat.");
    }
    return parsed.data;
  }

  private async executeFetch(
    url: string,
    init: RequestInit,
    timeoutMs?: number
  ): Promise<Response> {
    const timeout = timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeout);

    const abortHandler = () => controller.abort();
    if (init.signal) {
      init.signal.addEventListener("abort", abortHandler);
    }

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderUnavailableError(
          `Ollama service responded with HTTP status ${response.status}: ${errorText}`
        );
      }

      return response;
    } catch (err: unknown) {
      if (err instanceof ProviderUnavailableError) {
        throw err;
      }
      if (controller.signal.aborted) {
        throw new ProviderTimeoutError(`Ollama request to ${url} timed out after ${timeout}ms.`);
      }
      if (err instanceof Error && (err.name === "TypeError" || err.message.includes("fetch failed"))) {
        throw new ProviderUnavailableError(
          `Cannot reach Ollama at ${this.baseUrl}. Ensure Ollama is running ('ollama serve').`
        );
      }
      throw new InternalError(`Ollama request error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timeoutTimer);
      if (init.signal) {
        init.signal.removeEventListener("abort", abortHandler);
      }
    }
  }
}

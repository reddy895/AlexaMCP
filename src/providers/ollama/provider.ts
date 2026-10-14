import type {
  ILanguageModelProvider,
  ChatMessage,
  ModelGenerationOptions,
  ModelResponse,
  ModelCapabilities,
  ProviderHealthResult,
  ToolSchemaDefinition,
} from "../llm-provider.js";
import { OllamaHttpClient } from "./client.js";
import { checkOllamaHealth } from "./health.js";
import { detectModelCapabilities } from "./capabilities.js";
import { formatToolsForOllama, parseOllamaToolCalls } from "./tools-adapter.js";
import { withTransientRetry } from "./retry.js";
import { getConfig } from "../../config/env.js";

export interface OllamaProviderOptions {
  baseUrl?: string;
  modelName?: string;
  timeoutMs?: number;
}

export class OllamaLanguageModelProvider implements ILanguageModelProvider {
  public readonly providerName = "ollama";
  public readonly modelName: string;
  private readonly client: OllamaHttpClient;
  private readonly timeoutMs: number;

  constructor(options: OllamaProviderOptions = {}) {
    const config = getConfig();
    const baseUrl = options.baseUrl ?? config.OLLAMA_URL;
    this.modelName = options.modelName ?? config.OLLAMA_MODEL;
    this.timeoutMs = options.timeoutMs ?? config.OLLAMA_TIMEOUT_MS;
    this.client = new OllamaHttpClient({ baseUrl, defaultTimeoutMs: this.timeoutMs });
  }

  public async generateText(
    messages: ChatMessage[],
    options: ModelGenerationOptions = {}
  ): Promise<ModelResponse> {
    const config = getConfig();
    const payload = {
      model: this.modelName,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2,
        num_ctx: config.OLLAMA_NUM_CTX,
      },
    };

    const res = await withTransientRetry(
      () => this.client.chat(payload, options.signal, options.timeoutMs ?? this.timeoutMs),
      { signal: options.signal }
    );

    return {
      text: res.message.content,
      model: res.model,
      usage: {
        promptTokens: res.prompt_eval_count ?? 0,
        completionTokens: res.eval_count ?? 0,
      },
    };
  }

  public async chatWithTools(
    messages: ChatMessage[],
    tools: ToolSchemaDefinition[],
    options: ModelGenerationOptions = {}
  ): Promise<ModelResponse> {
    const config = getConfig();
    const formattedTools = formatToolsForOllama(tools);
    const allowedNames = new Set(tools.map((t) => t.name));

    const payload = {
      model: this.modelName,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls?.map((tc) => ({
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })),
      })),
      tools: formattedTools,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2,
        num_ctx: config.OLLAMA_NUM_CTX,
      },
    };

    const res = await withTransientRetry(
      () => this.client.chat(payload, options.signal, options.timeoutMs ?? this.timeoutMs),
      { signal: options.signal }
    );

    const parsedToolCalls = parseOllamaToolCalls(res.message.tool_calls, allowedNames);

    return {
      text: res.message.content,
      model: res.model,
      toolCalls: parsedToolCalls,
      usage: {
        promptTokens: res.prompt_eval_count ?? 0,
        completionTokens: res.eval_count ?? 0,
      },
    };
  }

  public async healthCheck(): Promise<ProviderHealthResult> {
    return checkOllamaHealth(this.client, this.modelName);
  }

  public async getCapabilities(): Promise<ModelCapabilities> {
    return detectModelCapabilities(this.modelName);
  }
}

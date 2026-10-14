import type {
  ILanguageModelProvider,
  ChatMessage,
  ModelGenerationOptions,
  ModelResponse,
  ModelCapabilities,
  ProviderHealthResult,
  ToolSchemaDefinition,
} from "./llm-provider.js";

export interface MockProviderConfig {
  providerName?: string;
  modelName?: string;
  defaultResponse?: string;
  scriptedResponses?: ModelResponse[];
  shouldFail?: boolean;
  failureError?: Error;
}

export class MockLanguageModelProvider implements ILanguageModelProvider {
  public readonly providerName: string;
  public readonly modelName: string;
  private readonly defaultResponse: string;
  private readonly responseQueue: ModelResponse[] = [];
  public readonly callHistory: Array<{ messages: ChatMessage[]; tools?: ToolSchemaDefinition[] }> = [];
  private shouldFail: boolean;
  private failureError?: Error;

  constructor(config: MockProviderConfig = {}) {
    this.providerName = config.providerName ?? "mock-provider";
    this.modelName = config.modelName ?? "mock-model:1b";
    this.defaultResponse = config.defaultResponse ?? "This is a deterministic mock response.";
    this.shouldFail = config.shouldFail ?? false;
    this.failureError = config.failureError;
    if (config.scriptedResponses) {
      this.responseQueue.push(...config.scriptedResponses);
    }
  }

  public enqueueResponse(response: ModelResponse): void {
    this.responseQueue.push(response);
  }

  public setFailure(fail: boolean, error?: Error): void {
    this.shouldFail = fail;
    this.failureError = error;
  }

  public async generateText(
    messages: ChatMessage[],
    _options?: ModelGenerationOptions
  ): Promise<ModelResponse> {
    this.callHistory.push({ messages });

    if (this.shouldFail) {
      throw this.failureError ?? new Error("Mock provider simulated failure.");
    }

    if (this.responseQueue.length > 0) {
      return this.responseQueue.shift()!;
    }

    return {
      text: this.defaultResponse,
      model: this.modelName,
      usage: { promptTokens: 10, completionTokens: 10 },
    };
  }

  public async chatWithTools(
    messages: ChatMessage[],
    tools: ToolSchemaDefinition[],
    _options?: ModelGenerationOptions
  ): Promise<ModelResponse> {
    this.callHistory.push({ messages, tools });

    if (this.shouldFail) {
      throw this.failureError ?? new Error("Mock provider simulated failure.");
    }

    if (this.responseQueue.length > 0) {
      return this.responseQueue.shift()!;
    }

    return {
      text: this.defaultResponse,
      model: this.modelName,
      toolCalls: [],
      usage: { promptTokens: 10, completionTokens: 10 },
    };
  }

  public async healthCheck(): Promise<ProviderHealthResult> {
    if (this.shouldFail) {
      return {
        isHealthy: false,
        providerName: this.providerName,
        model: this.modelName,
        latencyMs: 1,
        error: "Mock provider unavailable.",
      };
    }
    return {
      isHealthy: true,
      providerName: this.providerName,
      model: this.modelName,
      latencyMs: 1,
      availableModels: [this.modelName],
    };
  }

  public async getCapabilities(): Promise<ModelCapabilities> {
    return {
      supportsToolCalling: true,
      contextWindow: 8192,
      supportsSystemPrompt: true,
      isAvailable: !this.shouldFail,
    };
  }
}

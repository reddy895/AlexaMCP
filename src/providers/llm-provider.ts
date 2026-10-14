export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCalls?: ToolCallRequest[];
}

export interface ToolCallRequest {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelGenerationOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ModelResponse {
  text: string;
  model: string;
  toolCalls?: ToolCallRequest[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ModelCapabilities {
  supportsToolCalling: boolean;
  contextWindow: number;
  supportsSystemPrompt: boolean;
  isAvailable: boolean;
}

export interface ProviderHealthResult {
  isHealthy: boolean;
  providerName: string;
  model: string;
  latencyMs: number;
  availableModels?: string[];
  error?: string;
}

export interface ToolSchemaDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ILanguageModelProvider {
  readonly providerName: string;
  readonly modelName: string;

  generateText(
    messages: ChatMessage[],
    options?: ModelGenerationOptions
  ): Promise<ModelResponse>;

  chatWithTools(
    messages: ChatMessage[],
    tools: ToolSchemaDefinition[],
    options?: ModelGenerationOptions
  ): Promise<ModelResponse>;

  healthCheck(): Promise<ProviderHealthResult>;

  getCapabilities(): Promise<ModelCapabilities>;
}

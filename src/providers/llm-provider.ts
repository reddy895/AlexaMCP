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

export interface ILanguageModelProvider {
  generateText(
    messages: ChatMessage[],
    options?: ModelGenerationOptions
  ): Promise<ModelResponse>;

  chatWithTools(
    messages: ChatMessage[],
    tools: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>,
    options?: ModelGenerationOptions
  ): Promise<ModelResponse>;

  healthCheck(): Promise<{
    isHealthy: boolean;
    model: string;
    latencyMs: number;
    error?: string;
  }>;
}

import type { OllamaHttpClient } from "./client.js";
import type { ProviderHealthResult } from "../llm-provider.js";

export function isModelAvailableInList(targetModel: string, availableModels: string[]): boolean {
  const target = targetModel.trim().toLowerCase();
  const targetPrefix = target.includes(":") ? target : `${target}:`;

  return availableModels.some((m) => {
    const item = m.toLowerCase();
    return item === target || item.startsWith(targetPrefix);
  });
}

export async function checkOllamaHealth(
  client: OllamaHttpClient,
  modelName: string
): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const tags = await client.fetchTags();
    const availableModels = (tags.models ?? [])
      .map((m) => m.name || m.model || "")
      .filter((name) => name.length > 0);

    const isAvailable = isModelAvailableInList(modelName, availableModels);
    const latencyMs = Date.now() - start;

    if (!isAvailable) {
      return {
        isHealthy: false,
        providerName: "ollama",
        model: modelName,
        latencyMs,
        availableModels,
        error: `Configured model "${modelName}" is not installed in local Ollama. Run: ollama pull ${modelName}`,
      };
    }

    return {
      isHealthy: true,
      providerName: "ollama",
      model: modelName,
      latencyMs,
      availableModels,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isHealthy: false,
      providerName: "ollama",
      model: modelName,
      latencyMs,
      error: `Cannot reach Ollama service: ${msg}. Run 'ollama serve' to start it.`,
    };
  }
}

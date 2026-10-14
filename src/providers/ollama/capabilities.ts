import type { ModelCapabilities } from "../llm-provider.js";
import { getConfig } from "../../config/env.js";

const TOOL_CALLING_MODEL_FAMILIES = [
  "qwen2.5",
  "llama3.1",
  "llama3.2",
  "mistral",
  "mixtral",
  "command-r",
  "hermes",
  "deepseek",
];

export function detectModelCapabilities(modelName: string): ModelCapabilities {
  const normalized = modelName.toLowerCase();
  const config = getConfig();

  const supportsToolCalling = TOOL_CALLING_MODEL_FAMILIES.some((family) =>
    normalized.includes(family)
  );

  let contextWindow = config.OLLAMA_NUM_CTX;
  if (normalized.includes("qwen2.5")) {
    contextWindow = Math.max(contextWindow, 4096);
  } else if (normalized.includes("llama3.1")) {
    contextWindow = Math.max(contextWindow, 8192);
  }

  return {
    supportsToolCalling,
    contextWindow,
    supportsSystemPrompt: true,
    isAvailable: true,
  };
}

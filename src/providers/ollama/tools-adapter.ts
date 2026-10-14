import type { ToolSchemaDefinition, ToolCallRequest } from "../llm-provider.js";

export function formatToolsForOllama(tools: ToolSchemaDefinition[]): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export function parseOllamaToolCalls(
  rawCalls: Array<{
    function?: {
      name?: string;
      arguments?: unknown;
    };
  }> | undefined,
  allowedToolNames?: Set<string>
): ToolCallRequest[] {
  if (!rawCalls || !Array.isArray(rawCalls)) return [];

  const results: ToolCallRequest[] = [];
  for (const c of rawCalls) {
    const name = c.function?.name?.trim();
    if (!name) continue;

    if (allowedToolNames && !allowedToolNames.has(name)) {
      continue;
    }

    let parsedArgs: Record<string, unknown> = {};
    const rawArgs = c.function?.arguments;

    if (typeof rawArgs === "string") {
      try {
        parsedArgs = JSON.parse(rawArgs);
      } catch {
        parsedArgs = { rawInput: rawArgs };
      }
    } else if (rawArgs && typeof rawArgs === "object") {
      parsedArgs = rawArgs as Record<string, unknown>;
    }

    results.push({
      name,
      arguments: parsedArgs,
    });
  }

  return results;
}

import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import type { AssistantService } from "../../core/assistant.js";

export const AskAssistantInputSchema = z.object({
  question: z.string().min(1).describe("The natural-language question to ask the assistant."),
  scope: z.string().optional().describe("Optional scope or workspace boundary."),
});

export function createAskAssistantTool(assistantService: AssistantService): ToolDefinition {
  return {
    name: "ask_assistant",
    description:
      "Accept a natural-language question and return an evidence-grounded answer using direct reasoning, local retrieval, or tools.",
    parameters: AskAssistantInputSchema,
    effectClass: "read_only",
    requiresConfirmation: false,
    execute: async (args: z.infer<typeof AskAssistantInputSchema>, context) => {
      const result = await assistantService.process({
        query: args.question,
        scope: args.scope ?? context.scope,
        userId: context.userId,
        confirmationToken: context.confirmationToken,
      });

      return {
        status: result.status,
        answer: result.answer,
        citations: result.citations,
        executedToolsCount: result.executedTools.length,
        durationMs: result.metadata.durationMs,
      };
    },
  };
}

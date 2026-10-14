import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import type { IMemoryService } from "../../memory/memory-service.js";
import { InvalidInputError } from "../../core/errors.js";

export const ManageMemoryInputSchema = z.object({
  action: z
    .enum(["save", "get", "search", "list", "delete"])
    .describe("Memory operation: save, get, search, list, or delete."),
  key: z.string().optional().describe("Unique identifier key for the memory."),
  content: z.string().optional().describe("Content to persist when action is save."),
  scope: z.string().optional().describe("Scope boundary (default: current workspace scope)."),
  query: z.string().optional().describe("Query term when action is search."),
});

export function createManageMemoryTool(memoryService: IMemoryService): ToolDefinition {
  return {
    name: "manage_memory",
    description:
      "Manage explicitly requested user preferences or project facts in scoped, persistent SQLite memory.",
    parameters: ManageMemoryInputSchema,
    effectClass: "locally_mutating",
    execute: async (args: z.infer<typeof ManageMemoryInputSchema>, context) => {
      const scope = args.scope ?? context.scope ?? "default";
      const userId = context.userId;

      switch (args.action) {
        case "save": {
          if (!args.key || !args.content) {
            throw new InvalidInputError("Both 'key' and 'content' are required for action 'save'.");
          }
          const saved = await memoryService.save(args.key, args.content, scope, userId);
          return {
            action: "save",
            success: true,
            memory: saved,
            summary: `Persisted memory "${args.key}" in scope "${scope}".`,
          };
        }

        case "get": {
          if (!args.key) {
            throw new InvalidInputError("'key' is required for action 'get'.");
          }
          const record = await memoryService.get(args.key, scope, userId);
          return {
            action: "get",
            found: record !== null,
            memory: record,
            summary: record ? `Retrieved memory "${args.key}".` : `Memory "${args.key}" not found.`,
          };
        }

        case "search": {
          if (!args.query) {
            throw new InvalidInputError("'query' is required for action 'search'.");
          }
          const results = await memoryService.search(args.query, scope, userId);
          return {
            action: "search",
            query: args.query,
            count: results.length,
            memories: results,
            summary: `Found ${results.length} memories matching "${args.query}".`,
          };
        }

        case "list": {
          const memories = await memoryService.list(scope, userId);
          return {
            action: "list",
            scope,
            count: memories.length,
            memories,
            summary: `Listed ${memories.length} memories in scope "${scope}".`,
          };
        }

        case "delete": {
          if (!args.key) {
            throw new InvalidInputError("'key' is required for action 'delete'.");
          }
          const deleted = await memoryService.delete(args.key, scope, userId);
          return {
            action: "delete",
            key: args.key,
            deleted,
            summary: deleted ? `Deleted memory "${args.key}".` : `Memory "${args.key}" not found.`,
          };
        }
      }
    },
  };
}

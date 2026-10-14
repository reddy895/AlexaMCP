import type { ExecutionContext } from "../core/types.js";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresConfirmation?: boolean;
  execute(args: Record<string, unknown>, context: ExecutionContext): Promise<unknown>;
}

export interface IToolRegistry {
  register(tool: ToolDefinition): void;
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
  execute(name: string, args: Record<string, unknown>, context: ExecutionContext): Promise<unknown>;
}

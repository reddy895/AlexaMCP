import type { z } from "zod";
import type { ExecutionContext } from "../core/types.js";
import type { ToolEffectClass } from "../security/confirmation.js";
import { InvalidInputError } from "../core/errors.js";

export interface ToolDefinition<TArgs = any, TOutput = any> {
  name: string;
  description: string;
  parameters: z.ZodType<TArgs> | Record<string, z.ZodTypeAny>;
  effectClass?: ToolEffectClass;
  requiresConfirmation?: boolean;
  execute(args: TArgs, context: ExecutionContext): Promise<TOutput>;
}

export interface IToolRegistry {
  register(tool: ToolDefinition): void;
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
  execute(name: string, args: Record<string, unknown>, context: ExecutionContext): Promise<unknown>;
}

export class ToolRegistry implements IToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  public register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public async execute(
    name: string,
    args: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<unknown> {
    const tool = this.get(name);
    if (!tool) {
      throw new InvalidInputError(`Tool "${name}" is not registered.`);
    }

    return tool.execute(args, context);
  }
}

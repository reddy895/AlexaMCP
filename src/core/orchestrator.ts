import type {
  AssistantRequest,
  AssistantResult,
  ExecutedToolCall,
} from "./types.js";
import type { QueryClassification } from "./intent.js";
import type { ManagedExecutionContext } from "./execution-context.js";
import type { ILanguageModelProvider, ChatMessage } from "../providers/llm-provider.js";
import type { IToolRegistry } from "../tools/registry.js";
import type { IMemoryService } from "../memory/memory-service.js";
import type { IRetrievalEngine } from "../retrieval/search.js";
import { CitationBuilder } from "../retrieval/citations.js";
import { logger } from "../observability/logger.js";
import { getConfig } from "../config/env.js";

export interface OrchestrationEngineOptions {
  provider: ILanguageModelProvider;
  toolRegistry: IToolRegistry;
  memoryService?: IMemoryService;
  retrievalEngine?: IRetrievalEngine;
}

export class OrchestrationEngine {
  private readonly provider: ILanguageModelProvider;
  private readonly toolRegistry: IToolRegistry;
  private readonly memoryService?: IMemoryService;
  private readonly retrievalEngine?: IRetrievalEngine;

  constructor(opts: OrchestrationEngineOptions) {
    this.provider = opts.provider;
    this.toolRegistry = opts.toolRegistry;
    this.memoryService = opts.memoryService;
    this.retrievalEngine = opts.retrievalEngine;
  }

  public async execute(
    request: AssistantRequest,
    context: ManagedExecutionContext,
    classification: QueryClassification
  ): Promise<AssistantResult> {
    const config = getConfig();
    const maxSteps = request.maxSteps ?? config.MAX_STEPS;
    const citationBuilder = new CitationBuilder();
    const executedTools: ExecutedToolCall[] = [];
    const seenCalls = new Set<string>();

    // Select candidate tools based on intent
    const candidateToolNames = new Set(classification.recommendedTools);
    const availableTools = this.toolRegistry
      .list()
      .filter((t) => candidateToolNames.size === 0 || candidateToolNames.has(t.name))
      .map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));

    // If retrieval is requested and engine is available, inject retrieval search tool if not already present
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are an evidence-grounded AI assistant.
Your goal is to answer the user request accurately and helpfully.
Use the provided tools when necessary to inspect repositories, analyze errors, search knowledge, or manage preferences.
Never invent tool outputs. If required information is not available, explicitly state what is missing.
Intent for this session: ${classification.intent} (${classification.explanation}).`,
      },
      {
        role: "user",
        content: request.query,
      },
    ];

    let lastModelUsed = config.OLLAMA_MODEL;
    let finalAnswer = "";

    for (let step = 1; step <= maxSteps; step++) {
      context.checkDeadline();

      logger.debug(`Orchestration step ${step}/${maxSteps}`, {
        toolCount: availableTools.length,
      });

      const response = await this.provider.chatWithTools(
        messages,
        availableTools,
        { signal: context.abortSignal }
      );

      lastModelUsed = response.model;

      // Model chose not to call any more tools -> Final Answer
      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalAnswer = response.text;
        break;
      }

      // Record assistant turn
      messages.push({
        role: "assistant",
        content: response.text,
        toolCalls: response.toolCalls,
      });

      // Execute each tool call
      for (const call of response.toolCalls) {
        context.checkDeadline();
        const callKey = `${call.name}::${JSON.stringify(call.arguments)}`;

        // Loop prevention check
        if (seenCalls.has(callKey)) {
          logger.warn(`Duplicate tool call detected, breaking loop: ${call.name}`);
          messages.push({
            role: "tool",
            name: call.name,
            content: JSON.stringify({
              error: "duplicate_call",
              hint: "You already invoked this tool with identical arguments. Provide your final answer based on accumulated evidence.",
            }),
          });
          continue;
        }
        seenCalls.add(callKey);

        const startToolTime = Date.now();
        let toolOutput: unknown;
        let toolStatus: "success" | "error" = "success";

        try {
          toolOutput = await this.toolRegistry.execute(call.name, call.arguments, context);

          // Check if output contains citations or evidence items
          if (toolOutput && typeof toolOutput === "object" && "citations" in toolOutput) {
            const rawCitations = (toolOutput as any).citations;
            if (Array.isArray(rawCitations)) {
              citationBuilder.addBatch(rawCitations);
            }
          }
        } catch (err: unknown) {
          toolStatus = "error";
          toolOutput = { error: err instanceof Error ? err.message : String(err) };
          logger.error(`Tool execution error: ${call.name}`, { error: toolOutput });
        }

        const durationMs = Date.now() - startToolTime;
        const outputSummary = JSON.stringify(toolOutput).slice(0, 300);

        executedTools.push({
          toolName: call.name,
          args: call.arguments,
          status: toolStatus,
          output: toolOutput,
          outputSummary,
          durationMs,
        });

        messages.push({
          role: "tool",
          name: call.name,
          content: typeof toolOutput === "string" ? toolOutput : JSON.stringify(toolOutput),
        });
      }
    }

    // Attach citations to answer if present
    const citations = citationBuilder.getCitations();
    let annotatedAnswer = finalAnswer || "Unable to produce an answer within the execution budget.";
    if (citations.length > 0) {
      annotatedAnswer += citationBuilder.formatMarkdownSources();
    }

    return {
      status: "success",
      answer: annotatedAnswer,
      citations,
      executedTools,
      metadata: {
        durationMs: context.elapsedMs(),
        stepsCount: executedTools.length,
        modelUsed: lastModelUsed,
        intent: classification.intent,
      },
    };
  }
}

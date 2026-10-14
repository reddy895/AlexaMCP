import { createExecutionContext } from "./execution-context.js";
import { classifyQueryIntent } from "./intent.js";
import { toAssistantError, ConfirmationRequiredError } from "./errors.js";
import type {
  AssistantRequest,
  AssistantResult,
  ExecutedToolCall,
} from "./types.js";
import { CitationBuilder } from "../retrieval/citations.js";
import { logger } from "../observability/logger.js";
import type { ILanguageModelProvider } from "../providers/llm-provider.js";
import type { IToolRegistry } from "../tools/registry.js";
import type { IMemoryService } from "../memory/memory-service.js";
import type { IRetrievalEngine } from "../retrieval/search.js";
import { OrchestrationEngine } from "./orchestrator.js";

export interface AssistantDependencies {
  provider: ILanguageModelProvider;
  toolRegistry: IToolRegistry;
  memoryService?: IMemoryService;
  retrievalEngine?: IRetrievalEngine;
}

export class AssistantService {
  private readonly provider: ILanguageModelProvider;
  private readonly toolRegistry: IToolRegistry;
  private readonly memoryService?: IMemoryService;
  private readonly retrievalEngine?: IRetrievalEngine;
  private readonly orchestrator: OrchestrationEngine;

  constructor(deps: AssistantDependencies) {
    this.provider = deps.provider;
    this.toolRegistry = deps.toolRegistry;
    this.memoryService = deps.memoryService;
    this.retrievalEngine = deps.retrievalEngine;
    this.orchestrator = new OrchestrationEngine({
      provider: deps.provider,
      toolRegistry: deps.toolRegistry,
      memoryService: deps.memoryService,
      retrievalEngine: deps.retrievalEngine,
    });
  }

  public async process(request: AssistantRequest): Promise<AssistantResult> {
    const context = createExecutionContext(request);
    const citationBuilder = new CitationBuilder();
    const executedTools: ExecutedToolCall[] = [];

    return logger.runWithContext({ requestId: context.requestId, operation: "process_query" }, async () => {
      try {
        const classification = classifyQueryIntent(request.query);
        logger.info(`Classified intent: ${classification.intent}`, {
          confidence: classification.confidence,
          explanation: classification.explanation,
        });

        // Fast-path: Direct reasoning without tool overhead
        if (classification.intent === "DIRECT_REASONING") {
          context.checkDeadline();
          const response = await this.provider.generateText(
            [
              {
                role: "system",
                content:
                  "You are an intelligent, evidence-grounded AI assistant. Answer the user question clearly, accurately, and concisely. If information is missing or uncertain, state the limitation directly.",
              },
              { role: "user", content: request.query },
            ],
            { signal: context.abortSignal }
          );

          return {
            status: "success",
            answer: response.text,
            citations: [],
            executedTools: [],
            metadata: {
              durationMs: context.elapsedMs(),
              stepsCount: 1,
              modelUsed: response.model,
              intent: classification.intent,
            },
          };
        }

        // Delegated orchestration for retrieval, tools, inspection, memory, and actions
        return await this.orchestrator.execute(request, context, classification);
      } catch (err: unknown) {
        context.cleanup();
        const assistantError = toAssistantError(err);

        if (assistantError instanceof ConfirmationRequiredError) {
          logger.warn(`Confirmation required for query: ${request.query}`);
          return {
            status: "confirmation_required",
            answer: assistantError.message,
            citations: citationBuilder.getCitations(),
            executedTools,
            proposedAction: assistantError.details as any,
            metadata: {
              durationMs: context.elapsedMs(),
              stepsCount: 1,
              intent: "CONSEQUENTIAL_ACTION",
            },
          };
        }

        logger.error(`Assistant execution failed: ${assistantError.message}`, {
          code: assistantError.code,
        });

        return {
          status: "failure",
          answer: `I encountered an error while processing your request: ${assistantError.message}`,
          citations: citationBuilder.getCitations(),
          executedTools,
          metadata: {
            durationMs: context.elapsedMs(),
            stepsCount: 1,
          },
        };
      } finally {
        context.cleanup();
      }
    });
  }
}

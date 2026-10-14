import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AssistantService } from "../../src/core/assistant.js";
import { MockLanguageModelProvider } from "../../src/providers/mock-provider.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import { createSearchKnowledgeTool } from "../../src/tools/definitions/search-knowledge.js";
import { SQLiteDatabase } from "../../src/storage/database.js";
import { runAllMigrations } from "../../src/storage/migrations/index.js";
import { DocumentIndexer } from "../../src/retrieval/indexer.js";
import { LexicalSearchEngine } from "../../src/retrieval/search.js";

describe("E2E Scenario: Retrieval-Augmented Grounded Answering", () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = new SQLiteDatabase({ inMemory: true });
    runAllMigrations(db);

    // Index sample architectural documents into SQLite
    const indexer = new DocumentIndexer(db);
    indexer.indexDocument({
      absolutePath: "/app/docs/ARCHITECTURE.md",
      relativePath: "docs/ARCHITECTURE.md",
      content:
        "The architecture consists of an Express HTTP transport, a central AssistantService with 12-step lifecycle, and SQLite storage for persistent memory and indexed documents.",
      sizeBytes: 150,
      mimeType: "text/markdown",
    });
  });

  afterEach(() => {
    db.close();
  });

  it("retrieves relevant document evidence and synthesizes grounded answer", async () => {
    const searchEngine = new LexicalSearchEngine(db);
    const searchTool = createSearchKnowledgeTool(searchEngine);

    const registry = new ToolRegistry();
    registry.register(searchTool);

    // Mock LLM scripted to call search_knowledge first, then provide final grounded answer
    const mockProvider = new MockLanguageModelProvider({
      scriptedResponses: [
        {
          text: "I need to search the project documentation for architecture details.",
          model: "mock:1b",
          toolCalls: [
            {
              name: "search_knowledge",
              arguments: { query: "architecture lifecycle storage" },
            },
          ],
        },
        {
          text: "Based on the project documentation, the architecture consists of an Express HTTP transport, a central AssistantService with a 12-step lifecycle, and SQLite storage.",
          model: "mock:1b",
        },
      ],
    });

    const assistant = new AssistantService({
      provider: mockProvider,
      toolRegistry: registry,
      retrievalEngine: searchEngine,
    });

    const result = await assistant.process({
      query: "Summarize these documents regarding our system architecture.",
    });

    expect(result.status).toBe("success");
    expect(result.executedTools).toHaveLength(1);
    expect(result.executedTools[0].toolName).toBe("search_knowledge");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].sourceId).toBe("docs/ARCHITECTURE.md");
    expect(result.answer).toContain("Sources & Evidence");
    expect(result.answer).toContain("docs/ARCHITECTURE.md");
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { AssistantService } from "../../src/core/assistant.js";
import { MockLanguageModelProvider } from "../../src/providers/mock-provider.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import { SQLiteDatabase } from "../../src/storage/database.js";
import { runAllMigrations } from "../../src/storage/migrations/index.js";
import { SQLiteMemoryRepository } from "../../src/storage/repositories/memory-repository.js";
import { MemoryService } from "../../src/memory/memory-service.js";
import { createManageMemoryTool } from "../../src/tools/definitions/manage-memory.js";

const TEST_DB_PATH = path.resolve(".data/test-restart-memory.db");

describe("E2E Scenario: Persistent Memory Across Restarts", () => {
  beforeEach(() => {
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DB_PATH)) {
      try {
        unlinkSync(TEST_DB_PATH);
      } catch {}
    }
  });

  it("stores explicit user preference and retrieves it after complete process restart", async () => {
    // === SESSION 1 ===
    const db1 = new SQLiteDatabase({ path: TEST_DB_PATH });
    runAllMigrations(db1);
    const repo1 = new SQLiteMemoryRepository(db1);
    const memoryService1 = new MemoryService(repo1);

    const registry1 = new ToolRegistry();
    registry1.register(createManageMemoryTool(memoryService1));

    const mockProvider1 = new MockLanguageModelProvider({
      scriptedResponses: [
        {
          text: "I will save your preference.",
          model: "mock:1b",
          toolCalls: [
            {
              name: "manage_memory",
              arguments: { action: "save", key: "default_port", content: "8080", scope: "project" },
            },
          ],
        },
        {
          text: "I have remembered your project preference: default_port is set to 8080.",
          model: "mock:1b",
        },
      ],
    });

    const assistant1 = new AssistantService({
      provider: mockProvider1,
      toolRegistry: registry1,
      memoryService: memoryService1,
    });

    // Save preference in Session 1
    const saveResult = await assistant1.process({
      query: "Remember this project preference for future sessions: default_port=8080",
      scope: "project",
    });
    expect(saveResult.status).toBe("success");
    expect(saveResult.executedTools).toHaveLength(1);
    expect(saveResult.executedTools[0].toolName).toBe("manage_memory");

    // Close session 1 completely (simulates server shutdown / restart)
    db1.close();

    // === SESSION 2 (Fresh connection & assistant instance) ===
    const db2 = new SQLiteDatabase({ path: TEST_DB_PATH });
    runAllMigrations(db2);
    const repo2 = new SQLiteMemoryRepository(db2);
    const memoryService2 = new MemoryService(repo2);

    const registry2 = new ToolRegistry();
    registry2.register(createManageMemoryTool(memoryService2));

    const mockProvider2 = new MockLanguageModelProvider({
      scriptedResponses: [
        {
          text: "Checking stored memory for default_port.",
          model: "mock:1b",
          toolCalls: [
            {
              name: "manage_memory",
              arguments: { action: "get", key: "default_port", scope: "project" },
            },
          ],
        },
        {
          text: "You asked me to remember that the default_port is 8080.",
          model: "mock:1b",
        },
      ],
    });

    const assistant2 = new AssistantService({
      provider: mockProvider2,
      toolRegistry: registry2,
      memoryService: memoryService2,
    });

    // Query preference in Session 2
    const retrieveResult = await assistant2.process({
      query: "What did I ask you to remember regarding default_port?",
      scope: "project",
    });

    expect(retrieveResult.status).toBe("success");
    expect(retrieveResult.executedTools).toHaveLength(1);
    const toolOutput = retrieveResult.executedTools[0].output as any;
    expect(toolOutput.found).toBe(true);
    expect(toolOutput.memory.content).toBe("8080");
    expect(retrieveResult.answer).toContain("8080");

    db2.close();
  });
});

import { describe, it, expect } from "vitest";
import { AssistantService } from "../../src/core/assistant.js";
import { MockLanguageModelProvider } from "../../src/providers/mock-provider.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import { SQLiteDatabase } from "../../src/storage/database.js";
import { runAllMigrations } from "../../src/storage/migrations/index.js";
import { SQLiteMemoryRepository } from "../../src/storage/repositories/memory-repository.js";
import { MemoryService } from "../../src/memory/memory-service.js";
import { createManageMemoryTool } from "../../src/tools/definitions/manage-memory.js";

describe("E2E Scenario: Consequential Action Confirmation & Authorization", () => {
  it("requires explicit user confirmation for consequential actions and executes upon confirmation", async () => {
    const db = new SQLiteDatabase({ inMemory: true });
    runAllMigrations(db);
    const repo = new SQLiteMemoryRepository(db);
    const memoryService = new MemoryService(repo);

    // Seed a memory to delete
    await memoryService.save("production_db_url", "postgres://user:pass@db:5432/main", "infra");

    const memoryTool = createManageMemoryTool(memoryService);
    memoryTool.requiresConfirmation = true; // Mark as requiring explicit confirmation

    const registry = new ToolRegistry();
    registry.register(memoryTool);

    const mockProvider = new MockLanguageModelProvider({
      scriptedResponses: [
        {
          text: "I propose deleting the production_db_url memory from infra scope.",
          model: "mock:1b",
          toolCalls: [
            {
              name: "manage_memory",
              arguments: { action: "delete", key: "production_db_url", scope: "infra" },
            },
          ],
        },
        {
          text: "Deleting the confirmed memory production_db_url now.",
          model: "mock:1b",
          toolCalls: [
            {
              name: "manage_memory",
              arguments: { action: "delete", key: "production_db_url", scope: "infra" },
            },
          ],
        },
        {
          text: "Memory deleted successfully upon confirmation.",
          model: "mock:1b",
        },
      ],
    });

    const assistant = new AssistantService({
      provider: mockProvider,
      toolRegistry: registry,
      memoryService,
    });

    // STEP 1: Attempt without confirmation token
    const firstAttempt = await assistant.process({
      query: "Delete production_db_url from infra scope, but confirm before making changes",
      scope: "infra",
    });

    // Consequential action halted before execution
    expect(firstAttempt.status).toBe("confirmation_required");
    expect(firstAttempt.proposedAction).toBeDefined();
    const token = (firstAttempt.proposedAction as any)?.confirmationToken;
    expect(token).toBeDefined();

    // Verify memory was NOT deleted yet
    const checkBefore = await memoryService.get("production_db_url", "infra");
    expect(checkBefore).not.toBeNull();

    // STEP 2: Client provides confirmation token
    const secondAttempt = await assistant.process({
      query: "Delete production_db_url from infra scope",
      scope: "infra",
      confirmationToken: token,
    });

    expect(secondAttempt.status).toBe("success");
    expect(secondAttempt.executedTools).toHaveLength(1);

    // Verify memory is now deleted
    const checkAfter = await memoryService.get("production_db_url", "infra");
    expect(checkAfter).toBeNull();

    db.close();
  });

  it("rejects forged or invalid confirmation tokens with permission denial", async () => {
    const db = new SQLiteDatabase({ inMemory: true });
    runAllMigrations(db);
    const repo = new SQLiteMemoryRepository(db);
    const memoryService = new MemoryService(repo);

    await memoryService.save("secret_key", "top-secret", "security");

    const memoryTool = createManageMemoryTool(memoryService);
    memoryTool.requiresConfirmation = true;

    const registry = new ToolRegistry();
    registry.register(memoryTool);

    const mockProvider = new MockLanguageModelProvider({
      scriptedResponses: [
        {
          text: "Attempting to delete memory with forged token",
          model: "mock:1b",
          toolCalls: [
            {
              name: "manage_memory",
              arguments: { action: "delete", key: "secret_key", scope: "security" },
            },
          ],
        },
        {
          text: "Could not delete due to permission error.",
          model: "mock:1b",
        },
      ],
    });

    const assistant = new AssistantService({
      provider: mockProvider,
      toolRegistry: registry,
      memoryService,
    });

    const result = await assistant.process({
      query: "Delete secret_key from security scope",
      scope: "security",
      confirmationToken: "forged-invalid-token",
    });

    // Tool execution reported error and memory remains protected
    expect(result.executedTools[0]?.status).toBe("error");
    const checkStillExists = await memoryService.get("secret_key", "security");
    expect(checkStillExists).not.toBeNull();

    db.close();
  });
});

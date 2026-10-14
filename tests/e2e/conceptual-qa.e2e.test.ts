import { describe, it, expect } from "vitest";
import { AssistantService } from "../../src/core/assistant.js";
import { MockLanguageModelProvider } from "../../src/providers/mock-provider.js";
import { ToolRegistry } from "../../src/tools/registry.js";

describe("E2E Scenario: Conceptual Question Answering", () => {
  it("answers conceptual questions directly without calling tools", async () => {
    const mockProvider = new MockLanguageModelProvider({
      defaultResponse: "An abstract class provides a common base for subclasses and cannot be instantiated directly.",
    });
    const registry = new ToolRegistry();
    const assistant = new AssistantService({
      provider: mockProvider,
      toolRegistry: registry,
    });

    const result = await assistant.process({
      query: "Explain what an abstract class is in object oriented programming.",
    });

    expect(result.status).toBe("success");
    expect(result.answer).toContain("abstract class");
    // Crucial requirement: No unnecessary tool calls for conceptual questions
    expect(result.executedTools).toHaveLength(0);
    expect(mockProvider.callHistory[0].tools).toBeUndefined(); // Direct text generation was used
  });

  it("transparently admits when evidence is missing or insufficient", async () => {
    const mockProvider = new MockLanguageModelProvider({
      defaultResponse: "I could not find any documents or records answering this specific question.",
    });
    const registry = new ToolRegistry();
    const assistant = new AssistantService({
      provider: mockProvider,
      toolRegistry: registry,
    });

    const result = await assistant.process({
      query: "What is the secret deployment key for the staging server?",
    });

    expect(result.status).toBe("success"); // Direct conceptual path succeeded
    expect(result.answer).toContain("could not find");
  });
});

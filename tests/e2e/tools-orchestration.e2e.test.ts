import { describe, it, expect } from "vitest";
import { AssistantService } from "../../src/core/assistant.js";
import { MockLanguageModelProvider } from "../../src/providers/mock-provider.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import { inspectRepositoryTool } from "../../src/tools/definitions/inspect-repository.js";
import { analyzeErrorTool } from "../../src/tools/definitions/analyze-error.js";

describe("E2E Scenario: Repository Inspection & Error Analysis", () => {
  it("invokes inspect_repository when asked about repository structure", async () => {
    const registry = new ToolRegistry();
    registry.register(inspectRepositoryTool);

    const mockProvider = new MockLanguageModelProvider({
      scriptedResponses: [
        {
          text: "I need to inspect the project repository structure.",
          model: "mock:1b",
          toolCalls: [
            {
              name: "inspect_repository",
              arguments: { path: ".", depth: 1 },
            },
          ],
        },
        {
          text: "The repository contains a TypeScript project with src/, tests/, docs/, and package.json.",
          model: "mock:1b",
        },
      ],
    });

    const assistant = new AssistantService({
      provider: mockProvider,
      toolRegistry: registry,
    });

    const result = await assistant.process({
      query: "Analyze the structure of this repository and explain how my project works.",
    });

    expect(result.status).toBe("success");
    expect(result.executedTools).toHaveLength(1);
    expect(result.executedTools[0].toolName).toBe("inspect_repository");
    expect(result.executedTools[0].output).toBeDefined();
    expect(result.answer).toContain("TypeScript project");
  });

  it("invokes analyze_error with supplied stack trace", async () => {
    const registry = new ToolRegistry();
    registry.register(analyzeErrorTool);

    const mockProvider = new MockLanguageModelProvider({
      scriptedResponses: [
        {
          text: "Analyzing the supplied error stack trace.",
          model: "mock:1b",
          toolCalls: [
            {
              name: "analyze_error",
              arguments: {
                errorText: "connect ECONNREFUSED 127.0.0.1:3001 at TCPConnectWrap.afterConnect",
              },
            },
          ],
        },
        {
          text: "The root cause is that the local server is not running on port 3001. Please run 'npm run server'.",
          model: "mock:1b",
        },
      ],
    });

    const assistant = new AssistantService({
      provider: mockProvider,
      toolRegistry: registry,
    });

    const result = await assistant.process({
      query: "Find the root cause of this error: connect ECONNREFUSED 127.0.0.1:3001 at TCPConnectWrap",
    });

    expect(result.status).toBe("success");
    expect(result.executedTools).toHaveLength(1);
    expect(result.executedTools[0].toolName).toBe("analyze_error");
    const output = result.executedTools[0].output as any;
    expect(output.errorType).toBe("ConnectionRefusedError");
    expect(result.answer).toContain("npm run server");
  });
});

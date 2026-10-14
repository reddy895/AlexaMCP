import { describe, it, expect, vi } from "vitest";
import { ToolRegistry } from "../../src/tools/registry.js";
import { ToolExecutor } from "../../src/tools/executor.js";
import { inspectRepositoryTool, assertWithinWorkspace } from "../../src/tools/definitions/inspect-repository.js";
import { analyzeErrorPattern, analyzeErrorTool } from "../../src/tools/definitions/analyze-error.js";
import { createSystemStatusTool } from "../../src/tools/definitions/system-status.js";
import { createManageMemoryTool } from "../../src/tools/definitions/manage-memory.js";
import { createSearchKnowledgeTool } from "../../src/tools/definitions/search-knowledge.js";
import { MockLanguageModelProvider } from "../../src/providers/mock-provider.js";
import { PermissionDeniedError, InvalidInputError } from "../../src/core/errors.js";
import { createExecutionContext } from "../../src/core/execution-context.js";
import { z } from "zod";

describe("Core Tools Unit Tests", () => {
  const dummyContext = createExecutionContext({ query: "Test tool query" });

  describe("ToolRegistry & ToolExecutor", () => {
    it("registers tools and prevents duplicates", () => {
      const registry = new ToolRegistry();
      const tool = {
        name: "test_tool",
        description: "Test description",
        parameters: z.object({ x: z.number() }),
        execute: async () => "ok",
      };
      registry.register(tool);
      expect(registry.get("test_tool")).toBeDefined();
      expect(() => registry.register(tool)).toThrow(/already registered/);
    });

    it("validates inputs and rejects invalid arguments", async () => {
      const executor = new ToolExecutor();
      const tool = {
        name: "number_tool",
        description: "Needs number",
        parameters: z.object({ count: z.number().min(5) }),
        execute: async (args: any) => args.count * 2,
      };

      await expect(
        executor.executeTool(tool, { count: "not-a-number" }, dummyContext)
      ).rejects.toThrow(InvalidInputError);

      await expect(
        executor.executeTool(tool, { count: 2 }, dummyContext)
      ).rejects.toThrow(InvalidInputError);

      const result = await executor.executeTool(tool, { count: 10 }, dummyContext);
      expect(result).toBe(20);
    });
  });

  describe("inspect_repository Tool", () => {
    it("prevents directory traversal outside workspace root", () => {
      expect(() => {
        assertWithinWorkspace("../../../etc/passwd", process.cwd());
      }).toThrow(PermissionDeniedError);
    });

    it("inspects current directory tree cleanly", async () => {
      const res: any = await inspectRepositoryTool.execute({ path: ".", depth: 1 }, dummyContext);
      expect(res.workspacePath).toBe(".");
      expect(res.structure).toBeDefined();
      expect(res.projectMetadata).toBeDefined();
    });
  });

  describe("analyze_error Tool", () => {
    it("identifies connection refused causes", () => {
      const finding = analyzeErrorPattern("connect ECONNREFUSED 127.0.0.1:3001 at TCPConnectWrap");
      expect(finding.errorType).toBe("ConnectionRefusedError");
      expect(finding.confidence).toBe("high");
      expect(finding.recommendedActions[0]).toContain("running");
    });

    it("parses stack frame file and line numbers", () => {
      const finding = analyzeErrorPattern(
        "TypeError: Cannot read properties of undefined at /app/src/server.ts:42:15"
      );
      expect(finding.errorType).toBe("TypeError");
      expect(finding.parsedLocation).toEqual({
        file: "/app/src/server.ts",
        line: 42,
        column: 15,
      });
    });
  });

  describe("get_system_status Tool", () => {
    it("returns real system health and memory diagnostics", async () => {
      const mockProvider = new MockLanguageModelProvider();
      const statusTool = createSystemStatusTool({
        provider: mockProvider,
        toolCount: () => 5,
      });

      const res: any = await statusTool.execute({ includeDiagnostics: true }, dummyContext);
      expect(res.overallStatus).toBe("healthy");
      expect(res.registeredToolsCount).toBe(5);
      expect(res.subsystems.llmProvider.isHealthy).toBe(true);
      expect(res.memory.heapUsedMb).toBeGreaterThan(0);
    });
  });

  describe("manage_memory Tool", () => {
    it("performs memory save, get, and list operations", async () => {
      const store = new Map<string, any>();
      const mockMemoryService: any = {
        save: async (key: string, content: string, scope: string) => {
          const rec = { id: "1", key, content, scope, createdAt: "", updatedAt: "" };
          store.set(`${scope}:${key}`, rec);
          return rec;
        },
        get: async (key: string, scope: string) => store.get(`${scope}:${key}`) ?? null,
        list: async (scope: string) => Array.from(store.values()).filter((m) => m.scope === scope),
        delete: async (key: string, scope: string) => store.delete(`${scope}:${key}`),
      };

      const memoryTool = createManageMemoryTool(mockMemoryService);

      // 1. Save
      const saveRes: any = await memoryTool.execute(
        { action: "save", key: "theme", content: "dark", scope: "test" },
        dummyContext
      );
      expect(saveRes.success).toBe(true);

      // 2. Get
      const getRes: any = await memoryTool.execute(
        { action: "get", key: "theme", scope: "test" },
        dummyContext
      );
      expect(getRes.found).toBe(true);
      expect(getRes.memory.content).toBe("dark");

      // 3. List
      const listRes: any = await memoryTool.execute(
        { action: "list", scope: "test" },
        dummyContext
      );
      expect(listRes.count).toBe(1);
    });
  });

  describe("search_knowledge Tool", () => {
    it("executes retrieval search and produces citations", async () => {
      const mockRetrievalEngine: any = {
        search: async (q: string) => [
          {
            id: "doc-1",
            sourceId: "docs/ARCH.md",
            title: "Architecture",
            content: `Matching content for ${q}`,
            score: 0.95,
          },
        ],
        toCitations: (results: any[]) =>
          results.map((r) => ({
            sourceId: r.sourceId,
            title: r.title,
            excerpt: r.content,
          })),
      };

      const searchTool = createSearchKnowledgeTool(mockRetrievalEngine);
      const res: any = await searchTool.execute({ query: "architecture", limit: 5 }, dummyContext);
      expect(res.count).toBe(1);
      expect(res.results[0].title).toBe("Architecture");
      expect(res.citations).toHaveLength(1);
    });
  });
});

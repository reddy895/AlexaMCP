import { describe, it, expect } from "vitest";
import {
  InvalidInputError,
  ProviderTimeoutError,
  ConfirmationRequiredError,
  toAssistantError,
} from "../../src/core/errors.js";
import { classifyQueryIntent } from "../../src/core/intent.js";
import { createExecutionContext } from "../../src/core/execution-context.js";
import { CitationBuilder } from "../../src/retrieval/citations.js";
import { evaluateEvidenceSufficiency } from "../../src/core/result.js";
import {
  generateConfirmationToken,
  verifyConfirmationToken,
} from "../../src/security/confirmation.js";

describe("Core Assistant Unit Tests", () => {
  describe("Error Taxonomy", () => {
    it("preserves typed error codes and details", () => {
      const err = new InvalidInputError("Field missing", { field: "query" });
      expect(err.code).toBe("INVALID_INPUT");
      expect(err.details).toEqual({ field: "query" });
      expect(err.isRetryable).toBe(false);
    });

    it("normalizes unknown errors safely", () => {
      const normalized = toAssistantError(new Error("Network glitch"));
      expect(normalized.code).toBe("INTERNAL_FAILURE");
      expect(normalized.message).toBe("Network glitch");
    });
  });

  describe("Intent Classification", () => {
    it("routes conceptual questions to direct reasoning", () => {
      const res = classifyQueryIntent("What is the difference between a process and a thread?");
      expect(res.intent).toBe("DIRECT_REASONING");
      expect(res.recommendedTools).toHaveLength(0);
    });

    it("routes repo questions to repository inspection", () => {
      const res = classifyQueryIntent("Explain how my project works and analyze the structure of this repository");
      expect(res.intent).toBe("REPOSITORY_INSPECTION");
      expect(res.recommendedTools).toContain("inspect_repository");
    });

    it("routes error analysis queries properly", () => {
      const res = classifyQueryIntent("Find the root cause of this error: TypeError: cannot read properties of undefined");
      expect(res.intent).toBe("ERROR_ANALYSIS");
      expect(res.recommendedTools).toContain("analyze_error");
    });

    it("routes memory queries to memory tool", () => {
      const res = classifyQueryIntent("Remember this project preference for future sessions: use port 8080");
      expect(res.intent).toBe("MEMORY_OPERATION");
      expect(res.recommendedTools).toContain("manage_memory");
    });

    it("detects mutating actions requiring confirmation", () => {
      const res = classifyQueryIntent("Delete all stored preferences but confirm before making changes");
      expect(res.intent).toBe("CONSEQUENTIAL_ACTION");
      expect(res.requiresConfirmation).toBe(true);
    });
  });

  describe("Execution Context & Deadlines", () => {
    it("rejects empty queries with InvalidInputError", () => {
      expect(() => createExecutionContext({ query: "   " })).toThrow(InvalidInputError);
    });

    it("creates unique requestId and initializes deadline", () => {
      const ctx = createExecutionContext({ query: "Hello", timeoutMs: 5000 });
      expect(ctx.requestId).toMatch(/^req_/);
      expect(ctx.deadlineMs).toBeGreaterThan(Date.now());
      ctx.checkDeadline(); // Should not throw
      ctx.cleanup();
    });
  });

  describe("Citations & Provenance", () => {
    it("deduplicates identical citations and formats markdown", () => {
      const builder = new CitationBuilder();
      builder.addCitation({
        sourceId: "docs/API.md",
        title: "API Spec",
        excerpt: "GET /healthz returns status 200.",
      });
      builder.addCitation({
        sourceId: "docs/API.md",
        title: "API Spec",
        excerpt: "GET /healthz returns status 200.",
      });

      expect(builder.getCitations()).toHaveLength(1);
      const markdown = builder.formatMarkdownSources();
      expect(markdown).toContain("Sources & Evidence");
      expect(markdown).toContain("docs/API.md");
    });
  });

  describe("Missing Evidence Logic", () => {
    it("flags missing information when model admits limitation without citations", () => {
      const evalRes = evaluateEvidenceSufficiency(
        "I could not find any documents answering your query.",
        [],
        []
      );
      expect(evalRes.status).toBe("missing_information");
      expect(evalRes.missingEvidence.length).toBeGreaterThan(0);
    });

    it("passes success when citations are present", () => {
      const evalRes = evaluateEvidenceSufficiency(
        "The project runs on port 3001.",
        [{ sourceId: "README.md", title: "README", excerpt: "port 3001" }],
        []
      );
      expect(evalRes.status).toBe("success");
    });
  });

  describe("Confirmation Tokens", () => {
    it("generates deterministic tokens and verifies match", () => {
      const token = generateConfirmationToken("delete_memory", "user_prefs");
      expect(verifyConfirmationToken(token, "delete_memory", "user_prefs")).toBe(true);
      expect(verifyConfirmationToken("invalid_token", "delete_memory", "user_prefs")).toBe(false);
    });
  });
});

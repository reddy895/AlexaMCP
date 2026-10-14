import { describe, it, expect, vi, beforeEach } from "vitest";
import { Logger, redactSensitiveData, logStorage } from "../../src/observability/logger.js";

describe("Structured JSON Logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts sensitive fields from metadata", () => {
    const input = {
      username: "alexa_user",
      apiKey: "sk-123456789",
      nested: {
        authToken: "Bearer xyz",
        normal: "safe",
      },
    };

    const redacted = redactSensitiveData(input) as any;
    expect(redacted.username).toBe("alexa_user");
    expect(redacted.apiKey).toBe("[REDACTED]");
    expect(redacted.nested.authToken).toBe("[REDACTED]");
    expect(redacted.nested.normal).toBe("safe");
  });

  it("propagates async request context into log records", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true as any);
    const testLogger = new Logger("test");

    testLogger.runWithContext({ requestId: "req-999", operation: "ask_assistant" }, () => {
      testLogger.info("Processing question");
    });

    expect(writeSpy).toHaveBeenCalled();
    const loggedJson = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(loggedJson.level).toBe("info");
    expect(loggedJson.message).toBe("Processing question");
    expect(loggedJson.context.requestId).toBe("req-999");
    expect(loggedJson.context.operation).toBe("ask_assistant");
    expect(loggedJson.context.module).toBe("test");
    expect(loggedJson.timestamp).toBeDefined();
  });
});

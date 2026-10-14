import { describe, it, expect, beforeEach } from "vitest";
import { loadConfig, resetConfig } from "../../src/config/env.js";

describe("Configuration Validation", () => {
  beforeEach(() => {
    resetConfig();
  });

  it("loads valid default configuration", () => {
    const config = loadConfig();
    expect(config.PORT).toBe(3001);
    expect(config.OLLAMA_MODEL).toBe("qwen2.5:3b");
    expect(config.MAX_STEPS).toBe(8);
    expect(["development", "test"]).toContain(config.NODE_ENV);
    expect(config.DATABASE_PATH).toContain("assistant.db");
  });

  it("applies environment overrides correctly", () => {
    const config = loadConfig({
      PORT: "4500",
      OLLAMA_MODEL: "llama3.2:1b",
      LOG_LEVEL: "debug",
    });
    expect(config.PORT).toBe(4500);
    expect(config.OLLAMA_MODEL).toBe("llama3.2:1b");
    expect(config.LOG_LEVEL).toBe("debug");
  });

  it("throws descriptive error on invalid port", () => {
    expect(() => {
      loadConfig({ PORT: "not-a-number" });
    }).toThrow(/Configuration validation failed/);
  });

  it("throws descriptive error on invalid URL", () => {
    expect(() => {
      loadConfig({ OLLAMA_URL: "invalid-url" });
    }).toThrow(/Configuration validation failed/);
  });
});

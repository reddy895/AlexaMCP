import { z } from "zod";

export const ConfigSchema = z.object({
  // Server
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MCP_PATH: z.string().default("/mcp"),

  // LLM / Ollama
  OLLAMA_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).default("qwen2.5:3b"),
  OLLAMA_NUM_CTX: z.coerce.number().int().min(512).max(131072).default(4096),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(30000),
  MAX_STEPS: z.coerce.number().int().min(1).max(20).default(8),

  // Storage
  DATABASE_PATH: z.string().default(".data/assistant.db"),

  // Security & Boundaries
  WORKSPACE_ROOT: z.string().default(process.cwd()),
  APPROVED_DOCS_DIRS: z.string().default("docs,test-inputs"),
  AUTH_TOKEN: z.string().optional(),
  RATE_LIMIT_RPS: z.coerce.number().int().min(1).max(1000).default(50),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().int().min(1).max(50).default(10),

  // Observability
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Voice mode
  DD_MODE: z.enum(["text", "voice"]).default("voice"),
  RECORD_SECONDS: z.coerce.number().int().min(1).max(60).default(6),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

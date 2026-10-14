import path from "node:path";
import { ConfigSchema, type AppConfig } from "./schema.js";

let cachedConfig: AppConfig | null = null;

export function loadConfig(overrides: Record<string, unknown> = {}): AppConfig {
  const merged = {
    ...process.env,
    ...overrides,
  };

  const parsed = ConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuration validation failed:\n${errorMessages}`);
  }

  // Resolve relative paths against WORKSPACE_ROOT
  const root = path.resolve(parsed.data.WORKSPACE_ROOT);
  const resolvedDbPath = path.isAbsolute(parsed.data.DATABASE_PATH)
    ? parsed.data.DATABASE_PATH
    : path.resolve(root, parsed.data.DATABASE_PATH);

  const finalConfig: AppConfig = {
    ...parsed.data,
    WORKSPACE_ROOT: root,
    DATABASE_PATH: resolvedDbPath,
  };

  cachedConfig = finalConfig;
  return finalConfig;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}

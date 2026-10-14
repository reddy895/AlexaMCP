import { AsyncLocalStorage } from "node:async_hooks";
import { getConfig } from "../config/env.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  operation?: string;
  toolName?: string;
  durationMs?: number;
  status?: "success" | "partial" | "error" | "cancelled" | "confirmation_required";
  errorCategory?: string;
  [key: string]: unknown;
}

export interface StructuredLogRecord {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEY_PATTERN = /(auth|token|password|secret|key|credential|cookie|bearer)/i;

export function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Redact Bearer tokens in strings
    return obj.replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED]");
  }
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      result[key] = redactSensitiveData(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export const logStorage = new AsyncLocalStorage<LogContext>();

export class Logger {
  constructor(private readonly moduleName?: string) {}

  public child(name: string): Logger {
    return new Logger(this.moduleName ? `${this.moduleName}:${name}` : name);
  }

  private shouldLog(level: LogLevel): boolean {
    const configuredLevel = getConfig().LOG_LEVEL;
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[configuredLevel];
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const storeContext = logStorage.getStore() ?? {};
    const mergedContext = {
      ...(this.moduleName ? { module: this.moduleName } : {}),
      ...storeContext,
      ...(meta ?? {}),
    };

    const record: StructuredLogRecord = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(Object.keys(mergedContext).length > 0
        ? { context: redactSensitiveData(mergedContext) as Record<string, unknown> }
        : {}),
    };

    const output = JSON.stringify(record);
    if (level === "error") {
      process.stderr.write(output + "\n");
    } else {
      process.stdout.write(output + "\n");
    }
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.write("debug", message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.write("info", message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.write("warn", message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    this.write("error", message, meta);
  }

  public runWithContext<T>(context: LogContext, fn: () => T): T {
    const existing = logStorage.getStore() ?? {};
    return logStorage.run({ ...existing, ...context }, fn);
  }
}

export const logger = new Logger();

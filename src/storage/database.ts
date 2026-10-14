import { DatabaseSync, type StatementSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { getConfig } from "../config/env.js";
import { DatabaseError } from "../core/errors.js";
import { logger } from "../observability/logger.js";

export interface DatabaseConnectionOptions {
  path?: string;
  inMemory?: boolean;
}

export class SQLiteDatabase {
  private db: DatabaseSync | null = null;
  private readonly dbPath: string;
  private readonly inMemory: boolean;
  private readonly statementCache = new Map<string, StatementSync>();

  constructor(options: DatabaseConnectionOptions = {}) {
    const config = getConfig();
    this.inMemory = options.inMemory ?? false;
    this.dbPath = this.inMemory ? ":memory:" : (options.path ?? config.DATABASE_PATH);
  }

  public connect(): DatabaseSync {
    if (this.db) {
      return this.db;
    }

    try {
      if (!this.inMemory) {
        mkdirSync(path.dirname(this.dbPath), { recursive: true });
      }

      const db = new DatabaseSync(this.dbPath);

      // Apply production performance and integrity pragmas
      db.exec("PRAGMA foreign_keys = ON;");
      if (!this.inMemory) {
        db.exec("PRAGMA journal_mode = WAL;");
        db.exec("PRAGMA synchronous = NORMAL;");
        db.exec("PRAGMA busy_timeout = 5000;");
      }

      this.db = db;
      logger.info(`Connected to SQLite database at ${this.dbPath}`);
      return db;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new DatabaseError(`Failed to initialize SQLite database at ${this.dbPath}: ${msg}`);
    }
  }

  public prepare(sql: string): StatementSync {
    const db = this.connect();
    let stmt = this.statementCache.get(sql);
    if (!stmt) {
      try {
        stmt = db.prepare(sql);
        this.statementCache.set(sql, stmt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new DatabaseError(`Failed to prepare statement "${sql}": ${msg}`);
      }
    }
    return stmt;
  }

  public exec(sql: string): void {
    const db = this.connect();
    try {
      db.exec(sql);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new DatabaseError(`Failed to execute SQL: ${msg}`);
    }
  }

  public transaction<T>(fn: () => T): T {
    const db = this.connect();
    db.exec("BEGIN TRANSACTION;");
    try {
      const result = fn();
      db.exec("COMMIT;");
      return result;
    } catch (err) {
      try {
        db.exec("ROLLBACK;");
      } catch {}
      throw err;
    }
  }

  public close(): void {
    if (this.db) {
      try {
        this.statementCache.clear();
        this.db.close();
        logger.info(`Closed SQLite database at ${this.dbPath}`);
      } catch (err: unknown) {
        logger.error("Error closing SQLite database", {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        this.db = null;
      }
    }
  }

  public getPath(): string {
    return this.dbPath;
  }
}

let defaultDatabase: SQLiteDatabase | null = null;

export function getDatabase(): SQLiteDatabase {
  if (!defaultDatabase) {
    defaultDatabase = new SQLiteDatabase();
  }
  return defaultDatabase;
}

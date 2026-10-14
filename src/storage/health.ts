import type { SQLiteDatabase } from "./database.js";
import { statSync, existsSync } from "node:fs";

export interface DatabaseHealthReport {
  isHealthy: boolean;
  databasePath: string;
  sizeBytes: number;
  schemaVersion: number;
  journalMode: string;
  foreignKeysEnabled: boolean;
  counts: {
    memories: number;
    documents: number;
    chunks: number;
  };
  error?: string;
}

export function checkDatabaseHealth(db: SQLiteDatabase): DatabaseHealthReport {
  const dbPath = db.getPath();
  try {
    const isMemory = dbPath === ":memory:";
    const sizeBytes = isMemory || !existsSync(dbPath) ? 0 : statSync(dbPath).size;

    const fkRow = db.prepare("PRAGMA foreign_keys;").get() as any;
    const jmRow = db.prepare("PRAGMA journal_mode;").get() as any;

    let schemaVersion = 0;
    try {
      const vRow = db.prepare("SELECT max(version) as max_v FROM _migrations;").get() as any;
      schemaVersion = vRow?.max_v ?? 0;
    } catch {
      // Table might not exist yet
    }

    let memories = 0;
    let documents = 0;
    let chunks = 0;

    try {
      memories = (db.prepare("SELECT count(*) as count FROM memories;").get() as any)?.count ?? 0;
      documents = (db.prepare("SELECT count(*) as count FROM documents;").get() as any)?.count ?? 0;
      chunks = (db.prepare("SELECT count(*) as count FROM document_chunks;").get() as any)?.count ?? 0;
    } catch {
      // Tables might be empty or migrating
    }

    return {
      isHealthy: true,
      databasePath: dbPath,
      sizeBytes,
      schemaVersion,
      journalMode: String(jmRow?.journal_mode ?? "unknown"),
      foreignKeysEnabled: Boolean(fkRow?.foreign_keys ?? 0),
      counts: {
        memories,
        documents,
        chunks,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isHealthy: false,
      databasePath: dbPath,
      sizeBytes: 0,
      schemaVersion: 0,
      journalMode: "unknown",
      foreignKeysEnabled: false,
      counts: { memories: 0, documents: 0, chunks: 0 },
      error: msg,
    };
  }
}

export function backupDatabase(db: SQLiteDatabase, destinationPath: string): void {
  // Use safe SQLite VACUUM INTO for non-blocking consistent online backup
  db.exec(`VACUUM INTO '${destinationPath.replace(/'/g, "''")}';`);
}

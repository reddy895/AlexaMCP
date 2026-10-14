import type { Migration } from "./runner.js";
import type { SQLiteDatabase } from "../database.js";

export const v1InitialSchemaMigration: Migration = {
  version: 1,
  name: "initial_schema_memories_and_documents",
  up(db: SQLiteDatabase): void {
    // 1. Memories Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        user_id TEXT,
        key TEXT NOT NULL,
        content TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_scope_key_user
      ON memories(scope, key, ifnull(user_id, ''));

      CREATE INDEX IF NOT EXISTS idx_memories_expires
      ON memories(expires_at);
    `);

    // 2. Documents Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        content_hash TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        indexed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_documents_path
      ON documents(path);
    `);

    // 3. Document Chunks Table with Foreign Key
    db.exec(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        tokens TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_doc_id
      ON document_chunks(document_id);

      CREATE INDEX IF NOT EXISTS idx_chunks_doc_index
      ON document_chunks(document_id, chunk_index);
    `);
  },
};

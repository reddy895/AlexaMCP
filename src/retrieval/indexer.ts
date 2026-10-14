import { createHash, randomUUID } from "node:crypto";
import type { SQLiteDatabase } from "../storage/database.js";
import type { LoadedDocument } from "./document-loader.js";
import { chunkText, type ChunkOptions } from "./chunker.js";
import { logger } from "../observability/logger.js";

export function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export interface IndexingResult {
  indexed: number;
  skipped: number;
  totalChunks: number;
}

export class DocumentIndexer {
  constructor(private readonly db: SQLiteDatabase) {}

  public indexDocument(doc: LoadedDocument, chunkOptions: ChunkOptions = {}): boolean {
    const hash = computeContentHash(doc.content);

    // Check if document already indexed with identical hash
    const existing = this.db
      .prepare("SELECT id, content_hash FROM documents WHERE path = ?;")
      .get(doc.relativePath) as { id: string; content_hash: string } | undefined;

    if (existing && existing.content_hash === hash) {
      return false; // Skipped (unchanged)
    }

    const docId = existing ? existing.id : `doc_${randomUUID()}`;
    const now = new Date().toISOString();
    const chunks = chunkText(doc.content, chunkOptions);

    this.db.transaction(() => {
      // Upsert document record
      this.db
        .prepare(`
          INSERT INTO documents (id, path, content_hash, size_bytes, mime_type, indexed_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(path) DO UPDATE SET
            content_hash = excluded.content_hash,
            size_bytes = excluded.size_bytes,
            mime_type = excluded.mime_type,
            indexed_at = excluded.indexed_at;
        `)
        .run(docId, doc.relativePath, hash, doc.sizeBytes, doc.mimeType, now);

      // Delete existing chunks if updating
      this.db.prepare("DELETE FROM document_chunks WHERE document_id = ?;").run(docId);

      // Insert new chunks
      const insertChunk = this.db.prepare(`
        INSERT INTO document_chunks (id, document_id, chunk_index, content, tokens, created_at)
        VALUES (?, ?, ?, ?, ?, ?);
      `);

      for (const chunk of chunks) {
        insertChunk.run(
          `chk_${randomUUID()}`,
          docId,
          chunk.chunkIndex,
          chunk.content,
          chunk.tokens,
          now
        );
      }
    });

    return true;
  }

  public indexDocuments(docs: LoadedDocument[], chunkOptions: ChunkOptions = {}): IndexingResult {
    let indexed = 0;
    let skipped = 0;

    for (const doc of docs) {
      try {
        const wasIndexed = this.indexDocument(doc, chunkOptions);
        if (wasIndexed) indexed++;
        else skipped++;
      } catch (err: unknown) {
        logger.error(`Failed to index document: ${doc.relativePath}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const chunkCountRow = this.db
      .prepare("SELECT count(*) as count FROM document_chunks;")
      .get() as any;
    const totalChunks = Number(chunkCountRow?.count ?? 0);

    return { indexed, skipped, totalChunks };
  }
}

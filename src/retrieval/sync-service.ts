import { existsSync } from "node:fs";
import path from "node:path";
import type { SQLiteDatabase } from "../storage/database.js";
import { DocumentIndexer, type IndexingResult } from "./indexer.js";
import { loadApprovedDocuments } from "./document-loader.js";
import { getConfig } from "../config/env.js";
import { logger } from "../observability/logger.js";

export interface SyncReport extends IndexingResult {
  pruned: number;
  totalDocuments: number;
}

export class KnowledgeSyncService {
  private readonly indexer: DocumentIndexer;

  constructor(private readonly db: SQLiteDatabase) {
    this.indexer = new DocumentIndexer(db);
  }

  public async sync(): Promise<SyncReport> {
    const config = getConfig();
    logger.info("Starting knowledge index synchronization...");

    // 1. Ingest approved documents incrementally
    const loadedDocs = loadApprovedDocuments();
    const indexResult = this.indexer.indexDocuments(loadedDocs);

    // 2. Prune documents that no longer exist on disk
    let pruned = 0;
    const allDbDocs = this.db.prepare("SELECT id, path FROM documents;").all() as Array<{
      id: string;
      path: string;
    }>;

    for (const doc of allDbDocs) {
      const fullPath = path.resolve(config.WORKSPACE_ROOT, doc.path);
      if (!existsSync(fullPath)) {
        this.db.transaction(() => {
          this.db.prepare("DELETE FROM document_chunks WHERE document_id = ?;").run(doc.id);
          this.db.prepare("DELETE FROM documents WHERE id = ?;").run(doc.id);
        });
        pruned++;
        logger.info(`Pruned deleted document from index: ${doc.path}`);
      }
    }

    const docCountRow = this.db.prepare("SELECT count(*) as count FROM documents;").get() as any;
    const totalDocuments = Number(docCountRow?.count ?? 0);

    const report: SyncReport = {
      ...indexResult,
      pruned,
      totalDocuments,
    };

    logger.info("Knowledge index synchronization complete", { ...report });
    return report;
  }
}

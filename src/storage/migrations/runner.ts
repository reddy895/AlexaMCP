import type { SQLiteDatabase } from "../database.js";
import { logger } from "../../observability/logger.js";
import { DatabaseError } from "../../core/errors.js";

export interface Migration {
  version: number;
  name: string;
  up(db: SQLiteDatabase): void;
  down?(db: SQLiteDatabase): void;
}

export class MigrationRunner {
  constructor(private readonly db: SQLiteDatabase) {}

  public ensureMigrationTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);
  }

  public getAppliedVersions(): Set<number> {
    this.ensureMigrationTable();
    const rows = this.db.prepare("SELECT version FROM _migrations ORDER BY version ASC").all() as Array<{
      version: number;
    }>;
    return new Set(rows.map((r) => r.version));
  }

  public runMigrations(migrations: Migration[]): number[] {
    this.ensureMigrationTable();
    const appliedVersions = this.getAppliedVersions();
    const newlyApplied: number[] = [];

    const sorted = [...migrations].sort((a, b) => a.version - b.version);

    for (const migration of sorted) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }

      logger.info(`Applying database migration v${migration.version}: ${migration.name}`);
      try {
        this.db.transaction(() => {
          migration.up(this.db);
          this.db
            .prepare("INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)")
            .run(migration.version, migration.name, new Date().toISOString());
        });
        newlyApplied.push(migration.version);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new DatabaseError(
          `Migration v${migration.version} (${migration.name}) failed: ${msg}`
        );
      }
    }

    return newlyApplied;
  }
}

import type { SQLiteDatabase } from "../database.js";
import { MigrationRunner } from "./runner.js";
import { v1InitialSchemaMigration } from "./v1-initial-schema.js";

export const ALL_MIGRATIONS = [v1InitialSchemaMigration];

export function runAllMigrations(db: SQLiteDatabase): number[] {
  const runner = new MigrationRunner(db);
  return runner.runMigrations(ALL_MIGRATIONS);
}

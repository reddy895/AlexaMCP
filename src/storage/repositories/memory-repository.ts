import { randomUUID } from "node:crypto";
import type { SQLiteDatabase } from "../database.js";
import type { MemoryRecord } from "../../memory/memory-service.js";

export interface UpsertMemoryParams {
  key: string;
  content: string;
  scope: string;
  userId?: string;
  expiresAt?: string;
}

export class SQLiteMemoryRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public upsert(params: UpsertMemoryParams): MemoryRecord {
    const now = new Date().toISOString();
    const id = `mem_${randomUUID()}`;

    // Parameterized upsert query
    const sql = `
      INSERT INTO memories (id, scope, user_id, key, content, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope, key, ifnull(user_id, ''))
      DO UPDATE SET
        content = excluded.content,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
      RETURNING id, scope, user_id, key, content, created_at, updated_at;
    `;

    const row = this.db
      .prepare(sql)
      .get(
        id,
        params.scope,
        params.userId ?? null,
        params.key,
        params.content,
        params.expiresAt ?? null,
        now,
        now
      ) as any;

    return {
      id: row.id,
      scope: row.scope,
      userId: row.user_id ?? undefined,
      key: row.key,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public findByKey(key: string, scope: string, userId?: string): MemoryRecord | null {
    const sql = `
      SELECT id, scope, user_id, key, content, created_at, updated_at
      FROM memories
      WHERE scope = ? AND key = ? AND (user_id IS ? OR user_id = ?)
        AND (expires_at IS NULL OR expires_at > ?)
      LIMIT 1;
    `;

    const now = new Date().toISOString();
    const row = this.db
      .prepare(sql)
      .get(scope, key, userId ? null : null, userId ?? null, now) as any;

    if (!row) return null;

    return {
      id: row.id,
      scope: row.scope,
      userId: row.user_id ?? undefined,
      key: row.key,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public search(query: string, scope: string, userId?: string): MemoryRecord[] {
    const sql = `
      SELECT id, scope, user_id, key, content, created_at, updated_at
      FROM memories
      WHERE scope = ? AND (user_id IS ? OR user_id = ?)
        AND (expires_at IS NULL OR expires_at > ?)
        AND (key LIKE ? OR content LIKE ?)
      ORDER BY updated_at DESC
      LIMIT 20;
    `;

    const now = new Date().toISOString();
    const pattern = `%${query}%`;
    const rows = this.db
      .prepare(sql)
      .all(scope, userId ? null : null, userId ?? null, now, pattern, pattern) as any[];

    return rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      userId: r.user_id ?? undefined,
      key: r.key,
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  public list(scope: string, userId?: string): MemoryRecord[] {
    const sql = `
      SELECT id, scope, user_id, key, content, created_at, updated_at
      FROM memories
      WHERE scope = ? AND (user_id IS ? OR user_id = ?)
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY updated_at DESC
      LIMIT 100;
    `;

    const now = new Date().toISOString();
    const rows = this.db
      .prepare(sql)
      .all(scope, userId ? null : null, userId ?? null, now) as any[];

    return rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      userId: r.user_id ?? undefined,
      key: r.key,
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  public delete(key: string, scope: string, userId?: string): boolean {
    const sql = `
      DELETE FROM memories
      WHERE scope = ? AND key = ? AND (user_id IS ? OR user_id = ?);
    `;

    const info = this.db
      .prepare(sql)
      .run(scope, key, userId ? null : null, userId ?? null) as any;

    return Number(info?.changes ?? 0) > 0;
  }

  public deleteExpired(): number {
    const now = new Date().toISOString();
    const sql = "DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at <= ?;";
    const info = this.db.prepare(sql).run(now) as any;
    return Number(info?.changes ?? 0);
  }
}

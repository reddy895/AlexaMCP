import type { SQLiteMemoryRepository } from "../storage/repositories/memory-repository.js";
import { InvalidInputError, PermissionDeniedError } from "../core/errors.js";
import { sanitizeUntrustedContent } from "../security/redaction.js";

export interface MemoryRecord {
  id: string;
  scope: string;
  userId?: string;
  key: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMemoryService {
  save(key: string, content: string, scope?: string, userId?: string, expiresAt?: string): Promise<MemoryRecord>;
  get(key: string, scope?: string, userId?: string): Promise<MemoryRecord | null>;
  search(query: string, scope?: string, userId?: string): Promise<MemoryRecord[]>;
  delete(key: string, scope?: string, userId?: string): Promise<boolean>;
  list(scope?: string, userId?: string): Promise<MemoryRecord[]>;
  cleanupExpired(): Promise<number>;
}

export class MemoryService implements IMemoryService {
  constructor(private readonly repository: SQLiteMemoryRepository) {}

  private validateKey(key: string): string {
    const cleanKey = key.trim();
    if (!cleanKey || cleanKey.length > 100) {
      throw new InvalidInputError("Memory key must be between 1 and 100 characters.");
    }
    if (!/^[a-zA-Z0-9_.:-]+$/.test(cleanKey)) {
      throw new InvalidInputError("Memory key can only contain alphanumeric characters, underscores, colons, hyphens, and dots.");
    }
    return cleanKey;
  }

  public async save(
    key: string,
    content: string,
    scope = "default",
    userId?: string,
    expiresAt?: string
  ): Promise<MemoryRecord> {
    const cleanKey = this.validateKey(key);
    const cleanContent = content.trim();

    if (!cleanContent) {
      throw new InvalidInputError("Memory content cannot be empty.");
    }

    if (cleanContent.length > 10_000) {
      throw new InvalidInputError("Memory content exceeds maximum allowed length of 10,000 characters.");
    }

    // Safety policy: Prevent persisting raw private keys or credentials
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(cleanContent) || /AKIA[0-9A-Z]{16}/.test(cleanContent)) {
      throw new PermissionDeniedError("Refusing to persist raw secrets or private cryptographic keys in memory.");
    }

    const sanitized = sanitizeUntrustedContent(cleanContent);

    return this.repository.upsert({
      key: cleanKey,
      content: sanitized,
      scope: scope.trim() || "default",
      userId,
      expiresAt,
    });
  }

  public async get(key: string, scope = "default", userId?: string): Promise<MemoryRecord | null> {
    const cleanKey = this.validateKey(key);
    return this.repository.findByKey(cleanKey, scope.trim() || "default", userId);
  }

  public async search(query: string, scope = "default", userId?: string): Promise<MemoryRecord[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];
    return this.repository.search(cleanQuery, scope.trim() || "default", userId);
  }

  public async delete(key: string, scope = "default", userId?: string): Promise<boolean> {
    const cleanKey = this.validateKey(key);
    return this.repository.delete(cleanKey, scope.trim() || "default", userId);
  }

  public async list(scope = "default", userId?: string): Promise<MemoryRecord[]> {
    return this.repository.list(scope.trim() || "default", userId);
  }

  public async cleanupExpired(): Promise<number> {
    return this.repository.deleteExpired();
  }
}

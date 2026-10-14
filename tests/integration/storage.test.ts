import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SQLiteDatabase } from "../../src/storage/database.js";
import { runAllMigrations } from "../../src/storage/migrations/index.js";
import { SQLiteMemoryRepository } from "../../src/storage/repositories/memory-repository.js";
import { MemoryService } from "../../src/memory/memory-service.js";
import { checkDatabaseHealth } from "../../src/storage/health.js";
import { PermissionDeniedError, InvalidInputError } from "../../src/core/errors.js";

describe("SQLite Storage & Memory Integration Tests", () => {
  let db: SQLiteDatabase;
  let repo: SQLiteMemoryRepository;
  let service: MemoryService;

  beforeEach(() => {
    db = new SQLiteDatabase({ inMemory: true });
    runAllMigrations(db);
    repo = new SQLiteMemoryRepository(db);
    service = new MemoryService(repo);
  });

  afterEach(() => {
    db.close();
  });

  it("applies migrations and initializes schema tables", () => {
    const health = checkDatabaseHealth(db);
    expect(health.isHealthy).toBe(true);
    expect(health.schemaVersion).toBe(1);
    expect(health.counts.memories).toBe(0);
  });

  it("saves, retrieves, and updates memory records with scope isolation", async () => {
    // 1. Save in scope "project_alpha"
    const saved = await service.save("theme", "dracula", "project_alpha");
    expect(saved.key).toBe("theme");
    expect(saved.content).toBe("dracula");
    expect(saved.scope).toBe("project_alpha");

    // 2. Retrieve in same scope
    const found = await service.get("theme", "project_alpha");
    expect(found).not.toBeNull();
    expect(found?.content).toBe("dracula");

    // 3. Isolated from different scope
    const otherScope = await service.get("theme", "project_beta");
    expect(otherScope).toBeNull();

    // 4. Update in place
    const updated = await service.save("theme", "nord", "project_alpha");
    expect(updated.content).toBe("nord");

    const foundUpdated = await service.get("theme", "project_alpha");
    expect(foundUpdated?.content).toBe("nord");
  });

  it("enforces user isolation for scoped user preferences", async () => {
    await service.save("editor", "vim", "default", "user_alice");
    const alicePref = await service.get("editor", "default", "user_alice");
    expect(alicePref?.content).toBe("vim");

    // user_bob cannot see user_alice's memory
    const bobPref = await service.get("editor", "default", "user_bob");
    expect(bobPref).toBeNull();
  });

  it("searches and lists memory records", async () => {
    await service.save("deploy.host", "aws.us-east-1", "infra");
    await service.save("deploy.port", "8080", "infra");
    await service.save("app.color", "blue", "frontend");

    const infraList = await service.list("infra");
    expect(infraList).toHaveLength(2);

    const searchRes = await service.search("8080", "infra");
    expect(searchRes).toHaveLength(1);
    expect(searchRes[0].key).toBe("deploy.port");
  });

  it("deletes memory on explicit user request", async () => {
    await service.save("temp_key", "temporary", "test");
    const deleted = await service.delete("temp_key", "test");
    expect(deleted).toBe(true);

    const check = await service.get("temp_key", "test");
    expect(check).toBeNull();
  });

  it("rejects saving raw cryptographic private keys", async () => {
    const rawPrivateKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----";
    await expect(service.save("ssh_key", rawPrivateKey, "default")).rejects.toThrow(
      PermissionDeniedError
    );
  });

  it("validates key format strictly", async () => {
    await expect(service.save("bad key with spaces", "content")).rejects.toThrow(InvalidInputError);
  });

  it("cleans up expired memory records", async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    await service.save("expired_fact", "old context", "test", undefined, pastDate);

    const pruned = await service.cleanupExpired();
    expect(pruned).toBe(1);

    const check = await service.get("expired_fact", "test");
    expect(check).toBeNull();
  });
});

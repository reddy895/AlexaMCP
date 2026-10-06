import { describe, it, expect, beforeEach } from 'vitest';
import { db, initDatabase } from '../backend/src/database/db';
import { agentService } from '../backend/src/agent/agentService';

describe('Investigation Lifecycle & Database Persistence', () => {
  beforeEach(() => {
    initDatabase();
  });

  it('should create an investigation with a unique ID and store it in SQLite', async () => {
    const input = 'Suspicious notification test';
    const invId = await agentService.startInvestigation(input);

    expect(invId).toMatch(/^INV-\d{4}$/);

    const record = agentService.getInvestigation(invId);
    expect(record).toBeDefined();
    expect(record?.id).toBe(invId);
    expect(record?.input).toBe(input);
    expect(['started', 'investigating', 'failed']).toContain(record?.status);
    expect(record?.progress).toBeGreaterThanOrEqual(5);
  });

  it('should list investigations from database', () => {
    const list = agentService.listInvestigations(10);
    expect(Array.isArray(list)).toBe(true);
  });

  it('should handle non-existent investigation ID without throwing', () => {
    const result = agentService.getInvestigation('NON-EXISTENT-ID');
    expect(result).toBeNull();
  });
});

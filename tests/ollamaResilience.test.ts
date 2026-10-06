import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaService } from '../backend/src/services/ollamaService';
import { z } from 'zod';

describe('OllamaService Resilience & Graceful Fallback', () => {
  let service: OllamaService;

  beforeEach(() => {
    service = new OllamaService();
    vi.restoreAllMocks();
  });

  it('should handle Ollama unavailable gracefully without throwing', async () => {
    // Mock fetch to simulate network connection refused
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

    const health = await service.checkHealth();
    expect(health.available).toBe(false);
    expect(health.model_available).toBe(false);

    const schema = z.object({ verdict: z.string() });
    const result = await service.reasonOverEvidence('Test prompt', schema);

    expect(result.data).toBeNull();
    expect(result.usedFallback).toBe(true);
    expect(result.error).toContain('offline or unreachable');
  });

  it('should parse valid structured JSON from Ollama', async () => {
    const mockHealthVersion = { ok: true, json: async () => ({ version: '0.35.1' }) };
    const mockHealthTags = { ok: true, json: async () => ({ models: [{ name: 'qwen2.5:1.5b' }] }) };
    const mockGenerate = {
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          verdict: 'LIKELY_PHISHING',
          confidence: 'high'
        })
      })
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/version')) return mockHealthVersion as any;
      if (urlStr.includes('/api/tags')) return mockHealthTags as any;
      return mockGenerate as any;
    });

    const schema = z.object({
      verdict: z.string(),
      confidence: z.string()
    });

    const result = await service.reasonOverEvidence('Analyze this evidence', schema);
    expect(result.data).toBeDefined();
    expect(result.data?.verdict).toBe('LIKELY_PHISHING');
    expect(result.usedFallback).toBe(false);
  });

  it('should retry once when output is malformed before falling back', async () => {
    let callCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/version')) return { ok: true, json: async () => ({ version: '0.35.1' }) } as any;
      if (urlStr.includes('/api/tags')) return { ok: true, json: async () => ({ models: [{ name: 'qwen2.5:1.5b' }] }) } as any;

      callCount++;
      if (callCount === 1) {
        // Return non-matching schema on first call
        return {
          ok: true,
          json: async () => ({ response: '{"unrelated_field": "some data"}' })
        } as any;
      } else {
        // Return valid schema on retry
        return {
          ok: true,
          json: async () => ({ response: '{"verdict": "MISLEADING", "score": 60}' })
        } as any;
      }
    });

    const schema = z.object({
      verdict: z.string(),
      score: z.number()
    });

    const result = await service.reasonOverEvidence('Analyze evidence', schema);
    expect(result.data).toBeDefined();
    expect(result.data?.verdict).toBe('MISLEADING');
    expect(callCount).toBe(2); // Initial call + 1 correction retry
  });
});

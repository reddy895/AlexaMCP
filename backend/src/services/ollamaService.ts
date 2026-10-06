import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export interface OllamaHealthStatus {
  available: boolean;
  version?: string;
  model: string;
  model_available: boolean;
  installed_models: string[];
  error?: string;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
    this.timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS || '45000', 10);
  }

  async checkHealth(): Promise<OllamaHealthStatus> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const verRes = await fetch(`${this.baseUrl}/api/version`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!verRes.ok) {
        return {
          available: false,
          model: this.model,
          model_available: false,
          installed_models: [],
          error: `Ollama returned status ${verRes.status}`
        };
      }

      const verData = (await verRes.json()) as { version?: string };

      const tagsRes = await fetch(`${this.baseUrl}/api/tags`);
      let installedModels: string[] = [];
      if (tagsRes.ok) {
        const tagsData = (await tagsRes.json()) as { models?: Array<{ name: string }> };
        installedModels = (tagsData.models || []).map(m => m.name);
      }

      const isModelPresent = installedModels.some(
        name => name === this.model || name.startsWith(this.model) || this.model.startsWith(name.split(':')[0])
      );

      return {
        available: true,
        version: verData.version,
        model: this.model,
        model_available: isModelPresent,
        installed_models: installedModels
      };
    } catch (err: any) {
      return {
        available: false,
        model: this.model,
        model_available: false,
        installed_models: [],
        error: err.message
      };
    }
  }

  /**
   * Generates structured JSON output from Ollama reasoning over tool evidence.
   * Enforces Zod schema validation, retries once if malformed, and fails gracefully.
   */
  async reasonOverEvidence<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    systemPrompt: string = 'You are a meticulous AI forensic investigation engine. You strictly analyze verified evidence gathered by investigative tools. You NEVER invent claims or facts. Respond ONLY in valid JSON matching the exact schema requested.'
  ): Promise<{ data: T | null; error?: string; usedFallback: boolean }> {
    const health = await this.checkHealth();
    if (!health.available) {
      return {
        data: null,
        error: 'Ollama is offline or unreachable',
        usedFallback: true
      };
    }

    // First attempt
    try {
      const rawText = await this.callGenerate(prompt, systemPrompt);
      const parsedJson = this.extractJson(rawText);
      const validation = schema.safeParse(parsedJson);

      if (validation.success) {
        return { data: validation.data, usedFallback: false };
      }

      console.warn('[OllamaService] Output did not match schema. Retrying once with error feedback...', validation.error.message);

      // Retry once with correction prompt
      const correctionPrompt = `
The previous output did not match the required JSON schema:
Errors: ${validation.error.message}
Your previous output was:
${rawText}

Original task:
${prompt}

Respond ONLY with valid JSON strictly conforming to the required schema.
`;
      const retryRaw = await this.callGenerate(correctionPrompt, systemPrompt);
      const retryParsed = this.extractJson(retryRaw);
      const retryValidation = schema.safeParse(retryParsed);

      if (retryValidation.success) {
        return { data: retryValidation.data, usedFallback: false };
      }

      return {
        data: null,
        error: `Failed schema validation after retry: ${retryValidation.error.message}`,
        usedFallback: true
      };
    } catch (err: any) {
      console.error('[OllamaService] Error during LLM reasoning:', err.message);
      return {
        data: null,
        error: err.message,
        usedFallback: true
      };
    }
  }

  private async callGenerate(prompt: string, system: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          system,
          prompt,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.9
          }
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama API error (${res.status}): ${text}`);
      }

      const json = (await res.json()) as { response: string };
      return json.response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractJson(text: string): any {
    const clean = text.trim();
    try {
      return JSON.parse(clean);
    } catch {
      // Find JSON markdown fences or outermost {}
      const jsonMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || clean.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('No valid JSON could be extracted from model output');
    }
  }
}

export const ollamaService = new OllamaService();

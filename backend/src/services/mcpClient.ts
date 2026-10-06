import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { db } from '../database/db.js';
import crypto from 'crypto';

export class McpClientService {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private serverUrl: string;
  private isConnected = false;

  constructor(serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000/sse') {
    this.serverUrl = serverUrl;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client) return;

    try {
      this.transport = new SSEClientTransport(new URL(this.serverUrl));
      this.client = new Client(
        {
          name: 'alexa-investigation-agent',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log(`[MCP Client] Connected successfully to ${this.serverUrl}`);
    } catch (err: any) {
      this.isConnected = false;
      this.client = null;
      console.warn(`[MCP Client] Connection to ${this.serverUrl} failed: ${err.message}. Reconnect will be attempted on next call.`);
      throw err;
    }
  }

  async ensureConnected(): Promise<Client> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }
    return this.client!;
  }

  async listTools(): Promise<any[]> {
    const client = await this.ensureConnected();
    const result = await client.listTools();
    return result.tools || [];
  }

  async executeTool<T = any>(
    investigationId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const callId = `TC-${crypto.randomUUID().slice(0, 8)}`;
    const inputSummary = JSON.stringify(args).slice(0, 150);

    try {
      const client = await this.ensureConnected();
      const response = await client.callTool({
        name: toolName,
        arguments: args
      });

      const duration = Date.now() - startTime;

      if (response.isError) {
        const errorText = (response.content as any[])?.[0]?.text || 'Tool returned an error';
        this.recordToolCall(callId, investigationId, toolName, 'error', duration, errorText.slice(0, 200), inputSummary);
        throw new Error(`MCP tool ${toolName} failed: ${errorText}`);
      }

      const text = (response.content as any[])?.[0]?.text || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      const resultSummary = typeof parsed === 'object'
        ? (parsed.status || parsed.verdict || (parsed.claims ? `${parsed.claims.length} claims` : JSON.stringify(parsed).slice(0, 150)))
        : String(parsed).slice(0, 150);

      this.recordToolCall(callId, investigationId, toolName, 'success', duration, String(resultSummary), inputSummary);

      return parsed as T;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      this.recordToolCall(callId, investigationId, toolName, 'failed', duration, err.message.slice(0, 200), inputSummary);
      throw err;
    }
  }

  private recordToolCall(
    id: string,
    investigationId: string,
    toolName: string,
    status: string,
    duration: number,
    resultSummary: string,
    inputSummary: string
  ) {
    try {
      const stmt = db.prepare(`
        INSERT INTO tool_calls (id, investigation_id, tool_name, status, duration, result_summary, input_summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, investigationId, toolName, status, duration, resultSummary, inputSummary, new Date().toISOString());
    } catch (err: any) {
      console.error('[McpClient] Failed to log tool call to DB:', err.message);
    }
  }
}

export const mcpClient = new McpClientService();

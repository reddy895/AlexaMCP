import { Investigation, SystemHealth } from '../types/investigation';

const API_BASE = 'http://localhost:4000/api';
const MCP_BASE = 'http://localhost:3000';

export async function checkSystemHealth(): Promise<SystemHealth> {
  let backendOk = false;
  let ollamaStatus = {
    available: false,
    version: undefined as string | undefined,
    model: 'qwen2.5:1.5b',
    model_available: false
  };

  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    backendOk = res.ok;
  } catch {
    backendOk = false;
  }

  try {
    const oRes = await fetch(`${API_BASE}/ollama/health`, { signal: AbortSignal.timeout(3000) });
    if (oRes.ok) {
      const data = await oRes.json();
      ollamaStatus = {
        available: data.available,
        version: data.version,
        model: data.model,
        model_available: data.model_available
      };
    }
  } catch {
    // Ollama offline
  }

  let mcpOk = false;
  try {
    const mRes = await fetch(`${MCP_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    mcpOk = mRes.ok;
  } catch {
    mcpOk = false;
  }

  return {
    backend: backendOk,
    mcpServer: mcpOk,
    ollama: ollamaStatus
  };
}

export async function startInvestigation(content: string): Promise<{ investigation_id: string }> {
  const res = await fetch(`${API_BASE}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details?.join(', ') || 'Failed to start investigation');
  }

  return res.json();
}

export async function getInvestigation(id: string): Promise<Investigation> {
  const res = await fetch(`${API_BASE}/investigate/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to load investigation ${id}`);
  }
  return res.json();
}

export async function getInvestigationActivity(id: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/investigate/${id}/activity`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.tool_calls || [];
}

export async function getInvestigationHistory(): Promise<Investigation[]> {
  try {
    const res = await fetch(`${API_BASE}/investigations`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.investigations || [];
  } catch {
    return [];
  }
}

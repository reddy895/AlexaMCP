# HTTP & Protocol API Reference

The Alexa + MCP Question-Answering Assistant exposes a production-ready backend service over HTTP and Streamable HTTP (Model Context Protocol).

## 1. Overview of Endpoints

| Endpoint | Method | Transport | Auth Required | Description |
|---|---|---|---|---|
| `/mcp` | `POST` | Streamable HTTP (SSE) | Optional (Bearer) | Official MCP protocol endpoint for initialization, tool discovery, and tool invocation. |
| `/mcp` | `GET` / `DELETE` | HTTP | No | Returns `405 Method Not Allowed` per MCP Streamable HTTP specifications. |
| `/healthz` | `GET` | HTTP JSON | No | Basic liveness probe returning `{ "ok": true }`. |
| `/api/system/status` | `GET` | HTTP JSON | Optional (Bearer) | Comprehensive operational readiness diagnostics for model, database, tools, and retrieval. |
| `/api/assistant` | `POST` | HTTP JSON | Optional (Bearer) | Direct programmatic question-answering endpoint bypassing MCP client wrapping. |
| `/api/voice/*` | Multiple | HTTP JSON / Audio | No | Voice dialogue manager, text-to-speech audio streams, and transcription endpoints. |

---

## 2. Authentication

When remote access authentication is configured via `AUTH_TOKEN`, incoming HTTP requests must supply an `Authorization` header with a Bearer token:

```http
Authorization: Bearer <AUTH_TOKEN>
```

Authentication is validated using constant-time cryptographic comparison (`crypto.timingSafeEqual`) to prevent timing attack vulnerabilities. If `AUTH_TOKEN` is unset or blank, the service operates in secure local-development mode (localhost only).

---

## 3. Endpoints Detail

### 3.1 MCP Streamable HTTP (`POST /mcp`)

Implements the official Model Context Protocol (MCP) TypeScript SDK transport. Clients establish a connection and exchange JSON-RPC 2.0 messages over Server-Sent Events (SSE) or chunked HTTP streaming.

#### Headers:
- `Content-Type: application/json`
- `Accept: application/json, text/event-stream`

#### Protocol Capabilities:
- `tools`: Full dynamic tool discovery and tool execution with typed Zod schemas.
- `resources`: Read-only system and project resources (`system://status`, `project://structure`).
- `prompts`: Guided prompt templates (`investigate_claim`, `code_review`, `project_overview`).

---

### 3.2 System Diagnostics (`GET /api/system/status`)

Returns real-time health checks of all backend subsystems without leaking sensitive configuration or credentials.

#### Response Example (`200 OK`):
```json
{
  "status": "ready",
  "modelProvider": {
    "provider": "ollama",
    "model": "qwen2.5:3b",
    "reachable": true,
    "hasModel": true,
    "availableModels": ["qwen2.5:3b", "llama3.2:1b"]
  },
  "database": {
    "status": "connected",
    "path": "./.data/assistant.db",
    "walMode": true
  },
  "retrieval": {
    "status": "operational",
    "indexedDocuments": 14,
    "totalChunks": 86
  },
  "tools": {
    "registeredCount": 13
  },
  "metrics": {
    "uptimeSeconds": 3600,
    "totalRequests": 142,
    "activeDeadlines": 0
  }
}
```

---

### 3.3 Direct Assistant Query (`POST /api/assistant`)

Allows client applications to submit natural-language queries directly.

#### Request Body:
```json
{
  "query": "What tools are available to you and how does the project work?",
  "userId": "user_123",
  "scope": "project_alpha",
  "maxSteps": 6,
  "timeoutMs": 30000,
  "confirmationToken": "optional_token_for_mutating_actions"
}
```

#### Response Example (`200 OK`):
```json
{
  "status": "success",
  "answer": "I have access to 13 tools including inspect_repository, search_knowledge, manage_memory, analyze_error, and get_system_status...",
  "citations": [
    {
      "sourceId": "doc_a1b2c3",
      "filePath": "docs/ARCHITECTURE.md",
      "excerpt": "The Alexa + MCP assistant is built on evidence grounding...",
      "score": 0.92
    }
  ],
  "executedTools": [
    {
      "toolName": "get_system_status",
      "status": "success",
      "durationMs": 42
    }
  ],
  "metadata": {
    "durationMs": 1450,
    "stepsCount": 2,
    "modelUsed": "qwen2.5:3b",
    "intent": "SYSTEM_STATUS"
  }
}
```

#### Confirmation-Required Response (`200 OK` with special status):
```json
{
  "status": "confirmation_required",
  "answer": "Action 'manage_memory' affecting resource 'db_pass' requires explicit confirmation before execution.",
  "proposedAction": {
    "actionId": "manage_memory",
    "resource": "db_pass",
    "confirmationToken": "4f9b8c2d1e0a...",
    "expiresAt": "2026-10-14T11:00:00.000Z"
  }
}
```

---

## 4. Standard Error Taxonomy

Errors returned by the service conform to structured JSON contracts:

| Error Code | HTTP Status | Description |
|---|---|---|
| `invalid_input` | 400 | Request validation failed (Zod schema issue or query length violation). |
| `authentication_failed` | 401 | Missing or invalid Bearer authentication token. |
| `permission_denied` | 403 | Attempted access to paths outside approved directory boundaries or forged token. |
| `rate_limit_exceeded` | 429 | In-flight concurrency limit or client token bucket depleted. |
| `provider_timeout` | 504 | LLM provider or tool execution exceeded execution deadline. |
| `internal_error` | 500 | Unhandled internal exception safely caught without leaking stack traces. |

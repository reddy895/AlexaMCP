# Configuration Specification

All runtime configuration for the Alexa + MCP Assistant is managed via environment variables and validated at startup using a strict **Zod** schema (`src/config/schema.ts`). If any required variable is invalid or out of range, the server terminates immediately with human-readable error descriptions.

---

## Supported Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Integer | `3001` | HTTP and Streamable HTTP server listening port. |
| `HOST` | String | `0.0.0.0` | Network binding interface. |
| `NODE_ENV` | String | `development` | Runtime environment (`development`, `production`, `test`). |
| `OLLAMA_BASE_URL` | URL | `http://127.0.0.1:11434` | Base URL for the local Ollama LLM provider. |
| `OLLAMA_MODEL` | String | `qwen2.5:3b` | Default model tag used for tool calling and reasoning. |
| `OLLAMA_TIMEOUT_MS` | Integer | `30000` | Request timeout for Ollama chat and completion calls (ms). |
| `SQLITE_PATH` | String | `./.data/assistant.db` | Filesystem path for the SQLite database. |
| `APPROVED_DOC_DIRS` | Comma List | `.` | Approved comma-separated relative or absolute directories for document indexing. |
| `WORKSPACE_ROOT` | String | Current Working Dir | Approved root directory boundary for repository inspection and indexing. |
| `AUTH_TOKEN` | String | *(empty)* | Optional Bearer token for remote authentication. If empty, local-dev mode is active. |
| `MAX_STEPS` | Integer | `8` | Maximum autonomous multi-step tool calls allowed per query before loop breaker fires. |
| `MAX_TOOL_CALLS_PER_STEP` | Integer | `3` | Maximum parallel tool calls allowed in a single model turn. |
| `RETRIEVAL_CHUNK_SIZE` | Integer | `500` | Target token/character length for knowledge chunk segmentation. |
| `RETRIEVAL_CHUNK_OVERLAP` | Integer | `50` | Overlap between adjacent chunks for semantic continuity. |
| `RATE_LIMIT_RPS` | Integer | `20` | Token bucket replenishment rate (requests per second). |
| `RATE_LIMIT_BURST` | Integer | `50` | Maximum token bucket burst capacity. |
| `LOG_LEVEL` | String | `info` | Structured logging verbosity (`debug`, `info`, `warn`, `error`). |
| `CONFIRMATION_SECRET` | String | `alexa-mcp-internal-action-key` | Secret key used to sign HMAC-SHA256 two-phase confirmation tokens. |

---

## Example Configuration File (`.env`)

```ini
# Server Network Settings
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Local Model Provider
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_MS=30000

# Persistent Storage
SQLITE_PATH=./.data/assistant.db

# Workspace Boundaries
APPROVED_DOC_DIRS=.,docs,src
WORKSPACE_ROOT=.

# Security & Concurrency
AUTH_TOKEN=
RATE_LIMIT_RPS=20
RATE_LIMIT_BURST=50
MAX_STEPS=8

# Retrieval Parameters
RETRIEVAL_CHUNK_SIZE=500
RETRIEVAL_CHUNK_OVERLAP=50

# Logging
LOG_LEVEL=info
```

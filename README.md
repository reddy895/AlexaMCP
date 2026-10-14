# Alexa + MCP Question-Answering AI Assistant

A production-quality, backend-only AI assistant that combines evidence-grounded reasoning, local zero-cost LLMs (via Ollama), persistent SQLite memory, lexical knowledge retrieval, and the official Model Context Protocol (MCP) Streamable HTTP transport.

The assistant intelligently answers user questions—distinguishing between direct conceptual reasoning, local document retrieval, multi-tool orchestration, scoped memory recall, and consequential actions requiring two-phase confirmation.

---

## 1. Key Capabilities

- **Evidence-Grounded Question Answering**: Distinguishes direct conceptual questions from questions requiring workspace inspection or document search. If evidence is missing, it admits the limitation directly rather than hallucinating.
- **Official MCP Streamable HTTP Server**: Exposes standard MCP tools, resources, and prompts over Streamable HTTP (`/mcp`) for seamless integration with Claude Desktop, Cursor, and custom clients.
- **100% Local & Zero-Cost Stack**: Powered by Ollama (`qwen2.5:3b` default) and Node.js 22 native SQLite (`DatabaseSync`), requiring zero paid cloud API keys.
- **Local Knowledge Retrieval**: Incremental document ingestion, tokenized chunking, and lexical BM25 ranking over local Markdown, code, and documentation files with source attribution.
- **Scoped Persistent Memory**: Stores explicit user preferences and project facts across server restarts with scope isolation and expiration policies.
- **Production Security Defaults**: Token-bucket rate limiting, workspace boundary guard (path traversal prevention), two-phase cryptographic confirmation for mutating actions (`HMAC-SHA256`), constant-time bearer authentication, and automated PII redaction.
- **Conversational Voice Dialogue & Legacy Tools**: Preserves Digital Detective scam/fraud investigation tools and conversational voice dialogue capabilities.

---

## 2. Architecture Overview

```
[MCP Client / Alexa Voice / HTTP Client]
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ 1. Transport & Ingress Security                        │
│    - Streamable HTTP Transport (POST /mcp)             │
│    - Token-Bucket Rate Limiter & Concurrency Guard     │
│    - Constant-Time Bearer Auth (timingSafeEqual)       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Request Lifecycle & Context                         │
│    - Correlation ID, Monotonic Deadlines, Scopes       │
│    - Intent Classifier & Loop Detection                │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼                           ▼
┌────────────────────────────┐ ┌─────────────────────────┐
│ 3. Core Tool Registry      │ │ 4. Knowledge Retrieval  │
│    - Typed Zod Schemas     │ │    - Content Hashing    │
│    - 2-Phase Confirmation  │ │    - Lexical BM25 Search│
│    - Bounded Timeouts      │ │    - Provenance Builder │
└──────────────┬─────────────┘ └───────────┬─────────────┘
               │                           │
               ▼                           ▼
┌────────────────────────────────────────────────────────┐
│ 5. SQLite Persistent Storage (Native WAL Mode)         │
│    - Versioned Migrations, Parameterized Queries       │
│    - Scoped Memory Repository & Document Index         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 6. Model Provider Abstraction                          │
│    - Ollama Client with Preflight & Exponential Backoff│
│    - Mock Provider for 100% Deterministic Testing      │
└────────────────────────────────────────────────────────┘
```

---

## 3. Requirements

- **Node.js**: v22 LTS (supports native `node:sqlite`)
- **Ollama**: Local AI runner (`curl -fsSL https://ollama.com/install.sh | sh`)
- **Platform**: Linux / macOS / WSL

---

## 4. Installation & Setup

### 4.1 Clone and Install Dependencies

```bash
git clone <repository-url>
cd "Alexa MCP"
npm install
```

### 4.2 Ollama Model Configuration

1. Start the Ollama daemon:
   ```bash
   ollama serve
   ```
2. Pull the default model:
   ```bash
   ollama pull qwen2.5:3b
   ```
   *(Optional lightweight alternatives: `ollama pull qwen2.5:1.5b` or `ollama pull llama3.2:1b`)*

3. Run provider diagnostics:
   ```bash
   npm run diagnostics
   ```

---

## 5. Running the Server

### 5.1 Start MCP Server (Streamable HTTP)

```bash
npm run server
```
Server starts on `http://localhost:3001` with:
- `POST /mcp`: Streamable HTTP MCP endpoint
- `GET /healthz`: Basic health probe
- `GET /api/system/status`: Real-time system diagnostics

### 5.2 Interactive Text / Voice REPL

```bash
# Interactive Text REPL
npm run agent:text

# Two-Way Conversational Voice Agent
npm run agent:voice
```

---

## 6. MCP Client Configuration

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "alexa-assistant": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

### Cursor IDE
1. Open **Settings -> Features -> MCP Servers**.
2. Click **Add New MCP Server**.
3. Set **Type** to `SSE` or `Streamable HTTP` with URL: `http://localhost:3001/mcp`.

---

## 7. Available Core MCP Tools

| Tool | Description |
|---|---|
| `ask_assistant` | Evidence-grounded natural-language question answering with automated tool orchestration. |
| `search_knowledge` | Lexical BM25 search across indexed project documents and Markdown files. |
| `inspect_repository` | Workspace structure, dependency analysis, and file inspection within safe boundaries. |
| `analyze_error` | Root-cause analysis of stack traces, error messages, and test failures. |
| `manage_memory` | Save, retrieve, list, or delete scoped user preferences with explicit confirmation for deletion. |
| `get_system_status` | Operational health diagnostics for Ollama, SQLite, tools, and retrieval status. |
| *Digital Detective Suite* | `inspect_url`, `extract_claims`, `analyze_message`, `search_evidence`, `calculate_risk`. |

---

## 8. Example Questions & Invocations

- *"Explain how my project works and what dependencies are installed."*  
  -> Automatically routes to `inspect_repository`.
- *"Find the root cause of this error: TypeError: Cannot read properties of undefined (reading 'digest')"*  
  -> Automatically routes to `analyze_error`.
- *"Search documentation for how rate limiting is configured."*  
  -> Retrieves excerpts and citations from `docs/CONFIGURATION.md`.
- *"Remember that my target deployment environment is Ubuntu 24.04 LTS."*  
  -> Saves preference to scoped SQLite memory.
- *"What did I ask you to remember?"*  
  -> Recalls scoped preferences from memory.
- *"Delete all memories from infra scope."*  
  -> Halts and requests explicit two-phase confirmation before executing.

---

## 9. Testing & Verification

The test suite runs 100% offline without requiring a running Ollama daemon or paid APIs:

```bash
# Run all Vitest suites (unit, integration, security, E2E)
npm test

# Run specific suites
npm run test:unit
npm run test:integration
npm run test:security
npm run test:e2e

# Run legacy regression, contradiction, and voice suites
npm run test:regression
npm run test:legacy
npm run test:contradiction
npm run test:voice

# Full verification across all suites
npm run test:all
```

---

## 10. Security & Threat Model

- **Path Traversal Protection**: Filesystem access is strictly restricted to `WORKSPACE_ROOT`. Directory traversal sequences (`..`) are rejected.
- **Two-Phase Confirmation**: Consequential and mutating actions generate a cryptographic HMAC token and require confirmation before modifying state.
- **PII & Credential Redaction**: Automated sanitization masks API keys, passwords, and personal data in logs.
- **Constant-Time Comparison**: Bearer tokens are compared using `crypto.timingSafeEqual`.
- **SQL Injection Prevention**: 100% parameterized SQL prepared statements.

---

## 11. Documentation Index

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Full architectural philosophy, component diagrams, and 12-step lifecycle.
- [docs/API.md](docs/API.md): HTTP endpoints, SSE transport, status codes, and JSON error taxonomy.
- [docs/MCP_CLIENT_SETUP.md](docs/MCP_CLIENT_SETUP.md): Configuration guides for Claude, Cursor, and custom clients.
- [docs/CONFIGURATION.md](docs/CONFIGURATION.md): Complete list of environment variables and defaults.
- [docs/SECURITY.md](docs/SECURITY.md): Threat model, boundaries, and production hardening checklist.
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md): Solutions for missing models, port collisions, and database recovery.
- [docs/COMMIT_PLAN.md](docs/COMMIT_PLAN.md): 80-commit engineering roadmap and verification log.

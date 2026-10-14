# Implementation Plan: Production-Quality Question-Answering AI Assistant

## 1. Repository Audit & Baseline Assessment

### 1.1 Existing Architecture
The repository originally implemented **Digital Detective**, an AI-powered scam and fraud investigation assistant:
- **Transport**: MCP Streamable HTTP endpoint implemented using Express and `@modelcontextprotocol/sdk` (v1.11.0).
- **Tools**: 7 domain-specific fraud investigation tools: `extract_claims`, `analyze_message`, `inspect_url`, `search_evidence`, `cross_reference`, `calculate_risk`, and `generate_investigation_report`.
- **Agent**: An iterative agent in `src/agent.ts` with hardcoded system prompt and sequential fraud investigation pipeline.
- **Voice Stack**: Multi-backend TTS (`edge-tts`, `spd-say`, `piper`, `espeak-ng`), audio player, cache, earcons, and Whisper STT.
- **Storage**: In-memory ephemeral objects with no persistent SQLite database for memory, user preferences, or knowledge retrieval.
- **Model Integration**: Direct `fetch` calls to `http://localhost:11434/api/chat` with hardcoded `qwen2.5:3b` defaults, lacking provider abstractions, retry policies, or mock implementations for testing.

### 1.2 Gaps Identified
1. **General Question-Answering Deficit**: The assistant could only execute the rigid 7-step scam investigation pipeline and could not answer general conceptual questions, explain project code, inspect repositories, or handle general queries without error.
2. **Missing Knowledge Retrieval Engine**: No local document discovery, safe chunking, content hashing, SQLite persistence, or full-text retrieval.
3. **Missing Persistent Memory**: No database-backed storage for user preferences, project facts, or scoped context.
4. **Lack of Model Provider Abstraction**: Tight coupling to Ollama HTTP API without mock support, leading to fragile automated tests when Ollama is offline.
5. **Security Deficits**: Need for strict workspace boundary enforcement, path traversal guards, secret redaction in logs/responses, and two-phase confirmation for mutating actions.
6. **Testing Gaps**: Legacy tests required a live MCP server and live Ollama instance, causing failures in isolated CI environments.

---

## 2. Target Architecture

```
                    ┌─────────────────────────────────┐
                    │  MCP Client / CLI / Voice / API │
                    └────────────────┬────────────────┘
                                     │ Streamable HTTP / Direct
                                     ▼
                    ┌─────────────────────────────────┐
                    │    Security & Transport Layer   │
                    │  - Rate Limiter & Concurrency   │
                    │  - Authentication & Headers     │
                    │  - Streamable HTTP Transport    │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │    Core Assistant Orchestrator   │
                    │  - Intent Classifier            │
                    │  - Execution Context & Deadline │
                    │  - Loop Prevention & Provenance │
                    └───────┬─────────────────┬───────┘
                            │                 │
              ┌─────────────┴──────┐   ┌──────┴─────────────┐
              ▼                    │   │                    ▼
┌───────────────────────────┐      │   │     ┌───────────────────────────┐
│       Tools Engine        │      │   │     │    Retrieval Subsystem    │
│ - ask_assistant           │      │   │     │ - Document Loader         │
│ - search_knowledge        │◄─────┘   └────►│ - Content Chunker         │
│ - inspect_repository      │                │ - SQLite Lexical Search   │
│ - analyze_error           │                │ - Citations & Provenance  │
│ - manage_memory           │                └───────────────────────────┘
│ - get_system_status       │
│ - (Digital Detective 7)   │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐                ┌───────────────────────────┐
│     SQLite Storage        │                │    LLM Provider Layer     │
│ - Versioned Migrations    │                │ - Ollama Local Provider   │
│ - Memory Repository       │                │ - Mock Testing Provider   │
│ - Knowledge Index         │                │ - Dynamic Capability Check│
└───────────────────────────┘                └───────────────────────────┘
```

---

## 3. Engineering Milestones (80 Commits)

- **Phase 1 (Commits 01–08)**: Baseline tooling, configuration, schema validation, logging, architecture specs.
- **Phase 2 (Commits 09–18)**: Core assistant engine, request lifecycle, typed errors, multi-step orchestration.
- **Phase 3 (Commits 19–28)**: Model provider interface, Ollama client, health diagnostics, mock provider.
- **Phase 4 (Commits 29–38)**: Streamable HTTP transport, MCP tool/resource/prompt registration, client integration.
- **Phase 5 (Commits 39–48)**: Core tools (`ask_assistant`, `inspect_repository`, `analyze_error`, etc.), central registry.
- **Phase 6 (Commits 49–56)**: SQLite connection manager, migrations, memory service, retention policies.
- **Phase 7 (Commits 57–64)**: Document ingestion, chunking, full-text index, citations, grounded answers.
- **Phase 8 (Commits 65–72)**: Security hardening (path traversal, secret redaction, confirmation protocol).
- **Phase 9 (Commits 73–78)**: Comprehensive unit, integration, security, and e2e test suites.
- **Phase 10 (Commits 79–80)**: Complete documentation suite and release readiness verification.

---

## 4. Acceptance Criteria

1. **Non-Negotiable QA**: Answers direct conceptual queries without unnecessary tools, while employing tools when evidence or actions are requested.
2. **Local Zero-Cost Execution**: Operates completely offline with Ollama and SQLite without paid third-party APIs.
3. **MCP Streamable HTTP**: Exposes standard MCP protocol over Streamable HTTP verified via official SDK client.
4. **Tested Boundaries**: All paths, file boundaries, and input schemas enforced in application code with automated security tests.
5. **No Regressions**: Existing voice pipelines, earcons, and digital detective tool contracts remain functional.

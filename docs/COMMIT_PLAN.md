# Engineering Commit Plan: Alexa + MCP Question-Answering Assistant

This plan tracks 80 distinct, reviewable engineering milestones transforming the repository into a production-quality, evidence-grounded AI assistant.

| # | Hash | Status | Phase | Conventional Commit Title | Verification Result |
|---|------|--------|-------|---------------------------|---------------------|
| 01 | `6b0c831` | Done | Baseline & Tooling | `chore: establish baseline vitest configuration and test scripts` | vitest passes (2 tests) |
| 02 | `1cb5176` | Done | Architecture & Audit | `docs: document repository audit findings and implementation plan` | verified markdown |
| 03 | `bf5b099` | Done | Configuration | `chore: configure environment variable schema and validation` | vitest passes (6 tests) |
| 04 | `4c228fe` | Done | Strict Typing | `chore: update tsconfig and strict typing configuration` | tsc --noEmit passes |
| 05 | `9060d51` | Done | Observability | `chore: add structured json logging infrastructure` | vitest passes (8 tests) |
| 06 | `233c650` | Done | Storage Isolation | `chore: create database gitignore rules and local data directory isolation` | git status clean |
| 07 | `PENDING` | In Progress | Commit Tracking | `chore: establish commit plan tracking document with 80 milestones` | self-tracking |
| 08 | `PENDING` | Planned | System Architecture | `docs: author system architecture specification and component boundaries` | docs validated |
| 09 | `PENDING` | Planned | Assistant Core | `feat(core): define assistant domain types, execution context, and result models` | typecheck passed |
| 10 | `PENDING` | Planned | Typed Errors | `feat(core): implement comprehensive typed error taxonomy and codes` | unit tests |
| 11 | `PENDING` | Planned | Intent Classification | `feat(core): implement natural-language intent classification and query analyzer` | unit tests |
| 12 | `PENDING` | Planned | Execution Lifecycle | `feat(core): implement request normalizer and execution deadline controller` | unit tests |
| 13 | `PENDING` | Planned | Authorization Context | `feat(core): implement authorization and confirmation context evaluator` | unit tests |
| 14 | `PENDING` | Planned | Evidence Provenance | `feat(core): implement evidence provenance and citation builder` | unit tests |
| 15 | `PENDING` | Planned | Assistant Pipeline | `feat(core): implement central assistant service and execution pipeline` | unit tests |
| 16 | `PENDING` | Planned | Multi-Step Orchestrator | `feat(core): implement multi-step orchestration engine with loop prevention` | unit tests |
| 17 | `PENDING` | Planned | Missing Evidence Logic | `feat(core): implement missing evidence detection and transparent admission logic` | unit tests |
| 18 | `PENDING` | Planned | Core Verification | `test(core): add unit tests for assistant lifecycle, errors, and orchestration` | unit tests passed |
| 19 | `PENDING` | Planned | LLM Provider Interface | `feat(provider): define language model provider interface and contracts` | typecheck passed |
| 20 | `PENDING` | Planned | Ollama Client | `feat(provider): implement ollama http client with connection timeouts and cancellation` | unit tests |
| 21 | `PENDING` | Planned | Provider Health | `feat(provider): implement ollama health check and model availability diagnostics` | unit tests |
| 22 | `PENDING` | Planned | Capability Detection | `feat(provider): implement dynamic model capability and context window detection` | unit tests |
| 23 | `PENDING` | Planned | Tool Calling Bridge | `feat(provider): implement structured tool call generation and payload normalization` | unit tests |
| 24 | `PENDING` | Planned | Retry Policies | `feat(provider): implement transient error retry policy with exponential backoff` | unit tests |
| 25 | `PENDING` | Planned | Prompt Sanitization | `feat(provider): implement safe prompt framing and prompt-injection sanitization` | unit tests |
| 26 | `PENDING` | Planned | Mock Model Provider | `feat(provider): implement mock language model provider for deterministic testing` | unit tests |
| 27 | `PENDING` | Planned | Model CLI Diagnostic | `feat(provider): implement cli model diagnostic tool for local installation verification` | cli verified |
| 28 | `PENDING` | Planned | Provider Verification | `test(provider): add comprehensive unit and failure mode tests for ollama provider` | test suite passed |
| 29 | `PENDING` | Planned | MCP Capabilities | `feat(mcp): define server capabilities and protocol lifecycle contracts` | typecheck passed |
| 30 | `PENDING` | Planned | Streamable HTTP | `feat(mcp): implement streamable http transport handler with session isolation` | unit tests |
| 31 | `PENDING` | Planned | MCP HTTP Routes | `feat(mcp): configure express mcp routes with protocol headers and cors protection` | unit tests |
| 32 | `PENDING` | Planned | MCP Resources | `feat(mcp): implement mcp resource discovery and registration` | unit tests |
| 33 | `PENDING` | Planned | MCP Prompts | `feat(mcp): implement mcp prompt template registration` | unit tests |
| 34 | `PENDING` | Planned | Tool Schema Generator | `feat(mcp): implement mcp tool schema generator with zod validation` | unit tests |
| 35 | `PENDING` | Planned | Graceful Shutdown | `feat(mcp): implement graceful server shutdown and active transport cleanup` | integration tests |
| 36 | `PENDING` | Planned | MCP Auth Middleware | `feat(mcp): implement authenticated endpoint middleware for remote mcp access` | unit tests |
| 37 | `PENDING` | Planned | Standalone Assistant | `feat(mcp): implement standalone direct assistant access without mcp client` | unit tests |
| 38 | `PENDING` | Planned | MCP Protocol Tests | `test(mcp): add integration tests for mcp initialization and tool discovery` | test suite passed |
| 39 | `PENDING` | Planned | Central Tool Registry | `feat(tools): implement central tool registry and metadata repository` | unit tests |
| 40 | `PENDING` | Planned | Tool Execution Limits | `feat(tools): implement tool executor with concurrency bounds and timeouts` | unit tests |
| 41 | `PENDING` | Planned | Tool: ask_assistant | `feat(tools): implement ask_assistant tool for direct and tool-assisted queries` | unit tests |
| 42 | `PENDING` | Planned | Tool: inspect_repository | `feat(tools): implement inspect_repository tool with workspace boundary enforcement` | unit tests |
| 43 | `PENDING` | Planned | Tool: analyze_error | `feat(tools): implement analyze_error tool for logs, stack traces, and test failures` | unit tests |
| 44 | `PENDING` | Planned | Tool: get_system_status | `feat(tools): implement get_system_status tool with real subsystem health checks` | unit tests |
| 45 | `PENDING` | Planned | Tool: search_knowledge | `feat(tools): implement search_knowledge tool bridge for indexed local documents` | unit tests |
| 46 | `PENDING` | Planned | Tool: manage_memory | `feat(tools): implement manage_memory tool for scoped persistent preferences` | unit tests |
| 47 | `PENDING` | Planned | Legacy Tool Bridge | `feat(tools): integrate existing digital detective investigation tools into central registry` | regression tests |
| 48 | `PENDING` | Planned | Tool Contracts | `test(tools): add unit tests for all core tools and input validation contracts` | test suite passed |
| 49 | `PENDING` | Planned | SQLite Manager | `feat(storage): implement sqlite database connection manager and pragmas` | unit tests |
| 50 | `PENDING` | Planned | Migration Engine | `feat(storage): implement versioned schema migration runner with rollback protection` | unit tests |
| 51 | `PENDING` | Planned | Database Schema | `feat(storage): create initial database migration for memories, documents, and chunks` | migration test |
| 52 | `PENDING` | Planned | Memory Repository | `feat(storage): implement memory repository with parameterized queries` | unit tests |
| 53 | `PENDING` | Planned | Memory Service | `feat(storage): implement memory service with scope isolation and explicit intent policies` | unit tests |
| 54 | `PENDING` | Planned | Memory Retention | `feat(storage): implement memory expiration and retention cleanup policy` | unit tests |
| 55 | `PENDING` | Planned | Database Diagnostics | `feat(storage): implement database health diagnostics and backup guidance` | unit tests |
| 56 | `PENDING` | Planned | Storage Verification | `test(storage): add integration tests for database migrations and memory persistence` | test suite passed |
| 57 | `PENDING` | Planned | Document Loader | `feat(retrieval): implement document loader with file allowlist and path traversal checks` | unit tests |
| 58 | `PENDING` | Planned | Content Chunker | `feat(retrieval): implement content chunker with configurable size and overlap` | unit tests |
| 59 | `PENDING` | Planned | Incremental Indexer | `feat(retrieval): implement content hashing and incremental indexer` | unit tests |
| 60 | `PENDING` | Planned | Lexical Search Engine | `feat(retrieval): implement lexical search index with bm25/keyword relevance ranking` | unit tests |
| 61 | `PENDING` | Planned | Excerpt Extractor | `feat(retrieval): implement source metadata extraction and excerpt formatter` | unit tests |
| 62 | `PENDING` | Planned | Evidence Attribution | `feat(retrieval): implement citation builder and evidence verification` | unit tests |
| 63 | `PENDING` | Planned | Index Pruning Service | `feat(retrieval): implement index refresh and stale document pruning service` | unit tests |
| 64 | `PENDING` | Planned | Retrieval Tests | `test(retrieval): add unit and integration tests for document chunking and search ranking` | test suite passed |
| 65 | `PENDING` | Planned | Workspace Boundary Guard | `feat(security): implement path traversal prevention and workspace boundary guard` | security tests |
| 66 | `PENDING` | Planned | Redaction Hardening | `feat(security): implement credential and pii redaction in logs and tool outputs` | security tests |
| 67 | `PENDING` | Planned | Confirmation Protocol | `feat(security): implement two-phase confirmation protocol for mutating actions` | security tests |
| 68 | `PENDING` | Planned | Rate Limiting | `feat(security): implement rate limiter and in-flight request concurrency limiter` | security tests |
| 69 | `PENDING` | Planned | Constant-Time Auth | `feat(security): implement constant-time secret comparison and api key validation` | security tests |
| 70 | `PENDING` | Planned | Telemetry & Metrics | `feat(observability): implement request telemetry and performance metrics tracker` | unit tests |
| 71 | `PENDING` | Planned | Request Cancellation | `feat(reliability): implement request cancellation and execution deadline propagation` | unit tests |
| 72 | `PENDING` | Planned | Security Test Suite | `test(security): add security tests for path traversal, injection, and authorization` | security suite passed |
| 73 | `PENDING` | Planned | E2E: Direct Reasoning | `test(e2e): implement end-to-end tests for conceptual question answering without tools` | e2e passed |
| 74 | `PENDING` | Planned | E2E: Grounded Answers | `test(e2e): implement end-to-end tests for retrieval-augmented grounded answers` | e2e passed |
| 75 | `PENDING` | Planned | E2E: Inspection & Errors | `test(e2e): implement end-to-end tests for repository inspection and error analysis` | e2e passed |
| 76 | `PENDING` | Planned | E2E: Persistent Memory | `test(e2e): implement end-to-end tests for persistent memory across restarts` | e2e passed |
| 77 | `PENDING` | Planned | E2E: Confirmation Guard | `test(e2e): implement end-to-end tests for confirmation-required actions and permission denials` | e2e passed |
| 78 | `PENDING` | Planned | Legacy Test Alignment | `fix(agent): align legacy acceptance tests with isolated server runner and vitest` | full regression |
| 79 | `PENDING` | Planned | Comprehensive Docs | `docs: author comprehensive documentation suite for api, security, and setup` | markdown lint |
| 80 | `PENDING` | Planned | Release Readiness | `chore: finalize package scripts, release verification, and commit plan records` | all tests verified |

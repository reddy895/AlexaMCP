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
| 07 | `c0cc66b` | Done | Commit Tracking | `chore: establish commit plan tracking document with 80 milestones` | self-tracking verified |
| 08 | `5a51834` | Done | System Architecture | `docs: author system architecture specification and component boundaries` | docs validated |
| 09 | `328f459` | Done | Assistant Core | `feat(core): define assistant domain types, execution context, and result models` | typecheck passed |
| 10 | `dd73fa1` | Done | Typed Errors | `feat(core): implement comprehensive typed error taxonomy and codes` | unit tests |
| 11 | `c1ccaf9` | Done | Intent Classification | `feat(core): implement natural-language intent classification and query analyzer` | unit tests |
| 12 | `9394d8a` | Done | Execution Lifecycle | `feat(core): implement request normalizer and execution deadline controller` | unit tests |
| 13 | `0e16e9e` | Done | Authorization Context | `feat(core): implement authorization and confirmation context evaluator` | unit tests |
| 14 | `5bce4bd` | Done | Evidence Provenance | `feat(core): implement evidence provenance and citation builder` | unit tests |
| 15 | `e858d7e` | Done | Assistant Pipeline | `feat(core): implement central assistant service and execution pipeline` | unit tests |
| 16 | `69493b4` | Done | Multi-Step Orchestrator | `feat(core): implement multi-step orchestration engine with loop prevention` | unit tests |
| 17 | `a97e553` | Done | Missing Evidence Logic | `feat(core): implement missing evidence detection and transparent admission logic` | unit tests |
| 18 | `9911cf1` | Done | Core Verification | `test(core): add unit tests for assistant lifecycle, errors, and orchestration` | unit tests passed (13 tests) |
| 19 | `ef6e926` | Done | LLM Provider Interface | `feat(provider): define language model provider interface and contracts` | typecheck passed |
| 20 | `b437b19` | Done | Ollama Client | `feat(provider): implement ollama http client with connection timeouts and cancellation` | unit tests |
| 21 | `828a2cd` | Done | Provider Health | `feat(provider): implement ollama health check and model availability diagnostics` | unit tests |
| 22 | `88cb373` | Done | Capability Detection | `feat(provider): implement dynamic model capability and context window detection` | unit tests |
| 23 | `3483f1a` | Done | Tool Calling Bridge | `feat(provider): implement structured tool call generation and payload normalization` | unit tests |
| 24 | `75f34bc` | Done | Retry Policies | `feat(provider): implement transient error retry policy with exponential backoff` | unit tests |
| 25 | `7e93d01` | Done | Prompt Sanitization | `feat(provider): implement safe prompt framing and prompt-injection sanitization` | unit tests |
| 26 | `fc82c09` | Done | Mock Model Provider | `feat(provider): implement mock language model provider for deterministic testing` | unit tests |
| 27 | `bf463a6` | Done | Model CLI Diagnostic | `feat(provider): implement cli model diagnostic tool for local installation verification` | cli verified |
| 28 | `eb22df2` | Done | Provider Verification | `test(provider): add comprehensive unit and failure mode tests for ollama provider` | test suite passed (11 tests) |
| 29 | `3aff5fa` | Done | MCP Capabilities | `feat(mcp): define server capabilities and protocol lifecycle contracts` | typecheck passed |
| 30 | `0caff45` | Done | Streamable HTTP | `feat(mcp): implement streamable http transport handler with session isolation` | unit tests |
| 31 | `b636ce4` | Done | MCP HTTP Routes | `feat(mcp): configure express mcp routes with protocol headers and cors protection` | unit tests |
| 32 | `cec7cb8` | Done | MCP Resources | `feat(mcp): implement mcp resource discovery and registration` | unit tests |
| 33 | `acf6d05` | Done | MCP Prompts | `feat(mcp): implement mcp prompt template registration` | unit tests |
| 34 | `8cf7f89` | Done | Tool Schema Generator | `feat(mcp): implement mcp tool schema generator with zod validation` | unit tests |
| 35 | `050f9d4` | Done | Graceful Shutdown | `feat(mcp): implement graceful server shutdown and active transport cleanup` | integration tests |
| 36 | `e34a63d` | Done | MCP Auth Middleware | `feat(mcp): implement authenticated endpoint middleware for remote mcp access` | unit tests |
| 37 | `3b16bd8` | Done | Standalone Assistant | `feat(mcp): implement standalone direct assistant access without mcp client` | unit tests |
| 38 | `347324a` | Done | MCP Protocol Tests | `test(mcp): add integration tests for mcp initialization and tool discovery` | test suite passed (4 tests) |
| 39 | `4f5e33e` | Done | Central Tool Registry | `feat(tools): implement central tool registry and metadata repository` | unit tests |
| 40 | `0e86704` | Done | Tool Execution Limits | `feat(tools): implement tool executor with concurrency bounds and timeouts` | unit tests |
| 41 | `99e4809` | Done | Tool: ask_assistant | `feat(tools): implement ask_assistant tool for direct and tool-assisted queries` | unit tests |
| 42 | `8881552` | Done | Tool: inspect_repository | `feat(tools): implement inspect_repository tool with workspace boundary enforcement` | unit tests |
| 43 | `168cb6a` | Done | Tool: analyze_error | `feat(tools): implement analyze_error tool for logs, stack traces, and test failures` | unit tests |
| 44 | `77722af` | Done | Tool: get_system_status | `feat(tools): implement get_system_status tool with real subsystem health checks` | unit tests |
| 45 | `a68f8b6` | Done | Tool: search_knowledge | `feat(tools): implement search_knowledge tool bridge for indexed local documents` | unit tests |
| 46 | `026bebf` | Done | Tool: manage_memory | `feat(tools): implement manage_memory tool for scoped persistent preferences` | unit tests |
| 47 | `febc942` | Done | Legacy Tool Bridge | `feat(tools): integrate existing digital detective investigation tools into central registry` | regression tests |
| 48 | `c8c605f` | Done | Tool Contracts | `test(tools): add unit tests for all core tools and input validation contracts` | test suite passed (9 tests) |
| 49 | `ce3c925` | Done | SQLite Manager | `feat(storage): implement sqlite database connection manager and pragmas` | unit tests |
| 50 | `1126a3d` | Done | Migration Engine | `feat(storage): implement versioned schema migration runner with rollback protection` | unit tests |
| 51 | `598ed6d` | Done | Database Schema | `feat(storage): create initial database migration for memories, documents, and chunks` | migration test |
| 52 | `a07cf04` | Done | Memory Repository | `feat(storage): implement memory repository with parameterized queries` | unit tests |
| 53 | `185425e` | Done | Memory Service | `feat(storage): implement memory service with scope isolation and explicit intent policies` | unit tests |
| 54 | `5ce4834` | Done | Memory Retention | `feat(storage): implement memory expiration and retention cleanup policy` | unit tests |
| 55 | `c3ba91a` | Done | Database Diagnostics | `feat(storage): implement database health diagnostics and backup guidance` | unit tests |
| 56 | `91b48de` | Done | Storage Verification | `test(storage): add integration tests for database migrations and memory persistence` | test suite passed (8 tests) |
| 57 | `d43993e` | Done | Document Loader | `feat(retrieval): implement document loader with file allowlist and path traversal checks` | unit tests |
| 58 | `ae8a8bb` | Done | Content Chunker | `feat(retrieval): implement content chunker with configurable size and overlap` | unit tests |
| 59 | `e60660f` | Done | Incremental Indexer | `feat(retrieval): implement content hashing and incremental indexer` | unit tests |
| 60 | `92f5bba` | Done | Lexical Search Engine | `feat(retrieval): implement lexical search index with bm25/keyword relevance ranking` | unit tests |
| 61 | `6c2caae` | Done | Excerpt Extractor | `feat(retrieval): implement source metadata extraction and excerpt formatter` | unit tests |
| 62 | `a053713` | Done | Evidence Attribution | `feat(retrieval): implement citation builder and evidence verification` | unit tests |
| 63 | `3b2f3a1` | Done | Index Pruning Service | `feat(retrieval): implement index refresh and stale document pruning service` | unit tests |
| 64 | `2ba3ea4` | Done | Retrieval Tests | `test(retrieval): add unit and integration tests for document chunking and search ranking` | test suite passed (5 tests) |
| 65 | `dbd5cee` | Done | Workspace Boundary Guard | `feat(security): implement path traversal prevention and workspace boundary guard` | security tests |
| 66 | `8fb79ee` | Done | Redaction Hardening | `feat(security): implement credential and pii redaction in logs and tool outputs` | security tests |
| 67 | `7358d28` | Done | Confirmation Protocol | `feat(security): implement two-phase confirmation protocol for mutating actions` | security tests |
| 68 | `bc2fc91` | Done | Rate Limiting | `feat(security): implement rate limiter and in-flight request concurrency limiter` | security tests |
| 69 | `8c5bf7b` | Done | Constant-Time Auth | `feat(security): implement constant-time secret comparison and api key validation` | security tests |
| 70 | `6e7b5e1` | Done | Telemetry & Metrics | `feat(observability): implement request telemetry and performance metrics tracker` | unit tests |
| 71 | `c9ce76d` | Done | Request Cancellation | `feat(reliability): implement request cancellation and execution deadline propagation` | unit tests |
| 72 | `76f7c9c` | Done | Security Test Suite | `test(security): add security tests for path traversal, injection, and authorization` | security suite passed (11 tests) |
| 73 | `58c40f8` | Done | E2E: Direct Reasoning | `test(e2e): implement end-to-end tests for conceptual question answering without tools` | e2e passed (2 tests) |
| 74 | `1b9d41f` | Done | E2E: Grounded Answers | `test(e2e): implement end-to-end tests for retrieval-augmented grounded answers` | e2e passed (1 test) |
| 75 | `903e6c3` | Done | E2E: Inspection & Errors | `test(e2e): implement end-to-end tests for repository inspection and error analysis` | e2e passed (2 tests) |
| 76 | `7018e4c` | Done | E2E: Persistent Memory | `test(e2e): implement end-to-end tests for persistent memory across restarts` | e2e passed (1 test) |
| 77 | `31a9ac0` | Done | E2E: Confirmation Guard | `test(e2e): implement end-to-end tests for confirmation-required actions and permission denials` | e2e passed (2 tests) |
| 78 | `09f55a8` | Done | Legacy Test Alignment | `fix(agent): align legacy acceptance tests with isolated server runner and vitest` | legacy & contradiction passed (51 tests) |
| 79 | `6f2ee3f` | Done | Comprehensive Docs | `docs: author comprehensive documentation suite for api, security, and setup` | docs validated |
| 80 | `aefc937` | Done | Release Readiness | `chore: finalize package scripts, release verification, and commit plan records` | all test suites passed |

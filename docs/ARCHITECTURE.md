# System Architecture Specification

## 1. Architectural Philosophy
The Alexa + MCP Question-Answering Assistant is built on the principles of **evidence grounding**, **explicit boundaries**, and **zero-cost local execution**.
It does not hallucinate answers from model parameters when evidence is required, and does not invoke tools when standard reasoning suffices.

---

## 2. Component Diagram

```
[MCP Client / Voice / HTTP Client]
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Transport & Security Boundary                            │
│    - Express HTTP with Streamable HTTP transport            │
│    - Rate limiter, concurrency guard, authentication token   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Request Lifecycle & Context Normalizer                   │
│    - Assigns unique RequestId, ExecutionDeadline, & Scopes  │
│    - Evaluates authorization policy & confirmation status   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Core Assistant & Orchestrator                            │
│    - Classifies intent (Direct, Retrieval, Tool, Action)    │
│    - Bounded execution loop with loop & duplication guards  │
│    - Assembles evidence provenance & citation metadata      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│ 4. Tool Registry & Executor │ │ 5. Knowledge Retrieval      │
│    - Strict Zod schemas     │ │    - Safe document loader   │
│    - Timeouts & concurrency │ │    - Semantic chunker       │
│    - Core QA tools + legacy │ │    - BM25/keyword ranking   │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. SQLite Persistent Storage                                │
│    - Versioned schema migrations                            │
│    - Parameterized statement repository                     │
│    - Scoped user preferences & indexed knowledge chunks     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Model Provider Layer                                     │
│    - Generic LLM provider contract                          │
│    - Ollama local client with timeouts & health checks      │
│    - Mock provider for reproducible automated testing       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. The 12-Step Request Lifecycle

1. **Ingress**: Request received via Streamable HTTP (`/mcp`) or internal programmatic call.
2. **Context Creation**: Assigns correlation ID, monotonic start timer, timeout deadline (default 30s), and user/scope identifiers.
3. **Authentication & Rate Check**: Verifies optional bearer token and evaluates per-client token bucket limits.
4. **Intent Classification**: Evaluates input query to determine if it is:
   - Direct conceptual / conversational reasoning.
   - Retrieval-augmented (project documentation, knowledge base).
   - Tool-assisted (repository inspection, system diagnostics, error analysis).
   - Mutating / Consequential (requires two-phase confirmation).
5. **Capability Selection**: Pre-filters registered tools matching the active intent to avoid polluting the model context.
6. **Execution Step**: Bounded loop (up to `MAX_STEPS` iterations) executing authorized tools or retrieval queries.
7. **Provenance Tracking**: Each tool output is tagged with provenance metadata (source URI, hash, timestamp, status).
8. **Loop Detection**: Identifies repeated tool invocations with identical parameters, halting execution loops immediately.
9. **Evidence Synthesis**: Relevant evidence chunks and tool summaries are formatted into an immutable prompt context.
10. **Model Generation**: The LLM synthesizes the evidence-grounded response using strict temperature and formatting rules.
11. **Admission of Missing Evidence**: If evidence is missing or inconclusive, the assistant explicitly states the limitation rather than hallucinating.
12. **Telemetry & Response**: Logs duration, tool counts, and outcome status without leaking credentials, returning structured results to the caller.

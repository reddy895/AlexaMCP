# Alexa + MCP — Digital Detective

> **Tagline:** *"Don't just ask. Investigate."*

An AI forensic investigation agent engineered for hackathons that inspects suspicious messages, phishing links, job scams, viral claims, and deceptive URLs using the official **Model Context Protocol (MCP)** with **Streamable HTTP transport** and local **Ollama** reasoning.

---

> [!NOTE]
> **Independent Implementation Disclaimer:** This project is an original, independent hackathon submission. It is **NOT** Amazon's proprietary Alexa software and is not affiliated with or endorsed by Amazon Technologies, Inc.

---

## 📑 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Architecture](#-architecture)
- [Why Model Context Protocol (MCP)?](#-why-model-context-protocol-mcp)
- [The 7 Real MCP Tools](#-the-7-real-mcp-tools)
- [Forensic Risk Scoring Algorithm](#-forensic-risk-scoring-algorithm)
- [Ollama Local AI Integration](#-ollama-local-ai-integration)
- [Demo Scenarios](#-demo-scenarios)
- [Technology Stack](#-technology-stack)
- [Local Setup & Getting Started](#-local-setup--getting-started)
- [Running the Services](#-running-the-services)
- [Running Tests](#-running-tests)
- [Safety & Security Principles](#-safety--security-principles)
- [Limitations & Future Roadmap](#-limitations--future-roadmap)

---

## 🔍 Problem Statement

Online users encounter hundreds of digital interactions daily: urgent SMS messages warning that their bank account will be frozen, LinkedIn recruitment offers requesting interview application fees, deceptive look-alike domains harvesting OTPs, and sensational health claims promising miracle cures.

Standard conversational chatbots frequently hallucinate confidence, invent facts, or blindly trust the text given to them. Most assistants can only answer questions—**they cannot investigate**.

## 💡 Solution Overview

**Digital Detective** is an investigation-centric agent. The user's only job is:
> Give Alexa a suspicious message, URL, email, claim, job offer, or website and ask it to investigate.

The system does not engage in casual chat, play music, or check the weather. Instead, it systematically invokes real MCP investigative tools, extracts factual claims, tests URL network safety, cross-references independent security advisories, calculates a transparent risk score, and asks a local Ollama model to reason over the collected evidence before issuing a verdict.

---

## 🏗 Architecture

```
                 USER
                   │ (Voice or Text)
                   ▼
       ┌────────────────────────┐
       │   ALEXA-STYLE UI       │ (React + Vite + Tailwind + Web Speech)
       │   - Interactive Orb    │
       │   - Live Tool Stepper  │
       │   - MCP Activity Panel │
       └───────────┬────────────┘
                   │ REST / SSE
                   ▼
       ┌────────────────────────┐
       │     AGENT SERVICE      │ (Express + TypeScript + SQLite)
       │ - Intent Understanding │
       │ - Pipeline Coordinator │
       │ - Forensic Memory DB   │
       └───────────┬────────────┘
                   │ MCP Client (Streamable HTTP / SSE)
                   ▼
       ┌────────────────────────┐
       │       MCP SERVER       │ (Port 3000, @modelcontextprotocol/sdk)
       │  Streamable HTTP /sse  │
       └─────┬─────┬──────┬─────┘
             │     │      │
     ┌───────┘     │      └────────┐
     ▼             ▼               ▼
Claims Tools   Web Tools     Analysis Tools
extract_claims inspect_url   analyze_message
               search_evid.  cross_reference
                             calculate_risk
                             generate_report
             │     │      │
             └─────┼──────┘
                   │ Verified Evidence
                   ▼
       ┌────────────────────────┐
       │     OLLAMA ENGINE      │ (Port 11434, Local Inference Only)
       │  - Model: qwen2.5/qwen3│
       │  - Zero Cloud API Keys │
       │  - Reasons OVER Tool   │
       │    Evidence Only       │
       └───────────┬────────────┘
                   │
                   ▼
       FORENSIC VERDICT & REPORT
       (Score, Confidence, Why, Recommendations)
```

---

## 🔌 Why Model Context Protocol (MCP)?

Unlike traditional monoliths where functions are tightly coupled to application code, **Digital Detective** implements an authentic **MCP Server** using `@modelcontextprotocol/sdk` and **Streamable HTTP transport** (`SSEServerTransport` over `/sse` and `/messages`).

1. **Protocol Decoupling:** Any MCP-compliant client (Claude desktop, Cursor, autonomous agents, or our backend agent) can connect to `http://localhost:3000/sse` and discover the forensic tool suite.
2. **Standardized Tool Schemas:** All inputs and outputs are strictly typed with Zod schemas.
3. **Observability:** Every MCP tool call is recorded in SQLite with microsecond latency measurements, input snapshots, and execution status visible to judges in the **MCP Activity Stream** panel.

---

## 🛠 The 7 Real MCP Tools

| Tool | Purpose | Schema / Capabilities |
| :--- | :--- | :--- |
| `extract_claims` | Breaks text into atomic factual propositions | Categorizes claims (`financial`, `security`, `job`, `product`, `news`, `identity`). Never hallucinates claims. |
| `inspect_url` | Network & domain security inspection | Checks SSL/TLS, TLD abuse flags (`.xyz`, `.top`), IP hosts, IDN punycode, brand typosquatting, redirect headers, and path targeting. Safe timeout without executing code. |
| `analyze_message` | Linguistic threat & social engineering analysis | Detects urgency coercion, intimidation, brand impersonation, credential harvesting, upfront employment fees, and emotional manipulation. |
| `search_evidence` | Queries authoritative repositories & web intelligence | Prioritizes Official &gt; Government &gt; Security &gt; Reputable. Returns `insufficient_evidence` when unverified. |
| `cross_reference` | Compares original claims against findings | Strictly classifies claims into `SUPPORTED`, `CONTRADICTED`, `UNCERTAIN`, or `INSUFFICIENT_EVIDENCE`. |
| `calculate_risk` | Transparent algorithmic risk engine | Mathematical scoring based on verified indicator weights. Clamped 0–100. Eliminates LLM number guessing. |
| `generate_investigation_report` | Forensic report synthesis | Formats final report with verdict, confidence, indicator checklist, sources, and actionable safety guidance. |

---

## 📊 Forensic Risk Scoring Algorithm

Ollama is **never** permitted to hallucinate risk percentages. The `calculate_risk` MCP tool calculates transparent risk using a deterministic formula:

| Indicator Detected | Score Weight |
| :--- | :--- |
| **URL Risk / Domain Mismatch** | `+25` |
| **Credential / OTP Request** | `+25` |
| **Upfront Fee for Job Interview** | `+25` |
| **Brand Impersonation (Bank, Tech, Courier)** | `+20` |
| **Contradicted by Independent Evidence** | `+20` |
| **Urgency / Time Pressure Language** | `+15` |
| **Coercive Legal / Freeze Threat** | `+15` |
| **Sensationalist / Clickbait Claims** | `+15` |
| **Clean Domain & Neutral Signal Credit** | `-20` |

- **Score Range:** Clamped strictly between `0` and `100`.
- **Tiers:** `low` (0–24), `medium` (25–54), `high` (55–79), `critical` (80–100).
- **Confidence Rating:** Determined by evidence density (HIGH if &ge; 3 strong indicators or official contradiction; LOW if sparse).

---

## 🦙 Ollama Local AI Integration

- **Local Inference Only:** No OpenAI, Gemini, Claude, Groq, or paid cloud APIs.
- **Configurable Model:** Defaults to `qwen2.5:1.5b` or `qwen3:8b` via `OLLAMA_MODEL`.
- **Structured Output:** All prompts enforce JSON mode with Zod schema verification.
- **Auto-Correction Retry:** If LLM output fails schema validation, it is retried once with targeted feedback.
- **Graceful Offline Degradation:** If Ollama is offline or busy, the deterministic fallback engine synthesizes the forensic verdict and recommendations based on MCP tool outputs so the service **never crashes**.

---

## 🎬 Demo Scenarios

Pre-seeded directly in the UI for 1-click demonstration:

1. **🚨 Bank Account Phishing (Critical Risk — 85–100%)**
   ```text
   Your SBI account will be blocked today.
   Verify immediately using this link:
   https://onlinesbi-kyc-update.xyz/login
   ```
   *Expected Verdict:* `LIKELY_PHISHING` or `SUSPICIOUS`
   *Findings:* Mismatched domain, high-abuse `.xyz` TLD, urgent deadline, credential request, contradicted by SBI official security advisory.

2. **💼 Recruitment Upfront Fee Scam (High Risk — 65%)**
   ```text
   Amazon is offering a software engineer job with salary ₹18 LPA.
   Pay ₹999 to register for the mandatory technical interview round.
   ```
   *Expected Verdict:* `SUSPICIOUS`
   *Findings:* Mandatory payment for job interview, Amazon impersonation, contradicted by Amazon Candidate Safety Advisory.

3. **☕ Viral Scientific Claim (Low Risk / Misleading — 20%)**
   ```text
   Scientists have discovered that drinking coffee increases lifespan by exactly 40%.
   ```
   *Expected Verdict:* `MISLEADING` / `SUSPICIOUS`
   *Findings:* Sensational clickbait distortion, contradicted by Harvard T.H. Chan nutritional consensus.

4. **💻 Legitimate Hardware Announcement (Low Risk — 0%)**
   ```text
   Apple officially announced the M4 chip built on 3nm architecture with hardware-accelerated ray tracing and 38 TOPS neural engine.
   ```
   *Expected Verdict:* `SUPPORTED` / `LIKELY_TRUE`

---

## 💻 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Audio & Voice** | Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) |
| **Backend** | Node.js (v22), Express, TypeScript, better-sqlite3 |
| **MCP** | `@modelcontextprotocol/sdk` (Streamable HTTP / Server-Sent Events) |
| **Validation** | Zod (schemas across all tools, APIs, and LLM responses) |
| **Database** | SQLite WAL mode (`investigations`, `claims`, `evidence`, `tool_calls`, `reports`) |
| **AI Inference** | Ollama (`http://localhost:11434`, Qwen / Llama) |
| **Testing** | Vitest (25 unit and integration tests) |

---

## 🚀 Local Setup & Getting Started

### Prerequisites

- **Node.js**: v20+ (v22 recommended)
- **Ollama**: Installed and running locally ([Download Ollama](https://ollama.ai))

### 1. Clone & Install Dependencies

```bash
cd "Alexa MCP"
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Contents of `.env`:
```env
# AI Model Configuration (OLLAMA ONLY)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b

# Database
DATABASE_URL=./data/alexa-mcp.db

# Network Ports
BACKEND_PORT=4000
MCP_PORT=3000
FRONTEND_URL=http://localhost:5173

# MCP Transport
MCP_SERVER_URL=http://localhost:3000/sse
```

### 3. Pull Ollama Model

```bash
ollama pull qwen2.5:1.5b
# or qwen3:8b
```

---

## ⚡ Running the Services

You can run everything concurrently with a single command:

```bash
npm run dev
```

Or run each service individually:

```bash
# Terminal 1: MCP Server (Port 3000)
npm run dev:mcp

# Terminal 2: Backend Orchestrator (Port 4000)
npm run dev:backend

# Terminal 3: Frontend Web UI (Port 5173)
npm run dev:frontend
```

Open your browser at:
👉 **`http://localhost:5173`**

---

## 🧪 Running Tests

The test suite contains 25 offline-first unit and integration tests that mock Ollama and do not require external network connections:

```bash
npm test
```

Test coverage includes:
- ✅ Claim extraction across financial, security, employment, and scientific texts
- ✅ URL validation, TLD abuse flags, and brand typosquatting
- ✅ Message threat, urgency, and fee-for-job analysis
- ✅ Evidence retrieval and priority ordering
- ✅ Cross-referencing and contradiction detection
- ✅ Transparent mathematical risk calculation and clamping
- ✅ Ollama offline resilience, schema validation, and correction retries
- ✅ Investigation lifecycle and SQLite persistence

---

## 🔒 Safety & Security Principles

This application analyzes untrusted and hostile inputs:
1. **No Code Execution:** Never evaluates downloaded scripts or arbitrary HTML.
2. **Safe Probing:** HTTP inspection performs `HEAD` requests with strict 2.5s abort controllers and does not download large or executable payloads.
3. **No Sensitive Leakage:** Server configuration, environment paths, and local files are never passed back into responses.
4. **Zod Validation:** All inputs are strictly checked against length limits (max 20,000 characters for content; max 2,048 characters for URLs).
5. **No AI API Keys:** Operates 100% locally with zero third-party cloud data transmission.

---

## 🔮 Limitations & Future Roadmap

- **DNS WHOIS Deep Inspection:** Integrate direct RDAP/WHOIS domain registration date checks to detect domains registered &lt; 48 hours ago.
- **SSL Certificate Transparency:** Add Certificate Transparency (CT) log queries to detect rapid certificate re-issuance.
- **Multilingual Support:** Expand threat indicator patterns to Hindi, Spanish, French, and regional languages.
- **Browser Extension:** Provide a Chrome extension that sends the current tab's active URL directly to Digital Detective via MCP.

---

**Built with pride for the Hackathon &bull; Alexa + MCP — Digital Detective**

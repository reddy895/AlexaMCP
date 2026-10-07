# Digital Detective

Digital Detective is an AI-powered fraud and scam investigation agent built for the Amazon Developer Hackathon (Alexa+ / MCP track). It combines local LLM reasoning via Ollama with the official Model Context Protocol (MCP) streamable HTTP server. When presented with suspicious digital offers, messages, or URLs, the agent executes an autonomous multi-step investigation loop across real MCP tools—extracting factual claims, analyzing linguistic red flags, inspecting target domains with SSRF protection, searching live DuckDuckGo web evidence, cross-referencing conflicting signals, and calculating calibrated risk scores—delivering an evidence-backed verdict without relying on LLM memory.

## Prerequisites

- **Node.js 20+** (ESM support enabled)
- **Ollama** installed and running (`ollama serve`)
- A tool-calling LLM model:
  ```bash
  ollama pull qwen2.5:3b
  ```
  *(or `qwen2.5:1.5b`, `llama3.1:8b`, or `mistral-nemo`)*

## Install

```bash
npm install
```

## Run (two terminals)

Start the MCP server in Terminal A and the interactive agent REPL in Terminal B:

```bash
# Terminal A (MCP Server on port 3001)
npm run server

# Terminal B (Interactive Agent REPL)
npm run agent
```

Or run both concurrently in a single terminal:

```bash
npm run dev
```

## Voice mode (Linux)

Prereqs:
```bash
sudo apt install alsa-utils espeak-ng
# whisper.cpp:
git clone https://github.com/ggerganov/whisper.cpp && cd whisper.cpp
make && bash models/download-ggml-model.sh base.en
```

Run:
```bash
DD_MODE=voice \
WHISPER_BIN=$HOME/whisper.cpp/build/bin/whisper-cli \
WHISPER_MODEL=$HOME/whisper.cpp/models/ggml-base.en.bin \
OLLAMA_MODEL=qwen2.5:3b \
npm run agent
```

Optional better TTS with piper:
  set `PIPER_BIN` and `PIPER_MODEL` env vars.

## Example Input

Paste a suspicious message into the `detective›` prompt:

```text
Congratulations! You have been selected for a remote job paying ₹2,50,000 per month. Pay ₹999 registration fee at http://secure-jobs-verify.xyz/register to continue.
```

## What You'll See

1. Real-time MCP tool invocations stream into the terminal:
   - `extract_claims` breaks down sentences and flags high-importance payment and earnings claims.
   - `analyze_message` detects urgency, unrealistic salary promises, upfront fee demands, and exclamation marks.
   - `inspect_url` safely validates the domain (SSRF protection), flags `.xyz` TLD, and checks content.
   - `search_evidence` queries DuckDuckGo for scam reports, domain age, or victim complaints.
   - `cross_reference` contrasts high-importance claims against discovered web evidence.
   - `calculate_risk` tabulates weighted risk factors into a 0–100 score and categorical verdict.
   - `generate_investigation_report` aggregates findings into a cohesive report.
2. A clean, human-readable terminal report:
   - **VERDICT**: HIGH RISK / SUSPICIOUS / LIKELY SAFE
   - **RISK SCORE**: Numeric score out of 100
   - **RED FLAGS**: Specific linguistic and behavioral signals detected
   - **EVIDENCE**: Real search snippets and domain findings
   - **RECOMMENDATION**: Actionable advisory guidance for users

## Troubleshooting

- **"Cannot reach Ollama"**  
  Run `ollama serve` in a background terminal and ensure `http://localhost:11434` is accessible.
- **"Cannot reach MCP server"**  
  Start the MCP server first using `npm run server` before running `npm run agent`.
- **Model produces no tool calls**  
  Ensure your model supports function calling: run `ollama pull qwen2.5:7b` (or `llama3.1:8b` / `mistral-nemo`). Models that do not support tool calling (such as base `llama3` or `gemma`) will not trigger MCP tools.

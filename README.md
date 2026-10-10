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

## Voice Agent Architecture (Conversational Alexa + MCP)

Digital Detective is a complete, two-way conversational voice agent that listens to human speech, investigates digital fraud in real-time using Model Context Protocol (MCP) tools, and replies naturally in spoken voice.

```
       ┌────────────────┐
       │   Human Voice  │
       └───────┬────────┘
               │ (Microphone / arecord / Web Audio)
               ▼
   ┌───────────────────────┐
   │  STT Pipeline         │ ◄── Auditory Earcon (listen start)
   │  - Silence / VAD Trim │
   │  - whisper.cpp Engine │
   │  - Transcript Clean   │
   └───────────┬───────────┘
               │
               ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Voice Dialogue Manager & Intent Classifier                │
   │  ├─ GREETING / SMALLTALK ──► Spoken Knowledge Explanation   │
   │  ├─ VOICE CONTROL ─────────► Persona Switch, Mute/Unmute    │
   │  ├─ REPEAT / EXPLAIN ──────► Detailed Voice Breakdown       │
   │  └─ INVESTIGATE FRAUD ─────► MCP Multi-Tool Autonomous Loop │
   └───────────────────────────┬─────────────────────────────────┘
                               │
                               ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Natural Spoken Briefing Generator                          │
   │  - Calibrated Risk Score (0-100)                            │
   │  - Primary Red Flags & Deception Signals                    │
   │  - Grounded Web Evidence                                    │
   │  - Actionable Human Safety Recommendation                   │
   └───────────────────────────┬─────────────────────────────────┘
                               │
                               ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Multi-Backend TTS Engine                                  │ ◄── Auditory Earcon (alert / safe)
   │  - Neural Edge-TTS (Alexa-grade natural voices)             │
   │  - Speech Dispatcher (spd-say Linux fast local)             │
   │  - Piper ONNX Neural TTS                                    │
   │  - Audio Cache (0ms latency instant playback)               │
   └───────────┬─────────────────────────────────────────────────┘
               │ (Speakers / PipeWire pw-play / aplay / Web Audio)
               ▼
       ┌────────────────┐
       │   Agent Speech │
       └────────────────┘
```

### Voice Capabilities & Features

1. **Continuous Voice Conversation Loop**:
   - The agent speaks an introductory greeting, chimes to signal listening, listens to user input, investigates, delivers spoken briefings, and listens again.
2. **Multi-Backend Text-To-Speech (TTS)**:
   - **Neural Edge-TTS**: Studio-quality neural voices (`en-US-AriaNeural`, `en-US-GuyNeural`, `en-IN-NeerjaNeural`).
   - **Speech Dispatcher (`spd-say`)**: Instant local Linux desktop speech with zero extra packages required.
   - **Piper & Espeak**: Fast offline ONNX/formant fallbacks.
   - **Audio File Caching**: Pre-synthesized prompt caching with SHA-256 for 0ms latency audio playback.
3. **Auditory Earcons**:
   - Acoustic earcons synthesized via PCM:
     - Ascending wake chime (`listen_start`)
     - Soft descending confirmation tone (`listen_stop`)
     - Ambient investigation chirp (`investigating`)
     - Harmonious major triad (`verdict_safe`)
     - Alert siren interval (`verdict_alert`)
4. **Voice Personas**:
   - `alexa`: Crisp, balanced, clear natural assistant tone (`en-US-AriaNeural`).
   - `detective`: Sharp, authoritative investigative voice (`en-US-GuyNeural`).
   - `forensics`: Deep, calm, highly technical analytical voice (`en-US-ChristopherNeural`).
   - `advisor`: Warm, supportive, protective advisory voice (`en-IN-NeerjaNeural`).
5. **Interactive Web Voice Assistant UI**:
   - Access the cyberpunk-themed voice assistant dashboard at `http://localhost:3001`.
   - Features real-time microphone visualization, glowing reactive orb, speech recognition, persona selector, and live risk score meters.
6. **Voice Commands Supported**:
   - *"Alexa, is this a scam?"* or *"Check http://example.xyz"* — triggers investigation pipeline.
   - *"Why is it high risk?"* or *"Explain SSRF"* — conversational follow-up.
   - *"Can you repeat that?"* — repeats previous agent briefing.
   - *"Switch voice to advisor"* or *"Switch voice to detective"* — switches persona on the fly.
   - *"Mute"* / *"Unmute"* — controls voice audio output.
   - *"Help"* — lists available voice commands.
   - *"Goodbye"* — exits gracefully.

### Running the Voice Agent

```bash
# Terminal A: Start MCP Server and Web Voice Interface (port 3001)
npm run server

# Terminal B: Start Hands-Free Voice Agent
npm run agent:voice
```

Or run both concurrently:
```bash
npm run dev
```

Open `http://localhost:3001` in your browser for the Web Voice Dashboard!

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


## Fix A: Enforce Report-Only Final Answers
The agent guarantees that verdicts come exclusively from the authoritative Model Context Protocol tool output rather than LLM memory or hallucination.

## Fix B: Intermediate Tool Plumbing
Intermediate outputs across `extract_claims`, `analyze_message`, `inspect_url`, and `calculate_risk` are cached and directly plumbed into the final report.

## Fix C: Risk Score Floors
To prevent contradictions between red flags and risk scores, calibrated floor rules ensure that messages with red flags or high-importance claims receive minimum risk scores.

## Fix D: Authoritative Report Formatting
The terminal presentation renders an unmistakable authoritative block with double borders, categorized sections, and non-authoritative model commentary suppressed or relegated.

## Voice Mode (Default Hands-Free)
The agent now operates in voice mode by default (`DD_MODE=voice`). It listens to user voice input via ALSA `arecord`, performs local transcription via `whisper.cpp`, and announces the verdict via speech synthesis.

## Contradiction & Signal Tests (B1–B5)
Run the automated contradiction test suite:
```bash
npm run test:contradiction
```

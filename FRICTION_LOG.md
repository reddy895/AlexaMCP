# Digital Detective — Friction Log

This document records the friction items encountered during the development and optimization of the Digital Detective agent, along with root causes, fixes applied, and estimated time cost.

---

### 1. Model Not Found (`qwen2.5:7b`)
- **Symptom**: Execution fails on GPUs with <= 4GB VRAM because the 7B model is too large or not pulled locally.
- **Root cause**: Default model selection (`qwen2.5:7b`) exceeded resource constraints for lightweight local setups, and startup lacked preflight checks.
- **Fix**: Switched default model to `qwen2.5:3b`, capped context window via `NUM_CTX`, and added startup preflight to check Ollama reachability and installed models via `/api/tags`.
- **Time cost**: 15 minutes.

---

### 2. Blank / Empty Investigation Report
- **Symptom**: Model provides prose answer without calling `generate_investigation_report`, resulting in missing or empty structured report headers.
- **Root cause**: No enforcement mechanisms existed when the model finished its turn without invoking the mandatory report tool.
- **Fix**: Tracked `lastReport` and `reportGenerated` flag in `runInvestigation()`. If the model attempts a final answer without calling `generate_investigation_report`, push a tool message feedback loop requiring the report call.
- **Time cost**: 20 minutes.

---

### 3. `inspect_url` Received `null` Arguments
- **Symptom**: Model called `inspect_url({"url": null})` or hallucinated invalid URL arguments when no URL was explicitly extracted.
- **Root cause**: Model struggled to reliably isolate exact URL substrings from unstructured raw user input text.
- **Fix**: Implemented regex pre-extraction via `extractUrls()` in `src/util.ts`, pre-identifying URLs before the agent turn and appending a `[SYSTEM: URLs detected...]` prompt directive.
- **Time cost**: 15 minutes.

---

### 4. Duplicate `search_evidence` Calls
- **Symptom**: The model repeatedly issued identical `search_evidence` calls with identical query parameters, exhausting turn steps.
- **Root cause**: Lack of call deduplication tracking across multi-step LLM tool iterations.
- **Fix**: Added a `seenCalls` `Set<string>` in `runInvestigation()` to track `name|args` strings. If a call is duplicated, skip execution with `⏭ skipped duplicate <name>` and inform the model.
- **Time cost**: 15 minutes.

---

### 5. False Positives on Legitimate Sites
- **Symptom**: Legitimate job portals like `indeed.com` and `remoterocketship.com` were flagged as HIGH RISK scams.
- **Root cause**: Overly aggressive raw HTML body regex scans matching standard login/payment keywords across entire web page contents.
- **Fix**: Removed full HTML body regex scans in `inspectUrl()`. Restricted check to page `<title>` and `<meta name="description">`, and raised the suspicious threshold to `>= 2` signals.
- **Time cost**: 25 minutes.

---

### 6. Report Verdict Contradicted Model Prose
- **Symptom**: Model's conversational text contradicted the structured report verdict or calculated risk score.
- **Root cause**: Model passed incomplete or hallucinated arguments into `generate_investigation_report` instead of using actual tool outputs.
- **Fix**: Cached tool outputs (`claimsResult`, `analysisResult`, `urlFindings`, `evidenceResults`, `crossRefResult`, `riskResult`), explicitly overwritten arguments before invoking `generate_investigation_report`, and enforced risk floors.
- **Time cost**: 30 minutes.

---

### 7. Unreliable Voice Input & Crashes
- **Symptom**: Missing audio hardware (`arecord`), STT binaries (`whisper-cli`), or TTS tools (`piper`/`espeak-ng`) caused fatal crashes during execution.
- **Root cause**: Hard dependencies on system audio commands without error catching or text fallback.
- **Fix**: Created `src/voice.ts` wrapping `recordVoice()`, `transcribe()`, and `speak()` in try/catch blocks that gracefully log warnings and fall back to interactive text mode.
- **Time cost**: 25 minutes.

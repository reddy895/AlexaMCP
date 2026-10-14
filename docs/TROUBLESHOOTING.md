# Operational Troubleshooting Guide

This guide provides concrete, tested solutions for common operational and development issues.

---

## 1. Ollama & Model Provider Issues

### 1.1 "Cannot reach Ollama. Run: ollama serve"
**Cause**: The local Ollama daemon is not running on the configured host/port (`http://127.0.0.1:11434`).
**Fix**:
1. Open a terminal and start the daemon:
   ```bash
   ollama serve
   ```
2. Verify connectivity:
   ```bash
   curl -s http://127.0.0.1:11434/api/tags
   ```

### 1.2 "Model 'qwen2.5:3b' is not installed"
**Cause**: The requested model has not been downloaded to the local Ollama cache.
**Fix**:
Pull the model using the Ollama CLI:
```bash
ollama pull qwen2.5:3b
```
*(Alternative smaller model if RAM is constrained: `ollama pull qwen2.5:1.5b` or `ollama pull llama3.2:1b`)*

### 1.3 Model Diagnostics CLI
Run the built-in diagnostic utility to test provider health without starting the full server:
```bash
npm run diagnostics
```
This will print model availability, connection latency, and provider capabilities.

---

## 2. Port Collisions & Transport Errors

### 2.1 "Error: listen EADDRINUSE: address already in use :::3001"
**Cause**: Another process (e.g., an earlier server instance or legacy service) is holding port 3001.
**Fix**:
1. Identify the occupying process:
   ```bash
   lsof -i :3001
   ```
2. Terminate the process:
   ```bash
   kill -9 <PID>
   ```
3. Or assign a different port via `.env`:
   ```bash
   PORT=3005 npm run server
   ```

### 2.2 "ECONNREFUSED 127.0.0.1:3001"
**Cause**: The client attempted to connect before the MCP server finished binding.
**Fix**:
When running automated tests or clients, ensure the server is running or use the in-process server runner (`tests/acceptance.test.ts` and `tests/integration/mcp-protocol.test.ts` demonstrate this pattern).

---

## 3. Database & Migration Problems

### 3.1 "Failed to open SQLite database: EACCES or directory not found"
**Cause**: The parent directory for `.data/assistant.db` does not exist or lacks write permissions.
**Fix**:
Create the directory with appropriate user permissions:
```bash
mkdir -p .data
chmod 755 .data
```

### 3.2 Corrupted SQLite Database
**Cause**: Unexpected process termination during un-journaled operations.
**Fix**:
The server runs in WAL (Write-Ahead-Logging) mode which prevents corruption in standard crashes. To reset the local development database safely:
```bash
rm -f .data/assistant.db*
npm test
```
The database and versioned migrations will automatically recreate clean tables upon next startup.

---

## 4. Test Failures & Mock Provider

### 4.1 "Do not make tests depend on running Ollama"
The test suite is designed to be 100% deterministic and runnable offline. All unit and E2E tests use `MockLanguageModelProvider` or isolated in-memory instances:
```bash
npm test
```
If you encounter timeout errors in tests, check if `timeoutMs` in your execution context is sufficient (default is 10s for tests).

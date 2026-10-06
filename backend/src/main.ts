import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database/db.js';
import { apiRouter } from './api/routes.js';
import { mcpClient } from './services/mcpClient.js';
import { ollamaService } from './services/ollamaService.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || '4000', 10);

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

// Mount investigation API router
app.use('/api', apiRouter);

// Initialize DB schema
initDatabase();
console.log('[Backend] SQLite Database initialized');

// Background check and connect to MCP Server
setTimeout(async () => {
  try {
    await mcpClient.connect();
  } catch (err: any) {
    console.warn(`[Backend] Initial connection to MCP server deferred: ${err.message}`);
  }
}, 1000);

// Check Ollama status
setTimeout(async () => {
  const health = await ollamaService.checkHealth();
  if (health.available) {
    console.log(`[Backend] Ollama connected (v${health.version}), model '${health.model}' available: ${health.model_available}`);
  } else {
    console.warn(`[Backend] Ollama not detected at ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'} (${health.error || 'offline'}). Fallback reasoning heuristics will be used.`);
  }
}, 1500);

app.listen(PORT, () => {
  console.log(`[Backend] Digital Detective Backend listening on http://localhost:${PORT}`);
});

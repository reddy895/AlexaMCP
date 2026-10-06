import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_URL || './data/alexa-mcp.db';
const resolvedPath = path.resolve(process.cwd(), dbPath);

// Ensure directory exists
const dir = path.dirname(resolvedPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(resolvedPath);
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS investigations (
      id TEXT PRIMARY KEY,
      input TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      stage TEXT,
      progress INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT NOT NULL,
      FOREIGN KEY(investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      summary TEXT NOT NULL,
      classification TEXT NOT NULL,
      FOREIGN KEY(investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tool_calls (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      status TEXT NOT NULL,
      duration INTEGER NOT NULL,
      result_summary TEXT NOT NULL,
      input_summary TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL UNIQUE,
      verdict TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      confidence TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      summary TEXT NOT NULL,
      voice_summary TEXT,
      recommendations TEXT NOT NULL,
      evidence_json TEXT,
      contradictions_json TEXT,
      uncertainties_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );
  `);
}

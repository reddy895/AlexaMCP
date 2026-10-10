import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface CacheEntryMetadata {
  key: string;
  filePath: string;
  createdAt: number;
  lastAccessed: number;
  sizeBytes: number;
}

export class AudioCache {
  private cacheDir: string;
  private metadata = new Map<string, CacheEntryMetadata>();

  constructor(customDir?: string) {
    this.cacheDir = customDir ?? path.join(os.tmpdir(), "alexa-mcp-audio-cache");
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    this.loadExisting();
  }

  public static hashKey(text: string, voice = "default", rate = "default"): string {
    return crypto
      .createHash("sha256")
      .update(`${voice}:::${rate}:::${text.trim()}`)
      .digest("hex")
      .slice(0, 16);
  }

  private loadExisting(): void {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith(".wav") || file.endsWith(".mp3")) {
          const filePath = path.join(this.cacheDir, file);
          const stat = fs.statSync(filePath);
          const key = path.basename(file, path.extname(file));
          this.metadata.set(key, {
            key,
            filePath,
            createdAt: stat.birthtimeMs || stat.mtimeMs,
            lastAccessed: stat.atimeMs || stat.mtimeMs,
            sizeBytes: stat.size,
          });
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  public has(key: string): boolean {
    const entry = this.metadata.get(key);
    if (!entry) return false;
    return fs.existsSync(entry.filePath);
  }

  public get(key: string): string | null {
    const entry = this.metadata.get(key);
    if (!entry) return null;
    if (!fs.existsSync(entry.filePath)) {
      this.metadata.delete(key);
      return null;
    }
    entry.lastAccessed = Date.now();
    return entry.filePath;
  }

  public put(key: string, data: Buffer | string, ext = "wav"): string {
    const filePath = path.join(this.cacheDir, `${key}.${ext}`);
    if (typeof data === "string") {
      if (fs.existsSync(data) && data !== filePath) {
        fs.copyFileSync(data, filePath);
      }
    } else {
      fs.writeFileSync(filePath, data);
    }
    const stat = fs.statSync(filePath);
    this.metadata.set(key, {
      key,
      filePath,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      sizeBytes: stat.size,
    });
    return filePath;
  }

  public size(): number {
    return this.metadata.size;
  }

  public clear(): void {
    for (const entry of this.metadata.values()) {
      try {
        if (fs.existsSync(entry.filePath)) {
          fs.unlinkSync(entry.filePath);
        }
      } catch {
        // ignore
      }
    }
    this.metadata.clear();
  }

  public prune(maxEntries = 100): void {
    if (this.metadata.size <= maxEntries) return;
    const sorted = Array.from(this.metadata.values()).sort(
      (a, b) => a.lastAccessed - b.lastAccessed
    );
    const toRemove = sorted.slice(0, sorted.length - maxEntries);
    for (const item of toRemove) {
      try {
        if (fs.existsSync(item.filePath)) {
          fs.unlinkSync(item.filePath);
        }
      } catch {
        // ignore
      }
      this.metadata.delete(item.key);
    }
  }
}

export const defaultAudioCache = new AudioCache();

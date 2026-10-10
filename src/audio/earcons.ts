import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { generateTone, generateMelody } from "./tones.js";

export type EarconType =
  | "wake"
  | "listen_start"
  | "listen_stop"
  | "investigating"
  | "verdict_safe"
  | "verdict_alert"
  | "error";

export class EarconManager {
  private cache = new Map<EarconType, Buffer>();
  private filePaths = new Map<EarconType, string>();
  private tempDir: string;

  constructor(tempDir?: string) {
    this.tempDir = tempDir ?? path.join(os.tmpdir(), "alexa-mcp-earcons");
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    this.initializePresets();
  }

  private initializePresets(): void {
    // 1. Wake / Listen Start: Ascending two-tone chime (523Hz C5 -> 784Hz G5)
    const listenStart = generateMelody([
      { freqHz: 523.25, durationMs: 120 },
      { freqHz: 783.99, durationMs: 160 },
    ], { volume: 0.45 });
    this.cache.set("wake", listenStart);
    this.cache.set("listen_start", listenStart);

    // 2. Listen Stop: Descending soft confirmation (659Hz E5 -> 440Hz A4)
    const listenStop = generateMelody([
      { freqHz: 659.25, durationMs: 90 },
      { freqHz: 440.0, durationMs: 120 },
    ], { volume: 0.35 });
    this.cache.set("listen_stop", listenStop);

    // 3. Investigating: Ambient radar chirp (680Hz)
    const investigating = generateTone(680, 100, { volume: 0.25 });
    this.cache.set("investigating", investigating);

    // 4. Safe verdict: Major triad chime (C5 -> E5 -> G5)
    const safeChime = generateMelody([
      { freqHz: 523.25, durationMs: 100 },
      { freqHz: 659.25, durationMs: 100 },
      { freqHz: 783.99, durationMs: 200 },
    ], { volume: 0.4 });
    this.cache.set("verdict_safe", safeChime);

    // 5. Alert verdict: Warning siren interval (880Hz -> 587Hz -> 880Hz)
    const alertSiren = generateMelody([
      { freqHz: 880.0, durationMs: 110 },
      { freqHz: 587.33, durationMs: 110 },
      { freqHz: 880.0, durationMs: 160 },
    ], { volume: 0.55 });
    this.cache.set("verdict_alert", alertSiren);

    // 6. Error: Low buzz (220Hz -> 180Hz)
    const errorTone = generateMelody([
      { freqHz: 220.0, durationMs: 150 },
      { freqHz: 180.0, durationMs: 200 },
    ], { volume: 0.4 });
    this.cache.set("error", errorTone);
  }

  /**
   * Returns in-memory WAV buffer for the specified earcon.
   */
  public getWavBuffer(type: EarconType): Buffer {
    const buf = this.cache.get(type);
    if (!buf) {
      throw new Error(`Unknown earcon type: ${type}`);
    }
    return buf;
  }

  /**
   * Persists the earcon WAV to disk and returns absolute path.
   */
  public getWavPath(type: EarconType): string {
    if (this.filePaths.has(type)) {
      return this.filePaths.get(type)!;
    }
    const buf = this.getWavBuffer(type);
    const filePath = path.join(this.tempDir, `${type}.wav`);
    fs.writeFileSync(filePath, buf);
    this.filePaths.set(type, filePath);
    return filePath;
  }

  /**
   * Pre-writes all earcon files to disk for zero-latency playback.
   */
  public prewarm(): void {
    for (const type of this.cache.keys()) {
      this.getWavPath(type);
    }
  }
}

export const defaultEarcons = new EarconManager();

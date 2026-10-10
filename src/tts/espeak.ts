import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ITTSBackend, TTSBackendType, TTSResult, TTSVoiceOptions } from "./types.js";
import { hasBinary } from "../audio/player.js";

export class EspeakBackend implements ITTSBackend {
  public readonly name: TTSBackendType = "espeak";
  private binary: string = "";

  constructor() {
    if (hasBinary("espeak-ng")) {
      this.binary = "espeak-ng";
    } else if (hasBinary("espeak")) {
      this.binary = "espeak";
    }
  }

  public isAvailable(): boolean {
    return this.binary !== "";
  }

  public async synthesizeToFile(
    text: string,
    outputPath: string,
    _opts?: TTSVoiceOptions
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const cleanText = text.slice(0, 600).replace(/"/g, '\\"');

    return new Promise((resolve) => {
      const proc = spawn(this.binary, ["-s", "160", "-v", "en-us", "-w", outputPath, cleanText], {
        stdio: "ignore",
      });
      proc.on("close", (code) => {
        resolve(code === 0 && fs.existsSync(outputPath));
      });
      proc.on("error", () => resolve(false));
    });
  }

  public async speak(text: string, opts: TTSVoiceOptions = {}): Promise<TTSResult> {
    const startTime = Date.now();
    if (!this.isAvailable()) {
      return { success: false, backendUsed: this.name, error: "espeak not available" };
    }

    const cleanText = text.slice(0, 600).replace(/"/g, '\\"');
    const args = ["-s", "160", "-v", "en-us", cleanText];

    return new Promise((resolve) => {
      const proc = spawn(this.binary, args, { stdio: "ignore" });
      proc.on("close", (code) => {
        resolve({
          success: code === 0,
          backendUsed: this.name,
          durationMs: Date.now() - startTime,
        });
      });
      proc.on("error", (err) => {
        resolve({
          success: false,
          backendUsed: this.name,
          error: err.message,
        });
      });
    });
  }
}
